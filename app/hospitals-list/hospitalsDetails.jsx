import { View, Text, Image, ScrollView, TouchableOpacity } from 'react-native'
import React from 'react'
import { useLocalSearchParams, router } from 'expo-router'
import Ionicons from '@expo/vector-icons/Ionicons'

export default function HospitalsDetails() {
  const { name, address, imageKey } = useLocalSearchParams()
  
  // We need to statically define all possible images since we can't use dynamic requires
  const imageMapping = {
    'polyclinic-kk.jpg': require('../../assets/images/polyclinic-kk.jpg'),
    'polyclinic-jlnpantai.jpeg': require('../../assets/images/polyclinic-jlnpantai.jpeg'),
    'polyclinic-asiacity.jpg': require('../../assets/images/polyclinic-asiacity.jpg'),
    'pusatkesihatan-tawau.jpg': require('../../assets/images/pusatkesihatan-tawau.jpg'),
    'polyclinic-fajar.jpg': require('../../assets/images/polyclinic-fajar.jpg'),
    'polyclinic-megahjaya.jpg': require('../../assets/images/polyclinic-megahjaya.jpg')
  }
  
  // Use the image that corresponds to the key or fall back to default
  const hospitalImage = imageMapping[imageKey] || require('../../assets/images/polyclinic-kk.jpg')
  
  // Mock data for this example
  const hospitalInfo = {
    phone: '+60 88-123456',
    email: 'info@' + name.toLowerCase().replace(/ /g, '') + '.com',
    website: 'www.' + name.toLowerCase().replace(/ /g, '') + '.com',
    services: ['General Medicine', 'Emergency Care', 'Pediatrics', 'Cardiology'],
    openingHours: 'Open 24 hours'
  }
  
  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#fff', }}>
      <TouchableOpacity 
        style={{ position: 'absolute', top: 50, left: 20, zIndex: 10, backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: 20, padding: 8}}
        onPress={() => router.back()}
      >
        <Ionicons name="arrow-back" size={24} color="#0066cc" />
      </TouchableOpacity>
      
      <Image 
        source={hospitalImage}
        style={{ width: '100%', height: 250 }}
      />
      
      <View style={{ padding: 16 }}>
        <Text style={{ fontSize: 24, fontWeight: 'bold' }}>{name}</Text>
        
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
          <Ionicons name="location" size={18} color="#666" />
          <Text style={{ fontSize: 16, color: '#666', marginLeft: 6 }}>{address}</Text>
        </View>
        
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
          <Ionicons name="time" size={18} color="#666" />
          <Text style={{ fontSize: 16, color: '#666', marginLeft: 6 }}>{hospitalInfo.openingHours}</Text>
        </View>
        
        <View style={{ height: 1, backgroundColor: '#eee', marginVertical: 16 }} />
        
        <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 12 }}>Contact Information</Text>
        
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
          <Ionicons name="call" size={18} color="#0066cc" />
          <Text style={{ fontSize: 16, color: '#333', marginLeft: 6 }}>{hospitalInfo.phone}</Text>
        </View>
        
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
          <Ionicons name="mail" size={18} color="#0066cc" />
          <Text style={{ fontSize: 16, color: '#333', marginLeft: 6 }}>{hospitalInfo.email}</Text>
        </View>
        
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
          <Ionicons name="globe" size={18} color="#0066cc" />
          <Text style={{ fontSize: 16, color: '#333', marginLeft: 6 }}>{hospitalInfo.website}</Text>
        </View>
        
        <View style={{ height: 1, backgroundColor: '#eee', marginVertical: 16 }} />
        
        <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 12 }}>Services</Text>
        
        {hospitalInfo.services.map((service, index) => (
          <View key={index} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <Ionicons name="medical" size={18} color="#0066cc" />
            <Text style={{ fontSize: 16, color: '#333', marginLeft: 6 }}>{service}</Text>
          </View>
        ))}
        
        <TouchableOpacity 
          onPress={() => router.push('/AddNew')}
          style={{ 
            backgroundColor: '#0066cc',
            paddingVertical: 14,
            borderRadius: 10,
            alignItems: 'center',
            marginTop: 20,
            marginBottom: 40
          }}
        >
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>Book Appointment</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  )
}