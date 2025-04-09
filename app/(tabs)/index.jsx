import { View, Text, ScrollView, TouchableOpacity, Image, ActivityIndicator, StyleSheet } from 'react-native'
import React, { useEffect, useState } from 'react'
import Header from "../../components/Header";
import SearchBar from '../../components/SearchBar';
import AppointmentCard from '../../components/AppointmentCard';
import DoctorSpeciality from '../../components/DoctorSpeciality';
import NearbyHospitals from '../../components/NearbyHospitals';
import { router, useRouter } from 'expo-router';
import { AuthService, DatabaseService, Query } from '../../configs/AppwriteConfig';
import { Ionicons } from '@expo/vector-icons';

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
            [Query.equal('user_id', currentUser.$id)],
            100 // Limit
          );
          
          setAppointments(response.documents);
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
    const parts = appointment.date?.match(/(\w+), (\d+) (\w+) (\d+)/);
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

  // Sort upcoming appointments by date (earliest first)
  const sortedUpcomingAppointments = [...upcomingAppointments].sort((a, b) => {
    const partsA = a.date?.match(/(\w+), (\d+) (\w+) (\d+)/);
    const partsB = b.date?.match(/(\w+), (\d+) (\w+) (\d+)/);
    
    if (!partsA || !partsB) return 0;
    
    const months = {
      'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
      'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
    };
    
    const dateA = new Date(
      parseInt(partsA[4]),
      months[partsA[3]],
      parseInt(partsA[2])
    );
    
    const dateB = new Date(
      parseInt(partsB[4]),
      months[partsB[3]],
      parseInt(partsB[2])
    );
    
    // If same date, sort by time
    if (dateA.getTime() === dateB.getTime()) {
      return a.time_slot?.localeCompare(b.time_slot || '');
    }
    
    return dateA - dateB;
  });

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Header />
        <SearchBar setSearchText={(value) => console.log(value)} />
        
        {/* Upcoming Appointments Section */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <View style={styles.titleContainer}>
              <Text style={styles.sectionTitle}>Upcoming Schedule</Text>
              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>
                  {sortedUpcomingAppointments.length}
                </Text>
              </View>
            </View>
            
            <TouchableOpacity 
              onPress={() => router.push('/appointment/upcoming')}
              style={styles.seeAllButton}
            >
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>
          
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#0AD476" />
            </View>
          ) : sortedUpcomingAppointments.length > 0 ? (
            <View>
              {/* Show first upcoming appointment */}
              <AppointmentCard appointment={sortedUpcomingAppointments[0]} />
              
              {/* If there are more appointments, show a message */}
              {sortedUpcomingAppointments.length > 1 && (
                <TouchableOpacity 
                  onPress={() => router.push('/appointment/upcoming')}
                  style={styles.moreAppointmentsButton}
                >
                  <Ionicons name="calendar-outline" size={16} color="#0AD476" />
                  <Text style={styles.moreAppointmentsText}>
                    {sortedUpcomingAppointments.length - 1} more appointment{sortedUpcomingAppointments.length > 2 ? 's' : ''}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <View style={styles.noAppointmentsContainer}>
              <Ionicons name="calendar-outline" size={40} color="#d1d5db" />
              <Text style={styles.noAppointmentsTitle}>No upcoming appointments</Text>
              <Text style={styles.noAppointmentsText}>Schedule your next appointment</Text>
              <TouchableOpacity 
                onPress={() => router.push('/appointment/appointmentBooking')}
                style={styles.bookAppointmentButton}
              >
                <Text style={styles.bookAppointmentText}>Book Appointment</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={{ marginTop: 25 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
            <Text style={{ fontSize: 20, fontWeight: 'bold' }}>Doctor Speciality</Text>
            <TouchableOpacity>
              <Text style={{ color: '#0AD476' }}>See All</Text>
            </TouchableOpacity>
          </View>
          <DoctorSpeciality />
        </View>
        
        <View style={{ marginTop: 25, marginBottom: 20 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
            <Text style={{ fontSize: 20, fontWeight: 'bold' }}>Nearby Hospitals</Text>
            <TouchableOpacity onPress={()=>router.push('/hospitals-list')}>
              <Text style={{ color: '#0AD476' }}>See All</Text>
            </TouchableOpacity>
          </View>
          <NearbyHospitals />
        </View>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: 'white' 
  },
  content: { 
    padding: 16, 
    marginTop: 50 
  },
  sectionContainer: { 
    marginTop: 25 
  },
  sectionHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 15 
  },
  titleContainer: { 
    flexDirection: 'row', 
    alignItems: 'center' 
  },
  sectionTitle: { 
    fontSize: 20, 
    fontWeight: 'bold' 
  },
  countBadge: { 
    backgroundColor: '#0AD476', 
    borderRadius: 15, 
    marginLeft: 10, 
    width: 24, 
    height: 24, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  countBadgeText: { 
    color: 'white', 
    fontWeight: 'bold' 
  },
  seeAllButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  seeAllText: { 
    color: '#0AD476',
    fontWeight: '600'
  },
  loadingContainer: {
    height: 150,
    justifyContent: 'center',
    alignItems: 'center',
  },
  moreAppointmentsButton: { 
    flexDirection: 'row',
    alignItems: 'center', 
    justifyContent: 'center',
    marginTop: 10, 
    paddingVertical: 12,
    backgroundColor: '#f0fff4',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#d1fae5',
  },
  moreAppointmentsText: { 
    color: '#0AD476',
    fontWeight: '600',
    marginLeft: 6,
  },
  noAppointmentsContainer: { 
    padding: 20, 
    backgroundColor: '#f5f7fa', 
    borderRadius: 15,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  noAppointmentsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 10,
    color: '#374151',
  },
  noAppointmentsText: {
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 12,
    color: '#6b7280',
  },
  bookAppointmentButton: { 
    marginTop: 8,
    backgroundColor: '#0AD476',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    elevation: 1,
  },
  bookAppointmentText: { 
    color: 'white',
    fontWeight: 'bold',
  },
});