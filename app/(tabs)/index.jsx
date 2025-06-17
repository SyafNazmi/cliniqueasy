// app/(tabs)/index.jsx - Improved with better realtime handling
import { View, Text, ScrollView, TouchableOpacity, Image, ActivityIndicator, StyleSheet, RefreshControl, SafeAreaView, StatusBar } from 'react-native'
import React, { useEffect, useState, useCallback, useRef } from 'react'
import { useFocusEffect } from '@react-navigation/native'
import Header from "../../components/Header";
import AppointmentCard from '../../components/AppointmentCard';
import DoctorSpeciality from '../../components/DoctorSpeciality';
import NearbyHospitals from '../../components/NearbyHospitals';
import { router, useRouter } from 'expo-router';
import { AuthService, DatabaseService, Query } from '../../configs/AppwriteConfig';
import { COLLECTIONS } from '../../constants';
import { Ionicons } from '@expo/vector-icons';
import { appointmentManager } from '../../service/appointmentUtils';

export default function HomeScreen() {
  const router = useRouter();
  const [appointments, setAppointments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [user, setUser] = useState(null);
  const [familyBookingStats, setFamilyBookingStats] = useState({
    total: 0,
    family: 0,
    own: 0
  });

  // IMPROVED: Add refs for cleanup and retry logic
  const subscriptionRef = useRef(null);
  const retryTimeoutRef = useRef(null);
  const isComponentMountedRef = useRef(true);

  // Function to fetch appointments (extracted for reuse)
  const fetchUserAndAppointments = useCallback(async (showLoader = true) => {
    if (!isComponentMountedRef.current) return;
    
    try {
      if (showLoader) {
        setIsLoading(true);
      } else {
        setIsRefreshing(true);
      }
      
      // Get current user
      const currentUser = await AuthService.getCurrentUser();
      if (!currentUser || !isComponentMountedRef.current) return;
      
      setUser(currentUser);
      
      // Fetch user's appointments
      const queries = [
        Query.equal('user_id', currentUser.$id),
        Query.orderDesc('$createdAt'),
        Query.limit(100)
      ];
      
      const response = await DatabaseService.listDocuments(
        COLLECTIONS.APPOINTMENTS,
        queries
      );
      
      if (!isComponentMountedRef.current) return;
      
      const appointmentDocuments = response.documents || [];
      setAppointments(appointmentDocuments);
      
      // Calculate family booking stats
      const familyBookings = appointmentDocuments.filter(apt => apt.is_family_booking === true);
      const ownBookings = appointmentDocuments.filter(apt => apt.is_family_booking !== true);
      
      setFamilyBookingStats({
        total: appointmentDocuments.length,
        family: familyBookings.length,
        own: ownBookings.length
      });
      
    } catch (error) {
      console.error('Error fetching appointments:', error);
      if (!showLoader && isComponentMountedRef.current) {
        // Show error toast for refresh failures
      }
    } finally {
      if (isComponentMountedRef.current) {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    }
  }, []);

  // IMPROVED: Simplified realtime subscription with better error handling
  const setupRealtimeSubscription = useCallback(async () => {
    try {
      // Clear existing subscription
      if (subscriptionRef.current) {
        appointmentManager.unsubscribe(subscriptionRef.current);
        subscriptionRef.current = null;
      }

      const currentUser = await AuthService.getCurrentUser();
      if (!currentUser || !isComponentMountedRef.current) return;

      console.log('Setting up realtime subscription for appointments...');
      
      // Simplified subscription with debounced refresh
      const subscriptionKey = appointmentManager.subscribeToAppointments(
        (event) => {
          if (!isComponentMountedRef.current) return;
          
          console.log('Realtime appointment event received:', event);
          
          // Check if this appointment belongs to the current user
          if (event.appointment?.user_id === currentUser.$id) {
            // Simple debounced refresh - just refresh data after a short delay
            if (retryTimeoutRef.current) {
              clearTimeout(retryTimeoutRef.current);
            }
            
            retryTimeoutRef.current = setTimeout(() => {
              if (isComponentMountedRef.current) {
                console.log('Refreshing appointments due to realtime event');
                fetchUserAndAppointments(false);
              }
            }, 1000); // 1 second delay to debounce multiple events
          }
        }
      );

      subscriptionRef.current = subscriptionKey;
      console.log('Realtime subscription established:', subscriptionKey);
      
    } catch (error) {
      console.error('Error setting up realtime subscription:', error);
      // Don't show error to user - realtime is nice-to-have, not critical
    }
  }, [fetchUserAndAppointments]);

  // Use useFocusEffect to refetch data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      console.log('HomeScreen focused, refreshing data...');
      fetchUserAndAppointments(false);
    }, [fetchUserAndAppointments])
  );

  // IMPROVED: Better effect management
  useEffect(() => {
    isComponentMountedRef.current = true;
    
    // Initial load
    fetchUserAndAppointments(true);
    
    // Set up realtime subscription after initial load
    const setupSubscriptionDelayed = setTimeout(() => {
      if (isComponentMountedRef.current) {
        setupRealtimeSubscription();
      }
    }, 2000); // Delay to avoid conflicts with initial load

    // Cleanup function
    return () => {
      isComponentMountedRef.current = false;
      
      // Clear timeouts
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
      clearTimeout(setupSubscriptionDelayed);
      
      // Cleanup subscription
      if (subscriptionRef.current) {
        try {
          appointmentManager.unsubscribe(subscriptionRef.current);
        } catch (error) {
          console.error('Error cleaning up subscription:', error);
        }
        subscriptionRef.current = null;
      }
    };
  }, [fetchUserAndAppointments, setupRealtimeSubscription]);

  // Add pull-to-refresh functionality
  const onRefresh = useCallback(() => {
    console.log('Pull to refresh triggered');
    fetchUserAndAppointments(false);
  }, [fetchUserAndAppointments]);

  // IMPROVED: More robust appointment filtering
  const upcomingAppointments = appointments.filter(appointment => {
    try {
      // First check if appointment is cancelled or completed
      const status = appointment.status?.toLowerCase();
      if (status === 'cancelled' || status === 'completed') {
        return false;
      }
      
      // Parse the appointment date
      const parts = appointment.date?.match(/(\w+), (\d+) (\w+) (\d+)/);
      if (!parts) {
        console.warn('Invalid date format:', appointment.date);
        return false;
      }
      
      const [_, dayName, dayNum, monthName, year] = parts;
      const months = {
        'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
        'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
      };
      
      const monthIndex = months[monthName];
      if (monthIndex === undefined) {
        console.warn('Unknown month:', monthName);
        return false;
      }
      
      const appointmentDate = new Date(
        parseInt(year),
        monthIndex,
        parseInt(dayNum)
      );
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      return appointmentDate >= today;
    } catch (error) {
      console.error('Error filtering appointment:', appointment, error);
      return false;
    }
  });

  // Sort upcoming appointments by date (earliest first)
  const sortedUpcomingAppointments = [...upcomingAppointments].sort((a, b) => {
    try {
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
    } catch (error) {
      console.error('Error sorting appointments:', error);
      return 0;
    }
  });

  // Calculate family booking info for upcoming appointments
  const upcomingFamilyBookings = sortedUpcomingAppointments.filter(apt => apt.is_family_booking === true);
  const hasUpcomingFamilyBookings = upcomingFamilyBookings.length > 0;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="white" />
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor="#0AD476" // iOS
          />
        }
      >
        <View style={styles.content}>
          <Header />
          
          {/* Appointment Summary Cards */}
          {familyBookingStats.total > 0 && (
            <View style={styles.enhancedSummaryContainer}>
              {/* Your Appointments Card */}
              <TouchableOpacity 
                style={[styles.summaryCard, styles.yourAppointmentsCard]}
                onPress={() => router.push('/appointment?filter=own')}
                activeOpacity={0.7}
              >
                <View style={styles.summaryCardHeader}>
                  <View style={[styles.summaryIconContainer, styles.yourAppointmentsIcon]}>
                    <Ionicons name="person" size={20} color="#007AFF" />
                  </View>
                  <Text style={styles.summaryNumber}>{familyBookingStats.own}</Text>
                </View>
                <Text style={styles.summaryLabel}>Your Appointments</Text>
                <View style={styles.summaryProgress}>
                  <View style={[
                    styles.progressBar, 
                    styles.yourAppointmentsProgress,
                    { width: `${familyBookingStats.total > 0 ? (familyBookingStats.own / familyBookingStats.total) * 100 : 0}%` }
                  ]} />
                </View>
              </TouchableOpacity>

              {/* Family Appointments Card */}
              <TouchableOpacity 
                style={[styles.summaryCard, styles.familyAppointmentsCard]}
                onPress={() => router.push('/appointment?filter=family')}
                activeOpacity={0.7}
              >
                <View style={styles.summaryCardHeader}>
                  <View style={[styles.summaryIconContainer, styles.familyAppointmentsIcon]}>
                    <Ionicons name="people" size={20} color="#0AD476" />
                  </View>
                  <Text style={styles.summaryNumber}>{familyBookingStats.family}</Text>
                </View>
                <Text style={styles.summaryLabel}>Family Appointments</Text>
                <View style={styles.summaryProgress}>
                  <View style={[
                    styles.progressBar, 
                    styles.familyAppointmentsProgress,
                    { width: `${familyBookingStats.total > 0 ? (familyBookingStats.family / familyBookingStats.total) * 100 : 0}%` }
                  ]} />
                </View>
              </TouchableOpacity>
            </View>
          )}
          
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
                {/* Family indicator */}
                {hasUpcomingFamilyBookings && (
                  <View style={styles.familyIndicator}>
                    <Ionicons name="people" size={12} color="#0AD476" />
                  </View>
                )}
              </View>
              
              <TouchableOpacity 
                onPress={() => router.push('/appointment')}
                style={styles.seeAllButton}
              >
                <Text style={styles.seeAllText}>See All</Text>
              </TouchableOpacity>
            </View>
            
            {/* Show loading or refresh indicator */}
            {(isLoading || isRefreshing) && appointments.length === 0 ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#0AD476" />
                <Text style={styles.loadingText}>
                  {isRefreshing ? 'Refreshing...' : 'Loading appointments...'}
                </Text>
              </View>
            ) : sortedUpcomingAppointments.length > 0 ? (
              <View>
                <AppointmentCard 
                  appointment={sortedUpcomingAppointments[0]} 
                  currentUserId={user?.$id}
                />
                
                {sortedUpcomingAppointments.length > 1 && (
                  <TouchableOpacity 
                    onPress={() => router.push('/appointment')}
                    style={styles.moreAppointmentsButton}
                  >
                    <Ionicons name="calendar-outline" size={16} color="#0AD476" />
                    <Text style={styles.moreAppointmentsText}>
                      {sortedUpcomingAppointments.length - 1} more appointment{sortedUpcomingAppointments.length > 2 ? 's' : ''}
                      {hasUpcomingFamilyBookings && ' (including family)'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              <View style={styles.noAppointmentsContainer}>
                <Ionicons name="calendar-outline" size={40} color="#d1d5db" />
                <Text style={styles.noAppointmentsTitle}>No upcoming appointments</Text>
                <Text style={styles.noAppointmentsText}>Schedule your next appointment for you or your family</Text>
                <TouchableOpacity 
                  onPress={() => router.push('/appointment/appointmentBooking')}
                  style={styles.bookAppointmentButton}
                >
                  <Text style={styles.bookAppointmentText}>Book Appointment</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Rest of your sections */}
          <View style={styles.doctorSpecialitySection}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Doctor Speciality</Text>
              <TouchableOpacity>
                <Text style={styles.seeAllText}>See All</Text>
              </TouchableOpacity>
            </View>
            <DoctorSpeciality />
          </View>
          
          <View style={styles.nearbyHospitalsSection}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Nearby Hospitals</Text>
              <TouchableOpacity onPress={()=>router.push('/hospitals-list')}>
                <Text style={styles.seeAllText}>See All</Text>
              </TouchableOpacity>
            </View>
            <NearbyHospitals />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: 'white' 
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: { 
    padding: 16,
    // Removed marginTop: 50 - this was causing the gap!
  },
  
  // Enhanced Summary Cards
  enhancedSummaryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    marginTop: 15,
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 2,
  },
  yourAppointmentsCard: {
    borderColor: '#E3F2FD',
    backgroundColor: '#FAFBFF',
  },
  familyAppointmentsCard: {
    borderColor: '#E8F5E8',
    backgroundColor: '#FAFFFE',
  },
  summaryCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  summaryIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  yourAppointmentsIcon: {
    backgroundColor: '#E3F2FD',
  },
  familyAppointmentsIcon: {
    backgroundColor: '#E8F5E8',
  },
  summaryNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  summaryLabel: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
    marginBottom: 8,
  },
  summaryProgress: {
    height: 3,
    backgroundColor: '#f0f0f0',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 2,
  },
  yourAppointmentsProgress: {
    backgroundColor: '#007AFF',
  },
  familyAppointmentsProgress: {
    backgroundColor: '#0AD476',
  },

  // Fixed section spacing
  sectionContainer: { 
    marginTop: 5, 
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
    fontWeight: 'bold',
    fontSize: 12
  },
  familyIndicator: {
    backgroundColor: '#dcfce7',
    borderRadius: 10,
    marginLeft: 6,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  seeAllButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  seeAllText: { 
    color: '#0AD476',
    fontWeight: '600'
  },
  
  // Better section spacing for other components
  doctorSpecialitySection: {
    marginTop: 20,
  },
  nearbyHospitalsSection: {
    marginTop: 30,
    marginBottom: 20,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },

  loadingContainer: {
    height: 150,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
    fontSize: 14,
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