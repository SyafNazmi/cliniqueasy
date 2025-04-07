import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  FlatList, 
  SafeAreaView, 
  ActivityIndicator, 
  Alert, 
  Image, 
  StyleSheet,
  ScrollView
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { DatabaseService, AuthService } from '../../configs/AppwriteConfig';
import { initializeDoctors } from '../../constants';
import { doctorImages } from '../../constants';
import PageHeader from '../../components/PageHeader';

const AppointmentBooking = () => {
  const router = useRouter();
  const { serviceId, serviceName } = useLocalSearchParams();
  
  const DOCTOR_COLLECTION_ID = '67e033480011d20e04fb';
  const [doctors, setDoctors] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState(null);
  
  // Service details based on service ID
  const serviceDetails = {
    '3': { // Prenatal Care
      duration: 'Approximately 45 minutes',
      fee: 'RM 100, Non-refundable'
    },
    '1': { // In-clinic consultation
      duration: 'Approximately 30 minutes',
      fee: 'RM 80, Non-refundable'
    },
    '2': { // Online consultation
      duration: 'Approximately 20 minutes',
      fee: 'RM 60, Non-refundable'
    },
    '4': { // 5D Scan
      duration: 'Approximately 60 minutes',
      fee: 'RM 250, Non-refundable'
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
    const fetchDoctors = async () => {
      try {
        await initializeDoctors();
        const response = await DatabaseService.listDocuments(DOCTOR_COLLECTION_ID, [], 100);
        setDoctors(response.documents);
      } catch (err) {
        Alert.alert('Error', err.message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchDoctors();
  }, []);

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
      
      const appointment = {
        user_id: currentUser.$id,
        doctor_id: selectedDoctor.$id,
        doctor_name: selectedDoctor.name,
        service_name: serviceName, 
        date: formattedDate,
        time_slot: selectedTimeSlot,
        status: 'Booked',
      };
      
      
      await DatabaseService.createDocument('67e0332c0001131d71ec', appointment);

      Alert.alert(
        'Booking Successful', 
        `Your ${serviceName} appointment with Dr. ${selectedDoctor.name} on ${formattedDate} at ${selectedTimeSlot} has been booked.`
      );
      
      router.push('/');
    } catch (err) {
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
        </View>
        
        <View style={styles.serviceInfo}>
          <Text style={styles.serviceName}>{serviceName}</Text>
          
          {serviceDetails[serviceId] && (
            <>
              <Text style={styles.sectionTitle}>DURATION</Text>
              <Text style={styles.detailText}>{serviceDetails[serviceId].duration}</Text>
              
              <Text style={styles.sectionTitle}>BOOKING FEE</Text>
              <Text style={styles.detailText}>{serviceDetails[serviceId].fee}</Text>
            </>
          )}
        </View>

        {/* Date Selection */}
        <View style={styles.dateContainer}>
          <View style={styles.dateNavigator}>
            <Text>‹</Text>
            <Text style={styles.dateText}>
              {selectedDate ? formatDate(selectedDate) : 'Select a date'}
            </Text>
            <Text>›</Text>
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
        <Text style={styles.sectionTitle}>DOCTOR</Text>
        {doctors.map((doctor) => (
          <TouchableOpacity 
            key={doctor.$id}
            style={[
              styles.doctorItem,
              selectedDoctor && selectedDoctor.$id === doctor.$id && styles.selectedDoctor
            ]}
            onPress={() => setSelectedDoctor(doctor)}
          >
            {doctorImages[doctor.image] ? (
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
              <Text style={styles.doctorName}>Dr {doctor.name}</Text>
              <Text style={styles.doctorSpecialty}>{doctor.specialty}</Text>
              
              {/* Time slots only appear for selected doctor */}
              {selectedDoctor && selectedDoctor.$id === doctor.$id && selectedDate && (
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
              )}
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Continue Button */}
      <TouchableOpacity 
        style={[
          styles.continueButton,
          (!selectedDoctor || !selectedDate || !selectedTimeSlot) && styles.disabledButton
        ]}
        onPress={handleBooking}
        disabled={!selectedDoctor || !selectedDate || !selectedTimeSlot}
      >
        <Text style={styles.continueButtonText}>Continue</Text>
      </TouchableOpacity>
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
  sectionTitle: {
    fontSize: 12,
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
  dateContainer: {
    marginVertical: 15,
    padding: 10,
  },
  dateNavigator: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 10,
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
  timeSlotContainer: {
    marginTop: 10,
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