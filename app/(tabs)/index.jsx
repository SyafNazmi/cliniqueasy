import { View, Text, ScrollView, TouchableOpacity, Image, ActivityIndicator } from 'react-native'
import React, { useEffect, useState } from 'react'
import Header from "../../components/Header";
import SearchBar from '../../components/SearchBar';
import AppointmentCard from '../../components/AppointmentCard';
import DoctorSpeciality from '../../components/DoctorSpeciality';
import NearbyHospitals from '../../components/NearbyHospitals';
import { router, useRouter } from 'expo-router';
import { AuthService, DatabaseService, Query } from '../../configs/AppwriteConfig';

export default function HomeScreen() {

  const router = useRouter();
  const [appointments, setAppointments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const fetchUserAndAppointments = async () => {
      try {
        setIsLoading(true);
        
        // Get current user
        const currentUser = await AuthService.getCurrentUser();
        setUser(currentUser);
        
        // Fetch user's appointments from Appwrite
        if (currentUser) {
          const response = await DatabaseService.listDocuments(
            '67e0332c0001131d71ec', // Appointments collection ID
            [Query.equal('user_id', currentUser.$id)], // Use Query.equal instead of string format
            100 // Limit
          );
          
          // Sort appointments by date (most recent first)
          const sortedAppointments = response.documents.sort((a, b) => {
            // Assuming date is in format "Day, DD Month YYYY"
            const dateA = new Date(a.date);
            const dateB = new Date(b.date);
            
            // If same date, sort by time
            if (dateA.getTime() === dateB.getTime()) {
              return a.time_slot.localeCompare(b.time_slot);
            }
            return dateA - dateB;
          });
          
          setAppointments(sortedAppointments);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchUserAndAppointments();
  }, []);

  // Find upcoming appointments (today or in the future)
  const upcomingAppointments = appointments.filter(appointment => {
    // Parse the appointment date
    const parts = appointment.date.match(/(\w+), (\d+) (\w+) (\d+)/);
    if (!parts) return false;
    
    const [_, dayName, dayNum, monthName, year] = parts;
    const months = {
      'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
      'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
    };
    
    const appointmentDate = new Date(
      parseInt(year),
      months[monthName],
      parseInt(dayNum)
    );
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return appointmentDate >= today;
  });

  return (
    <ScrollView style={{ flex: 1, backgroundColor: 'white' }}>
      <View style={{ padding: 16, marginTop: 50 }}>
        <Header />
        <SearchBar setSearchText={(value) => console.log(value)} />
        
        <View style={{ marginTop: 25 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ fontSize: 20, fontWeight: 'bold' }}>Upcoming Schedule</Text>
            <View style={{ backgroundColor: '#2563eb', borderRadius: 15, marginLeft: 10, width: 24, height: 24, justifyContent: 'center', alignItems: 'center' }}>
              <Text style={{ color: 'white', fontWeight: 'bold' }}>
                {upcomingAppointments.length}
              </Text>
            </View>
          </View>
          <TouchableOpacity onPress={() => router.push('/appointment/upcoming')}>
            <Text style={{ color: '#2563eb' }}>See All</Text>
          </TouchableOpacity>
        </View>
        
        {isLoading ? (
          <ActivityIndicator size="large" color="#2563eb" />
        ) : upcomingAppointments.length > 0 ? (
          <>
            {/* Show first upcoming appointment */}
            <AppointmentCard appointment={upcomingAppointments[0]} />
            
            {/* If there are more appointments, show a message */}
            {upcomingAppointments.length > 1 && (
              <TouchableOpacity 
                onPress={() => router.push('/appointment/upcoming')}
                style={{ 
                  alignItems: 'center', 
                  marginTop: 10, 
                  paddingVertical: 10,
                  backgroundColor: '#f0f4ff',
                  borderRadius: 10
                }}
              >
                <Text style={{ color: '#2563eb' }}>
                  {upcomingAppointments.length - 1} more appointment{upcomingAppointments.length > 2 ? 's' : ''}
                </Text>
              </TouchableOpacity>
            )}
          </>
        ) : (
          <View style={{ 
            padding: 20, 
            backgroundColor: '#f0f4ff', 
            borderRadius: 15,
            alignItems: 'center'
          }}>
            <Text style={{ textAlign: 'center' }}>No upcoming appointments</Text>
            <TouchableOpacity 
              onPress={() => router.push('/appointment/appointmentBooking')}
              style={{ 
                marginTop: 10,
                backgroundColor: '#2563eb',
                paddingVertical: 8,
                paddingHorizontal: 16,
                borderRadius: 8
              }}
            >
              <Text style={{ color: 'white' }}>Book Appointment</Text>
            </TouchableOpacity>
          </View>
        )}
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