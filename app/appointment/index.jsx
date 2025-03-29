import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, SafeAreaView, ActivityIndicator, Alert, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { DatabaseService, AuthService } from '../../configs/AppwriteConfig';
import { initializeDoctors } from '../../constants';
import { doctorImages } from '../../constants';
import PageHeader from '../../components/PageHeader';

const AppointmentBooking = () => {
  const router = useRouter();
  const DOCTOR_COLLECTION_ID = '67e033480011d20e04fb'; 
  const [doctors, setDoctors] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

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

  const handleDoctorSelect = (doctor) => {
    router.push({ 
      pathname: '/appointment/DateSelection', 
      params: { doctorId: doctor.$id, doctorName: doctor.name } 
    });
  };

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
        <Text>Loading Doctors...</Text>
      </SafeAreaView>
    );
  }

  const renderDoctorItem = ({ item }) => {
    // Add console logs for debugging
    console.log("Doctor Item:", item);
    console.log("Image Path:", item.image);
    console.log("Image Source:", doctorImages[item.image]);

    return (
      <TouchableOpacity 
        style={{ padding: 10, borderBottomWidth: 1, flexDirection: 'row', alignItems: 'center' }} 
        onPress={() => handleDoctorSelect(item)}
      >
        {doctorImages[item.image] ? (
          <Image 
            source={doctorImages[item.image]} 
            style={{ 
              width: 80, 
              height: 80, 
              borderRadius: 40,  // Make it round
              marginRight: 10 
            }} 
            resizeMode="cover"  // Ensures image fills while maintaining aspect ratio
          />
        ) : (
          <Text>No Image Available</Text>
        )}
        <View>
          <Text style={{ fontWeight: 'bold' }}>{item.name}</Text>
          <Text>{item.specialty}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <PageHeader onPress={() => router.back()}/> 
      <FlatList
        data={doctors}
        keyExtractor={(item) => item.$id}
        renderItem={renderDoctorItem}
      />
    </SafeAreaView>
  );
};

export default AppointmentBooking;
