// app/profile/appointment-details.jsx 
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
  SafeAreaView,
  StatusBar
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { DatabaseService } from '@/configs/AppwriteConfig';
import { COLLECTIONS } from '@/constants';
import Toast from 'react-native-toast-message';
import { appointmentManager, APPOINTMENT_STATUS } from '@/service/appointmentUtils';

export default function EnhancedAppointmentDetails() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [appointment, setAppointment] = useState(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [realtimeSubscription, setRealtimeSubscription] = useState(null); 
  const [isUpdating, setIsUpdating] = useState(false);
  
  // Parse appointment data from params or ID
  const appointmentData = params.appointment ? JSON.parse(params.appointment) : null;
  const appointmentId = params.appointmentId || appointmentData?.$id;
  
  useEffect(() => {
    if (appointmentData) {
      setAppointment(appointmentData);
    } else if (appointmentId) {
      loadAppointmentDetails();
    }
    
    if (appointmentId) {
      const subscription = appointmentManager.subscribeToAppointments((update) => {
        console.log('Appointment details received update:', update);
        
        // Check if the update is for the current appointment
        if (update.appointment.$id === appointmentId) {
          handleRealtimeUpdate(update);
        }
      });
      
      setRealtimeSubscription(subscription);
    }
  
    return () => {
      if (realtimeSubscription) {
        appointmentManager.unsubscribe(realtimeSubscription);
      }
    };
  }, [appointmentId]);

  const loadAppointmentDetails = async () => {
    try {
      setIsLoading(true);
      const appointmentDoc = await DatabaseService.getDocument(
        COLLECTIONS.APPOINTMENTS,
        appointmentId
      );
      setAppointment(appointmentDoc);
    } catch (error) {
      console.error('Error loading appointment:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to load appointment details',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRealtimeUpdate = (update) => {
    setIsUpdating(true);
    
    switch (update.type) {
      case 'updated':
        setAppointment(update.appointment);
        Toast.show({
          type: 'info',
          text1: 'Appointment Updated',
          text2: 'This appointment has been updated',
        });
        break;
        
      case 'deleted':
        Toast.show({
          type: 'success',
          text1: 'Appointment Cancelled',
          text2: 'This appointment has been cancelled',
        });
        // Navigate back after a delay
        setTimeout(() => {
          router.back();
        }, 2000);
        break;
        
      default:
        break;
    }
    
    // Reset updating indicator after a short delay
    setTimeout(() => setIsUpdating(false), 500);
  };
  
  if (!appointment && !appointmentId) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={50} color="#FF3B30" />
          <Text style={styles.errorTitle}>Appointment Not Found</Text>
          <Text style={styles.errorText}>Unable to load appointment details</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0AD476" />
          <Text style={styles.loadingText}>Loading appointment details...</Text>
        </View>
      </SafeAreaView>
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
  
  const isPast = isDatePast(appointment?.date);
  const isCancelled = appointment?.status === APPOINTMENT_STATUS.CANCELLED;
  
  const getStatusInfo = () => {
    if (isCancelled) {
      return { color: '#FF3B30', text: 'Cancelled', icon: 'close-circle' };
    } else if (isPast) {
      return { color: '#8E8E93', text: 'Completed', icon: 'checkmark-circle' };
    } else {
      return { color: '#0AD476', text: 'Upcoming', icon: 'time' };
    }
  };
  
  const statusInfo = getStatusInfo();
  
  const handleCancelAppointment = () => {
    if (isPast || isCancelled) {
      Toast.show({
        type: 'error',
        text1: 'Cannot Cancel',
        text2: isPast ? 'This appointment has already been completed.' : 'This appointment is already cancelled.',
      });
      return;
    }
    
    setShowCancelModal(true);
  };
  
  const confirmCancelAppointment = async () => {
    try {
      setIsLoading(true);
      setShowCancelModal(false);
      
      const result = await appointmentManager.cancelAppointment(
        appointment.$id,
        cancelReason,
        'patient'
      );
      
      if (result.success) {
        Toast.show({
          type: 'success',
          text1: 'Appointment Cancelled',
          text2: 'Your appointment has been successfully cancelled.',
        });
        
        // Update local state immediately for better UX
        setAppointment(prev => ({ ...prev, status: APPOINTMENT_STATUS.CANCELLED }));
        
        setTimeout(() => {
          router.back();
        }, 2000);
      } else {
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: result.error || 'Failed to cancel appointment.',
        });
      }
    } catch (error) {
      console.error('Error cancelling appointment:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to cancel appointment. Please try again.',
      });
    } finally {
      setIsLoading(false);
      setCancelReason('');
    }
  };
  
  const handleReschedule = () => {
    if (isPast || isCancelled) {
      Toast.show({
        type: 'error',
        text1: 'Cannot Reschedule',
        text2: isPast ? 'This appointment has already been completed.' : 'Cannot reschedule a cancelled appointment.',
      });
      return;
    }
    
    // Navigate to reschedule screen with appointment data
    router.push({
      pathname: '/appointment/reschedule',
      params: {
        appointmentId: appointment.$id,
        doctorId: appointment.doctor_id,
        doctorName: appointment.doctor_name,
        serviceName: appointment.service_name,
        branchName: appointment.branch_name,
        currentDate: appointment.date,
        currentTimeSlot: appointment.time_slot,
      }
    });
  };
  
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <View style={styles.container}>
        {/* Fixed Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backBtn}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Appointment Details</Text>
            {isUpdating && (
              <View style={styles.updateIndicator}>
                <ActivityIndicator size="small" color="#0AD476" />
                <Text style={styles.updateText}>Updating...</Text>
              </View>
            )}
          </View>
          
          <View style={styles.headerRight} />
        </View>
        
        <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
      {/* Status Badge */}
      <View style={styles.statusContainer}>
        <View style={[styles.statusBadge, { backgroundColor: statusInfo.color }]}>
          <Ionicons 
            name={statusInfo.icon} 
            size={16} 
            color="#FFFFFF" 
          />
          <Text style={styles.statusText}>{statusInfo.text}</Text>
        </View>
        
        {/* Show rescheduled indicator if applicable */}
        {appointment?.rescheduled_at && (
          <View style={styles.rescheduledBadge}>
            <Ionicons name="refresh" size={14} color="#FF9500" />
            <Text style={styles.rescheduledText}>Rescheduled</Text>
          </View>
        )}
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
            <Text style={styles.infoValue}>{appointment?.date || 'Not specified'}</Text>
          </View>
        </View>
        
        <View style={styles.infoRow}>
          <View style={styles.infoIcon}>
            <Ionicons name="time" size={20} color="#0AD476" />
          </View>
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Time</Text>
            <Text style={styles.infoValue}>{appointment?.time_slot || 'Not specified'}</Text>
          </View>
        </View>
        
        <View style={styles.infoRow}>
          <View style={styles.infoIcon}>
            <Ionicons name="person" size={20} color="#0AD476" />
          </View>
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Doctor</Text>
            <Text style={styles.infoValue}>{appointment?.doctor_name || 'Not specified'}</Text>
          </View>
        </View>
        
        <View style={styles.infoRow}>
          <View style={styles.infoIcon}>
            <Ionicons name="medical" size={20} color="#0AD476" />
          </View>
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Service</Text>
            <Text style={styles.infoValue}>{appointment?.service_name || 'Not specified'}</Text>
          </View>
        </View>
        
        <View style={styles.infoRow}>
          <View style={styles.infoIcon}>
            <Ionicons name="location" size={20} color="#0AD476" />
          </View>
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Branch</Text>
            <Text style={styles.infoValue}>{appointment?.branch_name || 'Not specified'}</Text>
          </View>
        </View>
      </View>
      
      {/* Show original appointment details if rescheduled */}
      {appointment?.rescheduled_at && appointment?.original_date && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Original Appointment</Text>
          
          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <Ionicons name="calendar-outline" size={20} color="#8E8E93" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Original Date</Text>
              <Text style={styles.infoValue}>{appointment.original_date}</Text>
            </View>
          </View>
          
          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <Ionicons name="time-outline" size={20} color="#8E8E93" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Original Time</Text>
              <Text style={styles.infoValue}>{appointment.original_time_slot}</Text>
            </View>
          </View>
        </View>
      )}
      
      {/* Cancellation details if cancelled */}
      {isCancelled && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cancellation Details</Text>
          
          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <Ionicons name="time" size={20} color="#FF3B30" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Cancelled At</Text>
              <Text style={styles.infoValue}>
                {appointment?.cancelled_at ? 
                  new Date(appointment.cancelled_at).toLocaleString() : 
                  'Not specified'
                }
              </Text>
            </View>
          </View>
          
          {appointment?.cancellation_reason && (
            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <Ionicons name="document-text" size={20} color="#FF3B30" />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Reason</Text>
                <Text style={styles.infoValue}>{appointment.cancellation_reason}</Text>
              </View>
            </View>
          )}
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
            <Text style={styles.infoValue}>{appointment?.$id?.substring(0, 8) || 'N/A'}</Text>
          </View>
        </View>
      </View>
      
      {/* Action Buttons - Only show for upcoming appointments */}
      {!isPast && !isCancelled && (
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
      
      {/* Cancel Appointment Modal */}
      <Modal
        visible={showCancelModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowCancelModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Cancel Appointment</Text>
            <Text style={styles.modalSubtitle}>
              Are you sure you want to cancel this appointment? This action cannot be undone.
            </Text>
            
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Reason for cancellation (optional)</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Please provide a reason..."
                value={cancelReason}
                onChangeText={setCancelReason}
                multiline={true}
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>
            
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => {
                  setShowCancelModal(false);
                  setCancelReason('');
                }}
              >
                <Text style={styles.modalCancelText}>Keep Appointment</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.modalConfirmButton}
                onPress={confirmCancelAppointment}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.modalConfirmText}>Cancel Appointment</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      
      <Toast />
      
      {/* Bottom padding */}
      <View style={{ height: 50 }} />
      </ScrollView>
      </View>
    </SafeAreaView>
  );
}

