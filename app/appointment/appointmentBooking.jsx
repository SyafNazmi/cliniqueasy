// app/appointment/appointmentBooking.jsx - Fixed with Focus Refresh
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  SafeAreaView, 
  ActivityIndicator, 
  Alert, 
  Image, 
  StyleSheet,
  ScrollView,
  Modal
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native'; // ADD: Import useFocusEffect
import { DatabaseService, AuthService, Query, RealtimeService, account } from '../../configs/AppwriteConfig';
import { doctorImages, COLLECTIONS, getDoctorsForBranch, PROFILE_TYPES } from '../../constants';
import PageHeader from '../../components/PageHeader';
import { appointmentManager, APPOINTMENT_STATUS } from '../../service/appointmentUtils';
import { Ionicons } from '@expo/vector-icons';

const AppointmentBooking = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  
  // Debugging params received
  console.log('Received params:', params);
  
  // FIXED: Handle both serviceId and service_id parameter names
  const branchId = String(params.branchId);
  const branchName = params.branchName;
  const service_id = String(params.serviceId || params.service_id || '');
  const serviceName = params.serviceName;
  
  console.log('Processed params:', { branchId, service_id, serviceName, branchName });
  
  const [doctors, setDoctors] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState(null);
  const [error, setError] = useState(null);
  const [serviceData, setServiceData] = useState(null);
  const [bookedSlots, setBookedSlots] = useState({});
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [realtimeSubscription, setRealtimeSubscription] = useState(null);
  
  // FAMILY BOOKING STATES
  const [availableProfiles, setAvailableProfiles] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [showPatientModal, setShowPatientModal] = useState(false);
  const [loadingProfiles, setLoadingProfiles] = useState(true);
  
  // NEW: Add state for profile validation
  const [profileComplete, setProfileComplete] = useState(false);
  const [profileCheckLoading, setProfileCheckLoading] = useState(true);
  
  // NEW: Ref to track component mount state
  const isComponentMountedRef = useRef(true);
  
  // Service details based on service ID
  const serviceDetails = {
    '1': { 
      duration: 'Approximately 45 minutes',
      fee: 'RM 120, Non-refundable'
    },
    '2': { 
      duration: 'Approximately 30 minutes',
      fee: 'RM 80, Non-refundable'
    },
    '3': { 
      duration: 'Approximately 20 minutes',
      fee: 'RM 60, Non-refundable'
    }
  };

  // Generate dates for the next 7 days
  const dates = Array.from({ length: 7 }).map((_, i) => {
    const date = new Date();
    date.setDate(date.getDate() + i);
    return date;
  });

  // Time slots
  const timeSlots = ['8:30 AM', '9:00 AM', '9:30 AM', '10:00 AM', '2:00 PM', '3:00 PM', '4:00 PM'];

  // Format date for comparison
  const formatDateForQuery = (date) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    return `${days[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
  };

  // ENHANCED: Profile validation function - extracted for reuse
  const checkProfileBeforeBooking = useCallback(async () => {
    if (!isComponentMountedRef.current) return false;
    
    try {
      setProfileCheckLoading(true);
      const currentUser = await AuthService.getCurrentUser();
      
      if (!currentUser) {
        router.replace('/login/signIn');
        return false;
      }
      
      const response = await DatabaseService.listDocuments(
        COLLECTIONS.PATIENT_PROFILES,
        [Query.equal('userId', currentUser.$id)],
        1
      );
      
      if (!isComponentMountedRef.current) return false;
      
      if (response.documents.length === 0) {
        // No profile found - redirect to profile creation
        Alert.alert(
          "Profile Required",
          "Please complete your patient profile before booking an appointment.",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Create Profile", onPress: () => router.push('/profile') }
          ]
        );
        setProfileComplete(false);
        return false;
      }
      
      // Check for required fields
      const profile = response.documents[0];
      const requiredFields = ['email', 'phoneNumber', 'fullName', 'gender', 'birthDate', 'address'];
      const missingFields = requiredFields.filter(field => !profile[field]);
      
      if (missingFields.length > 0) {
        Alert.alert(
          "Incomplete Profile",
          `Please complete these required fields: ${missingFields.join(', ')}`,
          [
            { text: "Cancel", style: "cancel" },
            { text: "Update Profile", onPress: () => router.push('/profile') }
          ]
        );
        setProfileComplete(false);
        return false;
      }
      
      // Profile is complete
      console.log("Profile validation passed");
      setProfileComplete(true);
      return true;
      
    } catch (error) {
      console.error('Error checking profile:', error);
      setProfileComplete(false);
      return false;
    } finally {
      if (isComponentMountedRef.current) {
        setProfileCheckLoading(false);
      }
    }
  }, [router]);

  // ENHANCED: Load available profiles function - extracted for reuse
  const loadAvailableProfiles = useCallback(async () => {
    if (!isComponentMountedRef.current) return;
    
    try {
      setLoadingProfiles(true);
      const user = await account.get();
      
      if (!user || !isComponentMountedRef.current) return;
      
      // Get all profiles for this user
      const response = await DatabaseService.listDocuments(
        COLLECTIONS.PATIENT_PROFILES,
        [DatabaseService.createQuery('equal', 'userId', user.$id)],
        100
      );

      if (!isComponentMountedRef.current) return;

      const allProfiles = response.documents || [];
      
      // Create display profiles with enhanced logic
      const profiles = allProfiles.map(profile => ({
        ...profile,
        displayName: profile.fullName || 'Unnamed',
        isOwner: profile.email === user.email || profile.profileType === PROFILE_TYPES.OWNER
      }));

      console.log('Available profiles for booking:', profiles);
      setAvailableProfiles(profiles);
      
      // Auto-select owner profile if available
      const ownerProfile = profiles.find(p => p.isOwner);
      if (ownerProfile) {
        setSelectedPatient(ownerProfile);
      } else if (profiles.length > 0) {
        setSelectedPatient(profiles[0]);
      }

    } catch (error) {
      console.error('Error loading profiles:', error);
      if (isComponentMountedRef.current) {
        Alert.alert('Error', 'Failed to load family profiles. Please try again.');
      }
    } finally {
      if (isComponentMountedRef.current) {
        setLoadingProfiles(false);
      }
    }
  }, []);

  // ENHANCED: Load all initial data function
  const loadInitialData = useCallback(async () => {
    if (!isComponentMountedRef.current) return;
    
    try {
      setIsLoading(true);
      
      // Check profile first
      const profileValid = await checkProfileBeforeBooking();
      
      if (!profileValid || !isComponentMountedRef.current) {
        setIsLoading(false);
        return;
      }
      
      // Load profiles and other data in parallel
      await Promise.all([
        loadAvailableProfiles(),
        loadServiceData(),
        loadDoctors()
      ]);
      
    } catch (error) {
      console.error('Error loading initial data:', error);
      if (isComponentMountedRef.current) {
        setError(error.message);
      }
    } finally {
      if (isComponentMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [checkProfileBeforeBooking, loadAvailableProfiles]);

  // ENHANCED: Refresh data when screen comes into focus
  const refreshDataOnFocus = useCallback(async () => {
    if (!isComponentMountedRef.current) return;
    
    console.log('AppointmentBooking screen focused, refreshing data...');
    
    try {
      // Check profile validation first
      const profileValid = await checkProfileBeforeBooking();
      
      if (profileValid && isComponentMountedRef.current) {
        // Refresh profiles if profile is valid
        await loadAvailableProfiles();
      }
    } catch (error) {
      console.error('Error refreshing data on focus:', error);
    }
  }, [checkProfileBeforeBooking, loadAvailableProfiles]);

  // ADD: Use useFocusEffect to refresh data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      refreshDataOnFocus();
    }, [refreshDataOnFocus])
  );

  // EXTRACTED: Service data loading
  const loadServiceData = useCallback(async () => {
    try {
      if (service_id) {
        console.log('Looking for service with ID:', service_id);
        
        // Try to fetch from database first
        const response = await DatabaseService.listDocuments(
          COLLECTIONS.SERVICES,
          [Query.equal('service_id', service_id)],
          1
        );
        
        console.log('Service lookup response:', response);
        
        if (response.documents && response.documents.length > 0) {
          console.log('Found service in database:', response.documents[0]);
          setServiceData({
            duration: response.documents[0].duration,
            fee: response.documents[0].fee
          });
        } else {
          // Use local fallback if not found in DB
          console.log(`Service not found in DB. Using local fallback for service_id: ${service_id}`);
          setServiceData(serviceDetails[service_id]);
          
          if (!serviceDetails[service_id]) {
            console.log(`WARNING: Service ${service_id} not found in local data either.`);
          }
        }
      }
    } catch (err) {
      console.error('Error fetching service details:', err);
      setServiceData(serviceDetails[service_id]);
    }
  }, [service_id, serviceDetails]);

  // EXTRACTED: Doctor loading
  const loadDoctors = useCallback(async () => {
  try {
    console.log('Fetching doctors for branchId:', branchId);
    
    const doctorsForBranch = await getDoctorsForBranch(branchId);
    
    if (doctorsForBranch && doctorsForBranch.length > 0) {
      console.log(`Found ${doctorsForBranch.length} doctors for branch ${branchId}`);
      setDoctors(doctorsForBranch);
    } else {
      console.log('No doctors found for this branch in the database. Using local fallback.');
      
      const { DoctorsData } = require('../../constants');
      const filteredDoctors = DoctorsData.filter(doc => doc.branchId === branchId);
      
      if (filteredDoctors.length > 0) {
        // FIXED: Create globally unique temporary IDs that include branch info
        const formattedDoctors = filteredDoctors.map((doc, index) => ({
          ...doc,
          $id: `temp_branch_${branchId}_doctor_${index}` // ✅ Now unique across branches
        }));
        
        console.log(`Using ${formattedDoctors.length} doctors from local data.`);
        console.log('Doctor IDs:', formattedDoctors.map(d => ({ name: d.name, id: d.$id })));
        setDoctors(formattedDoctors);
      } else {
        console.log('No doctors found in local data either.');
        setDoctors([]);
      }
    }
  } catch (err) {
    console.error('Error fetching doctors:', err);
    setError(err.message);
    Alert.alert('Error', `Failed to fetch doctors: ${err.message}`);
  }
}, [branchId]);

  // Fetch booked appointments for a specific doctor and date
  const fetchBookedSlots = async (doctorId, date) => {
    if (!doctorId || !date) return;
    
    setLoadingSlots(true);
    try {
      const bookedSlotsArray = await appointmentManager.getBookedSlots(doctorId, date);
      
      console.log('Found booked slots:', bookedSlotsArray);
      
      // Convert array to map for easier checking
      const bookedMap = {};
      bookedSlotsArray.forEach(slot => {
        bookedMap[slot] = true;
      });
      
      console.log('Booked slots map:', bookedMap);
      setBookedSlots(bookedMap);
      
    } catch (error) {
      console.error('Error fetching booked slots:', error);
      Alert.alert('Error', 'Failed to check availability. Please try again.');
    } finally {
      setLoadingSlots(false);
    }
  };

  // Subscribe to real-time updates for appointments
  const subscribeToAppointments = () => {
    try {
      const subscription = appointmentManager.subscribeToAppointments((update) => {
        console.log('Booking screen received update:', update);
        
        if (selectedDoctor && selectedDate && update.appointment) {
          const appointment = update.appointment;
          const formattedDate = formatDate(selectedDate);
          
          if (appointment.doctor_id === selectedDoctor.$id && 
              appointment.date === formattedDate) {
            console.log('Updating availability for current selection');
            fetchBookedSlots(selectedDoctor.$id, selectedDate);
          }
        }
      });
      
      setRealtimeSubscription(subscription);
      console.log('Subscribed to real-time appointment updates');
    } catch (error) {
      console.error('Error subscribing to real-time updates:', error);
    }
  };

  // UPDATED: Initial effect - simplified to just load data once
  useEffect(() => {
    isComponentMountedRef.current = true;
    
    // Load initial data
    loadInitialData();
    
    // Subscribe to real-time updates
    subscribeToAppointments();
    
    // Cleanup function
    return () => {
      isComponentMountedRef.current = false;
      
      if (realtimeSubscription) {
        appointmentManager.unsubscribe(realtimeSubscription);
        console.log('Unsubscribed from real-time updates');
      }
    };
  }, [loadInitialData]);

  // Fetch booked slots when doctor or date changes
  useEffect(() => {
    if (selectedDoctor && selectedDate) {
      fetchBookedSlots(selectedDoctor.$id, selectedDate);
    } else {
      setBookedSlots({});
    }
  }, [selectedDoctor, selectedDate]);

  const formatDate = (date) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    return `${days[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
  };

  const handleDateSelect = (date) => {
    setSelectedDate(date);
    setSelectedTimeSlot(null);
  };

  const handleTimeSlotSelect = (timeSlot) => {
    if (bookedSlots[timeSlot]) {
      Alert.alert('Unavailable', 'This time slot is already booked. Please select another time.');
      return;
    }
    setSelectedTimeSlot(timeSlot);
  };

  // UPDATED: Enhanced booking function with family member support
  const handleBooking = async () => {
    if (!selectedDoctor || !selectedDate || !selectedTimeSlot || !selectedPatient) {
      Alert.alert('Incomplete Selection', 'Please select doctor, patient, date and time slot');
      return;
    }
  
    // Double-check availability before booking
    const isStillAvailable = await appointmentManager.checkSlotAvailability(
      selectedDoctor.$id,
      selectedDate,
      selectedTimeSlot
    );
  
    if (!isStillAvailable) {
      Alert.alert('Slot Unavailable', 'This time slot was just booked. Please select another time.');
      setSelectedTimeSlot(null);
      fetchBookedSlots(selectedDoctor.$id, selectedDate);
      return;
    }
  
    try {
      const currentUser = await AuthService.getCurrentUser();
      const formattedDate = formatDate(selectedDate);
      
      const appointment = {
        user_id: currentUser.$id,
        doctor_id: selectedDoctor.$id,
        doctor_name: selectedDoctor.name,
        service_name: serviceName,
        branch_id: branchId,
        branch_name: branchName,
        service_id: service_id,
        date: formattedDate,
        time_slot: selectedTimeSlot,
        status: APPOINTMENT_STATUS.BOOKED,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        has_prescription: false,
        reschedule_count: 0,
        patient_id: selectedPatient.$id,
        patient_name: selectedPatient.fullName || selectedPatient.displayName,
        is_family_booking: !selectedPatient.isOwner
      };
      
      console.log('Creating appointment with family booking data:', appointment);
      
      const result = await DatabaseService.createDocument(COLLECTIONS.APPOINTMENTS, appointment);
      
      router.push({
        pathname: '/appointment/success',
        params: {
          appointmentId: result.$id,
          doctorName: selectedDoctor.name,
          serviceName: serviceName,
          branchName: branchName,
          date: formattedDate,
          timeSlot: selectedTimeSlot,
          patientName: selectedPatient.fullName || selectedPatient.displayName,
          isFamilyBooking: !selectedPatient.isOwner ? 'true' : 'false'
        }
      });
    } catch (err) {
      console.error('Booking failed with error:', err);
      Alert.alert('Booking Failed', err.message);
    }
  };

  // Patient Selection Modal Component
  const PatientSelectorModal = () => (
    <Modal
      visible={showPatientModal}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowPatientModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Patient</Text>
            <TouchableOpacity onPress={() => setShowPatientModal(false)}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.profilesList}>
            {availableProfiles.map((profile) => (
              <TouchableOpacity
                key={profile.$id}
                style={[
                  styles.profileOption,
                  selectedPatient?.$id === profile.$id && styles.selectedProfileOption
                ]}
                onPress={() => {
                  setSelectedPatient(profile);
                  setShowPatientModal(false);
                }}
              >
                <View style={styles.profileIcon}>
                  <Ionicons 
                    name={profile.isOwner ? "person" : "people"} 
                    size={20} 
                    color={profile.isOwner ? "#007AFF" : "#0AD476"} 
                  />
                </View>
                <View style={styles.profileInfo}>
                  <Text style={styles.profileName}>{profile.displayName}</Text>
                  <Text style={styles.profileType}>
                    {profile.isOwner ? 'You' : 'Family Member'}
                  </Text>
                  {profile.age && (
                    <Text style={styles.profileAge}>Age: {profile.age}</Text>
                  )}
                </View>
                {selectedPatient?.$id === profile.$id && (
                  <Ionicons name="checkmark-circle" size={24} color="#0AD476" />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
          
          <TouchableOpacity 
            style={styles.addFamilyMemberButton}
            onPress={() => {
              setShowPatientModal(false);
              router.push('/profile/add-family-member');
            }}
          >
            <Ionicons name="add" size={20} color="#0AD476" />
            <Text style={styles.addFamilyMemberText}>Add Family Member</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  // UPDATED: Loading state - show loading until profile check is complete
  if (isLoading || profileCheckLoading || (loadingProfiles && !profileComplete)) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0AD476" />
        <Text>
          {profileCheckLoading ? 'Checking profile...' : 
           loadingProfiles ? 'Loading profiles...' : 
           'Loading...'}
        </Text>
      </SafeAreaView>
    );
  }

  // UPDATED: Don't render the main UI if profile is not complete
  if (!profileComplete) {
    return (
      <SafeAreaView style={styles.container}>
        <PageHeader onPress={() => router.back()} />
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Profile Required</Text>
          <Text style={styles.errorText}>Please complete your profile before booking appointments.</Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.push('/profile')}
          >
            <Text style={styles.backButtonText}>Complete Profile</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Debug view to help troubleshoot
  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <PageHeader onPress={() => router.back()} />
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Debug Information</Text>
          <Text style={styles.errorText}>Branch ID: {branchId}</Text>
          <Text style={styles.errorText}>Service ID: {service_id}</Text>
          <Text style={styles.errorText}>Error: {error}</Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <PageHeader onPress={() => router.back()} />
      
      <ScrollView>
        <View style={styles.header}>
          <Image 
            source={require('../../assets/images/polyclinic-logo.png')} 
            style={styles.logo} 
          />
          <Text style={styles.title}>PolyClinic</Text>
          <Text style={styles.branchName}>{branchName} Branch</Text>
        </View>
        
        <View style={styles.serviceInfo}>
          <Text style={styles.serviceName}>{serviceName}</Text>
          
          {serviceData ? (
            <>
              <Text style={styles.sectionTitle}>DURATION</Text>
              <Text style={styles.detailText}>{serviceData.duration}</Text>
              
              <Text style={styles.sectionTitle}>BOOKING FEE</Text>
              <Text style={styles.detailText}>{serviceData.fee}</Text>
            </>
          ) : (
            <View style={styles.serviceDetailsMissing}>
              <Text style={styles.errorText}>Service details not found for ID: {service_id}</Text>
              <Text style={styles.debugText}>Note: Check that service_id is correctly passed from the previous screen</Text>
            </View>
          )}
        </View>

        {/* Patient Selection Section */}
        {availableProfiles.length > 0 && (
          <View style={styles.patientSection}>
            <Text style={styles.sectionTitle}>APPOINTMENT FOR</Text>
            <TouchableOpacity 
              style={styles.patientSelector}
              onPress={() => setShowPatientModal(true)}
            >
              <View style={styles.patientInfo}>
                <View style={styles.patientIcon}>
                  <Ionicons 
                    name={selectedPatient?.isOwner ? "person" : "people"} 
                    size={20} 
                    color={selectedPatient?.isOwner ? "#007AFF" : "#0AD476"} 
                  />
                </View>
                <View>
                  <Text style={styles.patientName}>
                    {selectedPatient?.displayName || 'Select Patient'}
                  </Text>
                  <Text style={styles.patientType}>
                    {selectedPatient?.isOwner ? 'You' : 'Family Member'}
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-down" size={20} color="#666" />
            </TouchableOpacity>
          </View>
        )}

        {/* Rest of your existing JSX remains the same */}
        {doctors.length === 0 ? (
          <View style={styles.noDoctorsContainer}>
            <Text style={styles.noDoctorsText}>No doctors available at this branch for this service.</Text>
            <Text style={styles.debugText}>Branch ID: {branchId}</Text>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <Text style={styles.backButtonText}>Go Back</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Date Selection */}
            <View style={styles.dateContainer}>
              <Text style={styles.sectionTitle}>SELECT DATE</Text>
              <View style={styles.dateNavigator}>
                <Text style={styles.dateText}>
                  {selectedDate ? formatDate(selectedDate) : 'Select a date'}
                </Text>
              </View>
              
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dateScroll}>
                {dates.map((date, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.dateButton,
                      selectedDate && selectedDate.toDateString() === date.toDateString() && styles.selectedDate
                    ]}
                    onPress={() => handleDateSelect(date)}
                  >
                    <Text style={[
                      styles.dateButtonText,
                      selectedDate && selectedDate.toDateString() === date.toDateString() && styles.selectedDateText
                    ]}>
                      {date.getDate()}
                    </Text>
                    <Text style={[
                      styles.dateButtonSubtext,
                      selectedDate && selectedDate.toDateString() === date.toDateString() && styles.selectedDateText
                    ]}>
                      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Doctor Selection */}
            <Text style={styles.sectionTitle}>SELECT DOCTOR</Text>
            {doctors.map((doctor) => (
              <TouchableOpacity 
                key={doctor.$id}
                style={[
                  styles.doctorItem,
                  selectedDoctor && selectedDoctor.$id === doctor.$id && styles.selectedDoctor
                ]}
                onPress={() => setSelectedDoctor(doctor)}
              >
                {doctorImages && doctorImages[doctor.image] ? (
                  <Image 
                    source={doctorImages[doctor.image]} 
                    style={styles.doctorImage} 
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.doctorImagePlaceholder}>
                    <Text>No Image</Text>
                  </View>
                )}
                <View style={styles.doctorInfo}>
                  <Text style={styles.doctorName}>Dr. {doctor.name}</Text>
                  <Text style={styles.doctorSpecialty}>{doctor.specialty}</Text>
                  
                  {/* Time slots only appear for selected doctor and date */}
                  {selectedDoctor && selectedDoctor.$id === doctor.$id && selectedDate && (
                    <View style={styles.timeSlotSection}>
                      <Text style={styles.timeSlotTitle}>Available Time Slots</Text>
                      {loadingSlots ? (
                        <ActivityIndicator size="small" color="#0AD476" />
                      ) : (
                        <View style={styles.timeSlotContainer}>
                          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                            {timeSlots.map((time, index) => {
                              const isBooked = bookedSlots[time];
                              return (
                                <TouchableOpacity
                                  key={index}
                                  style={[
                                    styles.timeSlot,
                                    selectedTimeSlot === time && styles.selectedTimeSlot,
                                    isBooked && styles.bookedTimeSlot
                                  ]}
                                  onPress={() => handleTimeSlotSelect(time)}
                                  disabled={isBooked}
                                >
                                  <Text style={[
                                    styles.timeSlotText,
                                    selectedTimeSlot === time && styles.selectedTimeSlotText,
                                    isBooked && styles.bookedTimeSlotText
                                  ]}>
                                    {time}
                                  </Text>
                                  {isBooked && (
                                    <Text style={styles.bookedLabel}>Booked</Text>
                                  )}
                                </TouchableOpacity>
                              );
                            })}
                          </ScrollView>
                        </View>
                      )}
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </>
        )}
      </ScrollView>

      {/* Patient Selector Modal */}
      <PatientSelectorModal />

      {/* Continue Button with patient validation */}
      {doctors.length > 0 && (
        <TouchableOpacity 
          style={[
            styles.continueButton,
            (!selectedDoctor || !selectedDate || !selectedTimeSlot || !selectedPatient) && styles.disabledButton
          ]}
          onPress={handleBooking}
          disabled={!selectedDoctor || !selectedDate || !selectedTimeSlot || !selectedPatient}
        >
          <Text style={styles.continueButtonText}>
            Book Appointment {selectedPatient && `for ${selectedPatient.displayName}`}
          </Text>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
};

// Styles remain exactly the same...
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: 'red',
  },
  errorText: {
    fontSize: 14,
    marginBottom: 5,
    color: '#ff6b6b',
  },
  debugText: {
    fontSize: 14,
    color: '#888',
    marginVertical: 10,
  },
  header: {
    alignItems: 'center',
    marginVertical: 20,
  },
  logo: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#5cbeff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 10,
  },
  branchName: {
    fontSize: 18,
    color: '#555',
    marginTop: 5,
  },
  serviceInfo: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  serviceName: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  serviceDetailsMissing: {
    padding: 10,
    backgroundColor: '#fff9f9',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ffdddd',
    marginTop: 10,
  },
  // Patient selection styles
  patientSection: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  patientSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  patientInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  patientIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  patientName: {
    fontSize: 16,
    fontWeight: '500',
  },
  patientType: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  profilesList: {
    maxHeight: 400,
  },
  profileOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  selectedProfileOption: {
    backgroundColor: '#f0f8ff',
  },
  profileIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 16,
    fontWeight: '500',
  },
  profileType: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  profileAge: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  addFamilyMemberButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    margin: 20,
    backgroundColor: '#f0f8ff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#0AD476',
  },
  addFamilyMemberText: {
    color: '#0AD476',
    fontWeight: '500',
    marginLeft: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#888',
    marginTop: 10,
    marginBottom: 5,
    marginHorizontal: 15,
  },
  detailText: {
    fontSize: 16,
    marginBottom: 10,
    marginHorizontal: 15,
  },
  noDoctorsContainer: {
    padding: 20,
    alignItems: 'center',
  },
  noDoctorsText: {
    fontSize: 16,
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
  dateContainer: {
    marginVertical: 15,
    padding: 10,
  },
  dateNavigator: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 10,
    marginBottom: 10,
  },
  dateText: {
    fontSize: 16,
    fontWeight: '500',
  },
  dateScroll: {
    marginTop: 10,
  },
  dateButton: {
    width: 60,
    height: 60,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    marginHorizontal: 5,
  },
  selectedDate: {
    backgroundColor: '#0AD476',
  },
  dateButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  dateButtonSubtext: {
    fontSize: 12,
  },
  selectedDateText: {
    color: 'white',
  },
  doctorItem: {
    flexDirection: 'row',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  selectedDoctor: {
    backgroundColor: '#f0f8ff',
  },
  doctorImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 15,
  },
  doctorImagePlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  doctorInfo: {
    flex: 1,
  },
  doctorName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  doctorSpecialty: {
    color: '#666',
    marginTop: 5,
  },
  timeSlotSection: {
    marginTop: 15,
  },
  timeSlotTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    marginBottom: 8,
  },
  timeSlotContainer: {
    marginTop: 5,
  },
  timeSlot: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    marginRight: 10,
    minWidth: 80,
    alignItems: 'center',
  },
  selectedTimeSlot: {
    backgroundColor: '#0AD476',
  },
  bookedTimeSlot: {
    backgroundColor: '#ffcccc',
    opacity: 0.7,
  },
  timeSlotText: {
    fontSize: 14,
  },
  selectedTimeSlotText: {
    color: 'white',
  },
  bookedTimeSlotText: {
    color: '#666',
    textDecorationLine: 'line-through',
  },
  bookedLabel: {
    fontSize: 10,
    color: '#ff0000',
    marginTop: 2,
  },
  continueButton: {
    backgroundColor: '#0AD476',
    padding: 15,
    margin: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#b3d9ff',
  },
  continueButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default AppointmentBooking;