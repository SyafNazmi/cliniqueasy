// app/medications/calendar.jsx - Fixed version

import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Platform, Alert } from 'react-native'
import React, { useCallback, useState } from 'react'
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';

// 🚨 UPDATED: Import from Appwrite services instead of local storage
import { integratedPatientMedicationService } from '../../service/PatientMedicationService';
import { doseTrackingService } from '../../service/DoseTrackingService';

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function CalendarScreen() {
    const router = useRouter();
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [medications, setMedications] = useState([]);
    const [doseHistory, setDoseHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [patients, setPatients] = useState([]);
    const [selectedPatient, setSelectedPatient] = useState(null);
    const [showPatientDropdown, setShowPatientDropdown] = useState(false);

    // 🚨 FIXED: Add the missing helper function for "As Needed" medications
    const isAsNeeded = (medication) => {
        return medication.frequencies === "As Needed" || 
               medication.frequency === "As Needed" ||
               !medication.times || 
               medication.times.length === 0;
    };

    // 🚨 FIXED: Get medication times with fallback for "As Needed"
    const getMedicationTimes = (medication) => {
        if (isAsNeeded(medication)) {
            return ["As Needed"]; // Return array with one item for display
        }
        return medication.times || [];
    };

    const loadPatients = useCallback(async () => {
      try {
            console.log('👥 Loading patients for calendar...');
            const patientList = await integratedPatientMedicationService.getFormattedPatientList();
            
            console.log('📋 Available patients:', patientList);
            setPatients(patientList || []);
            
            // Auto-select owner if no patient selected
            if (!selectedPatient && patientList.length > 0) {
                const owner = patientList.find(p => p.isOwner) || patientList[0];
                setSelectedPatient(owner);
            }
        } catch (error) {
            console.error('❌ Error loading patients:', error);
            setPatients([]);
        }
    }, [selectedPatient]);

    // 🚨 UPDATED: Load both medications and dose history from Appwrite
    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            console.log('🔄 Loading calendar data for patient:', selectedPatient?.name);
            
            const [meds, history] = await Promise.all([
                integratedPatientMedicationService.getPatientMedications({ 
                    patientId: selectedPatient?.id || 'all' 
                }),
                doseTrackingService.getAllDoseHistory()
            ]);

            // Filter medications by selected patient
            const filteredMeds = selectedPatient 
                ? meds.filter(med => 
                    med.patientId === selectedPatient.id || 
                    (selectedPatient.isOwner && !med.patientId)
                  )
                : meds;

            console.log(`📋 Calendar medications for ${selectedPatient?.name}:`, filteredMeds);
            console.log("📊 Calendar dose history:", history);
            
            setMedications(filteredMeds || []);
            setDoseHistory(history || []);
        } catch (error) {
            console.error("❌ Error loading calendar data:", error);
            Alert.alert(
                'Loading Error',
                'Failed to load calendar data. Please check your connection and try again.',
                [
                    { text: 'Retry', onPress: () => loadData() },
                    { text: 'OK' }
                ]
            );
            setMedications([]);
            setDoseHistory([]);
        } finally {
            setLoading(false);
        }
    }, [selectedPatient]);

    const PatientDropdown = () => (
      <View style={styles.patientSelectorContainer}>
          <TouchableOpacity
              style={styles.patientDropdownButton}
              onPress={() => setShowPatientDropdown(!showPatientDropdown)}
          >
              <View style={styles.patientDropdownContent}>
                  <View style={[
                      styles.patientAvatar,
                      selectedPatient?.isOwner ? styles.ownerAvatar : styles.familyAvatar
                  ]}>
                      <Ionicons 
                          name={selectedPatient?.isOwner ? "person" : "people"} 
                          size={16} 
                          color="white" 
                      />
                  </View>
                  <View style={styles.patientInfo}>
                      <Text style={styles.patientName}>
                          {selectedPatient?.name || 'Select Patient'}
                      </Text>
                      <Text style={styles.patientType}>
                          {selectedPatient?.isOwner 
                              ? 'Account Owner' 
                              : selectedPatient?.relationship || 'Family Member'
                          }
                      </Text>
                  </View>
              </View>
              <Ionicons 
                  name={showPatientDropdown ? 'chevron-up' : 'chevron-down'} 
                  size={20} 
                  color="#666" 
              />
          </TouchableOpacity>

          {showPatientDropdown && (
              <View style={styles.patientDropdownMenu}>
                  {patients.map((patient) => (
                      <TouchableOpacity
                          key={patient.id}
                          style={[
                              styles.patientDropdownItem,
                              selectedPatient?.id === patient.id && styles.selectedPatientItem
                          ]}
                          onPress={() => {
                              setSelectedPatient(patient);
                              setShowPatientDropdown(false);
                          }}
                      >
                          <View style={[
                              styles.patientAvatar,
                              patient.isOwner ? styles.ownerAvatar : styles.familyAvatar
                          ]}>
                              <Ionicons 
                                  name={patient.isOwner ? "person" : "people"} 
                                  size={16} 
                                  color="white" 
                              />
                          </View>
                          <View style={styles.patientInfo}>
                              <Text style={[
                                  styles.patientName,
                                  selectedPatient?.id === patient.id && styles.selectedPatientText
                              ]}>
                                  {patient.name}
                              </Text>
                              <Text style={[
                                  styles.patientType,
                                  selectedPatient?.id === patient.id && styles.selectedPatientText
                              ]}>
                                  {patient.isOwner 
                                      ? 'Account Owner' 
                                      : patient.relationship || 'Family Member'
                                  }
                              </Text>
                          </View>
                          {selectedPatient?.id === patient.id && (
                              <Ionicons name="checkmark-circle" size={20} color="#1a8e2d" />
                          )}
                      </TouchableOpacity>
                  ))}
              </View>
          )}
      </View>
  );

  useFocusEffect(
      useCallback(() => {
          loadPatients().then(() => {
              loadData();
          });
      }, [loadPatients, loadData])
  );

    const getDaysInMonth = (date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const days = new Date(year, month + 1, 0).getDate();
        const firstDay = new Date(year, month, 1).getDay();
        return { days, firstDay };
    };

    const { days, firstDay } = getDaysInMonth(selectedDate);

    // 🚨 UPDATED: Helper function to compare dates (handles Appwrite date format)
    const isSameDay = (date1, date2) => {
        const d1 = new Date(date1);
        const d2 = new Date(date2);
        return (
            d1.getFullYear() === d2.getFullYear() &&
            d1.getMonth() === d2.getMonth() &&
            d1.getDate() === d2.getDate()
        );
    };

    const renderCalendar = () => {
        const calendar = [];
        
        // Get the first day of the month (0-6 for Sunday-Saturday)
        const firstDayOfMonth = new Date(
            selectedDate.getFullYear(),
            selectedDate.getMonth(),
            1
        ).getDay();
        
        // Calculate number of days in the month
        const daysInMonth = new Date(
            selectedDate.getFullYear(),
            selectedDate.getMonth() + 1,
            0
        ).getDate();
        
        // Generate each week row
        for (let weekIndex = 0; weekIndex < 6; weekIndex++) {
            const week = [];
            
            for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
                const dayNumber = weekIndex * 7 + dayIndex + 1 - firstDayOfMonth;
                
                if (dayNumber < 1 || dayNumber > daysInMonth) {
                    // Empty cell for days outside current month
                    week.push(<View style={styles.calendarDay} key={`empty-${weekIndex}-${dayIndex}`} />);
                } else {
                    const date = new Date(
                        selectedDate.getFullYear(),
                        selectedDate.getMonth(),
                        dayNumber
                    );
                    
                    const isToday = isSameDay(new Date(), date);
                    const isSelected = dayNumber === selectedDate.getDate();
                    
                    // 🚨 UPDATED: Check for dose history events using Appwrite data
                    const hasDoses = doseHistory.some((dose) => 
                        isSameDay(dose.timestamp, date) && dose.taken
                    );
                        
                    // 🚨 FIXED: Check for scheduled medications on this date with "As Needed" handling
                    const hasScheduledMeds = medications.some(medication => {
                        // Always show "As Needed" medications
                        if (isAsNeeded(medication)) {
                            return true;
                        }
                        
                        const startDate = new Date(medication.startDate);
                        
                        // Set hours to 0 for both dates to compare just the date part
                        const dateWithoutTime = new Date(date);
                        dateWithoutTime.setHours(0,0,0,0);
                        
                        const startDateWithoutTime = new Date(startDate);
                        startDateWithoutTime.setHours(0,0,0,0);
                        
                        // Handle duration parsing
                        let durationDays;
                        if (medication.duration === 'On going' || medication.duration === 'Ongoing') {
                            durationDays = -1; // Indefinite
                        } else {
                            const durationMatch = medication.duration.match(/(\d+)/);
                            durationDays = durationMatch ? parseInt(durationMatch[1]) : 30;
                        }
                        
                        // For indefinite duration
                        if (durationDays === -1) {
                            return dateWithoutTime >= startDateWithoutTime;
                        }
                        
                        // For specific duration
                        const endDate = new Date(startDate);
                        endDate.setDate(startDate.getDate() + durationDays - 1);
                        endDate.setHours(0,0,0,0);
                        
                        return dateWithoutTime >= startDateWithoutTime && dateWithoutTime <= endDate;
                    });
                    
                    week.push(
                        <TouchableOpacity 
                            key={`day-${dayNumber}`}
                            style={[
                                styles.calendarDay,
                                isToday && styles.today,
                                isSelected && styles.selected,
                                (hasDoses || hasScheduledMeds) && styles.hasEvents,
                            ]}
                            onPress={() => setSelectedDate(new Date(
                                selectedDate.getFullYear(),
                                selectedDate.getMonth(),
                                dayNumber
                            ))}
                        >
                            <Text style={[
                                styles.dayText, 
                                isToday && styles.todayText,
                                isSelected && styles.selectedText
                            ]}>
                                {dayNumber}
                            </Text>
                            {hasScheduledMeds && <View style={[styles.eventDot, {backgroundColor: '#4CAF50'}]} />}
                            {hasDoses && <View style={[styles.eventDot, {backgroundColor: '#2196F3', marginTop: 2}]} />}
                        </TouchableOpacity>
                    );
                }
            }
            
            // Only add weeks that have at least one valid day
            if (week.some(element => element.props.children)) {
                calendar.push(
                    <View key={`week-${weekIndex}`} style={styles.calendarWeek}>{week}</View>
                );
            }
        }
        
        return calendar;
    };

    const renderMedicationsForDate = () => {
        const selectedDateObj = new Date(selectedDate);
        
        // 🚨 UPDATED: Filter dose history using Appwrite data structure
        const dayDoses = doseHistory.filter((dose) => 
            isSameDay(dose.timestamp, selectedDate)
        );

        // 🚨 FIXED: Filter medications with "As Needed" handling
        const activeMedications = medications.filter((medication) => {
            // Always include "As Needed" medications
            if (isAsNeeded(medication)) {
                console.log(`✅ Including "${medication.name}" - As Needed medication`);
                return true;
            }
            
            const startDate = new Date(medication.startDate);
            
            console.log(`Comparing: Selected date ${selectedDateObj.toDateString()} vs Start date ${startDate.toDateString()}`);
            
            // Handle duration parsing
            let durationDays;
            if (medication.duration === 'On going' || medication.duration === 'Ongoing') {
                durationDays = -1; // Indefinite
            } else {
                const durationMatch = medication.duration.match(/(\d+)/);
                durationDays = durationMatch ? parseInt(durationMatch[1]) : 30;
            }
            
            // For indefinite duration
            if (durationDays === -1) {
                // Compare dates without time component
                return selectedDateObj.setHours(0,0,0,0) >= startDate.setHours(0,0,0,0);
            }
            
            // For specific duration
            const endDate = new Date(startDate);
            endDate.setDate(startDate.getDate() + durationDays - 1);
            
            // Compare dates without time component for accurate date comparison
            const selectedTime = selectedDateObj.setHours(0,0,0,0);
            const startTime = startDate.setHours(0,0,0,0);
            const endTime = endDate.setHours(0,0,0,0);
            
            return selectedTime >= startTime && selectedTime <= endTime;
        });

        // Loading state
        if (loading) {
            return (
                <View style={styles.loadingState}>
                    <Ionicons name="refresh-outline" size={32} color="#ccc" />
                    <Text style={styles.loadingText}>Loading medications...</Text>
                </View>
            );
        }

        // No medications for this date
        if (activeMedications.length === 0) {
            return (
                <View style={styles.emptyMedicationState}>
                    <Ionicons name="medical-outline" size={32} color="#ccc" />
                    <Text style={styles.emptyStateText}>No medications scheduled for this date</Text>
                    <Text style={styles.emptyStateSubText}>
                        Add medications from the main screen
                    </Text>
                </View>
            );
        }

        return activeMedications.map((medication) => {
            // 🚨 FIXED: Use getMedicationTimes to handle "As Needed" medications
            const medicationTimes = getMedicationTimes(medication);
            
            return medicationTimes.map((time, timeIndex) => {
                // 🚨 FIXED: Handle "As Needed" dose IDs
                const doseId = isAsNeeded(medication) 
                    ? `${medication.id}-as-needed` // Use consistent ID for display
                    : `${medication.id}-${timeIndex}`;
                
                // 🚨 FIXED: Check if dose is taken using Appwrite data structure
                const isTaken = dayDoses.some((dose) => {
                    // For "As Needed", check if any dose was taken for this medication on this day
                    if (isAsNeeded(medication)) {
                        return dose.medication_id === medication.id && dose.taken;
                    }
                    // For scheduled medications, check specific dose ID
                    return dose.dose_id === doseId && dose.taken;
                });
                
                return (
                    <View key={`${medication.id}-${timeIndex}`} style={styles.medicationCard}>
                        <View
                            style={[
                                styles.medicationColor,
                                { backgroundColor: medication.color },
                            ]}
                        />
                        <View style={styles.medicationInfo}>
                            <Text style={styles.medicationName}>{medication.name}</Text>
                            <Text style={styles.medicationDosage}>
                                {medication.dosage}
                                {medication.type ? ` · ${medication.type}` : ''}
                                {/* 🚨 FIXED: Show different info for "As Needed" vs scheduled */}
                                {isAsNeeded(medication) 
                                    ? ' · As Needed' 
                                    : medicationTimes.length > 1 ? ` · Dose ${timeIndex + 1}/${medicationTimes.length}` : ''
                                }
                            </Text>
                            {medication.illnessType && (
                                <View style={styles.illnessTypeContainer}>
                                    <Ionicons name="fitness-outline" size={12} color="#666" />
                                    <Text style={styles.illnessTypeText}>For: {medication.illnessType}</Text>
                                </View>
                            )}
                            <Text style={styles.medicationTime}>
                                <Ionicons name="time-outline" size={12} color="#666" />
                                {' '}{time}
                            </Text>
                        </View>
                        {isTaken ? (
                            <View style={styles.takenBadge}>
                                <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                                <Text style={styles.takenText}>Taken</Text>
                            </View>
                        ) : (
                            <TouchableOpacity
                                style={[
                                    styles.takeDoseButton,
                                    { backgroundColor: medication.color },
                                ]}
                                onPress={async () => {
                                    try {
                                        // 🚨 FIXED: Use special dose ID format for "As Needed" medications
                                        const recordDoseId = isAsNeeded(medication) 
                                            ? `${medication.id}-as-needed-${Date.now()}` // Unique ID for each "as needed" dose
                                            : doseId;
                                        
                                        await doseTrackingService.recordDose(
                                            medication.id,
                                            recordDoseId,
                                            true,
                                            selectedDate.toISOString()
                                        );
                                        
                                        console.log('✅ Dose recorded successfully via calendar:', recordDoseId);
                                        
                                        // Show success feedback
                                        Alert.alert(
                                            "Dose Recorded", 
                                            `${medication.name} dose has been recorded successfully.`,
                                            [{ text: 'OK' }]
                                        );
                                        
                                        // Reload data to reflect changes
                                        await loadData();
                                        
                                    } catch (error) {
                                        console.error("❌ Error recording dose via calendar:", error);
                                        Alert.alert(
                                            "Error", 
                                            "Failed to record dose. Please check your connection and try again.",
                                            [
                                                { text: 'Retry', onPress: async () => {
                                                    try {
                                                        const recordDoseId = isAsNeeded(medication) 
                                                            ? `${medication.id}-as-needed-${Date.now()}`
                                                            : doseId;
                                                        
                                                        await doseTrackingService.recordDose(
                                                            medication.id,
                                                            recordDoseId,
                                                            true,
                                                            selectedDate.toISOString()
                                                        );
                                                        await loadData();
                                                    } catch (retryError) {
                                                        console.error('Retry failed:', retryError);
                                                    }
                                                }},
                                                { text: 'OK' }
                                            ]
                                        );
                                    }
                                }}
                            >
                                <Text style={styles.takeDoseText}>
                                    {isAsNeeded(medication) ? 'Take Now' : 'Take'}
                                </Text>
                            </TouchableOpacity>
                        )}
                    </View>
                );
            });
        });
    };

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={["#1a8e2d", "#146922"]}
                style={styles.headerGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
            />

            <View style={styles.content}>
                <View style={styles.header}>
                    <TouchableOpacity
                        onPress={() => router.back()}
                        style={styles.backButton}
                    >
                        <Ionicons name="chevron-back" size={28} color="#1a8e2d" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Calendar</Text>
                </View>

                <PatientDropdown />

                <View style={styles.calendarContainer}>
                    <View style={styles.monthHeader}>
                        <TouchableOpacity
                            onPress={() =>
                                setSelectedDate(
                                    new Date(
                                        selectedDate.getFullYear(),
                                        selectedDate.getMonth() - 1,
                                        1
                                    )
                                )
                            }
                        >
                            <Ionicons name="chevron-back" size={24} color="#333" />
                        </TouchableOpacity>
                        <Text style={styles.monthText}>
                            {selectedDate.toLocaleString("default", {
                                month: "long",
                                year: "numeric",
                            })}
                        </Text>
                        <TouchableOpacity
                            onPress={() =>
                                setSelectedDate(
                                    new Date(
                                        selectedDate.getFullYear(),
                                        selectedDate.getMonth() + 1,
                                        1
                                    )
                                )
                            }
                        >
                            <Ionicons name="chevron-forward" size={24} color="#333" />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.weekdayHeader}>
                        {WEEKDAYS.map((day) => (
                            <Text key={day} style={styles.weekdayText}>
                                {day}
                            </Text>
                        ))}
                    </View>

                    {renderCalendar()}
                </View>

                <View style={styles.scheduleContainer}>
                    <Text style={styles.scheduleTitle}>
                        {selectedDate.toLocaleDateString("default", {
                            weekday: "long",
                            month: "long",
                            day: "numeric",
                        })}
                    </Text>
                    <ScrollView showsVerticalScrollIndicator={false}>
                        {renderMedicationsForDate()}
                    </ScrollView>
                </View>
            </View>
        </View>
    );
}

