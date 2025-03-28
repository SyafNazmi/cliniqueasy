import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';

const AddNew = () => {
  const router = useRouter();

  const handleStartBooking = () => {
    router.push('/appointment');
  };

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>Add New Appointment</Text>
      <TouchableOpacity 
        style={{
          backgroundColor: '#007bff', 
          padding: 10, 
          borderRadius: 5, 
          marginTop: 20
        }}
        onPress={handleStartBooking}
      >
        <Text style={{ color: 'white' }}>Start Booking</Text>
      </TouchableOpacity>
    </View>
  );
};

export default AddNew;
