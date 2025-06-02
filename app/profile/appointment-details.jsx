import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native'
import React, { useState } from 'react'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { DatabaseService } from '@/configs/AppwriteConfig'
import { COLLECTIONS } from '@/constants'
import Toast from 'react-native-toast-message'

export default function AppointmentDetails() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  
  // Parse appointment data from params
  const appointment = params.appointment ? JSON.parse(params.appointment) : null;
  
  if (!appointment) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={50} color="#FF3B30" />
        <Text style={styles.errorTitle}>Appointment Not Found</Text>
        <Text style={styles.errorText}>Unable to load appointment details</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }
  
  const isDatePast = (dateString) => {
    if (!dateString) return false;
    
    try {
      const parts = dateString.match(/(\w+), (\d+) (\w+) (\d+)/);
      if (!parts) return false;
      
      const months = {
        'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
        'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
      };
      
      const appointmentDate = new Date(
        parseInt(parts[4]),
        months[parts[3]],
        parseInt(parts[2])
      );
      
      appointmentDate.setHours(23, 59, 59, 999);
      const today = new Date();
      
      return appointmentDate < today;
    } catch (error) {
      console.error('Error parsing date:', dateString, error);
      return false;
    }
  };
  
  const isPast = isDatePast(appointment.date);
  const statusColor = isPast ? '#8E8E93' : '#0AD476';
  const statusText = isPast ? 'Completed' : 'Upcoming';
  
  const handleCancelAppointment = () => {
    if (isPast) {
      Toast.show({
        type: 'error',
        text1: 'Cannot Cancel',
        text2: 'This appointment has already been completed.',
      });
      return;
    }
    
    Alert.alert(
      'Cancel Appointment',
      'Are you sure you want to cancel this appointment? This action cannot be undone.',
      [
        {
          text: 'Keep Appointment',
          style: 'cancel',
        },
        {
          text: 'Cancel Appointment',
          style: 'destructive',
          onPress: confirmCancelAppointment,
        },
      ]
    );
  };
  
  const confirmCancelAppointment = async () => {
    try {
      setIsLoading(true);
      
      await DatabaseService.deleteDocument(
        COLLECTIONS.APPOINTMENTS,
        appointment.$id
      );
      
      Toast.show({
        type: 'success',
        text1: 'Appointment Cancelled',
        text2: 'Your appointment has been successfully cancelled.',
      });
      
      setTimeout(() => {
        router.back();
      }, 1500);
      
    } catch (error) {
      console.error('Error cancelling appointment:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to cancel appointment. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleReschedule = () => {
    if (isPast) {
      Toast.show({
        type: 'error',
        text1: 'Cannot Reschedule',
        text2: 'This appointment has already been completed.',
      });
      return;
    }
    
    // Navigate to reschedule screen with appointment data
    router.push({
      pathname: '/book-appointment',
      params: {
        reschedule: 'true',
        appointmentId: appointment.$id,
        doctorId: appointment.doctor_id,
        currentDate: appointment.date,
        currentTime: appointment.time,
      }
    });
  };
  
  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backBtn}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Appointment Details</Text>
        <View style={styles.placeholder} />
      </View>
      
      {/* Status Badge */}
      <View style={styles.statusContainer}>
        <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
          <Ionicons 
            name={isPast ? "checkmark-circle" : "time"} 
            size={16} 
            color="#FFFFFF" 
          />
          <Text style={styles.statusText}>{statusText}</Text>
        </View>
      </View>
      
      {/* Appointment Information */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Appointment Information</Text>
        
        <View style={styles.infoRow}>
          <View style={styles.infoIcon}>
            <Ionicons name="calendar" size={20} color="#0AD476" />
          </View>
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Date</Text>
            <Text style={styles.infoValue}>{appointment.date || 'Not specified'}</Text>
          </View>
        </View>
        
        <View style={styles.infoRow}>
          <View style={styles.infoIcon}>
            <Ionicons name="time" size={20} color="#0AD476" />
          </View>
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Time</Text>
            <Text style={styles.infoValue}>{appointment.time || 'Not specified'}</Text>
          </View>
        </View>
        
        <View style={styles.infoRow}>
          <View style={styles.infoIcon}>
            <Ionicons name="person" size={20} color="#0AD476" />
          </View>
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Doctor</Text>
            <Text style={styles.infoValue}>{appointment.doctor_name || 'Not specified'}</Text>
          </View>
        </View>
        
        <View style={styles.infoRow}>
          <View style={styles.infoIcon}>
            <Ionicons name="medical" size={20} color="#0AD476" />
          </View>
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Specialization</Text>
            <Text style={styles.infoValue}>{appointment.doctor_specialization || 'General Practice'}</Text>
          </View>
        </View>
        
        <View style={styles.infoRow}>
          <View style={styles.infoIcon}>
            <Ionicons name="location" size={20} color="#0AD476" />
          </View>
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Hospital</Text>
            <Text style={styles.infoValue}>{appointment.hospital_name || 'Not specified'}</Text>
          </View>
        </View>
      </View>
      
      {/* Patient Information */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Patient Information</Text>
        
        <View style={styles.infoRow}>
          <View style={styles.infoIcon}>
            <Ionicons name="person-circle" size={20} color="#0AD476" />
          </View>
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Patient Name</Text>
            <Text style={styles.infoValue}>{appointment.patient_name || 'Not specified'}</Text>
          </View>
        </View>
        
        <View style={styles.infoRow}>
          <View style={styles.infoIcon}>
            <Ionicons name="call" size={20} color="#0AD476" />
          </View>
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Phone Number</Text>
            <Text style={styles.infoValue}>{appointment.patient_phone || 'Not specified'}</Text>
          </View>
        </View>
        
        <View style={styles.infoRow}>
          <View style={styles.infoIcon}>
            <Ionicons name="calendar-number-outline" size={20} color="#0AD476" />
          </View>
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Age</Text>
            <Text style={styles.infoValue}>{appointment.patient_age || 'Not specified'}</Text>
          </View>
        </View>
      </View>
      
      {/* Notes Section */}
      {appointment.notes && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Additional Notes</Text>
          <View style={styles.notesContainer}>
            <Text style={styles.notesText}>{appointment.notes}</Text>
          </View>
        </View>
      )}
      
      {/* Appointment ID */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Reference</Text>
        <View style={styles.infoRow}>
          <View style={styles.infoIcon}>
            <Ionicons name="document-text" size={20} color="#0AD476" />
          </View>
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Appointment ID</Text>
            <Text style={styles.infoValue}>{appointment.$id?.substring(0, 8) || 'N/A'}</Text>
          </View>
        </View>
      </View>
      
      {/* Action Buttons */}
      {!isPast && (
        <View style={styles.actionSection}>
          <TouchableOpacity 
            style={styles.rescheduleButton}
            onPress={handleReschedule}
            disabled={isLoading}
          >
            <Ionicons name="calendar-outline" size={20} color="#0AD476" />
            <Text style={styles.rescheduleButtonText}>Reschedule</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.cancelButton}
            onPress={handleCancelAppointment}
            disabled={isLoading}
          >
            <Ionicons name="close-circle-outline" size={20} color="#FF3B30" />
            <Text style={styles.cancelButtonText}>Cancel Appointment</Text>
          </TouchableOpacity>
        </View>
      )}
      
      <Toast />
      <View style={{ height: 50 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  backBtn: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
  },
  placeholder: {
    width: 40,
  },
  statusContainer: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#FFFFFF',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 6,
  },
  section: {
    backgroundColor: '#FFFFFF',
    marginTop: 10,
    paddingVertical: 20,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 15,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  infoIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0FDF4',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  infoContent: {
    flex: 1,
    paddingTop: 2,
  },
  infoLabel: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 16,
    color: '#000000',
    fontWeight: '500',
  },
  notesContainer: {
    backgroundColor: '#F8F9FA',
    padding: 15,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#0AD476',
  },
  notesText: {
    fontSize: 15,
    color: '#000000',
    lineHeight: 22,
  },
  actionSection: {
    backgroundColor: '#FFFFFF',
    marginTop: 10,
    paddingVertical: 20,
    paddingHorizontal: 20,
  },
  rescheduleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0FDF4',
    paddingVertical: 15,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#0AD476',
  },
  rescheduleButtonText: {
    color: '#0AD476',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF5F5',
    paddingVertical: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FF3B30',
  },
  cancelButtonText: {
    color: '#FF3B30',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  errorContainer: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#000000',
    marginTop: 20,
    marginBottom: 10,
  },
  errorText: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: 30,
  },
  backButton: {
    backgroundColor: '#0AD476',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});