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
import { COLORS } from '../../constants/Colors';

export default function AppointmentsScreen() {
  const router = useRouter();
  const [appointments, setAppointments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
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

  // Filter appointments based on date
  const filterAppointments = (appointmentList, type) => {
    return appointmentList.filter(appointment => {
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
      
      if (type === 'upcoming') {
        return appointmentDate >= today;
      } else {
        return appointmentDate < today;
      }
    });
  };

  // Sort appointments by date
  const sortAppointments = (appointmentList, type) => {
    return [...appointmentList].sort((a, b) => {
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
      
      // For upcoming, sort by earliest first
      // For past, sort by most recent first
      return type === 'upcoming' ? dateA - dateB : dateB - dateA;
    });
  };

  const upcomingAppointments = sortAppointments(
    filterAppointments(appointments, 'upcoming'),
    'upcoming'
  );
  
  const pastAppointments = sortAppointments(
    filterAppointments(appointments, 'past'),
    'past'
  );

  // Get the appropriate appointments based on active tab
  const displayedAppointments = activeTab === 'upcoming' ? upcomingAppointments : pastAppointments;

  const renderEmptyState = () => {
    if (activeTab === 'upcoming') {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="calendar-outline" size={70} color={COLORS.gray300} />
          <Text style={styles.emptyTitle}>No Upcoming Appointments</Text>
          <Text style={styles.emptyText}>You don't have any scheduled appointments.</Text>
          <TouchableOpacity 
            style={styles.bookButton}
            onPress={() => router.push('/')}
          >
            <Text style={styles.bookButtonText}>Book an Appointment</Text>
          </TouchableOpacity>
        </View>
      );
    } else {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="time-outline" size={70} color={COLORS.gray300} />
          <Text style={styles.emptyTitle}>No Past Appointments</Text>
          <Text style={styles.emptyText}>Your appointment history is empty.</Text>
        </View>
      );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <PageHeader title="My Appointments" onPress={() => router.back()} />
      
      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'upcoming' && styles.activeTab]}
          onPress={() => setActiveTab('upcoming')}
        >
          <Ionicons 
            name="calendar-outline" 
            size={18} 
            color={activeTab === 'upcoming' ? COLORS.white : COLORS.gray600} 
            style={styles.tabIcon}
          />
          <Text style={[styles.tabText, activeTab === 'upcoming' && styles.activeTabText]}>
            Upcoming
          </Text>
          {upcomingAppointments.length > 0 && (
            <View style={styles.badgeContainer}>
              <Text style={styles.badgeText}>{upcomingAppointments.length}</Text>
            </View>
          )}
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'past' && styles.activeTab]}
          onPress={() => setActiveTab('past')}
        >
          <Ionicons 
            name="time-outline" 
            size={18} 
            color={activeTab === 'past' ? COLORS.white : COLORS.gray600}
            style={styles.tabIcon}
          />
          <Text style={[styles.tabText, activeTab === 'past' && styles.activeTabText]}>
            Past
          </Text>
          {pastAppointments.length > 0 && (
            <View style={styles.badgeContainer}>
              <Text style={styles.badgeText}>{pastAppointments.length}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
      
      {isLoading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : displayedAppointments.length > 0 ? (
        <FlatList
          data={displayedAppointments}
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
              colors={[COLORS.primary]}
              tintColor={COLORS.primary}
            />
          }
        />
      ) : (
        renderEmptyState()
      )}
      
      {/* Only show FAB on the upcoming tab */}
      {activeTab === 'upcoming' && (
        <TouchableOpacity 
          style={styles.fab}
          onPress={() => router.push('/')}
        >
          <Ionicons name="add" size={24} color={COLORS.white} />
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginVertical: 16,
    borderRadius: 12,
    backgroundColor: COLORS.gray100,
    overflow: 'hidden',
    elevation: 1,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeTab: {
    backgroundColor: COLORS.primary,
  },
  tabIcon: {
    marginRight: 6,
  },
  tabText: {
    fontWeight: '600',
    color: COLORS.gray600,
    fontSize: 15,
  },
  activeTabText: {
    color: COLORS.white,
    fontWeight: 'bold',
  },
  badgeContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 6,
  },
  badgeText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: 'bold',
  },
  listContainer: {
    padding: 16,
    paddingBottom: 80, // Extra padding at bottom for FAB
  },
  appointmentContainer: {
    marginBottom: 16,
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
    color: COLORS.gray700,
    marginTop: 16,
  },
  emptyText: {
    fontSize: 15,
    color: COLORS.gray500,
    marginTop: 8,
    marginBottom: 24,
    textAlign: 'center',
  },
  bookButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
    elevation: 2,
  },
  bookButtonText: {
    color: COLORS.white,
    fontWeight: 'bold',
    fontSize: 16,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    backgroundColor: COLORS.primary,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
});