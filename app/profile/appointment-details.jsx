// app/profile/appointment-details.jsx - ENHANCED WITH CANCELLATION REQUEST FLOW
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
import { account, DatabaseService, Query } from '@/configs/AppwriteConfig';
import { COLLECTIONS } from '@/constants';
import Toast from 'react-native-toast-message';
import { APPOINTMENT_STATUS, CANCELLATION_STATUS } from '@/service/appointmentUtils'

export default function EnhancedAppointmentDetails() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [appointment, setAppointment] = useState(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
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
  const cancellationStatus = appointment?.cancellation_status;
  const hasPendingCancellation = cancellationStatus === CANCELLATION_STATUS.REQUESTED;
  const isCancellationDenied = cancellationStatus === CANCELLATION_STATUS.DENIED;
  const isCancellationApproved = cancellationStatus === CANCELLATION_STATUS.APPROVED;
  
  const getStatusInfo = () => {
    if (isCancelled) {
      return { color: '#FF3B30', text: 'Cancelled', icon: 'close-circle' };
    } else if (hasPendingCancellation) {
      return { color: '#FF9500', text: 'Cancellation Pending', icon: 'hourglass' };
    } else if (isCancellationDenied) {
      return { color: '#8E8E93', text: 'Cancellation Denied', icon: 'close-circle-outline' };
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
    
    if (hasPendingCancellation) {
      Toast.show({
        type: 'info',
        text1: 'Already Requested',
        text2: 'You have already requested cancellation for this appointment.',
      });
      return;
    }
    
    setShowCancelModal(true);
  };
  
  // Request cancellation instead of directly cancelling
  const requestCancellation = async () => {
    try {
      setIsLoading(true);
      setShowCancelModal(false);
      
      // Update appointment with cancellation request
      const updateData = {
        cancellation_status: CANCELLATION_STATUS.REQUESTED,
        cancellation_reason: cancelReason,
        cancellation_requested_at: new Date().toISOString(),
        cancellation_requested_by: 'patient'
      };
      
      await DatabaseService.updateDocument(
        COLLECTIONS.APPOINTMENTS,
        appointment.$id,
        updateData
      );
      
      // Update local state immediately for better UX
      setAppointment(prev => ({ 
        ...prev, 
        ...updateData
      }));
      
      Toast.show({
        type: 'success',
        text1: 'Cancellation Requested',
        text2: 'Your cancellation request has been sent to the health practitioner.',
      });
      
    } catch (error) {
      console.error('Error requesting cancellation:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to request cancellation. Please try again.',
      });
    } finally {
      setIsLoading(false);
      setCancelReason('');
    }
  };

  // Withdraw cancellation request
  const withdrawCancellationRequest = () => {
    Alert.alert(
      'Withdraw Request',
      'Are you sure you want to withdraw your cancellation request?',
      [
        { text: 'No', style: 'cancel' },
        { text: 'Yes', onPress: performWithdrawRequest }
      ]
    );
  };

  const performWithdrawRequest = async () => {
    try {
      setIsLoading(true);
      
      const updateData = {
        cancellation_status: CANCELLATION_STATUS.NONE,
        cancellation_reason: null,
        cancellation_requested_at: null,
        cancellation_requested_by: null
      };
      
      await DatabaseService.updateDocument(
        COLLECTIONS.APPOINTMENTS,
        appointment.$id,
        updateData
      );
      
      setAppointment(prev => ({ 
        ...prev, 
        ...updateData
      }));
      
      Toast.show({
        type: 'success',
        text1: 'Request Withdrawn',
        text2: 'Your cancellation request has been withdrawn.',
      });
      
    } catch (error) {
      console.error('Error withdrawing request:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to withdraw request.',
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleReschedule = () => {
    if (isPast || isCancelled || hasPendingCancellation) {
      let message = isPast ? 'This appointment has already been completed.' : 
                   isCancelled ? 'Cannot reschedule a cancelled appointment.' :
                   'Cannot reschedule while cancellation is pending.';
      
      Toast.show({
        type: 'error',
        text1: 'Cannot Reschedule',
        text2: message,
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

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown date';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'Invalid date';
    }
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

          {/* Cancellation Request Status Section */}
          {(hasPendingCancellation || isCancellationDenied || isCancellationApproved) && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Cancellation Request</Text>
              
              {hasPendingCancellation && (
                <View style={styles.cancellationRequestCard}>
                  <View style={styles.cancellationRequestHeader}>
                    <Ionicons name="hourglass" size={20} color="#FF9500" />
                    <Text style={styles.cancellationRequestTitle}>Request Pending</Text>
                  </View>
                  <Text style={styles.cancellationRequestText}>
                    Your cancellation request is pending approval from the health practitioner.
                  </Text>
                  <Text style={styles.cancellationRequestReason}>
                    Reason: {appointment.cancellation_reason || 'Not specified'}
                  </Text>
                  <Text style={styles.cancellationRequestTime}>
                    Requested: {formatDate(appointment.cancellation_requested_at)}
                  </Text>
                  <TouchableOpacity 
                    style={styles.withdrawButton}
                    onPress={withdrawCancellationRequest}
                    disabled={isLoading}
                  >
                    <Ionicons name="close" size={16} color="#FF3B30" />
                    <Text style={styles.withdrawButtonText}>Withdraw Request</Text>
                  </TouchableOpacity>
                </View>
              )}

              {isCancellationDenied && (
                <View style={styles.cancellationDeniedCard}>
                  <View style={styles.cancellationDeniedHeader}>
                    <Ionicons name="close-circle" size={20} color="#FF3B30" />
                    <Text style={styles.cancellationDeniedTitle}>Request Denied</Text>
                  </View>
                  <Text style={styles.cancellationDeniedText}>
                    Your cancellation request has been denied by the health practitioner.
                  </Text>
                  {appointment.cancellation_denial_reason && (
                    <Text style={styles.cancellationDenialReason}>
                      Reason: {appointment.cancellation_denial_reason}
                    </Text>
                  )}
                  <Text style={styles.cancellationDeniedSubtext}>
                    You can submit a new cancellation request if needed.
                  </Text>
                  <Text style={styles.cancellationRequestTime}>
                    Reviewed: {formatDate(appointment.cancellation_reviewed_at)}
                  </Text>
                </View>
              )}

              {isCancellationApproved && (
                <View style={styles.cancellationApprovedCard}>
                  <View style={styles.cancellationApprovedHeader}>
                    <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                    <Text style={styles.cancellationApprovedTitle}>Request Approved</Text>
                  </View>
                  <Text style={styles.cancellationApprovedText}>
                    Your cancellation request was approved and the appointment has been cancelled.
                  </Text>
                  <Text style={styles.cancellationRequestTime}>
                    Approved: {formatDate(appointment.cancellation_approved_at)}
                  </Text>
                </View>
              )}
            </View>
          )}
      
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

            {/* Family booking information */}
            {appointment?.is_family_booking && (
              <View style={styles.infoRow}>
                <View style={styles.infoIcon}>
                  <Ionicons name="people" size={20} color="#8B5CF6" />
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Patient</Text>
                  <Text style={[styles.infoValue, { color: '#8B5CF6' }]}>
                    {appointment.patient_name || 'Family Member'}
                  </Text>
                </View>
              </View>
            )}
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
                      formatDate(appointment.cancelled_at) : 
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
      
          {/* Action Buttons - Updated logic for cancellation requests */}
          {!isPast && !isCancelled && !isCancellationApproved && (
            <View style={styles.actionSection}>
              <TouchableOpacity 
                style={[
                  styles.rescheduleButton,
                  hasPendingCancellation && styles.disabledButton
                ]}
                onPress={handleReschedule}
                disabled={isLoading || hasPendingCancellation}
              >
                <Ionicons name="calendar-outline" size={20} color={hasPendingCancellation ? "#8E8E93" : "#0AD476"} />
                <Text style={[
                  styles.rescheduleButtonText,
                  hasPendingCancellation && styles.disabledButtonText
                ]}>Reschedule</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[
                  styles.cancelButton,
                  hasPendingCancellation && styles.disabledButton
                ]}
                onPress={handleCancelAppointment}
                disabled={isLoading || hasPendingCancellation}
              >
                <Ionicons name="close-circle-outline" size={20} color={hasPendingCancellation ? "#8E8E93" : "#FF3B30"} />
                <Text style={[
                  styles.cancelButtonText,
                  hasPendingCancellation && styles.disabledButtonText
                ]}>
                  {hasPendingCancellation ? 'Request Pending' : 'Request Cancellation'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
      
          {/* Cancel Appointment Modal - Updated for request flow */}
          <Modal
            visible={showCancelModal}
            transparent={true}
            animationType="slide"
            onRequestClose={() => setShowCancelModal(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Request Cancellation</Text>
                <Text style={styles.modalSubtitle}>
                  Submit a cancellation request for this appointment. The health practitioner will review and respond to your request.
                </Text>
                
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Reason for cancellation</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Please provide a reason for requesting cancellation..."
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
                    onPress={requestCancellation}
                    disabled={isLoading || !cancelReason.trim()}
                  >
                    {isLoading ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <Text style={styles.modalConfirmText}>Submit Request</Text>
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

  // Cancellation Request Styles
  cancellationRequestCard: {
    backgroundColor: '#FFF8E1',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9500',
    marginBottom: 10,
  },
  cancellationRequestHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  cancellationRequestTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF9500',
    marginLeft: 8,
  },
  cancellationRequestText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    lineHeight: 20,
  },
  cancellationRequestReason: {
    fontSize: 13,
    color: '#333',
    fontStyle: 'italic',
    marginBottom: 8,
  },
  cancellationRequestTime: {
    fontSize: 12,
    color: '#999',
    marginBottom: 12,
  },
  withdrawButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF5F5',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#FF3B30',
  },
  withdrawButtonText: {
    color: '#FF3B30',
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },

  cancellationDeniedCard: {
    backgroundColor: '#FFF5F5',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#FF3B30',
    marginBottom: 10,
  },
  cancellationDeniedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  cancellationDeniedTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF3B30',
    marginLeft: 8,
  },
  cancellationDeniedText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    lineHeight: 20,
  },
  cancellationDenialReason: {
    fontSize: 13,
    color: '#333',
    fontStyle: 'italic',
    marginBottom: 8,
  },
  cancellationDeniedSubtext: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
    marginBottom: 8,
  },

  cancellationApprovedCard: {
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#10B981',
    marginBottom: 10,
  },
  cancellationApprovedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  cancellationApprovedTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#10B981',
    marginLeft: 8,
  },
  cancellationApprovedText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    lineHeight: 20,
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

  // Disabled button styles
  disabledButton: {
    backgroundColor: '#F5F5F5',
    borderColor: '#E0E0E0',
    opacity: 0.6,
  },
  disabledButtonText: {
    color: '#8E8E93',
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
    backgroundColor: '#FF9500',
    alignItems: 'center',
  },
  modalConfirmText: {
    color: '#fff',
    fontWeight: '500',
    fontSize: 14,
  },
});