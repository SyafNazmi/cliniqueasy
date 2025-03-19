import { View, Text, ScrollView, TouchableOpacity, Image } from 'react-native'
import React from 'react'
import Header from "../../components/Header";
import SearchBar from '../../components/SearchBar';
import AppointmentCard from '../../components/AppointmentCard';
import DoctorSpeciality from '../../components/DoctorSpeciality';
import NearbyHospitals from '../../components/NearbyHospitals';
import { router } from 'expo-router';

export default function HomeScreen() {
  return (
    <ScrollView style={{ flex: 1, backgroundColor: 'white' }}>
      <View style={{ padding: 16, paddingTop: 50 }}>
        <Header />
        <SearchBar setSearchText={(value) => console.log(value)} />
        
        <View style={{ marginTop: 25 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ fontSize: 20, fontWeight: 'bold' }}>Upcoming Schedule</Text>
              <View style={{ backgroundColor: '#2563eb', borderRadius: 15, marginLeft: 10, width: 24, height: 24, justifyContent: 'center', alignItems: 'center' }}>
                <Text style={{ color: 'white', fontWeight: 'bold' }}>8</Text>
              </View>
            </View>
            <TouchableOpacity>
              <Text style={{ color: '#2563eb' }}>See All</Text>
            </TouchableOpacity>
          </View>
          <AppointmentCard />
        </View>

        <View style={{ marginTop: 25 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
            <Text style={{ fontSize: 20, fontWeight: 'bold' }}>Doctor Speciality</Text>
            <TouchableOpacity>
              <Text style={{ color: '#2563eb' }}>See All</Text>
            </TouchableOpacity>
          </View>
          <DoctorSpeciality />
        </View>
        
        <View style={{ marginTop: 25, marginBottom: 20 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
            <Text style={{ fontSize: 20, fontWeight: 'bold' }}>Nearby Hospitals</Text>
            <TouchableOpacity onPress={()=>router.push('/hospitals-list')}>
              <Text style={{ color: '#2563eb' }}>See All</Text>
            </TouchableOpacity>
          </View>
          <NearbyHospitals />
        </View>
      </View>
    </ScrollView>
  )
}