import React from 'react';
import { View, Text, TouchableOpacity, FlatList, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { DatabaseService, AuthService } from '../../configs/AppwriteConfig';
import PageHeader from '../../components/PageHeader';

const TimeSlotSelection = () => {
  const router = useRouter();

  const { doctorId, doctorName, date, serviceName } = useLocalSearchParams();


  const timeSlots = ['09:00 AM', '10:00 AM', '11:00 AM', '02:00 PM', '03:00 PM', '04:00 PM'];

  const handleTimeSlotSelect = async (timeSlot) => {
    try {
      const currentUser = await AuthService.getCurrentUser();
      const appointment = {
        user_id: currentUser.$id,
        doctor_id: doctorId,
        doctor_name: doctorName,
        date,
        time_slot: timeSlot,

        service_name: serviceName,

        status: 'Booked',
      };
      await DatabaseService.createDocument('67e0332c0001131d71ec', appointment);


      console.log('Booking Details:', { serviceName, doctorName, date, timeSlot });
      Alert.alert('Success', `Appointment booked for ${serviceName} with Dr. ${doctorName} on ${date} at ${timeSlot}`);

      router.back(); // You can also route back to home if you want
    } catch (err) {
      Alert.alert('Booking Failed', err.message);
    }
  };

  return ( 
    <View style={{ flex: 1, padding: 20, padding: 16, marginTop: 50 }}>
      <PageHeader onPress={() => router.back()}/>
      <Text>Select Time Slot</Text>
      <FlatList
        data={timeSlots}
        keyExtractor={(item) => item}
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={{ padding: 10, borderBottomWidth: 1 }}
            onPress={() => handleTimeSlotSelect(item)}
          >
            <Text>{item}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
};

export default TimeSlotSelection;
