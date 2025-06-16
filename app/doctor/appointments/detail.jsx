// app/doctor/appointments/detail.jsx - FIXED VERSION WITH CONSISTENT PATIENT NAME LOGIC
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  ActivityIndicator, 
  Alert, 
  TextInput,
  Modal,
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { DatabaseService, Query } from '../../../configs/AppwriteConfig';
import { COLLECTIONS } from '../../../constants';
import { appointmentManager } from '../../../service/appointmentUtils';

const { width } = Dimensions.get('window');

const APPOINTMENT_STATUS = {
  BOOKED: 'Booked',
  CONFIRMED: 'Confirmed',
  RESCHEDULED: 'Rescheduled',
  CANCELLED: 'Cancelled',
  COMPLETED: 'Completed',
  NO_SHOW: 'No Show'
};

const TIME_SLOTS = [
  '9:00 AM', '9:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
  '2:00 PM', '2:30 PM', '3:00 PM', '3:30 PM', '4:00 PM', '4:30 PM', '5:00 PM'
];

export default function AppointmentDetail() {
  const { appointmentId } = useLocalSearchParams();
  const [appointment, setAppointment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [patientInfo, setPatientInfo] = useState(null);
  const [branchInfo, setBranchInfo] = useState(null);
  const [doctorInfo, setDoctorInfo] = useState(null);
  const [serviceInfo, setServiceInfo] = useState(null);
  
  // Reschedule modal states
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState(new Date());
  const [rescheduleTimeSlot, setRescheduleTimeSlot] = useState('');
  const [rescheduleReason, setRescheduleReason] = useState('');
  const [availableSlots, setAvailableSlots] = useState([]);
  const [rescheduleLoading, setRescheduleLoading] = useState(false);
  
  // Cancel modal states
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelLoading, setCancelLoading] = useState(false);

  useEffect(() => {
    if (appointmentId) {
      loadAppointmentDetails();
    }
  }, [appointmentId]);

  const loadAppointmentDetails = async () => {
    try {
      setLoading(true);
      
      // Get appointment details
      const appointmentData = await appointmentManager.getAppointment(appointmentId);
      setAppointment(appointmentData);
      
      // Load related data
      await Promise.all([
        fetchPatientInfo(appointmentData),
        fetchBranchInfo(appointmentData.branch_id),
        fetchDoctorInfo(appointmentData.doctor_id),
        fetchServiceInfo(appointmentData.service_id)
      ]);
      
    } catch (error) {
      console.error('Error loading appointment details:', error);
      Alert.alert('Error', 'Failed to load appointment details');
    } finally {
      setLoading(false);
    }
  };

  // FIXED: Consistent patient info fetching logic matching the list view
  const fetchPatientInfo = async (appointmentData) => {
    try {
      console.log('Fetching patient info for appointment:', appointmentData.$id);
      console.log('Is family booking:', appointmentData?.is_family_booking);
      console.log('Patient name from appointment:', appointmentData?.patient_name);
      console.log('Patient ID from appointment:', appointmentData?.patient_id);
      console.log('User ID from appointment:', appointmentData?.user_id);
      
      let patientData = null;
      let patientName = 'Unknown Patient';
      
      // Use the same logic as the list view for consistency
      if (appointmentData.is_family_booking && appointmentData.patient_name) {
        // Family booking with patient name - use it directly
        patientName = appointmentData.patient_name;
        
        // Try to get additional details if patient_id exists
        if (appointmentData.patient_id) {
          try {
            const patientResponse = await DatabaseService.listDocuments(
              COLLECTIONS.PATIENT_PROFILES,
              [Query.equal('$id', appointmentData.patient_id)]
            );
            
            if (patientResponse.documents && patientResponse.documents.length > 0) {
              patientData = patientResponse.documents[0];
              // Keep the name from appointment but get other details from profile
              patientData.displayName = patientName;
            }
          } catch (error) {
            console.log('Could not fetch patient profile details');
          }
        }
      } 
      else if (appointmentData.is_family_booking && appointmentData.patient_id) {
        // Family booking with patient_id but no name
        try {
          const patientResponse = await DatabaseService.listDocuments(
            COLLECTIONS.PATIENT_PROFILES,
            [Query.equal('$id', appointmentData.patient_id)]
          );
          
          if (patientResponse.documents && patientResponse.documents.length > 0) {
            patientData = patientResponse.documents[0];
            patientName = patientData.fullName || patientData.name || patientData.displayName || 'Family Member';
          } else {
            patientName = 'Family Member';
          }
        } catch (error) {
          patientName = 'Family Member';
        }
      }
      else if (appointmentData.user_id) {
        // Regular booking - fetch by user_id
        try {
          const usersResponse = await DatabaseService.listDocuments(
            COLLECTIONS.PATIENT_PROFILES,
            [Query.equal('userId', appointmentData.user_id)]
          );
          
          if (usersResponse.documents && usersResponse.documents.length > 0) {
            patientData = usersResponse.documents[0];
            patientName = patientData.fullName || patientData.name || patientData.displayName || 
              (appointmentData.user_id.includes('@') ? appointmentData.user_id.split('@')[0].replace(/[._-]/g, ' ') : 
               `Patient ${appointmentData.user_id.substring(0, 8)}`);
          } else {
            patientName = appointmentData.user_id.includes('@') ? 
              appointmentData.user_id.split('@')[0].replace(/[._-]/g, ' ') : 
              `Patient ${appointmentData.user_id.substring(0, 8)}`;
          }
        } catch (error) {
          patientName = `Patient ${appointmentData.user_id.substring(0, 8)}`;
        }
      }
      
      // Create final patient info object
      const finalPatientInfo = {
        ...patientData,
        displayName: patientName,
        fullName: patientName,
        name: patientName,
        phone: patientData?.phoneNumber || patientData?.phone || 'Not provided',
        age: patientData?.age || 'Not provided',
        gender: patientData?.gender || 'Not provided',
        bookingType: appointmentData?.is_family_booking ? 'Family Member' : 'Account Holder',
        accountHolder: appointmentData?.user_id || 'Not provided'
      };
      
      setPatientInfo(finalPatientInfo);
      console.log('Final patient info set:', finalPatientInfo);
      
    } catch (error) {
      console.error('Error fetching patient info:', error);
      // Fallback to appointment data
      setPatientInfo({
        displayName: appointmentData?.patient_name || 'Unknown Patient',
        fullName: appointmentData?.patient_name || 'Unknown Patient',
        name: appointmentData?.patient_name || 'Unknown Patient', 
        phone: 'Not provided',
        age: 'Not provided',
        gender: 'Not provided',
        bookingType: appointmentData?.is_family_booking ? 'Family Member' : 'Account Holder',
        accountHolder: appointmentData?.user_id || 'Not provided'
      });
    }
  };

  // FIXED: Updated branch fetching logic
  const fetchBranchInfo = async (branchId) => {
    try {
      console.log('Fetching branch info for branch ID:', branchId);
      
      let branch = null;
      try {
        // Method 1: Try to get branch by document ID first
        branch = await DatabaseService.getDocument(COLLECTIONS.BRANCHES, branchId);
        console.log('Found branch by document ID:', branch);
      } catch (docError) {
        console.log('Branch not found by document ID, trying branch_id field...');
        
        // Method 2: Try to find by branch_id field
        const response = await DatabaseService.listDocuments(
          COLLECTIONS.BRANCHES,
          [Query.equal('branch_id', String(branchId))]
        );
        
        if (response.documents && response.documents.length > 0) {
          branch = response.documents[0];
          console.log('Found branch by branch_id field:', branch);
        }
      }
      
      if (branch) {
        let regionInfo = null;
        if (branch.region_id && branch.region_id !== null) {
          try {
            console.log('Fetching region info for region_id:', branch.region_id);
            
            const regionResponse = await DatabaseService.listDocuments(
              COLLECTIONS.REGIONS,
              [Query.equal('region_id', String(branch.region_id))]
            );
            
            if (regionResponse.documents && regionResponse.documents.length > 0) {
              regionInfo = regionResponse.documents[0];
              console.log('Found region info:', regionInfo);
            } else {
              // Fallback to hardcoded regions
              const hardcodedRegions = {
                'tawau': 'Tawau',
                'semporna': 'Semporna', 
                'kota_kinabalu': 'Kota Kinabalu',
              };
              regionInfo = { name: hardcodedRegions[branch.region_id] || branch.region_id };
            }
          } catch (regionError) {
            console.error('Error fetching region info:', regionError);
            const hardcodedRegions = {
              'tawau': 'Tawau',
              'semporna': 'Semporna', 
              'kota_kinabalu': 'Kota Kinabalu',
            };
            regionInfo = { name: hardcodedRegions[branch.region_id] || branch.region_id };
          }
        }
        
        setBranchInfo({
          ...branch,
          regionName: regionInfo?.name || 'Unknown Region'
        });
      } else {
        console.log('No branch found with ID:', branchId);
        setBranchInfo({
          name: 'Unknown Branch',
          regionName: 'Unknown Region',
          address: 'Address not available',
          phone: 'Not provided'
        });
      }
    } catch (error) {
      console.error('Error fetching branch info:', error);
      setBranchInfo({
        name: 'Unknown Branch',
        regionName: 'Unknown Region', 
        address: 'Address not available',
        phone: 'Not provided'
      });
    }
  };

  const fetchDoctorInfo = async (doctorId) => {
    try {
      const response = await DatabaseService.listDocuments(
        COLLECTIONS.DOCTORS,
        [Query.equal('$id', doctorId)]
      );
      
      if (response.documents && response.documents.length > 0) {
        setDoctorInfo(response.documents[0]);
      }
    } catch (error) {
      console.error('Error fetching doctor info:', error);
    }
  };

  const fetchServiceInfo = async (serviceId) => {
    try {
      const response = await DatabaseService.listDocuments(
        COLLECTIONS.SERVICES,
        [Query.equal('service_id', serviceId)]
      );
      
      if (response.documents && response.documents.length > 0) {
        setServiceInfo(response.documents[0]);
      }
    } catch (error) {
      console.error('Error fetching service info:', error);
    }
  };

  const getStatusInfo = (status) => {
    switch (status) {
      case APPOINTMENT_STATUS.CONFIRMED:
        return { color: '#0AD476', bgColor: '#F0FDF4', text: 'Confirmed', icon: 'checkmark-circle' };
      case APPOINTMENT_STATUS.COMPLETED:
        return { color: '#3B82F6', bgColor: '#EFF6FF', text: 'Completed', icon: 'checkmark-done-circle' };
      case APPOINTMENT_STATUS.CANCELLED:
        return { color: '#EF4444', bgColor: '#FEF2F2', text: 'Cancelled', icon: 'close-circle' };
      case APPOINTMENT_STATUS.RESCHEDULED:
        return { color: '#F59E0B', bgColor: '#FFFBEB', text: 'Rescheduled', icon: 'refresh-circle' };
      case APPOINTMENT_STATUS.NO_SHOW:
        return { color: '#8B5CF6', bgColor: '#F5F3FF', text: 'No Show', icon: 'alert-circle' };
      default:
        return { color: '#6B7280', bgColor: '#F9FAFB', text: 'Booked', icon: 'calendar' };
    }
  };

  const formatDateForDisplay = (date) => {
    if (date instanceof Date) {
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      
      return `${days[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
    }
    return date;
  };

  const loadAvailableSlots = async (selectedDate) => {
    if (!appointment?.doctor_id || !selectedDate) return;
    
    try {
      const formattedDate = formatDateForDisplay(selectedDate);
      const bookedSlots = await appointmentManager.getBookedSlots(
        appointment.doctor_id, 
        formattedDate, 
        appointmentId // Exclude current appointment
      );
      
      const available = TIME_SLOTS.filter(slot => !bookedSlots.includes(slot));
      setAvailableSlots(available);
    } catch (error) {
      console.error('Error loading available slots:', error);
      setAvailableSlots(TIME_SLOTS); // Fallback to all slots
    }
  };

  const handleReschedule = async () => {
    if (!rescheduleTimeSlot) {
      Alert.alert('Error', 'Please select a time slot');
      return;
    }

    try {
      setRescheduleLoading(true);
      
      const result = await appointmentManager.rescheduleAppointment(
        appointmentId,
        rescheduleDate,
        rescheduleTimeSlot,
        rescheduleReason
      );

      if (result.success) {
        Alert.alert(
          'Success', 
          'Appointment has been rescheduled successfully',
          [{ text: 'OK', onPress: () => {
            setShowRescheduleModal(false);
            loadAppointmentDetails(); // Reload appointment details
          }}]
        );
      } else {
        Alert.alert('Error', result.error || 'Failed to reschedule appointment');
      }
    } catch (error) {
      console.error('Error rescheduling appointment:', error);
      Alert.alert('Error', 'Failed to reschedule appointment');
    } finally {
      setRescheduleLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!cancelReason.trim()) {
      Alert.alert('Error', 'Please provide a reason for cancellation');
      return;
    }

    Alert.alert(
      'Confirm Cancellation',
      'Are you sure you want to cancel this appointment? This action cannot be undone.',
      [
        { text: 'No', style: 'cancel' },
        { text: 'Yes, Cancel', style: 'destructive', onPress: performCancellation }
      ]
    );
  };

  const performCancellation = async () => {
    try {
      setCancelLoading(true);
      
      const result = await appointmentManager.cancelAppointment(
        appointmentId,
        cancelReason,
        'doctor'
      );

      if (result.success) {
        Alert.alert(
          'Success', 
          'Appointment has been cancelled successfully',
          [{ text: 'OK', onPress: () => {
            setShowCancelModal(false);
            loadAppointmentDetails(); // Reload appointment details
          }}]
        );
      } else {
        Alert.alert('Error', result.error || 'Failed to cancel appointment');
      }
    } catch (error) {
      console.error('Error cancelling appointment:', error);
      Alert.alert('Error', 'Failed to cancel appointment');
    } finally {
      setCancelLoading(false);
    }
  };

  const handleStatusUpdate = (newStatus) => {
    Alert.alert(
      'Update Status',
      `Change appointment status to "${newStatus}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Update', onPress: () => updateAppointmentStatus(newStatus) }
      ]
    );
  };

  const updateAppointmentStatus = async (newStatus) => {
    try {
      await DatabaseService.updateDocument(
        COLLECTIONS.APPOINTMENTS,
        appointmentId,
        { status: newStatus }
      );
      
      Alert.alert('Success', 'Appointment status updated successfully');
      loadAppointmentDetails();
    } catch (error) {
      console.error('Error updating status:', error);
      Alert.alert('Error', 'Failed to update appointment status');
    }
  };

  const openRescheduleModal = () => {
    if (appointment?.status === APPOINTMENT_STATUS.CANCELLED || 
        appointment?.status === APPOINTMENT_STATUS.COMPLETED) {
      Alert.alert('Error', 'Cannot reschedule a cancelled or completed appointment');
      return;
    }
    
    setRescheduleDate(new Date());
    setRescheduleTimeSlot('');
    setRescheduleReason('');
    loadAvailableSlots(new Date());
    setShowRescheduleModal(true);
  };

  const openCancelModal = () => {
    if (appointment?.status === APPOINTMENT_STATUS.CANCELLED) {
      Alert.alert('Info', 'This appointment is already cancelled');
      return;
    }
    
    if (appointment?.status === APPOINTMENT_STATUS.COMPLETED) {
      Alert.alert('Error', 'Cannot cancel a completed appointment');
      return;
    }
    
    setCancelReason('');
    setShowCancelModal(true);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1a8e2d" />
        <Text style={styles.loadingText}>Loading appointment details...</Text>
      </View>
    );
  }

  if (!appointment) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={50} color="#EF4444" />
        <Text style={styles.errorText}>Appointment not found</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const statusInfo = getStatusInfo(appointment.status);

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient 
        colors={["#1a8e2d", "#146922"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity 
            style={styles.backButtonHeader}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Appointment Details</Text>
            <Text style={styles.headerSubtitle}>
              ID: {appointment.$id.substring(0, 8)}
            </Text>
          </View>
          
          <TouchableOpacity 
            style={styles.refreshButton} 
            onPress={loadAppointmentDetails}
          >
            <Ionicons name="refresh" size={24} color="white" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Status Card */}
        <View style={styles.statusCard}>
          <View style={[styles.statusIndicator, { backgroundColor: statusInfo.color }]} />
          <View style={styles.statusContent}>
            <View style={styles.statusHeader}>
              <View style={[styles.statusBadge, { backgroundColor: statusInfo.bgColor }]}>
                <Ionicons name={statusInfo.icon} size={16} color={statusInfo.color} />
                <Text style={[styles.statusText, { color: statusInfo.color }]}>
                  {statusInfo.text}
                </Text>
              </View>
              <Text style={styles.appointmentDate}>{appointment.date}</Text>
            </View>
            <Text style={styles.appointmentTime}>{appointment.time_slot}</Text>
          </View>
        </View>

        {/* Patient Information */}
        <View style={styles.infoCard}>
          <View style={styles.cardHeader}>
            <Ionicons name="person" size={20} color="#1a8e2d" />
            <Text style={styles.cardTitle}>Patient Information</Text>
            {appointment?.is_family_booking && (
              <View style={styles.familyBadge}>
                <Ionicons name="people" size={14} color="#8B5CF6" />
                <Text style={styles.familyBadgeText}>Family</Text>
              </View>
            )}
          </View>
          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Patient Name</Text>
              <Text style={styles.infoValue}>
                {patientInfo?.displayName || patientInfo?.fullName || patientInfo?.name || 'Unknown Patient'}
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Booking Type</Text>
              <Text style={[styles.infoValue, { 
                color: appointment?.is_family_booking ? '#8B5CF6' : '#1a8e2d',
                fontWeight: 'bold' 
              }]}>
                {patientInfo?.bookingType || (appointment?.is_family_booking ? 'Family Member' : 'Account Holder')}
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Account Holder</Text>
              <Text style={styles.infoValue}>
                {patientInfo?.accountHolder || appointment?.user_id || 'Not provided'}
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Phone</Text>
              <Text style={styles.infoValue}>
                {patientInfo?.phone || 'Not provided'}
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Age</Text>
              <Text style={styles.infoValue}>
                {patientInfo?.age || 'Not provided'}
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Gender</Text>
              <Text style={styles.infoValue}>
                {patientInfo?.gender || 'Not provided'}
              </Text>
            </View>
          </View>
        </View>

        {/* Service Information */}
        <View style={styles.infoCard}>
          <View style={styles.cardHeader}>
            <Ionicons name="medical" size={20} color="#1a8e2d" />
            <Text style={styles.cardTitle}>Service Information</Text>
          </View>
          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Service</Text>
              <Text style={styles.infoValue}>
                {appointment.service_name || serviceInfo?.name || 'General Consultation'}
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Duration</Text>
              <Text style={styles.infoValue}>
                {serviceInfo?.duration || 'Approximately 30 minutes'}
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Fee</Text>
              <Text style={styles.infoValue}>
                {serviceInfo?.fee || 'Standard consultation fee'}
              </Text>
            </View>
          </View>
        </View>

        {/* Branch Information */}
        <View style={styles.infoCard}>
          <View style={styles.cardHeader}>
            <Ionicons name="business" size={20} color="#1a8e2d" />
            <Text style={styles.cardTitle}>Branch Information</Text>
          </View>
          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Branch</Text>
              <Text style={styles.infoValue}>
                {branchInfo?.name || 'Unknown Branch'}
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Region</Text>
              <Text style={styles.infoValue}>
                {branchInfo?.regionName || 'Unknown Region'}
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Address</Text>
              <Text style={styles.infoValue}>
                {branchInfo?.address || 'Address not available'}
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Phone</Text>
              <Text style={styles.infoValue}>
                {branchInfo?.phone || 'Not provided'}
              </Text>
            </View>
          </View>
        </View>

        {/* Doctor Information */}
        {doctorInfo && (
          <View style={styles.infoCard}>
            <View style={styles.cardHeader}>
              <Ionicons name="medical-outline" size={20} color="#1a8e2d" />
              <Text style={styles.cardTitle}>Doctor Information</Text>
            </View>
            <View style={styles.infoGrid}>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Doctor</Text>
                <Text style={styles.infoValue}>
                  {doctorInfo.name || 'Unknown Doctor'}
                </Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Specialty</Text>
                <Text style={styles.infoValue}>
                  {doctorInfo.specialty || 'General Medicine'}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Prescription Status */}
        <View style={styles.infoCard}>
        <View style={styles.cardHeader}>
            <Ionicons name="document-text" size={20} color="#1a8e2d" />
            <Text style={styles.cardTitle}>Prescription Status</Text>
        </View>
        <View style={styles.prescriptionStatus}>
            <View style={[
            styles.prescriptionBadge,
            { backgroundColor: appointment.has_prescription ? '#F0FDF4' : '#FEF2F2' }
            ]}>
            <Ionicons 
                name={appointment.has_prescription ? "checkmark-circle" : "close-circle"} 
                size={16} 
                color={appointment.has_prescription ? '#0AD476' : '#EF4444'} 
            />
            <Text style={[
                styles.prescriptionText,
                { color: appointment.has_prescription ? '#0AD476' : '#EF4444' }
            ]}>
                {appointment.has_prescription ? 'Prescription Added' : 'No Prescription'}
            </Text>
            </View>
            
            {/* Conditional rendering based on appointment status */}
            {appointment.status === APPOINTMENT_STATUS.COMPLETED ? (
            // Appointment is completed - show prescription actions
            !appointment.has_prescription ? (
                <TouchableOpacity 
                style={styles.addPrescriptionButton}
                onPress={() => router.push({
                    pathname: '/doctor/prescriptions/create',
                    params: { appointmentId: appointment.$id }
                })}
                >
                <Ionicons name="add" size={16} color="white" />
                <Text style={styles.addPrescriptionText}>Add Prescription</Text>
                </TouchableOpacity>
            ) : (
                <TouchableOpacity 
                style={styles.viewPrescriptionButton}
                onPress={() => router.push({
                    pathname: '/doctor/prescriptions/view',
                    params: { appointmentId: appointment.$id }
                })}
                >
                <Ionicons name="eye" size={16} color="#1a8e2d" />
                <Text style={styles.viewPrescriptionText}>View Prescription</Text>
                </TouchableOpacity>
            )
            ) : (
            // Appointment is not completed - show status message
            <View style={styles.prescriptionDisabledContainer}>
                <View style={styles.prescriptionDisabledBadge}>
                <Ionicons name="time" size={14} color="#F59E0B" />
                <Text style={styles.prescriptionDisabledText}>
                    {appointment.status === APPOINTMENT_STATUS.CANCELLED ? 
                    'Appointment Cancelled' :
                    appointment.status === APPOINTMENT_STATUS.NO_SHOW ?
                    'Patient No Show' :
                    'Complete appointment first'
                    }
                </Text>
                </View>
                <Text style={styles.prescriptionDisabledSubtext}>
                {appointment.status === APPOINTMENT_STATUS.CANCELLED || 
                appointment.status === APPOINTMENT_STATUS.NO_SHOW ? 
                    'Cannot create prescription' :
                    'Mark as completed to add prescription'
                }
                </Text>
            </View>
            )}
        </View>
        
        {/* Helper text for better UX */}
        {appointment.status !== APPOINTMENT_STATUS.COMPLETED && 
        appointment.status !== APPOINTMENT_STATUS.CANCELLED && 
        appointment.status !== APPOINTMENT_STATUS.NO_SHOW && (
            <View style={styles.prescriptionHelpContainer}>
            <Ionicons name="information-circle" size={16} color="#6B7280" />
            <Text style={styles.prescriptionHelpText}>
                Use the "Complete" button above to mark this appointment as finished, then you can add a prescription.
            </Text>
            </View>
        )}
        </View>

        {/* Quick Status Updates */}
        <View style={styles.infoCard}>
        <View style={styles.cardHeader}>
            <Ionicons name="settings" size={20} color="#1a8e2d" />
            <Text style={styles.cardTitle}>Quick Status Updates</Text>
            {/* Show hint if appointment needs to be completed for prescription */}
            {appointment.status !== APPOINTMENT_STATUS.COMPLETED && 
            appointment.status !== APPOINTMENT_STATUS.CANCELLED && 
            appointment.status !== APPOINTMENT_STATUS.NO_SHOW && (
            <View style={styles.prescriptionPendingBadge}>
                <Ionicons name="medical" size={12} color="#8B5CF6" />
                <Text style={styles.prescriptionPendingText}>Prescription pending</Text>
            </View>
            )}
        </View>
        <View style={styles.statusButtons}>
            <TouchableOpacity 
            style={[styles.statusButton, { backgroundColor: '#F0FDF4' }]}
            onPress={() => handleStatusUpdate(APPOINTMENT_STATUS.CONFIRMED)}
            disabled={appointment.status === APPOINTMENT_STATUS.CONFIRMED}
            >
            <Ionicons name="checkmark-circle" size={16} color="#0AD476" />
            <Text style={[styles.statusButtonText, { color: '#0AD476' }]}>Confirm</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
            style={[
                styles.statusButton, 
                { 
                backgroundColor: appointment.status !== APPOINTMENT_STATUS.COMPLETED ? '#EFF6FF' : '#E0E7FF',
                borderWidth: appointment.status !== APPOINTMENT_STATUS.COMPLETED ? 2 : 0,
                borderColor: appointment.status !== APPOINTMENT_STATUS.COMPLETED ? '#3B82F6' : 'transparent'
                }
            ]}
            onPress={() => handleStatusUpdate(APPOINTMENT_STATUS.COMPLETED)}
            disabled={appointment.status === APPOINTMENT_STATUS.COMPLETED}
            >
            <Ionicons name="checkmark-done-circle" size={16} color="#3B82F6" />
            <Text style={[styles.statusButtonText, { 
                color: '#3B82F6',
                fontWeight: appointment.status !== APPOINTMENT_STATUS.COMPLETED ? 'bold' : '600'
            }]}>
                Complete
                {appointment.status !== APPOINTMENT_STATUS.COMPLETED && (
                <Text style={styles.completeHintText}> ✨</Text>
                )}
            </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
            style={[styles.statusButton, { backgroundColor: '#F5F3FF' }]}
            onPress={() => handleStatusUpdate(APPOINTMENT_STATUS.NO_SHOW)}
            disabled={appointment.status === APPOINTMENT_STATUS.NO_SHOW}
            >
            <Ionicons name="alert-circle" size={16} color="#8B5CF6" />
            <Text style={[styles.statusButtonText, { color: '#8B5CF6' }]}>No Show</Text>
            </TouchableOpacity>
        </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={styles.rescheduleButton}
            onPress={openRescheduleModal}
          >
            <Ionicons name="calendar" size={18} color="white" />
            <Text style={styles.rescheduleButtonText}>Reschedule</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.cancelButton}
            onPress={openCancelModal}
          >
            <Ionicons name="close-circle" size={18} color="white" />
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Reschedule Modal */}
      <Modal
        visible={showRescheduleModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowRescheduleModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Reschedule Appointment</Text>
              <TouchableOpacity onPress={() => setShowRescheduleModal(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={styles.modalSectionTitle}>Select New Date</Text>
              <Text style={styles.modalNote}>
                Current: {appointment.date} at {appointment.time_slot}
              </Text>
              
              <Text style={styles.modalSectionTitle}>Available Time Slots</Text>
              <View style={styles.timeSlotsGrid}>
                {availableSlots.map((slot) => (
                  <TouchableOpacity
                    key={slot}
                    style={[
                      styles.timeSlot,
                      rescheduleTimeSlot === slot && styles.selectedTimeSlot
                    ]}
                    onPress={() => setRescheduleTimeSlot(slot)}
                  >
                    <Text style={[
                      styles.timeSlotText,
                      rescheduleTimeSlot === slot && styles.selectedTimeSlotText
                    ]}>
                      {slot}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.modalSectionTitle}>Reason for Rescheduling</Text>
              <TextInput
                style={styles.reasonInput}
                multiline
                numberOfLines={3}
                placeholder="Enter reason for rescheduling..."
                value={rescheduleReason}
                onChangeText={setRescheduleReason}
              />
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowRescheduleModal(false)}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.modalConfirmButton}
                onPress={handleReschedule}
                disabled={rescheduleLoading || !rescheduleTimeSlot}
              >
                {rescheduleLoading ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={styles.modalConfirmButtonText}>Reschedule</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Cancel Modal */}
      <Modal
        visible={showCancelModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCancelModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Cancel Appointment</Text>
              <TouchableOpacity onPress={() => setShowCancelModal(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.modalNote}>
                Are you sure you want to cancel this appointment?
              </Text>
              <Text style={styles.appointmentInfo}>
                {patientInfo?.displayName || patientInfo?.fullName || 'Unknown Patient'} • {appointment.date} at {appointment.time_slot}
              </Text>
              
              <Text style={styles.modalSectionTitle}>Reason for Cancellation</Text>
              <TextInput
                style={styles.reasonInput}
                multiline
                numberOfLines={3}
                placeholder="Enter reason for cancellation..."
                value={cancelReason}
                onChangeText={setCancelReason}
              />
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowCancelModal(false)}
              >
                <Text style={styles.modalCancelButtonText}>Keep Appointment</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.modalDeleteButton}
                onPress={handleCancel}
                disabled={cancelLoading}
              >
                {cancelLoading ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={styles.modalDeleteButtonText}>Cancel Appointment</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

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
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#666',
    marginVertical: 16,
  },
  
  // Header
  header: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButtonHeader: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // Content
  content: {
    flex: 1,
    padding: 20,
  },
  
  // Status Card
  statusCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusIndicator: {
    height: 4,
    width: '100%',
  },
  statusContent: {
    padding: 20,
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  appointmentDate: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  appointmentTime: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  
  // Info Cards
  infoCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
    flex: 1,
  },
  infoGrid: {
    gap: 12,
  },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 4,
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
    flex: 1,
  },
  infoValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
    flex: 2,
    textAlign: 'right',
  },
  
  // Family booking badge
  familyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F3FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  familyBadgeText: {
    fontSize: 12,
    color: '#8B5CF6',
    fontWeight: '600',
  },
  
  // Prescription Status
  prescriptionStatus: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  prescriptionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 6,
    flex: 1,
  },
  prescriptionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  addPrescriptionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0AD476',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
    marginLeft: 12,
  },
  addPrescriptionText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  viewPrescriptionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1a8e2d',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
    marginLeft: 12,
  },
  viewPrescriptionText: {
    color: '#1a8e2d',
    fontSize: 12,
    fontWeight: '600',
  },
  // Prescription disabled states
