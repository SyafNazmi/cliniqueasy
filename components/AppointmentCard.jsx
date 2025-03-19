// components/AppointmentCard.jsx
import { View, Text, Image, TouchableOpacity } from 'react-native'
import React from 'react'
import Ionicons from '@expo/vector-icons/Ionicons';

export default function AppointmentCard() {
  return (
    <View style={{ 
      backgroundColor: '#2563eb', 
      borderRadius: 15, 
      padding: 15,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3
    }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Image 
            source={require('../assets/images/doctor1.png')} 
            style={{ width: 50, height: 50, borderRadius: 25, backgroundColor: 'white' }} 
          />
          <View style={{ marginLeft: 15 }}>
            <Text style={{ color: 'white', fontSize: 18, fontWeight: 'bold' }}>Dr. Alana Rueter</Text>
            <Text style={{ color: 'white', opacity: 0.8 }}>Dentist Consultation</Text>
          </View>
        </View>
        <TouchableOpacity style={{ 
          backgroundColor: 'white', 
          width: 40, 
          height: 40, 
          borderRadius: 20, 
          justifyContent: 'center', 
          alignItems: 'center' 
        }}>
          <Ionicons name="call" size={20} color="#2563eb" />
        </TouchableOpacity>
      </View>
      
      <View style={{ 
        backgroundColor: 'rgba(255,255,255,0.2)', 
        borderRadius: 10, 
        padding: 12, 
        marginTop: 15, 
        flexDirection: 'row', 
        justifyContent: 'space-between' 
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Ionicons name="calendar-outline" size={20} color="white" />
          <Text style={{ color: 'white', marginLeft: 10 }}>Monday, 26 July</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Ionicons name="time-outline" size={20} color="white" />
          <Text style={{ color: 'white', marginLeft: 10 }}>09:00 - 10:00</Text>
        </View>
      </View>
    </View>
  )
}