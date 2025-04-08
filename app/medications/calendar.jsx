import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Platform } from 'react-native'
import React, { useCallback, useState } from 'react'
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { getMedications,getDoseHistory,recordDose, Medication,DoseHistory, } from '../../service/Storage';

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function CalendarScreen() {

    const router = useRouter();
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [medications, setMedications] = useState([]);
    const [doseHistory, setDoseHistory] = useState([]);

    const loadData = useCallback(async () => {

      try {
        const [meds, history] = await Promise.all([
          getMedications(),
          getDoseHistory()
        ]);
    
        setMedications(meds);
        setDoseHistory(history);
      } catch (error) {
        console.error("Error loading calendar data:", error);
      }
    }, []); // Remove selectedDate dependency


    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [loadData])
    );

    const getDaysInMonth = (date: Date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const days = new Date(year, month + 1, 0).getDate();
        const firstDay = new Date(year, month, 1).getDate();
        return { days, firstDay };
    };

    const { days, firstDay } = getDaysInMonth(selectedDate)

    const renderCalendar = () => {
      const calendar: JSX.Element[] = [];
      
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
        const week: JSX.Element[] = [];
        
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
            
            const isToday = new Date().toDateString() === date.toDateString();
            const isSelected = dayNumber === selectedDate.getDate();
            
            // Check for dose history events
            const hasDoses = doseHistory.some((dose) => 
              new Date(dose.timestamp).toDateString() === date.toDateString());
              
            // Check for scheduled medications on this date
            const hasScheduledMeds = medications.some(medication => {
              const startDate = new Date(medication.startDate);
              const durationDays = parseInt(medication.duration.split(" ")[0]);
              
              // Set hours to 0 for both dates to compare just the date part
              const dateWithoutTime = new Date(date);
              dateWithoutTime.setHours(0,0,0,0);
              
              const startDateWithoutTime = new Date(startDate);
              startDateWithoutTime.setHours(0,0,0,0);
              
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
      const dateStr = selectedDate.toDateString();
      const selectedDateObj = new Date(dateStr);
      const dayDoses = doseHistory.filter(
        (dose) => new Date(dose.timestamp).toDateString() === dateStr
      );
    
      // Filter medications based on whether they should be active on the selected date
      const activeMedications = medications.filter((medication) => {
        // Convert medication.startDate to a proper Date object
        // The issue was here - we need to properly parse the ISO string
        const startDate = new Date(medication.startDate);
        
        // console.log(`Comparing: Selected date ${selectedDateObj.toDateString()} vs Start date ${startDate.toDateString()}`);
        
        const durationDays = parseInt(medication.duration.split(" ")[0]);
        
        // For indefinite duration (represented as -1)
        if (durationDays === -1) {
          // Compare dates without time component
          return selectedDateObj.setHours(0,0,0,0) >= startDate.setHours(0,0,0,0);
        }
        
        // For specific duration
        const endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + durationDays - 1); // -1 because the start date is inclusive
        
        // Compare dates without time component for accurate date comparison
        const selectedTime = selectedDateObj.setHours(0,0,0,0);
        const startTime = startDate.setHours(0,0,0,0);
        const endTime = endDate.setHours(0,0,0,0);
        
        return selectedTime >= startTime && selectedTime <= endTime;
      });
    
      // No medications for this date
      if (activeMedications.length === 0) {
        return (
          <View style={styles.emptyMedicationState}>
            <Text style={styles.emptyStateText}>No medications scheduled for this date</Text>
          </View>
        );
      }
    
      return activeMedications.map((medication) => {
        const taken = dayDoses.some(
          (dose) => dose.medicationId === medication.id && dose.taken
        );
    
        return (
          <View key={medication.id} style={styles.medicationCard}>
            <View
              style={[
                styles.medicationColor,
                { backgroundColor: medication.color },
              ]}
            />
            <View style={styles.medicationInfo}>
              <Text style={styles.medicationName}>{medication.name}</Text>
              <Text style={styles.medicationDosage}>{medication.dosage}</Text>
              <Text style={styles.medicationTime}>{medication.times[0]}</Text>
            </View>
            {taken ? (
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
                  await recordDose(medication.id, true, selectedDate.toISOString());
                  loadData();
                }}
              >
                <Text style={styles.takeDoseText}>Take</Text>
              </TouchableOpacity>
            )}
          </View>
        );
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
    hasEvents : {
        position: "relative",
    },
    eventDot : {
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: "#1a8e2d",
        position: "absolute",
        bottom: "15%",
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
    medicationTimes: {
        fontSize: 14,
        color: "#666",
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
        backgroundColor: "#EaF5E9",
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
    },
    takenText: {
        fontSize: 14,
        fontWeight: "600",
        color: "white",
    },

    emptyMedicationState: {
      padding: 20,
      alignItems: 'center',
      justifyContent: 'center',
    },
    emptyStateText: {
      fontSize: 16,
      color: '#666',
      textAlign: 'center',
    },
    selected: {
      backgroundColor: '#1a8e2d',
      borderRadius: 20,
    },
    selectedText: {
      color: '#fff',
      fontWeight: 'bold',
    },

});