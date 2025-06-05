// app/appointment/upcoming.jsx
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  SafeAreaView, 
  FlatList, 
  ActivityIndicator, 
  StyleSheet,
  TouchableOpacity,
  RefreshControl
} from 'react-native';
import { useRouter } from 'expo-router';
import { DatabaseService, AuthService, Query } from '../../configs/AppwriteConfig';
import AppointmentCard from '../../components/AppointmentCard';
import PageHeader from '../../components/PageHeader';
import { Ionicons } from '@expo/vector-icons';

export default function UpcomingScreen() {
  const router = useRouter();
  const [appointments, setAppointments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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
            [Query.equal('user_id', currentUser.$id)], // Filter by current user
            100 // Limit
        );
        setAppointments(response.documents);
      }
    } catch (error) {
      console.error('Error fetching appointments:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchAppointments();
  };

  // Filter upcoming appointments (today and future dates)
  const upcomingAppointments = appointments.filter(appointment => {
    // Parse appointment date
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
  const sortedAppointments = [...upcomingAppointments].sort((a, b) => {
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
    
    return dateA - dateB;
  });

  // Group appointments by date
  const groupedAppointments = sortedAppointments.reduce((groups, appointment) => {
    const date = appointment.date;
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(appointment);
    return groups;
  }, {});

  // Convert grouped object to array for FlatList
  const groupedData = Object.entries(groupedAppointments).map(([date, appointments]) => ({
    date,
    appointments
  }));

  return (
    <SafeAreaView style={styles.container}>
      <PageHeader title="Upcoming Appointments" onPress={() => router.back()} />
      
      {isLoading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0AD476" />
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
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#0AD476']}
              tintColor="#0AD476"
            />
          }
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Ionicons name="calendar-outline" size={70} color="#d1d5db" />
          <Text style={styles.emptyTitle}>No Upcoming Appointments</Text>
          <Text style={styles.emptyText}>You don't have any scheduled appointments.</Text>
          <TouchableOpacity 
            style={styles.bookButton}
            onPress={() => router.push('/')}
          >
            <Text style={styles.bookButtonText}>Book an Appointment</Text>
          </TouchableOpacity>
        </View>
      )}
      
      {/* Floating action button */}
      <TouchableOpacity 
        style={styles.fab}
        onPress={() => router.push('/')}
      >
        <Ionicons name="add" size={24} color="white" />
      </TouchableOpacity>
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
  listContainer: {
    padding: 16,
  },
  appointmentContainer: {
    marginBottom: 2,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#374151',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 15,
    color: '#6b7280',
    marginTop: 8,
    marginBottom: 24,
    textAlign: 'center',
  },
  bookButton: {
    backgroundColor: '#0AD476',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
    elevation: 2,
  },
  bookButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    backgroundColor: '#0AD476',
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  dateHeader: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
    paddingLeft: 8,
  },
});