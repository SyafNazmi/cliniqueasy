import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  SafeAreaView, 
  FlatList, 
  ActivityIndicator, 
  StyleSheet,
  TouchableOpacity
} from 'react-native';
import { useRouter } from 'expo-router';
import { DatabaseService, AuthService, Query } from '../../configs/AppwriteConfig';
import AppointmentCard from '../../components/AppointmentCard';
import PageHeader from '../../components/PageHeader';
import { Ionicons } from '@expo/vector-icons';

export default function AppointmentsScreen() {
  const router = useRouter();
  const [appointments, setAppointments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('upcoming'); // 'upcoming' or 'past'

  useEffect(() => {
    fetchAppointments();
  }, []);

  const fetchAppointments = async () => {
    try {
      setIsLoading(true);
      
      // Get current user
      const currentUser = await AuthService.getCurrentUser();
      
      if (currentUser) {
        // Fetch user's appointments
        const response = await DatabaseService.listDocuments(
            '67e0332c0001131d71ec', // Appointments collection ID
            [Query.equal('user_id', currentUser.$id)], // Use Query.equal instead of string format
            100 // Limit
        );
        setAppointments(response.documents);
      }
    } catch (error) {
      console.error('Error fetching appointments:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Filter appointments based on date
  const filteredAppointments = appointments.filter(appointment => {
    // Parse appointment date
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
    
    if (activeTab === 'upcoming') {
      return appointmentDate >= today;
    } else {
      return appointmentDate < today;
    }
  });

  // Sort appointments by date
  const sortedAppointments = [...filteredAppointments].sort((a, b) => {
    // Parse and compare dates
    const partsA = a.date.match(/(\w+), (\d+) (\w+) (\d+)/);
    const partsB = b.date.match(/(\w+), (\d+) (\w+) (\d+)/);
    
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
    
    // For upcoming, sort by earliest first
    // For past, sort by most recent first
    return activeTab === 'upcoming' ? dateA - dateB : dateB - dateA;
  });

  return (
    <SafeAreaView style={styles.container}>
      <PageHeader title="My Appointments" onPress={() => router.back()} />
      
      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'upcoming' && styles.activeTab]}
          onPress={() => setActiveTab('upcoming')}
        >
          <Text style={[styles.tabText, activeTab === 'upcoming' && styles.activeTabText]}>
            Upcoming
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'past' && styles.activeTab]}
          onPress={() => setActiveTab('past')}
        >
          <Text style={[styles.tabText, activeTab === 'past' && styles.activeTabText]}>
            Past
          </Text>
        </TouchableOpacity>
      </View>
      
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      ) : sortedAppointments.length > 0 ? (
        <FlatList
          data={sortedAppointments}
          keyExtractor={(item) => item.$id}
          renderItem={({ item }) => (
            <View style={styles.appointmentContainer}>
              <AppointmentCard appointment={item} />
            </View>
          )}
          contentContainerStyle={styles.listContainer}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Ionicons name="calendar-outline" size={60} color="#ccc" />
          <Text style={styles.emptyText}>No {activeTab} appointments</Text>
          {activeTab === 'upcoming' && (
            <TouchableOpacity 
              style={styles.bookButton}
              onPress={() => router.push('/appointment/appointmentBooking')}
            >
              <Text style={styles.bookButtonText}>Book an Appointment</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginVertical: 15,
    borderRadius: 10,
    backgroundColor: '#e5e7eb',
    overflow: 'hidden',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: '#2563eb',
  },
  tabText: {
    fontWeight: '500',
    color: '#4b5563',
  },
  activeTabText: {
    color: 'white',
    fontWeight: 'bold',
  },
  listContainer: {
    padding: 20,
  },
  appointmentContainer: {
    marginBottom: 15,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 10,
    marginBottom: 20,
  },
  bookButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  bookButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
});