// MISSING STYLESHEET - ADD THIS:
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  scrollContent: {
    flex: 1,
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 10,
    marginBottom: 5,
    color: '#FF3B30',
  },
  errorText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  backButton: {
    backgroundColor: '#0AD476',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  backButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backBtn: {
    padding: 5,
    width: 40,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  headerRight: {
    width: 40,
  },
  updateIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  updateText: {
    fontSize: 12,
    color: '#0AD476',
    marginLeft: 4,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#fff',
    marginTop: 0,
    marginBottom: 10,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginRight: 10,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  rescheduledBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#FFF3E0',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FF9500',
  },
  rescheduledText: {
    color: '#FF9500',
    fontSize: 10,
    fontWeight: '500',
    marginLeft: 2,
  },
  section: {
    backgroundColor: '#fff',
    marginTop: 10,
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 15,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  infoIcon: {
    width: 30,
    alignItems: 'center',
    marginTop: 2,
  },
  infoContent: {
    flex: 1,
    marginLeft: 10,
  },
  infoLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 16,
    color: '#000',
    fontWeight: '400',
  },
  actionSection: {
    backgroundColor: '#fff',
    marginTop: 10,
    paddingHorizontal: 20,
    paddingVertical: 20,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  rescheduleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F8FF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#0AD476',
    flex: 0.45,
    justifyContent: 'center',
  },
  rescheduleButtonText: {
    color: '#0AD476',
    marginLeft: 8,
    fontWeight: '500',
    fontSize: 14,
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF5F5',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FF3B30',
    flex: 0.45,
    justifyContent: 'center',
  },
  cancelButtonText: {
    color: '#FF3B30',
    marginLeft: 8,
    fontWeight: '500',
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    margin: 20,
    padding: 20,
    borderRadius: 12,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#000',
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    textAlign: 'center',
    lineHeight: 20,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    color: '#333',
    marginBottom: 8,
    fontWeight: '500',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    minHeight: 80,
    fontSize: 14,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
  },
  modalCancelText: {
    color: '#666',
    fontWeight: '500',
    fontSize: 14,
  },
  modalConfirmButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#FF3B30',
    alignItems: 'center',
  },
  modalConfirmText: {
    color: '#fff',
    fontWeight: '500',
    fontSize: 14,
  },
});