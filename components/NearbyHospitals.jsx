// components/NearbyHospitals.jsx
import { View, Text, Image, ScrollView } from 'react-native'
import React from 'react'
import Ionicons from '@expo/vector-icons/Ionicons';

export default function NearbyHospitals() {
  const hospitals = [
    { name: 'PolyClinic Tawau', rating: 4.8, image: require('../assets/images/polyclinic-fajar.jpg') },
    { name: 'PolyClinic Cyber City', rating: 4.5, image: require('../assets/images/polyclinic-kk.jpg') },
  ];

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      {hospitals.map((hospital, index) => (
        <View key={index} style={{ 
          width: 200, 
          marginRight: 15, 
          borderRadius: 10, 
          overflow: 'hidden',
          backgroundColor: '#f8f8f8',
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.1,
          shadowRadius: 2,
          elevation: 2
        }}>
          <Image source={hospital.image} style={{ width: '100%', height: 120 }} />
          <View style={{ 
            position: 'absolute', 
            top: 10, 
            right: 10, 
            backgroundColor: 'white', 
            borderRadius: 15, 
            paddingHorizontal: 8, 
            paddingVertical: 4, 
            flexDirection: 'row', 
            alignItems: 'center' 
          }}>
            <Ionicons name="star" size={16} color="#FFD700" />
            <Text style={{ marginLeft: 4 }}>{hospital.rating}</Text>
          </View>
          <View style={{ padding: 10 }}>
            <Text style={{ fontSize: 16, fontWeight: '500' }}>{hospital.name}</Text>
          </View>
        </View>
      ))}
    </ScrollView>
  )
}