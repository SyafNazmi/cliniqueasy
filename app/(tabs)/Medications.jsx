// app/(tabs)/Medications.jsx - Updated with new quick actions
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated, Dimensions, Modal, AppState } from 'react-native';
import React, { act, useCallback, useEffect, useRef, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Circle } from 'react-native-svg';
import { Link, useFocusEffect, useRouter } from 'expo-router';
import { getMedications, getDoseHistory, getTodaysDoses, recordDose } from '../../service/Storage';
import { registerForPushnotificationsAsync, resetAllMedicationReminders, scheduleMedicationReminder } from '../../service/Notification';

const {width} = Dimensions.get("window");

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// Updated QUICK_ACTIONS with new Medical Reports and Health Trend Analysis
const QUICK_ACTIONS = [
    {
        icon: "add-circle-outline",
        label: "Add \nMedications",
        route: "medications/add",
        color: "#2E7D32",
        gradient: ["#4CAF50", "#2E7D32"],
    },
    {
        icon: "calendar-outline",
        label: "Add \nCalendar",
        route: "medications/calendar",
        color: "#1976D2",
        gradient: ["#2196F3", "#1976D2"],
    },
    {
        icon: "document-text-outline",
        label: "Medical \nReports",
        route: "/medications/medical-reports",
        color: "#C2185B",
        gradient: ["#E91E63", "#C2185B"],
    },
    {
        icon: "analytics-outline",
        label: "Health Trend \nAnalysis",
        route: "/medications/health-trends",
        color: "#E64A19",
        gradient: ["#FF5722", "#E64A19"],
    },
];

interface CircularProgressProps {
    progress: number;
    totalDoses: number;
    completeDoses: number;
}

function CircularProgress({
    progress, // This is now a decimal between 0-1
    totalDoses,
    completeDoses  
}: CircularProgressProps) {
    const animationValue = useRef(new Animated.Value(0)).current;
    const size = width * 0.55;
    const strokeWidth = 15;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const safeProgress = isNaN(progress) || progress < 0 ? 0 : 
                    progress > 1 ? 1 : progress;

    // Convert progress decimal to percentage for display
    const progressPercentage = progress * 100;

    useEffect(() => {
        Animated.timing(animationValue, {
            toValue: progress, // Use the decimal directly
            duration: 1000,
            useNativeDriver: true,
        }).start();
    }, [progress]);

    const strokeDashoffset = animationValue.interpolate({
        inputRange: [0, 1],
        outputRange: [circumference, 0],
    });

    return (
        <View style={styles.progressContainer}>
            <View style={styles.progressTextContainer}>
                <Text style={styles.progressPercentage}>{Math.round(progressPercentage)}%</Text>
                <Text style={styles.progressLabel}>
                    {completeDoses} of {totalDoses} doses
                </Text>
            </View>
            <Svg width={size} height={size} style={styles.progressRing}>
                <Circle 
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke="rgba(255, 255, 255, 0.2)"
                    strokeWidth={strokeWidth}
                    fill="none"
                />
                <AnimatedCircle 
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke="white"
                    strokeWidth={strokeWidth}
                    fill="none"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    transform={`rotate(-90 ${size / 2} ${size / 2})`}
                />
            </Svg>
        </View>
    );
}

