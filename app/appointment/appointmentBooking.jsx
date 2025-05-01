import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  SafeAreaView, 
  ActivityIndicator, 
  Alert, 
  Image, 
  StyleSheet,
  ScrollView
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { DatabaseService, AuthService, Query } from '../../configs/AppwriteConfig';
import { doctorImages, COLLECTIONS, getDoctorsForBranch } from '../../constants';
import PageHeader from '../../components/PageHeader';

const AppointmentBooking = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  
  // Debugging params received
  console.log('Received params:', params);
  
  // FIXED: Handle both serviceId and service_id parameter names
  const branchId = String(params.branchId);
  const branchName = params.branchName;
  const service_id = String(params.serviceId || params.service_id || ''); // Accept either name
  const serviceName = params.serviceName;
  
  console.log('Processed params:', { branchId, service_id, serviceName, branchName });
  
  const [doctors, setDoctors] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState(null);
  const [error, setError] = useState(null);
  const [serviceData, setServiceData] = useState(null);
  
  // Service details based on service ID - matching the format in your constants
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

  useEffect(() => {
    // Load service data from the database or use fallback
    const getServiceData = async () => {
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
            
            // Additional debug if not found in local data either
            if (!serviceDetails[service_id]) {
              console.log(`WARNING: Service ${service_id} not found in local data either.`);
              console.log('Available service_ids in local data:', Object.keys(serviceDetails));
            }
          }
        }
      } catch (err) {
        console.error('Error fetching service details:', err);
        // Still use local fallback on error
        setServiceData(serviceDetails[service_id]);
      }
    };

    const checkProfileBeforeBooking = async () => {
      try {
        const currentUser = await AuthService.getCurrentUser();
        
        if (currentUser) {
          const response = await DatabaseService.listDocuments(
            COLLECTIONS.PATIENT_PROFILES,
            [Query.equal('userId', currentUser.$id)],
            1
          );
          
          if (response.documents.length === 0) {
            // No profile found - redirect to profile creation
            Alert.alert(
              "Profile Required",
              "Please complete your patient profile before booking an appointment.",
              [
                { text: "Create Profile", onPress: () => router.push('/profile') }
              ]
            );
            return;
          }
          
          // Check for required fields (using same fields as in your form validation)
          const profile = response.documents[0];
          const requiredFields = ['email', 'phoneNumber', 'fullName', 'gender', 'birthDate', 'address'];
          const missingFields = requiredFields.filter(field => !profile[field]);
          
          if (missingFields.length > 0) {
            Alert.alert(
              "Incomplete Profile",
              "Please complete the required fields in your profile before booking.",
              [
                { text: "Update Profile", onPress: () => router.push('/profile') }
              ]
            );
            return;
          }
          
          // Profile is complete, can proceed with booking
          console.log("Profile complete, proceeding with booking");
        }
      } catch (error) {
        console.error('Error checking profile:', error);
      }
    };
    
    checkProfileBeforeBooking();
    getServiceData(); // Fetch the service data

    const fetchDoctors = async () => {
      try {
        console.log('Fetching doctors for branchId:', branchId);
        
        // Use the helper function from constants
        const doctorsForBranch = await getDoctorsForBranch(branchId);
        
        if (doctorsForBranch && doctorsForBranch.length > 0) {
          console.log(`Found ${doctorsForBranch.length} doctors for branch ${branchId}`);
          setDoctors(doctorsForBranch);
        } else {
          console.log('No doctors found for this branch in the database. Using local fallback.');
          
          // Import DoctorsData from constants
          const { DoctorsData } = require('../../constants');
          
          // Filter doctors by branchId
          const filteredDoctors = DoctorsData.filter(doc => doc.branchId === branchId);
          
          if (filteredDoctors.length > 0) {
            // Add $id field to match database format
            const formattedDoctors = filteredDoctors.map((doc, index) => ({
              ...doc,
              $id: `temp_${index}`
            }));
            
            console.log(`Using ${formattedDoctors.length} doctors from local data.`);
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
      } finally {
        setIsLoading(false);
      }
    };
    fetchDoctors();
  }, [branchId, service_id]);

  const formatDate = (date) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    return `${days[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
  };

  const handleDateSelect = (date) => {
    setSelectedDate(date);
    setSelectedTimeSlot(null); // Clear time slot when date changes
  };

  const handleTimeSlotSelect = (timeSlot) => {
    setSelectedTimeSlot(timeSlot);
  };

  const handleBooking = async () => {
    if (!selectedDoctor || !selectedDate || !selectedTimeSlot) {
      Alert.alert('Incomplete Selection', 'Please select doctor, date and time slot');
      return;
    }

    try {
      const currentUser = await AuthService.getCurrentUser();
      const formattedDate = formatDate(selectedDate);
      
      // Make sure all these parameters are available and correctly named
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
        status: 'Booked',
        created_at: new Date().toISOString()
      };
      
      console.log('Creating appointment with data:', appointment);
      
      const result = await DatabaseService.createDocument(COLLECTIONS.APPOINTMENTS, appointment);
      
      // Navigate to success page
      router.push({
        pathname: '/appointment/success',
        params: {
          appointmentId: result.$id,
          doctorName: selectedDoctor.name,
          serviceName: serviceName,
          branchName: branchName,
          date: formattedDate,
          timeSlot: selectedTimeSlot
        }
      });
    } catch (err) {
      console.error('Booking failed with error:', err);
      Alert.alert('Booking Failed', err.message);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0AD476" />
        <Text>Loading Doctors...</Text>
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
          
          {/* Enhanced service details rendering with proper debug information */}
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
                      <View style={styles.timeSlotContainer}>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                          {timeSlots.map((time, index) => (
                            <TouchableOpacity
                              key={index}
                              style={[
                                styles.timeSlot,
                                selectedTimeSlot === time && styles.selectedTimeSlot
                              ]}
                              onPress={() => handleTimeSlotSelect(time)}
                            >
                              <Text style={[
                                styles.timeSlotText,
                                selectedTimeSlot === time && styles.selectedTimeSlotText
                              ]}>
                                {time}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      </View>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </>
        )}
      </ScrollView>

      {/* Continue Button - Only show if doctors are available */}
      {doctors.length > 0 && (
        <TouchableOpacity 
          style={[
            styles.continueButton,
            (!selectedDoctor || !selectedDate || !selectedTimeSlot) && styles.disabledButton
          ]}
          onPress={handleBooking}
          disabled={!selectedDoctor || !selectedDate || !selectedTimeSlot}
        >
          <Text style={styles.continueButtonText}>Book Appointment</Text>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
};

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
  },
  selectedTimeSlot: {
    backgroundColor: '#0AD476',
  },
  timeSlotText: {
    fontSize: 14,
  },
  selectedTimeSlotText: {
    color: 'white',
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