// Styles remain the same as your original code
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#f8f9fa",
    },
    headerGradient: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height: Platform.OS === "ios" ? 140 : 120,
    },
    content: {
        flex: 1,
        paddingTop: Platform.OS === "ios" ? 50 : 30,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingBottom: 20,
        zIndex: 1,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "white",
        justifyContent: "center",
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: "700",
        color: "white",
        marginLeft: 15,
    },
    calendarContainer: {
        backgroundColor: "white",
        borderRadius: 16,
        margin: 20,
        padding: 15,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    monthHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 15,
    },
    monthText: {
        fontSize: 18,
        fontWeight: "600",
        color: "#333",
    },
    weekdayHeader: {
        flexDirection: "row",
        marginBottom: 10,
    },
    weekdayText: {
        flex: 1,
        textAlign: "center",
        color: "#666",
        fontWeight: "500",
    },
    calendarWeek: {
        flexDirection: "row",
        marginBottom: 5,
    },
    calendarDay: {
        flex: 1,
        aspectRatio: 1,
        justifyContent: "center",
        alignItems: "center",
        borderRadius: 8,
    },
    dayText: {
        fontSize: 16,
        color: "#333",
    },
    today: {
        backgroundColor: "#1a8e2d15",
    },
    todayText: {
        color: "#1a8e2d",
        fontWeight: "600",
    },
    hasEvents: {
        position: "relative",
    },
    eventDot: {
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: "#1a8e2d",
        position: "absolute",
        bottom: "15%",
    },
    selected: {
        backgroundColor: '#1a8e2d',
        borderRadius: 20,
    },
    selectedText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    scheduleContainer: {
        flex: 1,
        backgroundColor: "white",
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 3,
    },
    scheduleTitle: {
        fontSize: 20,
        fontWeight: "700",
        color: "#333",
        marginBottom: 15,
    },
    loadingState: {
        padding: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    loadingText: {
        fontSize: 14,
        color: '#666',
        marginTop: 8,
    },
    emptyMedicationState: {
        padding: 30,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyStateText: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        marginTop: 10,
        marginBottom: 5,
    },
    emptyStateSubText: {
        fontSize: 14,
        color: '#999',
        textAlign: 'center',
    },
    medicationCard: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "white",
        borderRadius: 16,
        padding: 15,
        marginBottom: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 3,
    },
    medicationColor: {
        width: 12,
        height: 40,
        borderRadius: 6,
        marginRight: 15,
    },
    medicationInfo: {
        flex: 1,
    },
    medicationName: {
        fontSize: 16,
        fontWeight: "600",
        color: "#333",
        marginBottom: 4,
    },
    medicationDosage: {
        fontSize: 14,
        color: "#666",
        marginBottom: 2,
    },
    illnessTypeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 2,
        marginBottom: 4,
    },
    illnessTypeText: {
        fontSize: 12,
        color: '#666',
        marginLeft: 4,
    },
    medicationTime: {
        fontSize: 12,
        color: "#666",
        flexDirection: 'row',
        alignItems: 'center',
    },
    takeDoseButton: {
        paddingVertical: 8,
        paddingHorizontal: 15,
        borderRadius: 12,
    },
    takeDoseText: {
        fontSize: 14,
        fontWeight: "600",
        color: "white",
    },
    takenBadge: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#E8F5E8",
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
    },
    takenText: {
        fontSize: 12,
        fontWeight: "600",
        color: "#4CAF50",
        marginLeft: 4,
    },

    patientSelectorContainer: {
    margin: 20,
    marginBottom: 10,
    zIndex: 1000,
    },
    patientDropdownButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    patientDropdownContent: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    patientAvatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    ownerAvatar: {
        backgroundColor: '#1a8e2d',
    },
    familyAvatar: {
        backgroundColor: '#2196F3',
    },
    patientInfo: {
        flex: 1,
    },
    patientName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 2,
    },
    patientType: {
        fontSize: 12,
        color: '#666',
    },
    patientDropdownMenu: {
        backgroundColor: 'white',
        borderRadius: 12,
        marginTop: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
    },
    patientDropdownItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#f5f5f5',
    },
    selectedPatientItem: {
        backgroundColor: '#f8fdf9',
    },
    selectedPatientText: {
        color: '#1a8e2d',
    },
});