export default function Medications() {

    const router = useRouter();
    const [progress, setProgress] = useState(0);
    const [totalDoses, setTotalDoses] = useState(0);
    const [todaysMedications, setTodaysMedications] = useState([]);
    const [completedDoses, setCompletedDoses] = useState(0);
    const [doseHistory, setDoseHistory] = useState([]);
    const [medications, setMedications] = useState([]);
    const [showNotifications, setShowNotifications] = useState(false);

    // Recording Medications and Doses
    const loadMedicationData = useCallback(async () => {
      try {
        // Fetch data with Promise.all
        const [allMedications, todayDoses] = await Promise.all([
          getMedications(),
          getTodaysDoses(),
        ]);
        
        console.log("Medications:", allMedications);
        console.log("Today's doses:", todayDoses);
        
        // Verify arrays
        if (!Array.isArray(allMedications) || !Array.isArray(todayDoses)) {
          console.error("Expected arrays but got:", { allMedications, todayDoses });
          return;
        }
    
        // Set all medications
        setMedications(allMedications);
        setDoseHistory(todayDoses);
        
        // Filter today's medications
        const today = new Date();
        const todayMeds = allMedications.filter((med) => {
          const startDate = new Date(med.startDate);
          const durationsDays = parseInt(med.duration.split(" ")[0]);
          
          return (
            durationsDays === -1 || 
            (today >= startDate && 
             today <= new Date(startDate.getTime() + durationsDays * 24 * 60 * 60 * 1000))
          );
        });
        
        setTodaysMedications(todayMeds);
        
        // Calculate and update stats atomically
        const totalScheduledDoses = todayMeds.reduce((total, med) => {
          return total + med.times.length;
        }, 0);
        
        // Get unique taken doses
        const uniqueTakenDoses = new Set();
        todayDoses.forEach(dose => {
          if (dose.taken && isSameDay(new Date(dose.timestamp), today)) {
            uniqueTakenDoses.add(dose.doseId);
          }
        });
        
        const completedDosesCount = uniqueTakenDoses.size;
        const progressValue = totalScheduledDoses > 0 
          ? Math.min(completedDosesCount / totalScheduledDoses, 1)
          : 0;
        
        // Important: Update all three states together
        setTotalDoses(totalScheduledDoses);
        setCompletedDoses(completedDosesCount);
        setProgress(progressValue);
        
        console.log("Stats updated:", {
          totalDoses: totalScheduledDoses,
          completedDoses: completedDosesCount,
          progress: progressValue
        });
        
      } catch (error) {
        console.error("Error loading medication data:", error);
      }
    }, []);
 
    const setupNotificationsOnce = async () => {
      // Prevent multiple setups
      if (notificationsSetUp) return; 
      
      try {
        console.log("Setting up notifications...");
  
        let token;
        try {
          token = await registerForPushnotificationsAsync();
        } catch (error) {
          console.log("Error getting push token:", error);
        }
  
        // Get medications and reset all notifications
        const medications = await getMedications();
        console.log(`Setting up reminders for ${medications.length} medications`);
  
        // Use resetAllMedicationReminders to handle reminder setup
        await resetAllMedicationReminders(medications);
  
        console.log("Notification setup complete");

        // Set flag to prevent future setups
        // setNotificationsSetUp(true); 
      } catch (error) {
        console.error("Error setting up notifications:", error);
      }
    };
  
    // Ensure setupNotificationsOnce is called only once
    // Initial load on component mount
    useEffect(() => {
      loadMedicationData();
      
      // Setup notifications once
      setupNotificationsOnce();
      
      const subscription = AppState.addEventListener('change', (nextAppState) => {
        if (nextAppState === 'active') {
          // Reload medication data when app becomes active
          loadMedicationData();
        }
      });
      
      return () => {
        subscription.remove();
      };
    }, [loadMedicationData]);

    // Update on focus
    useFocusEffect(
      useCallback(() => {
        loadMedicationData();
        return () => {}; // cleanup
      }, [loadMedicationData])
    );

    const handleTakeDose = async (medication, timeIndex = 0) => {
      try {
        // Create a dose ID that includes the time index
        const doseId = `${medication.id}-${timeIndex}`;
        
        // Check if the dose has already been taken
        if (isDoseTaken(doseId)) return;
        
        // Record the dose
        await recordDose(medication.id, doseId, true, new Date().toISOString());
        
        // Reload all data
        await loadMedicationData();
      } catch (error) {
        console.error("Error recording dose:", error);
        Alert.alert("Error", "Failed to record dose. Please try again");
      }
    };
  
    // Update isDoseTaken to check for specific time doses
    const isDoseTaken = useCallback((doseId) => {
      // Check if this specific dose ID exists in today's dose history
      return doseHistory.some(dose => 
        dose.doseId === doseId && 
        dose.taken &&
        isSameDay(new Date(dose.timestamp), new Date())
      );
    }, [doseHistory]);

    function isSameDay(date1, date2) {
      return (
        date1.getFullYear() === date2.getFullYear() &&
        date1.getMonth() === date2.getMonth() &&
        date1.getDate() === date2.getDate()
      );
    }

    const calculateDoseStats = useCallback(() => {
      const today = new Date();
    
      // Log the incoming data for debugging
      console.log("Calculating dose stats with", {
        todaysMedications,
        doseHistory
      });
    
      const calculatedTotalDoses = todaysMedications.reduce((total, med) => {
        return total + med.times.length;
      }, 0);
    
      const uniqueTakenDoses = new Set();
      doseHistory.forEach(dose => {
        if (dose.taken && isSameDay(new Date(dose.timestamp), today)) {
          uniqueTakenDoses.add(dose.doseId);
        }
      });
    
      const calculatedCompletedDoses = uniqueTakenDoses.size;
      const calculatedProgress = calculatedTotalDoses > 0 
        ? Math.min(calculatedCompletedDoses / calculatedTotalDoses, 1)
        : 0;
    
      return {
        totalDoses: calculatedTotalDoses,
        completedDoses: calculatedCompletedDoses,
        progress: calculatedProgress
      };
    
    }, [todaysMedications, doseHistory]);

    // Count of medications to show in the notification badge
    const medicationCount = todaysMedications.length;

    
  return (
    <ScrollView style={styles.container}>
        <LinearGradient colors={["#0AD476", "#146922"]} style={styles.header}>
            <View style={styles.headerContent}>
                <View style={styles.headerTop}>
                    <View style={{flex: 1}}>
                        <Text style={styles.greeting}>Daily Progress</Text>
                    </View>
                    <TouchableOpacity style={styles.notificationButton}
                        onPress={() => setShowNotifications(true)} 
                    >
                        <Ionicons name="notifications-outline" size={24} color="white" />
                        {/* Render the notificationBadge */
                            <View style={styles.notificationBadge}>
                                <Text style={styles.notificationCount}>{medicationCount}</Text>
                            </View>
                        }
                    </TouchableOpacity>
                </View>
                <CircularProgress 
                    progress={progress} // This is a decimal between 0-1
                    totalDoses={totalDoses}
                    completeDoses={completedDoses}/>
            </View>
        </LinearGradient>
 
        {/* Quick Action Section */}
        <View style={styles.content}>
            <View style={styles.quickActionsContainer}>
                <Text style={styles.sectionTitle}>Quick Action</Text>
            <View style={styles.quickActionsGrid}>
                {QUICK_ACTIONS.map((action) => (
                    <Link href={action.route} key={action.label} asChild>
                        <TouchableOpacity style={styles.actionButton}>
                            <LinearGradient colors={action.gradient} style={styles.actionGradient}>
                            <View style={styles.actionContent}>
                                <View style={styles.actionIcon}>
                                <Ionicons name={action.icon} size={24} color="white"/>
                                </View>
                                <Text style={styles.actionLabel}>{action.label}</Text>
                            </View>
                            </LinearGradient>
                        </TouchableOpacity>
                    </Link>
                ))}
            </View>
            </View>
        </View>

        {/* Today Medicine Section - Rest of the component remains the same */}
        <View style={{paddingHorizontal: 20}}> 
            <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Today's Schedule</Text>
                <Link href="/medications/calendar" asChild>
                    <TouchableOpacity>
                        <Text style={styles.seeAllButton}>See All</Text>
                    </TouchableOpacity>
                </Link>
            </View>
            {todaysMedications.length === 0 ? (
                <View style={styles.emptyState}>
                    <Ionicons name="medical-outline" size={48} color="#ccc" />
                    <Text style={styles.emptyStateText}>No Medications Scheduled for Today</Text>
                    <Link href="/medications/add" asChild>
                        <TouchableOpacity style={styles.addMedicationButton}>
                            <Text style={styles.addMedicationButtonText}>Add Medication</Text>
                        </TouchableOpacity>
                    </Link>
                </View>
            ) : (
                todaysMedications.map((medication) => {
                    // Create an entry for each time in the medication times array
                    return medication.times.map((time, timeIndex) => {
                        const doseId = `${medication.id}-${timeIndex}`; // Create unique ID for each dose time
                        const taken = isDoseTaken(doseId); // You'll need to update your dose recording system
                        
                        return (
                        <View key={doseId} style={styles.doseCard}>
                          <View style={[styles.doseBadge, { backgroundColor: `${medication.color}15` }]}>
                            <Ionicons name="medical" size={24} />
                          </View>
                          <View style={styles.doseInfo}>
                            <View>
                              <Text style={styles.medicineName}>{medication.name}</Text>
                              <Text style={styles.dosageInfo}>
                                {medication.dosage} 
                                {medication.type ? ` · ${medication.type}` : ''}
                                {medication.times.length > 1 ? ` · Dose ${timeIndex + 1}/${medication.times.length}` : ''}
                              </Text>
                              {medication.illnessType && (
                                <View style={styles.illnessTypeContainer}>
                                  <Ionicons name="fitness-outline" size={14} color="#666" />
                                  <Text style={styles.illnessTypeText}>For: {medication.illnessType}</Text>
                                </View>
                              )}
                            </View>
                            <View style={styles.doseTime}>
                              <Ionicons name="time-outline" size={14} color="#ccc" />
                              <Text style={styles.timeText}>{time}</Text>
                            </View>
                          </View>
                          {taken ? (
                            <View style={styles.takeDoseButton}>
                              <Ionicons name="checkmark-circle" size={24} />
                              <Text style={styles.takeDoseText}>Taken</Text>
                            </View>
                          ) : (
                            <TouchableOpacity 
                              style={[styles.takeDoseButton, { backgroundColor: medication.color }]} 
                              onPress={() => handleTakeDose(medication, timeIndex)}
                            >
                              <Text style={styles.takeDoseText}>Take</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                        );
                    });
                })
            )}

            <TouchableOpacity 
              style={styles.reminderButton}
              onPress={() => router.push('/medications/reminders')}
            >
              <Ionicons name="notifications" size={20} color="white" />
              <Text style={styles.reminderButtonText}>Manage Reminders</Text>
            </TouchableOpacity>
        </View>

        {/* Display Notification Section - Rest remains the same */}
        <Modal 
          visible={showNotifications} 
          transparent={true} 
          animationType="slide" 
          onRequestClose={() => setShowNotifications(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Notification</Text>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setShowNotifications(false)}                
                >
                  <Ionicons name='close' size={24} color='#333' />
                </TouchableOpacity>
              </View>
              
              <ScrollView style={styles.notificationsList}>
              {todaysMedications.map((medication)=> (
                <View key={medication.id} style={styles.notificationItem}>
                <View style={[styles.notificationIcon, { backgroundColor: `${medication.color}15` }]}>
                  <Ionicons name='medical' size={24}/>
                </View>
                <View style={styles.notificationContent}>
                  <Text style={styles.notificationTitle}>{medication.name}</Text>
                  <Text style={styles.notificationMessage}>{medication.dosage}</Text>
                  {medication.illnessType && (
                    <Text style={styles.notificationIllness}>For: {medication.illnessType}</Text>
                  )}
                  <Text style={styles.notificationTime}>{medication.times[0]}</Text>
                </View>
              </View>
              ))
              }
              </ScrollView>
            </View>
          </View>
        </Modal>
    </ScrollView>
  );
}

// Styles remain the same as original...
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  header: {
    paddingTop: 50,
    paddingBottom: 25,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerContent: {
    alignItems: "center",
    paddingHorizontal: 20,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    marginBottom: 20,
  },
  greeting: {
    color: "white",
    opacity: 0.9,
    fontWeight: "bold"
  },
  content: {
    flex: 1,
    paddingTop: 20,
  },
  notificationButton: {
    position: "relative",
    padding: 8,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: 12,
    marginLeft: 8,
  },
  notificationBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: "#ff5252",
    borderRadius: 10,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
    minWidth: 20,
    borderWidth: 2,
    borderColor: "#146922"
  },
  notificationCount: {
    fontSize: 11,
    fontWeight: "bold",
    color: "white",
  },
  progressContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 10,
  },
  progressTextContainer: {
    position: "absolute",
    zIndex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  progressPercentage: {
    fontSize: 36,
    fontWeight: "bold",
    color: "white",
  },
  progressLabel: {
    fontSize: 14,
    fontWeight: "bold",
    color: "rgba(255, 255, 255, 0.9)",
  },
  progressDetails: {
    fontSize: 11,
    fontWeight: "bold",
    color: "white",
  },
  progressRing: {
    transform: [{rotate: "-90deg"}],
  },
  quickActionsContainer: {
    paddingHorizontal: 20,
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "1a1a1a",
    marginBottom: 5,
  },
  quickActionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 15,
  },
  actionButton: {
    width: (width - 52) / 2,
    height: 100,
    borderRadius: 16,
    overflow: "hidden"
  },
  actionGradient: {
    flex: 1,
    padding: 15,
  },
  actionContent: {
    flex: 1,
    justifyContent: "space-between",
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  actionLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "white",
    marginTop: 8,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  seeAllButton: {
    color: "#2E7D32",
    fontWeight: "600",
  },
  emptyState: {
    alignItems: "center",
    padding: 30,
    backgroundColor: "white",
    borderRadius: 16,
    marginTop: 16,
  },
  emptyStateText: {
    fontSize: 16,
    color: "#666",
    marginTop: 10,
    marginBottom: 20,
  },
  addMedicationButton: {
    backgroundColor: "#1a8e2d",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  addMedicationButtonText: {
    color: "white",
    fontWeight: "600",
  },
  doseCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  doseBadge: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  doseInfo: {
    flex: 1,
    justifyContent: "space-between",
  },
  medicineName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  dosageInfo: {
    fontSize: 14,
    color: "#666",
    marginBottom: 4,
  },
  doseTime: {
    flexDirection: "row",
    alignItems: "center",
  },
  illnessTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  illnessTypeText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 5,
  },
  notificationIllness: {
    fontSize: 13,
    color: '#666',
    marginBottom: 2,
  },
  timeText: {
    marginLeft: 5,
    color: "#666",
    fontSize: 14,
  },
  takeDoseButton: {
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 15,
    marginLeft: 10,
  },
  takeDoseText: {
    color: "white",
    fontWeight: "600",
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "white",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
  },
  closeButton: {
    padding: 5,
  },
  notificationItem: {
    flexDirection: "row",
    padding: 15,
    borderRadius: 12,
    backgroundColor: "#f5f5f5",
    marginBottom: 10,
  },
  notificationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  notificationMessage: {
    fontSize: 14,
    color: "#333",
    marginBottom: 4,
  },
  notificationTime: {
    fontSize: 12,
    color: "#999",
  },
  reminderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1a8e2d',
    borderRadius: 8,
    padding: 12,
    marginVertical: 10,
  },
  reminderButtonText: {
    color: 'white',
    fontWeight: 'bold',
    marginLeft: 8,
  },
});