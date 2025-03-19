import { View, Text, TextInput, ScrollView, TouchableOpacity, Image } from 'react-native'
import React, { useState } from 'react'
import PageHeader from '../../components/PageHeader'
import SearchBar from '../../components/SearchBar'
import { router } from 'expo-router'
import Ionicons from '@expo/vector-icons/Ionicons'

export default function HospitalsList() {
  const [searchText, setSearchText] = useState('')
  
  const regions = [
    {
      name: 'Kota Kinabalu',
      image: require('../../assets/images/kota-kinabalu.jpg'),
      hospitals: ['Cyber City', 'KK Jalan Pantai', 'Asia City']
    },
    {
      name: 'Tawau',
      image: require('../../assets/images/tawau.jpeg'),
      hospitals: ['Hospital Tawau', 'PolyClinic Fajar', 'PolyClinic Megah Jaya']
    }
  ]

  const navigateToHospitalsInRegion = (region) => {
    router.push({
      pathname: '/hospitals-list/hospitals-in-region',
      params: { region: region.name, hospitals: JSON.stringify(region.hospitals) }
    })
  }
  
  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <View style={{ padding: 16, paddingTop: 50 }}>
        <PageHeader onPress={() => router.replace('/(tabs)')}/>
        <Text style={{ fontSize: 24, fontWeight: 'bold', marginTop: 20 }}>Select Your Region</Text>
        <SearchBar setSearchText={setSearchText} />
      </View>
      
      <View style={{ paddingHorizontal: 16 }}>
        <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 16 }}>
          Search Hospital by Region
        </Text>
      </View>
      
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 30 }}>
        {regions.map((region, index) => (
          <TouchableOpacity
            key={index}
            style={{
              marginBottom: 16,
              borderRadius: 12,
              overflow: 'hidden',
              backgroundColor: '#fff',
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 4,
              elevation: 3
            }}
            onPress={() => navigateToHospitalsInRegion(region)}
          >
            <View style={{ height: 140, position: 'relative' }}>
              <Image
                source={region.image}
                style={{ width: '100%', height: '100%', resizeMode: 'cover' }}
              />
              <View style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: '100%',
                backgroundColor: 'rgba(0,0,0,0.2)',
                justifyContent: 'flex-end',
                padding: 16
              }}>
                <Text style={{ fontSize: 28, fontWeight: 'bold', color: '#fff' }}>
                  {region.name}
                </Text>
                <Text style={{ fontSize: 14, color: '#fff', marginTop: 4 }}>
                  {region.hospitals.length} hospitals available
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  )
}