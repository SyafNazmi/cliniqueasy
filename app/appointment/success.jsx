// app/appointment/success.jsx - Refined version for family bookings
import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Share, Alert } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Calendar from 'expo-calendar';

export default function BookingSuccessScreen() {
  const router = useRouter();
  const { 
    appointmentId, 
    doctorName, 
    date, 
    timeSlot, 
    serviceName, 
    branchName,
    patientName,
    isFamilyBooking 
  } = useLocalSearchParams();
  
  // Generate appointment reference code
  const referenceCode = appointmentId?.substring(0, 8).toUpperCase() || 'APT12345';
  
  // Check if this is a family booking
  const isForFamilyMember = isFamilyBooking === 'true';

  useEffect(() => {
    return () => {
      // This ensures the booking screen is removed from history
      router.replace('/');
    };
  }, []);

  // Enhanced calendar functionality
  const addToCalendar = async () => {
    try {
      const { status } = await Calendar.requestCalendarPermissionsAsync();
      if (status === 'granted') {
        const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
        const defaultCalendar = calendars.find(cal => cal.source.name === 'Default') || calendars[0];
        
        if (defaultCalendar) {
          // Parse the date and time for calendar event
          const appointmentDate = new Date(date);
          const [time, period] = timeSlot.split(' ');
          const [hours, minutes] = time.split(':');
          let hour24 = parseInt(hours);
          
          if (period === 'PM' && hour24 !== 12) hour24 += 12;
          if (period === 'AM' && hour24 === 12) hour24 = 0;
          
          appointmentDate.setHours(hour24, parseInt(minutes), 0, 0);
          const endDate = new Date(appointmentDate.getTime() + 60 * 60 * 1000); // 1 hour later
          
          await Calendar.createEventAsync(defaultCalendar.id, {
            title: `${serviceName} - Dr. ${doctorName}`,
            startDate: appointmentDate,
            endDate: endDate,
            location: `${branchName} Branch`,
            notes: `Patient: ${patientName}\nReference: ${referenceCode}\n${isForFamilyMember ? 'Family Member Appointment' : 'Personal Appointment'}`,
            alarms: [{ relativeOffset: -60 }, { relativeOffset: -15 }] // 1 hour and 15 mins before
          });
          
          Alert.alert('Success', 'Appointment added to your calendar!');
        }
      } else {
        Alert.alert('Permission Required', 'Please allow calendar access to add this appointment.');
      }
    } catch (error) {
      console.error('Calendar error:', error);
      Alert.alert('Error', 'Failed to add to calendar. Please add manually.');
    }
  };

  // Enhanced share functionality
  const shareAppointment = async () => {
    try {
      const message = `🏥 Appointment Confirmation
      
👤 Patient: ${patientName}${isForFamilyMember ? ' (Family Member)' : ''}
👨‍⚕️ Doctor: Dr. ${doctorName}
🏥 Service: ${serviceName}
📍 Location: ${branchName} Branch
📅 Date: ${date}
⏰ Time: ${timeSlot}
🔖 Reference: ${referenceCode}

Please save this information and bring ID to your appointment.`;

      await Share.share({
        message: message,
        title: 'Appointment Confirmation'
      });
    } catch (error) {
      console.error('Share error:', error);
    }
  };
  
  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
      <View style={styles.container}>
        {/* Success icon with animation effect */}
        <View style={styles.successIconContainer}>
          <Ionicons name="checkmark-circle" size={80} color="#0AD476" />
        </View>
        
        <Text style={styles.title}>Booking Confirmed!</Text>
        <Text style={styles.subtitle}>
          {isForFamilyMember 
            ? `Appointment successfully booked for ${patientName}` 
            : 'Your appointment has been successfully booked'
          }
        </Text>
        
        {/* Enhanced appointment details card */}
        <View style={styles.card}>
          <View style={styles.referenceContainer}>
            <Text style={styles.referenceLabel}>Reference Code</Text>
            <Text style={styles.referenceCode}>{referenceCode}</Text>
          </View>
          
          {/* Patient Information - Enhanced */}
          <View style={styles.detailRow}>
            <Ionicons 
              name={isForFamilyMember ? "people" : "person"} 
              size={20} 
              color="#0AD476" 
            />
            <Text style={styles.detailLabel}>Patient:</Text>
            <View style={styles.detailValueContainer}>
              <Text style={styles.detailValue}>{patientName}</Text>
              {isForFamilyMember && (
                <View style={styles.familyBadge}>
                  <Text style={styles.familyBadgeText}>Family</Text>
                </View>
              )}
            </View>
          </View>
          
          <View style={styles.detailRow}>
            <Ionicons name="medical" size={20} color="#0AD476" />
            <Text style={styles.detailLabel}>Doctor:</Text>
            <Text style={styles.detailValue}>Dr. {doctorName}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Ionicons name="medkit" size={20} color="#0AD476" />
            <Text style={styles.detailLabel}>Service:</Text>
            <Text style={styles.detailValue}>{serviceName}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Ionicons name="location" size={20} color="#0AD476" />
            <Text style={styles.detailLabel}>Branch:</Text>
            <Text style={styles.detailValue}>{branchName}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Ionicons name="calendar" size={20} color="#0AD476" />
            <Text style={styles.detailLabel}>Date:</Text>
            <Text style={styles.detailValue}>{date}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Ionicons name="time" size={20} color="#0AD476" />
            <Text style={styles.detailLabel}>Time:</Text>
            <Text style={styles.detailValue}>{timeSlot}</Text>
          </View>
          
          {/* Enhanced QR Code section */}
          <View style={styles.qrContainer}>
            <QRCode
              value={`APPT:${appointmentId}:${referenceCode}:${patientName}:${isForFamilyMember ? 'FAMILY' : 'OWNER'}`}
              size={120}
              color="#000000"
              backgroundColor="#FFFFFF"
            />
            <Text style={styles.qrText}>Present this QR code at the clinic</Text>
            <Text style={styles.qrSubText}>
              {isForFamilyMember 
                ? `For ${patientName}'s appointment check-in`
                : 'For quick appointment check-in'
              }
            </Text>
          </View>
        </View>
        
        {/* Enhanced important notes for family bookings */}
        {isForFamilyMember && (
          <View style={styles.familyBookingNote}>
            <Ionicons name="information-circle" size={20} color="#007AFF" />
            <View style={styles.noteTextContainer}>
              <Text style={styles.noteTitle}>Important Reminder</Text>
              <Text style={styles.noteText}>
                • {patientName} should bring valid ID to the appointment{'\n'}
                • You can accompany them or they can go independently{'\n'}
                • Prescription medications will be linked to their profile
              </Text>
            </View>
          </View>
        )}
        
        {/* Enhanced action buttons */}
        <View style={styles.actions}>
          <TouchableOpacity style={styles.actionButton} onPress={addToCalendar}>
            <Ionicons name="calendar" size={20} color="white" />
            <Text style={styles.actionText}>Add to Calendar</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionButton} onPress={shareAppointment}>
            <Ionicons name="share-social" size={20} color="white" />
            <Text style={styles.actionText}>Share Details</Text>
          </TouchableOpacity>
        </View>
        
        {/* Navigation buttons */}
        <View style={styles.navigationButtons}>
          {/* <TouchableOpacity 
            style={styles.secondaryButton}
            onPress={() => router.push('/appointment')}
          >
            <Ionicons name="list" size={16} color="#0AD476" />
            <Text style={styles.secondaryButtonText}>View All Appointments</Text>
          </TouchableOpacity> */}
          
          <TouchableOpacity 
            style={styles.primaryButton}
            onPress={() => router.push('/')}
          >
            <Text style={styles.primaryButtonText}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
    alignItems: 'center',
  },
  successIconContainer: {
    marginTop: 40,
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 30,
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 22,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 20,
  },
  referenceContainer: {
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  referenceLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  referenceCode: {
    fontSize: 24,
    fontWeight: 'bold',
    letterSpacing: 2,
    color: '#0AD476',
    marginTop: 4,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  detailLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#4b5563',
    marginLeft: 10,
    width: 70,
  },
  detailValue: {
    fontSize: 15,
    color: '#1f2937',
    flex: 1,
  },
  detailValueContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  familyBadge: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginLeft: 8,
  },
  familyBadgeText: {
    fontSize: 10,
    fontWeight: '500',
    color: '#16a34a',
  },
  qrContainer: {
    alignItems: 'center',
    marginTop: 20,
    padding: 20,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
  },
  qrText: {
    marginTop: 12,
    color: '#374151',
    fontSize: 14,
    fontWeight: '500',
  },
  qrSubText: {
    marginTop: 4,
    color: '#6b7280',
    fontSize: 12,
    textAlign: 'center',
  },
  familyBookingNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#eff6ff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#dbeafe',
    width: '100%',
  },
  noteTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  noteTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e40af',
    marginBottom: 4,
  },
  noteText: {
    fontSize: 13,
    color: '#1e40af',
    lineHeight: 18,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 20,
  },
  actionButton: {
    backgroundColor: '#0AD476',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    flex: 0.48,
  },
  actionText: {
    color: 'white',
    fontWeight: '600',
    marginLeft: 8,
    fontSize: 14,
  },
  navigationButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    gap: 12,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#0AD476',
    flex: 1,
  },
  secondaryButtonText: {
    color: '#0AD476',
    fontWeight: '600',
    marginLeft: 6,
    fontSize: 14,
  },
  primaryButton: {
    backgroundColor: '#0AD476',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
    minWidth: 80,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
});