prescriptionDisabledContainer: {
  flex: 1,
  alignItems: 'flex-end',
},
prescriptionDisabledBadge: {
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: '#FFFBEB',
  paddingHorizontal: 10,
  paddingVertical: 6,
  borderRadius: 12,
  gap: 4,
  marginBottom: 4,
},
prescriptionDisabledText: {
  fontSize: 12,
  color: '#F59E0B',
  fontWeight: '600',
},
prescriptionDisabledSubtext: {
  fontSize: 10,
  color: '#9CA3AF',
  fontStyle: 'italic',
  textAlign: 'right',
},

// Help container
prescriptionHelpContainer: {
  flexDirection: 'row',
  alignItems: 'flex-start',
  backgroundColor: '#F9FAFB',
  padding: 12,
  borderRadius: 8,
  marginTop: 12,
  gap: 8,
},
prescriptionHelpText: {
  fontSize: 13,
  color: '#6B7280',
  lineHeight: 18,
  flex: 1,
},
  
  // Status Buttons
  statusButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  statusButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 4,
  },
  statusButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },

  prescriptionPendingBadge: {
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: '#F5F3FF',
  paddingHorizontal: 8,
  paddingVertical: 4,
  borderRadius: 8,
  gap: 4,
},
prescriptionPendingText: {
  fontSize: 11,
  color: '#8B5CF6',
  fontWeight: '600',
},
completeHintText: {
  fontSize: 12,
  color: '#F59E0B',
},
  
  // Action Buttons
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  rescheduleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F59E0B',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  rescheduleButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EF4444',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  cancelButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  modalBody: {
    padding: 20,
  },
  modalSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    marginTop: 16,
  },
  modalNote: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    lineHeight: 20,
  },
  appointmentInfo: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
    backgroundColor: '#F8F9FA',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  
  // Time Slots
  timeSlotsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  timeSlot: {
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    minWidth: 80,
    alignItems: 'center',
  },
  selectedTimeSlot: {
    backgroundColor: '#F0FDF4',
    borderColor: '#1a8e2d',
  },
  timeSlotText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  selectedTimeSlotText: {
    color: '#1a8e2d',
    fontWeight: '600',
  },
  
  // Inputs
  reasonInput: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#333',
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  
  // Modal Footer
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  modalCancelButton: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalCancelButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  modalConfirmButton: {
    flex: 1,
    backgroundColor: '#1a8e2d',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalConfirmButtonText: {
    fontSize: 14,
    color: 'white',
    fontWeight: '600',
  },
  modalDeleteButton: {
    flex: 1,
    backgroundColor: '#EF4444',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalDeleteButtonText: {
    fontSize: 14,
    color: 'white',
    fontWeight: '600',
  },
  
  // Back Button (for error state)
  backButton: {
    backgroundColor: '#1a8e2d',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  backButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});