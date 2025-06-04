// app/appointment/reschedule.jsx
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  ScrollView, 
  SafeAreaView,
  ActivityIndicator,
  Alert
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { DatabaseService } from '../../configs/AppwriteConfig';
import { COLLECTIONS } from '../../constants';
import { appointmentManager, APPOINTMENT_STATUS } from '../../service/appointmentUtils';
import PageHeader from '../../components/PageHeader';

const RescheduleScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState(null);
  const [bookedSlots, setBookedSlots] = useState({});
  const [appointment, setAppointment] = useState(null);
  const [realtimeSubscription, setRealtimeSubscription] = useState(null);
  const [loadingSlots, setLoadingSlots] = useState(false);

  const appointmentId = params.appointmentId;
  const doctorId = params.doctorId;
  const timeSlots = ['8:30 AM', '9:00 AM', '9:30 AM', '10:00 AM', '2:00 PM', '3:00 PM', '4:00 PM'];

  // Generate next 14 days (excluding today)
  const dates = Array.from({ length: 14 }).map((_, i) => {
    const date = new Date();
    date.setDate(date.getDate() + i + 1);
    return date;
  });

  useEffect(() => {
    loadAppointmentDetails();
    
    // Subscribe to real-time updates using enhanced manager
    const subscription = appointmentManager.subscribeToAppointments((update) => {
      console.log('Reschedule screen received update:', update);
      
      if (update.type === 'updated' || update.type === 'created' || update.type === 'deleted') {
        // Refresh booked slots if the update affects the selected doctor and date
        if (appointment && selectedDate && 
            update.appointment.doctor_id === appointment.doctor_id) {
          refreshBookedSlots();
        }
      }
    });
    
    setRealtimeSubscription(subscription);
  
    return () => {
      if (subscription) {
        appointmentManager.unsubscribe(subscription);
      }
    };
  }, []);

  useEffect(() => {
    if (appointment && selectedDate) {
      refreshBookedSlots();
    }
  }, [appointment, selectedDate]);

  const loadAppointmentDetails = async () => {
    try {
      const appointmentDoc = await DatabaseService.getDocument(
        COLLECTIONS.APPOINTMENTS,
        appointmentId
      );
      setAppointment(appointmentDoc);
    } catch (error) {
      console.error('Error loading appointment:', error);
      Alert.alert('Error', 'Failed to load appointment details');
      router.back();
    }
  };

  const refreshBookedSlots = async () => {
    if (!appointment || !selectedDate) return;
    
    try {
      setLoadingSlots(true);
      
      // Use the enhanced method that excludes current appointment
      const slots = await appointmentManager.getBookedSlots(
        appointment.doctor_id,
        selectedDate,
        appointmentId // Exclude current appointment from availability check
      );
      
      const slotsMap = {};
      slots.forEach(slot => {
        slotsMap[slot] = true;
      });
      
      setBookedSlots(slotsMap);
    } catch (error) {
      console.error('Error refreshing booked slots:', error);
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleDateSelect = (date) => {
    setSelectedDate(date);
    setSelectedTimeSlot(null); // Reset time slot when date changes
    setBookedSlots({}); // Clear previous booked slots
  };

  const handleTimeSlotSelect = (timeSlot) => {
    if (bookedSlots[timeSlot]) {
      Alert.alert('Unavailable', 'This time slot is already booked. Please select another time.');
      return;
    }
    setSelectedTimeSlot(timeSlot);
  };

  const handleReschedule = async () => {
    if (!selectedDate || !selectedTimeSlot) {
      Alert.alert('Error', 'Please select both date and time');
      return;
    }
  
    // Final check if slot is still available using enhanced method
    const isStillAvailable = await appointmentManager.checkSlotAvailability(
      appointment.doctor_id,
      selectedDate,
      selectedTimeSlot,
      appointmentId // Exclude current appointment
    );
  
    if (!isStillAvailable) {
      Alert.alert('Slot Unavailable', 'This time slot was just booked. Please select another time.');
      setSelectedTimeSlot(null);
      refreshBookedSlots();
      return;
    }
  
    // Check if user selected the same date and time
    const newFormattedDate = appointmentManager.formatDateForDisplay(selectedDate);
    if (newFormattedDate === appointment.date && selectedTimeSlot === appointment.time_slot) {
      Alert.alert('No Changes', 'Please select a different date or time to reschedule.');
      return;
    }
  
    setLoading(true);
    
    try {
      // Use the enhanced reschedule method
      const result = await appointmentManager.rescheduleAppointment(
        appointmentId,
        selectedDate,
        selectedTimeSlot,
        'Rescheduled by patient' // optional reason
      );
      
      if (result.success) {
        Alert.alert(
          'Success',
          'Your appointment has been rescheduled successfully!',
          [
            {
              text: 'OK',
              onPress: () => {
                // Navigate back to appointment details with updated data
                router.back();
              }
            }
          ]
        );
      } else {
        Alert.alert('Error', result.error);
      }
    } catch (error) {
      console.error('Error rescheduling appointment:', error);
      Alert.alert('Error', 'Failed to reschedule appointment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date) => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    return {
      day: days[date.getDay()],
      date: date.getDate(),
      month: months[date.getMonth()],
      fullDate: `${days[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`
    };
  };

  const isToday = (date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isTomorrow = (date) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return date.toDateString() === tomorrow.toDateString();
  };

  const getDateLabel = (date) => {
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    return formatDate(date).day;
  };

  if (!appointment) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0AD476" />
        <Text style={styles.loadingText}>Loading appointment details...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <PageHeader onPress={() => router.back()} title="Reschedule Appointment" />
      
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Current appointment info */}
        <View style={styles.currentAppointment}>
          <Text style={styles.sectionTitle}>Current Appointment</Text>
          <View style={styles.currentInfoRow}>
            <Ionicons name="person" size={16} color="#666" />
            <Text style={styles.currentInfo}>Dr. {appointment.doctor_name}</Text>
          </View>
          <View style={styles.currentInfoRow}>
            <Ionicons name="calendar" size={16} color="#666" />
            <Text style={styles.currentInfo}>{appointment.date}</Text>
          </View>
          <View style={styles.currentInfoRow}>
            <Ionicons name="time" size={16} color="#666" />
            <Text style={styles.currentInfo}>{appointment.time_slot}</Text>
          </View>
          <View style={styles.currentInfoRow}>
            <Ionicons name="medical" size={16} color="#666" />
            <Text style={styles.currentInfo}>{appointment.service_name}</Text>
          </View>
        </View>

        {/* Date selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select New Date</Text>
          <Text style={styles.sectionSubtitle}>Choose a date for your rescheduled appointment</Text>
          
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.dateScrollView}
            contentContainerStyle={styles.dateScrollContent}
          >
            {dates.map((date, index) => {
              const formatted = formatDate(date);
              const isSelected = selectedDate && 
                selectedDate.toDateString() === date.toDateString();
              
              return (
                <TouchableOpacity
                  key={index}
                  style={[styles.dateButton, isSelected && styles.selectedDate]}
                  onPress={() => handleDateSelect(date)}
                >
                  <Text style={[styles.dateLabel, isSelected && styles.selectedDateText]}>
                    {getDateLabel(date)}
                  </Text>
                  <Text style={[styles.dateNumber, isSelected && styles.selectedDateText]}>
                    {formatted.date}
                  </Text>
                  <Text style={[styles.dateMonth, isSelected && styles.selectedDateText]}>
                    {formatted.month}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Selected date display */}
        {selectedDate && (
          <View style={styles.selectedDateInfo}>
            <Ionicons name="calendar" size={20} color="#0AD476" />
            <Text style={styles.selectedDateText2}>
              Selected: {formatDate(selectedDate).fullDate}
            </Text>
          </View>
        )}

        {/* Time slot selection */}
        {selectedDate && (
          <View style={styles.section}>
            <View style={styles.timeSlotHeader}>
              <Text style={styles.sectionTitle}>Select New Time</Text>
              {loadingSlots && (
                <View style={styles.loadingIndicator}>
                  <ActivityIndicator size="small" color="#0AD476" />
                  <Text style={styles.loadingText2}>Checking availability...</Text>
                </View>
              )}
            </View>
            <Text style={styles.sectionSubtitle}>Available time slots for the selected date</Text>
            
            <View style={styles.timeSlotGrid}>
            {timeSlots.map((timeSlot, index) => {
            const isBooked = bookedSlots[timeSlot];
            const isSelected = selectedTimeSlot === timeSlot;
            const isCurrent = appointment.time_slot === timeSlot;
            
            return (
                <TouchableOpacity
                key={index}
                style={[
                    styles.timeSlot,
                    isSelected && styles.selectedTimeSlot,
                    isBooked && styles.bookedTimeSlot,
                    isCurrent && styles.currentTimeSlot
                ]}
                onPress={() => handleTimeSlotSelect(timeSlot)}
                disabled={isBooked || loadingSlots}
                >
                <Text style={[
                    styles.timeSlotText,
                    isSelected && styles.selectedTimeSlotText,
                    isBooked && styles.bookedTimeSlotText,
                    isCurrent && styles.currentTimeSlotText
                ]}>
                    {timeSlot}
                </Text>
                {isBooked && (
                    <Text style={styles.bookedLabel}>Booked</Text>
                )}
                {isCurrent && selectedDate && 
                appointmentManager.formatDateForDisplay(selectedDate) === appointment.date && (
                    <Text style={styles.currentLabel}>Current</Text>
                )}
                </TouchableOpacity>
            );
            })}
            </View>
            
            {/* Available slots count */}
            <View style={styles.availabilityInfo}>
              <Ionicons name="information-circle" size={16} color="#666" />
              <Text style={styles.availabilityText}>
                {Object.keys(bookedSlots).length > 0 
                  ? `${timeSlots.length - Object.keys(bookedSlots).length} of ${timeSlots.length} slots available`
                  : `All ${timeSlots.length} slots available`
                }
              </Text>
            </View>
          </View>
        )}

        {/* Summary of changes */}
        {selectedDate && selectedTimeSlot && (
          <View style={styles.summarySection}>
            <Text style={styles.summaryTitle}>Reschedule Summary</Text>
            
            <View style={styles.summaryRow}>
              <View style={styles.summaryColumn}>
                <Text style={styles.summaryLabel}>From</Text>
                <Text style={styles.summaryValue}>{appointment.date}</Text>
                <Text style={styles.summaryValue}>{appointment.time_slot}</Text>
              </View>
              
              <Ionicons name="arrow-forward" size={20} color="#0AD476" style={styles.summaryArrow} />
              
              <View style={styles.summaryColumn}>
                <Text style={styles.summaryLabel}>To</Text>
                <Text style={styles.summaryValue}>{formatDate(selectedDate).fullDate}</Text>
                <Text style={styles.summaryValue}>{selectedTimeSlot}</Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Reschedule button */}
      <View style={styles.bottomSection}>
        <TouchableOpacity
          style={[
            styles.rescheduleButton,
            (!selectedDate || !selectedTimeSlot || loading || loadingSlots) && styles.disabledButton
          ]}
          onPress={handleReschedule}
          disabled={!selectedDate || !selectedTimeSlot || loading || loadingSlots}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Ionicons name="calendar" size={20} color="#fff" />
              <Text style={styles.rescheduleButtonText}>Confirm Reschedule</Text>
            </>
          )}
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => router.back()}
          disabled={loading}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  loadingText2: {
    fontSize: 12,
    color: '#666',
    marginLeft: 5,
  },
  content: {
    flex: 1,
  },
  currentAppointment: {
    backgroundColor: '#fff',
    margin: 20,
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9500',
  },
  currentInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  currentInfo: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
    flex: 1,
  },
  section: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  dateScrollView: {
    marginHorizontal: -16,
  },
  dateScrollContent: {
    paddingHorizontal: 16,
  },
  dateButton: {
    width: 70,
    height: 85,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  selectedDate: {
    backgroundColor: '#0AD476',
    borderColor: '#0AD476',
  },
  dateLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  dateNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
    marginVertical: 2,
  },
  dateMonth: {
    fontSize: 11,
    color: '#666',
  },
  selectedDateText: {
    color: '#fff',
  },
  selectedDateInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#0AD476',
  },
  selectedDateText2: {
    fontSize: 14,
    color: '#0AD476',
    fontWeight: '500',
    marginLeft: 8,
  },
  timeSlotHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  loadingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeSlotGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  timeSlot: {
    width: '48%',
    padding: 16,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    marginBottom: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  selectedTimeSlot: {
    backgroundColor: '#0AD476',
    borderColor: '#0AD476',
  },
  bookedTimeSlot: {
    backgroundColor: '#FFEBEE',
    borderColor: '#FFCDD2',
    opacity: 0.7,
  },
  currentTimeSlot: {
    backgroundColor: '#FFF3E0',
    borderColor: '#FFB74D',
  },
  timeSlotText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  selectedTimeSlotText: {
    color: '#fff',
  },
  bookedTimeSlotText: {
    color: '#999',
    textDecorationLine: 'line-through',
  },
  currentTimeSlotText: {
    color: '#FF9500',
  },
  bookedLabel: {
    fontSize: 10,
    color: '#FF5722',
    marginTop: 2,
    fontWeight: '500',
  },
  currentLabel: {
    fontSize: 10,
    color: '#FF9500',
    marginTop: 2,
    fontWeight: '500',
  },
  availabilityInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  availabilityText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 5,
  },
  summarySection: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#0AD476',
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0AD476',
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summaryColumn: {
    flex: 1,
    alignItems: 'center',
  },
  summaryArrow: {
    marginHorizontal: 16,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 14,
    color: '#000',
    fontWeight: '500',
    textAlign: 'center',
  },
  bottomSection: {
    backgroundColor: '#fff',
    padding: 20,
    paddingBottom: 30,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  rescheduleButton: {
    backgroundColor: '#0AD476',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  disabledButton: {
    backgroundColor: '#CCC',
    opacity: 0.6,
  },
  rescheduleButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  cancelButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '500',
  },
});

export default RescheduleScreen;