// components/DoctorSpeciality.jsx
import { View, Text, ScrollView } from 'react-native'
import React from 'react'
import Ionicons from '@expo/vector-icons/Ionicons';

export default function DoctorSpeciality() {
  const specialities = [
    { name: 'Dentist', icon: 'medical-outline' },
    { name: 'Cardiologist', icon: 'heart-outline' },
    { name: 'Orthopaedic', icon: 'fitness-outline' },
    { name: 'Audiologist', icon: 'ear-outline' },
  ];

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      {specialities.map((specialty, index) => (
        <View key={index} style={{ alignItems: 'center', marginRight: 20 }}>
          <View style={{ 
            width: 70, 
            height: 70, 
            borderRadius: 35, 
            backgroundColor: '#e6efff', 
            justifyContent: 'center', 
            alignItems: 'center' 
          }}>
            <Ionicons name={specialty.icon} size={30} color="#2563eb" />
          </View>
          <Text style={{ marginTop: 8, textAlign: 'center' }}>{specialty.name}</Text>
        </View>
      ))}
    </ScrollView>
  )
}