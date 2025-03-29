// components/DoctorSpeciality.jsx
import React from 'react';
import { TouchableOpacity, Text, View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';

const DoctorSpeciality = ({ doctorData }) => {
  const router = useRouter();

  const handlePress = () => {
    router.push({
      pathname: '/appointment/DateSelection',
      params: { doctor: JSON.stringify(doctorData) },
    });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.name}>{doctorData.name}</Text>
      <TouchableOpacity style={styles.button} onPress={handlePress}>
        <Text style={styles.buttonText}>Book Appointment</Text>
      </TouchableOpacity>
    </View>
  );
};

export default DoctorSpeciality;

const styles = StyleSheet.create({
  container: { margin: 10, padding: 10, backgroundColor: '#eee', borderRadius: 8, padding: 16, marginTop: 50 },
  name: { fontSize: 16, fontWeight: 'bold' },
  button: { marginTop: 10, padding: 10, backgroundColor: '#4CAF50', borderRadius: 5 },
  buttonText: { color: '#fff', textAlign: 'center' },
});
