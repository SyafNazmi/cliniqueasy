// Updated Medications.jsx - Fixed progress calculation for "As Needed" medications

import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated, Dimensions, Modal, AppState, Alert } from 'react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Circle } from 'react-native-svg';
import { Link, useFocusEffect, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { integratedPatientMedicationService } from '../../service/PatientMedicationService';
import { doseTrackingService } from '../../service/DoseTrackingService';
import { registerForPushnotificationsAsync, resetAllMedicationReminders, scheduleMedicationReminder } from '../../service/Notification';

const {width} = Dimensions.get("window");

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// Modified QUICK_ACTIONS - Replaced Health Trend Analysis with Manage Reminders
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
        icon: "notifications-outline",
        label: "Manage \nReminders",
        route: "/medications/reminders",
        color: "#FF6F00",
        gradient: ["#FF9800", "#FF6F00"],
    },
];

interface CircularProgressProps {
    progress: number;
    totalDoses: number;
    completeDoses: number;
}

function CircularProgress({
    progress,
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

    const progressPercentage = progress * 100;

    useEffect(() => {
        Animated.timing(animationValue, {
            toValue: progress,
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
    const [loading, setLoading] = useState(true);
    const [migrationComplete, setMigrationComplete] = useState(false);

    // Helper function to check if medication is "As Needed"
    const isAsNeeded = (medication) => {
        return medication.frequencies === "As Needed" || 
               medication.frequency === "As Needed" ||
               !medication.times || 
               medication.times.length === 0;
    };

    // 🚨 FIXED: Helper function to check if dose is "As Needed" by ID pattern
    const isAsNeededDose = (doseId) => {
        return doseId.includes('as-needed');
    };

    // Get medication times with fallback for "As Needed"
    const getMedicationTimes = (medication) => {
        if (isAsNeeded(medication)) {
            return ["As Needed"]; // Return array with one item for display
        }
        return medication.times || [];
    };

    // Load medications and dose history from Appwrite
    const loadMedicationData = useCallback(async () => {
        try {
            console.log('🔄 Loading medication data from Appwrite...');
            setLoading(true);
            
            // Load from Appwrite database
            const [allMedications, todayDoses] = await Promise.all([
                integratedPatientMedicationService.getPatientMedications(),
                doseTrackingService.getTodaysDoses()
            ]);
            
            console.log("📋 Medications from Appwrite:", allMedications);
            console.log("📊 Today's doses from Appwrite:", todayDoses);
            
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
                
                // Handle duration parsing
                let durationDays;
                if (med.duration === 'On going' || med.duration === 'Ongoing') {
                    durationDays = -1;
                } else {
                    const durationMatch = med.duration.match(/(\d+)/);
                    durationDays = durationMatch ? parseInt(durationMatch[1]) : 30;
                }
                
                return (
                    durationDays === -1 || 
                    (today >= startDate && 
                     today <= new Date(startDate.getTime() + durationDays * 24 * 60 * 60 * 1000))
                );
            });
            
            console.log("📅 Today's medications:", todayMeds);
            setTodaysMedications(todayMeds);
            
            // 🚨 FIXED: Calculate total scheduled doses - exclude "As Needed" medications
            const totalScheduledDoses = todayMeds.reduce((total, med) => {
                if (isAsNeeded(med)) {
                    return total; // Don't count "As Needed" medications in scheduled doses
                }
                return total + (med.times ? med.times.length : 1);
            }, 0);
            
            // 🚨 FIXED: Count completed doses ONLY for scheduled medications (exclude "As Needed")
            const completedDosesCount = todayDoses.filter(dose => {
                // Only count taken doses that are NOT "As Needed"
                return dose.taken && !isAsNeededDose(dose.dose_id);
            }).length;
            
            const progressValue = totalScheduledDoses > 0 
                ? Math.min(completedDosesCount / totalScheduledDoses, 1)
                : 0;
            
            // Update all three states together
            setTotalDoses(totalScheduledDoses);
            setCompletedDoses(completedDosesCount);
            setProgress(progressValue);
            
            console.log("📊 Stats updated:", {
                totalDoses: totalScheduledDoses,
                completedDoses: completedDosesCount,
                progress: progressValue
            });
            
        } catch (error) {
            console.error("❌ Error loading medication data:", error);
            Alert.alert(
                'Loading Error',
                'Failed to load medications. Please check your connection and try again.',
                [
                    { text: 'Retry', onPress: () => loadMedicationData() },
                    { text: 'OK' }
                ]
            );
        } finally {
            setLoading(false);
        }
    }, []);

    // Simplified migration function
    const performMigration = useCallback(async () => {
        try {
            console.log('🔄 Checking for migration needs...');
            
            // Check if migration has already been completed
            const migrationStatus = await AsyncStorage.getItem('dose_migration_complete');
            if (migrationStatus === 'true') {
                console.log('✅ Migration already completed');
                setMigrationComplete(true);
                return;
            }

            // Perform migration
            const result = await doseTrackingService.migrateDoseHistory();
            console.log('📊 Migration result:', result);
            
            if (result.migrated > 0) {
                Alert.alert(
                    'Data Migrated',
                    `Successfully migrated ${result.migrated} dose records to the cloud.`,
                    [{ text: 'OK' }]
                );
            }
            
            // Mark migration as complete
            await AsyncStorage.setItem('dose_migration_complete', 'true');
            setMigrationComplete(true);
            
        } catch (error) {
            console.error('❌ Migration error:', error);
            // Don't block the app if migration fails
            setMigrationComplete(true);
        }
    }, []);

    const setupNotificationsOnce = async () => {
        try {
            console.log("🔔 Setting up notifications...");
    
            let token;
            try {
                token = await registerForPushnotificationsAsync();
            } catch (error) {
                console.log("Error getting push token:", error);
            }
    
            // Get medications from Appwrite
            const medications = await integratedPatientMedicationService.getPatientMedications();
            console.log(`Setting up reminders for ${medications.length} medications`);
    
            // Filter out "As Needed" medications for notification setup
            const scheduledMedications = medications.filter(med => !isAsNeeded(med));
            console.log(`Setting up notifications for ${scheduledMedications.length} scheduled medications (excluding As Needed)`);
    
            // Use resetAllMedicationReminders to handle reminder setup
            await resetAllMedicationReminders(scheduledMedications);
    
            console.log("✅ Notification setup complete");
        } catch (error) {
            console.error("❌ Error setting up notifications:", error);
        }
    };

    // Initial load on component mount
    useEffect(() => {
        const initializeApp = async () => {
            await performMigration();
            await loadMedicationData();
            await setupNotificationsOnce();
        };
        
        initializeApp();
        
        const subscription = AppState.addEventListener('change', (nextAppState) => {
            if (nextAppState === 'active') {
                loadMedicationData();
            }
        });
        
        return () => {
            subscription.remove();
        };
    }, [loadMedicationData, performMigration]);

    // Update on focus
    useFocusEffect(
        useCallback(() => {
            if (migrationComplete) {
                loadMedicationData();
            }
            return () => {};
        }, [loadMedicationData, migrationComplete])
    );

    // Handle "As Needed" dose tracking
    const handleTakeDose = async (medication, timeIndex = 0) => {
        try {
            // Use special dose ID format for "As Needed" medications
            const doseId = isAsNeeded(medication) 
                ? `${medication.id}-as-needed-${Date.now()}` // Unique ID for each "as needed" dose
                : `${medication.id}-${timeIndex}`;
            
            // For "As Needed" medications, always allow taking (don't check if already taken)
            if (!isAsNeeded(medication)) {
                // Check if dose is already taken using Appwrite service for scheduled medications
                const alreadyTaken = await doseTrackingService.isDoseTaken(doseId);
                if (alreadyTaken) {
                    console.log('Dose already taken:', doseId);
                    return;
                }
            }
            
            // Record dose using Appwrite service
            await doseTrackingService.recordDose(
                medication.id, 
                doseId, 
                true, 
                new Date().toISOString()
            );
            
            console.log('✅ Dose recorded successfully:', doseId);
            
            // Show success feedback
            Alert.alert(
                "Dose Recorded", 
                `${medication.name} dose has been recorded successfully.`,
                [{ text: 'OK' }]
            );
            
            // Reload all data to reflect changes
            await loadMedicationData();
            
        } catch (error) {
            console.error("❌ Error recording dose:", error);
            Alert.alert(
                "Error", 
                "Failed to record dose. Please check your connection and try again.",
                [
                    { text: 'Retry', onPress: () => handleTakeDose(medication, timeIndex) },
                    { text: 'OK' }
                ]
            );
        }
    };

    // 🚨 FIXED: Check dose status - show "As Needed" medications as taken if taken today
    const isDoseTaken = useCallback((doseId, medication) => {
        if (isAsNeeded(medication)) {
            // For "As Needed" medications, check if any dose was taken today
            return doseHistory.some(dose => 
                dose.medication_id === medication.id &&
                dose.taken &&
                isAsNeededDose(dose.dose_id) &&
                isSameDay(new Date(dose.timestamp), new Date())
            );
        }
        
        return doseHistory.some(dose => 
            dose.dose_id === doseId && 
            dose.taken &&
            isSameDay(new Date(dose.timestamp), new Date())
        );
    }, [doseHistory]);

    // 🚨 NEW: Get count of "As Needed" doses taken today
    const getAsNeededDosesCount = useCallback((medication) => {
        if (!isAsNeeded(medication)) return 0;
        
        return doseHistory.filter(dose => 
            dose.medication_id === medication.id &&
            dose.taken &&
            isAsNeededDose(dose.dose_id) &&
            isSameDay(new Date(dose.timestamp), new Date())
        ).length;
    }, [doseHistory]);

    function isSameDay(date1, date2) {
        return (
            date1.getFullYear() === date2.getFullYear() &&
            date1.getMonth() === date2.getMonth() &&
            date1.getDate() === date2.getDate()
        );
    }

    // Count of medications to show in the notification badge
    const medicationCount = todaysMedications.length;

    return (
        <ScrollView style={styles.container}>
            <LinearGradient colors={["#0AD476", "#146922"]} style={styles.header}>
                <View style={styles.headerContent}>
                    <View style={styles.headerTop}>
                        <View style={{flex: 1}}>
                            <Text style={styles.greeting}>Daily Progress</Text>
                            {!migrationComplete && (
                                <Text style={styles.migrationText}>Syncing data...</Text>
                            )}
                        </View>
                        <TouchableOpacity 
                            style={styles.notificationButton}
                            onPress={() => setShowNotifications(true)} 
                        >
                            <Ionicons name="notifications-outline" size={24} color="white" />
                            {medicationCount > 0 && (
                                <View style={styles.notificationBadge}>
                                    <Text style={styles.notificationCount}>{medicationCount}</Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    </View>
                    <CircularProgress 
                        progress={progress}
                        totalDoses={totalDoses}
                        completeDoses={completedDoses}
                    />
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

            {/* Today Medicine Section */}
            <View style={{paddingHorizontal: 20}}> 
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Today's Schedule</Text>
                    <Link href="/medications/calendar" asChild>
                        <TouchableOpacity>
                            <Text style={styles.seeAllButton}>See All</Text>
                        </TouchableOpacity>
                    </Link>
                </View>

                {/* Loading and empty states */}
                {loading ? (
                    <View style={styles.loadingState}>
                        <Ionicons name="refresh-outline" size={48} color="#ccc" />
                        <Text style={styles.loadingText}>Loading your medications...</Text>
                    </View>
                ) : todaysMedications.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Ionicons name="medical-outline" size={48} color="#ccc" />
                        <Text style={styles.emptyStateText}>No Medications Scheduled for Today</Text>
                        <Text style={styles.emptyStateSubText}>
                            Add medications manually or scan a prescription QR code
                        </Text>
                        <Link href="/medications/add" asChild>
                            <TouchableOpacity style={styles.addMedicationButton}>
                                <Text style={styles.addMedicationButtonText}>Add Medication</Text>
                            </TouchableOpacity>
                        </Link>
                    </View>
                ) : (
                    // Handle both scheduled and "As Needed" medications
                    todaysMedications.map((medication) => {
                        const medicationTimes = getMedicationTimes(medication);
                        
                        return medicationTimes.map((time, timeIndex) => {
                            const doseId = isAsNeeded(medication) 
                                ? `${medication.id}-as-needed` // Use consistent ID for display
                                : `${medication.id}-${timeIndex}`;
                            const taken = isDoseTaken(doseId, medication);
                            
                            return (
                                <View key={`${medication.id}-${timeIndex}`} style={styles.doseCard}>
                                    <View style={[styles.doseBadge, { backgroundColor: `${medication.color}15` }]}>
                                        <Ionicons name="medical" size={24} />
                                    </View>
                                    <View style={styles.doseInfo}>
                                        <View>
                                            <Text style={styles.medicineName}>{medication.name}</Text>
                                            <Text style={styles.dosageInfo}>
                                                {medication.dosage} 
                                                {medication.type ? ` · ${medication.type}` : ''}
                                                {/* Show different info for "As Needed" vs scheduled */}
                                                {isAsNeeded(medication) 
                                                    ? ' · As Needed' 
                                                    : medicationTimes.length > 1 ? ` · Dose ${timeIndex + 1}/${medicationTimes.length}` : ''
                                                }
                                            </Text>
                                            {medication.illnessType && (
                                                <View style={styles.illnessTypeContainer}>
                                                    <Ionicons name="fitness-outline" size={14} color="#666" />
                                                    <Text style={styles.illnessTypeText}>For: {medication.illnessType}</Text>
                                                </View>
                                            )}
                                            {/* Show notes for "As Needed" medications */}
                                            {isAsNeeded(medication) && medication.notes && (
                                                <View style={styles.notesContainer}>
                                                    <Ionicons name="information-circle-outline" size={14} color="#666" />
                                                    <Text style={styles.notesText}>{medication.notes}</Text>
                                                </View>
                                            )}
                                        </View>
                                        <View style={styles.doseTime}>
                                            <Ionicons name="time-outline" size={14} color="#ccc" />
                                            <Text style={styles.timeText}>{time}</Text>
                                        </View>
                                    </View>
                                    {taken ? (
                                        <View style={[styles.takeDoseButton, styles.takenButton]}>
                                            <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
                                            <Text style={[styles.takeDoseText, styles.takenText]}>Taken</Text>
                                        </View>
                                    ) : (
                                        <TouchableOpacity 
                                            style={[styles.takeDoseButton, { backgroundColor: medication.color }]} 
                                            onPress={() => handleTakeDose(medication, timeIndex)}
                                        >
                                            <Text style={styles.takeDoseText}>
                                                {isAsNeeded(medication) ? 'Take Now' : 'Take'}
                                            </Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            );
                        });
                    })
                )}

                {/* Additional Action Buttons */}
                <View style={styles.actionButtonsContainer}>                    
                    <TouchableOpacity 
                        style={styles.historyButton}
                        onPress={() => router.push('/medications/history')}
                    >
                        <Ionicons name="analytics" size={20} color="white" />
                        <Text style={styles.historyButtonText}>View History</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Notification Modal */}
            <Modal 
                visible={showNotifications} 
                transparent={true} 
                animationType="slide" 
                onRequestClose={() => setShowNotifications(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Today's Medications</Text>
                            <TouchableOpacity
                                style={styles.closeButton}
                                onPress={() => setShowNotifications(false)}                
                            >
                                <Ionicons name='close' size={24} color='#333' />
                            </TouchableOpacity>
                        </View>
                        
                        <ScrollView style={styles.notificationsList}>
                            {todaysMedications.map((medication) => (
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
                                        {/* Show appropriate time for "As Needed" */}
                                        <Text style={styles.notificationTime}>
                                            {isAsNeeded(medication) ? 'As Needed' : medication.times[0]}
                                        </Text>
                                    </View>
                                </View>
                            ))}
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </ScrollView>
    );
}

// Styles remain the same as your original code
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
        color: "#1a1a1a",
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
    loadingState: {
        alignItems: "center",
        padding: 30,
        backgroundColor: "white",
        borderRadius: 16,
        marginTop: 16,
    },
    loadingText: {
        fontSize: 16,
        color: "#666",
        marginTop: 10,
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
        marginBottom: 5,
    },
    emptyStateSubText: {
        fontSize: 14,
        color: "#999",
        textAlign: "center",
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
    notesContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 2,
    },
    notesText: {
        fontSize: 12,
        color: '#666',
        marginLeft: 5,
        fontStyle: 'italic',
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
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
    },
    takeDoseText: {
        color: "white",
        fontWeight: "600",
        fontSize: 14,
    },
    takenButton: {
        backgroundColor: "#f0f0f0",
        borderWidth: 1,
        borderColor: "#4CAF50",
    },
    takenText: {
        color: "#4CAF50",
    },
    takenAsNeededButton: {
        backgroundColor: "#E8F5E8",
        borderWidth: 1,
        borderColor: "#4CAF50",
    },
    takenAsNeededText: {
        color: "#4CAF50",
        fontSize: 13,
    },
    actionButtonsContainer: {
        marginTop: 20,
        marginBottom: 30,
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
    historyButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#1976D2',
        borderRadius: 8,
        padding: 12,
        marginVertical: 5,
    },
    historyButtonText: {
        color: 'white',
        fontWeight: 'bold',
        marginLeft: 8,
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
    notificationsList: {
        maxHeight: 400,
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
    notificationIllness: {
        fontSize: 13,
        color: '#666',
        marginBottom: 2,
    },
    notificationTime: {
        fontSize: 12,
        color: "#999",
    },
});