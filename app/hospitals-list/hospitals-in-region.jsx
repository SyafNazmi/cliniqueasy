import { View, Text, ScrollView, Image, TouchableOpacity } from 'react-native'
import React from 'react'
import { router, useLocalSearchParams } from 'expo-router'
import PageHeader from '../../components/PageHeader'
import SearchBar from '../../components/SearchBar'
import Ionicons from '@expo/vector-icons/Ionicons'

export default function HospitalsInRegion() {
  const { region, hospitals } = useLocalSearchParams()
  const [searchText, setSearchText] = React.useState('')
  
  // Parse the JSON string back to an array
  const hospitalsList = JSON.parse(hospitals)
  
  // Region-specific hospital image mappings
  const regionHospitalImages = {
    'Kota Kinabalu': {
      'Cyber City': require('../../assets/images/polyclinic-kk.jpg'),
      'KK Jalan Pantai': require('../../assets/images/polyclinic-jlnpantai.jpeg'),
      'Asia City': require('../../assets/images/polyclinic-asiacity.jpg'),
    },
    'Tawau': {
      'Hospital Tawau': require('../../assets/images/pusatkesihatan-tawau.jpg'),
      'PolyClinic Fajar': require('../../assets/images/polyclinic-fajar.jpg'),
      'PolyClinic Megah Jaya': require('../../assets/images/polyclinic-megahjaya.jpg'),
    }
  }
  
  // Default image if the specific one isn't found
  const defaultImage = require('../../assets/images/polyclinic-kk.jpg')
  
  // Mock data for hospitals with region-specific images
  const hospitalsData = hospitalsList.map((hospital, index) => {
    // Get the specific image for this hospital in this region
    const hospitalImage = regionHospitalImages[region] && 
                          regionHospitalImages[region][hospital] ? 
                          regionHospitalImages[region][hospital] : 
                          defaultImage
    
    // Get image key to pass to the details page
    // This will help identify which image to use in the details
    let imageKey = 'polyclinic-kk.jpg' // default image key
    
    // Find the key for this hospital image
    if (regionHospitalImages[region] && regionHospitalImages[region][hospital]) {
      for (const [key, value] of Object.entries(regionHospitalImages[region])) {
        if (key === hospital) {
          // Extract the file name from the path (this is simplified)
          // In a real app, you might want to use a mapping instead
          if (hospital === 'Cyber City') imageKey = 'polyclinic-kk.jpg'
          else if (hospital === 'KK Jalan Pantai') imageKey = 'polyclinic-jlnpantai.jpeg'
          else if (hospital === 'Asia City') imageKey = 'polyclinic-asiacity.jpg'
          else if (hospital === 'Hospital Tawau') imageKey = 'pusatkesihatan-tawau.jpg'
          else if (hospital === 'PolyClinic Fajar') imageKey = 'polyclinic-fajar.jpg'
          else if (hospital === 'PolyClinic Megah Jaya') imageKey = 'polyclinic-megahjaya.jpg'
          break
        }
      }
    }
    
    return {
      id: index,
      name: hospital,
      address: `${index + 1}, Hospital Road, ${region}`,
      image: hospitalImage,
      imageKey: imageKey, // Save the image key for use in details page
      rating: (4 + Math.random()).toFixed(1),
      openHours: '24 hours',
      distance: `${(Math.random() * 10).toFixed(1)} km`
    }
  })
  
  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <View style={{ padding: 16, paddingTop: 50 }}>
        <PageHeader onPress={() => router.back()}/>
        <Text style={{ fontSize: 24, fontWeight: 'bold', marginTop: 20 }}>
          Hospitals In {region}
        </Text>
        <SearchBar setSearchText={setSearchText} />
      </View>
      
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
        {hospitalsData.map((hospital) => (
          <TouchableOpacity
            key={hospital.id}
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
            onPress={() => 
              router.push({
                pathname: '/hospitals-list/hospitalsDetails',
                params: { 
                  name: hospital.name, 
                  address: hospital.address,
                  imageKey: hospital.imageKey // Pass the image key instead of the image itself
                }
              })
            }
          >
            <Image
              source={hospital.image}
              style={{ width: '100%', height: 180, resizeMode: 'cover' }}
            />
            
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
            
            <View style={{ padding: 16 }}>
              <Text style={{ fontSize: 18, fontWeight: 'bold' }}>{hospital.name}</Text>
              
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
                <Ionicons name="location-outline" size={16} color="#666" />
                <Text style={{ fontSize: 14, color: '#666', marginLeft: 4 }}>
                  {hospital.address}
                </Text>
              </View>
              
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="time-outline" size={16} color="#666" />
                  <Text style={{ fontSize: 14, color: '#666', marginLeft: 4 }}>
                    {hospital.openHours}
                  </Text>
                </View>
                
                <TouchableOpacity 
                  style={{ 
                    backgroundColor: '#0066cc', 
                    paddingHorizontal: 12, 
                    paddingVertical: 6, 
                    borderRadius: 6
                  }}
                >
                  <Text style={{ color: '#fff', fontWeight: '500' }}>Get Direction</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  )
}