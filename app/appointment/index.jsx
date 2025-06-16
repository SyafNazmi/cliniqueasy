//app/appointment/index.jsx - FIXED VERSION
import React, { useState, useEffect, useCallback } from 'react';
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
import { useRouter, useLocalSearchParams } from 'expo-router';
import { DatabaseService, AuthService, Query } from '../../configs/AppwriteConfig';
import { COLLECTIONS } from '../../constants';
import AppointmentCard from '../../components/AppointmentCard';
import PageHeader from '../../components/PageHeader';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

export default function AppointmentsScreen() {
  const router = useRouter();
  const searchParams = useLocalSearchParams();
  const [appointments, setAppointments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('upcoming');
  const [user, setUser] = useState(null);

  const filterParam = searchParams?.filter;

  useEffect(() => {
    if (filterParam === 'family' || filterParam === 'own') {
      setActiveTab('upcoming');
    }
  }, [filterParam]);

  const fetchAppointments = useCallback(async (showLoader = true) => {
    try {
      if (showLoader) {
        setIsLoading(true);
      } else {
        setRefreshing(true);
      }
      
      const currentUser = await AuthService.getCurrentUser();
      setUser(currentUser);
      
      if (currentUser) {
        const queries = [
          Query.equal('user_id', currentUser.$id),
          Query.orderDesc('$createdAt'),
          Query.limit(100)
        ];
        
        const response = await DatabaseService.listDocuments(
          COLLECTIONS.APPOINTMENTS,
          queries
        );
        
        setAppointments(response.documents || []);
      }
    } catch (error) {
      console.error('Error fetching appointments:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchAppointments(false);
    }, [fetchAppointments])
  );

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  const onRefresh = useCallback(() => {
    fetchAppointments(false);
  }, [fetchAppointments]);

  // FIXED: Corrected filtering logic - cancelled/completed should show in past tab
  const filterAppointments = (appointmentList, type) => {
    return appointmentList.filter(appointment => {
      const status = appointment.status?.toLowerCase();
      
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
        // For upcoming: exclude cancelled/completed AND check if date >= today
        if (status === 'cancelled' || status === 'completed') {
          return false;
        }
        return appointmentDate >= today;
      } else {
        // For past: include cancelled/completed OR appointments with date < today
        if (status === 'cancelled' || status === 'completed') {
          return true;
        }
        return appointmentDate < today;
      }
    });
  };

  const applyFamilyFilter = (appointmentList) => {
    if (filterParam === 'family') {
      return appointmentList.filter(apt => apt.is_family_booking === true);
    } else if (filterParam === 'own') {
      return appointmentList.filter(apt => apt.is_family_booking !== true);
    }
    return appointmentList;
  };

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
      
      if (dateA.getTime() === dateB.getTime()) {
        return (a.time_slot || '').localeCompare(b.time_slot || '');
      }
      
      return type === 'upcoming' ? dateA - dateB : dateB - dateA;
    });
  };

  const filteredAppointments = applyFamilyFilter(appointments);
  const upcomingAppointments = sortAppointments(
    filterAppointments(filteredAppointments, 'upcoming'),
    'upcoming'
  );
  
  const pastAppointments = sortAppointments(
    filterAppointments(filteredAppointments, 'past'),
    'past'
  );

  const displayedAppointments = activeTab === 'upcoming' ? upcomingAppointments : pastAppointments;

  const renderEmptyState = () => {
    const isFiltered = filterParam === 'family' || filterParam === 'own';
    const filterText = filterParam === 'family' ? 'Family ' : filterParam === 'own' ? 'Your ' : '';
    
    if (activeTab === 'upcoming') {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="calendar-outline" size={70} color="#d1d5db" />
          <Text style={styles.emptyTitle}>No Upcoming {filterText}Appointments</Text>
          <Text style={styles.emptyText}>
            {isFiltered 
              ? `You don't have any upcoming ${filterText.toLowerCase()}appointments.`
              : "You don't have any scheduled appointments."
            }
          </Text>
          <TouchableOpacity 
            style={styles.bookButton}
            onPress={() => router.push('/appointment/appointmentBooking')}
          >
            <Text style={styles.bookButtonText}>Book an Appointment</Text>
          </TouchableOpacity>
        </View>
      );
    } else {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="time-outline" size={70} color="#d1d5db" />
          <Text style={styles.emptyTitle}>No Past {filterText}Appointments</Text>
          <Text style={styles.emptyText}>
            {isFiltered 
              ? `Your ${filterText.toLowerCase()}appointment history is empty.`
              : "Your appointment history is empty."
            }
          </Text>
        </View>
      );
    }
  };

  const getPageTitle = () => {
    if (filterParam === 'family') return 'Family Appointments';
    if (filterParam === 'own') return 'Your Appointments';
    return 'My Appointments';
  };

  return (
    <SafeAreaView style={styles.container}>
      <PageHeader title={getPageTitle()} onPress={() => router.back()} />
      
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'upcoming' && styles.activeTab]}
          onPress={() => setActiveTab('upcoming')}
        >
          <Ionicons 
            name="calendar-outline" 
            size={18} 
            color={activeTab === 'upcoming' ? "white" : "#4b5563"} 
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
            color={activeTab === 'past' ? "white" : "#4b5563"}
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
          <ActivityIndicator size="large" color="#0AD476" />
        </View>
      ) : displayedAppointments.length > 0 ? (
        <FlatList
          data={displayedAppointments}
          keyExtractor={(item) => item.$id}
          renderItem={({ item }) => (
            <View style={styles.appointmentContainer}>
              <AppointmentCard 
                appointment={item} 
                currentUserId={user?.$id}
                showCancelled={activeTab === 'past'} // Show cancelled in past tab
              />
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
        renderEmptyState()
      )}
      
      {activeTab === 'upcoming' && (
        <TouchableOpacity 
          style={styles.fab}
          onPress={() => router.push('/appointment/appointmentBooking')}
        >
          <Ionicons name="add" size={24} color="white" />
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

// ... (styles remain the same)
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
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
    backgroundColor: '#f3f4f6',
    overflow: 'hidden',
    elevation: 1,
    shadowColor: '#000',
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
    backgroundColor: '#0AD476',
  },
  tabIcon: {
    marginRight: 6,
  },
  tabText: {
    fontWeight: '600',
    color: '#4b5563',
    fontSize: 15,
  },
  activeTabText: {
    color: 'white',
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
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  listContainer: {
    padding: 16,
    paddingBottom: 80,
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
});