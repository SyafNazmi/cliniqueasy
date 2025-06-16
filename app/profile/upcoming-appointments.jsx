import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native'
import React, { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'expo-router'
import { useFocusEffect } from '@react-navigation/native'
import { AuthService, DatabaseService, Query } from '@/configs/AppwriteConfig'
import { Ionicons } from '@expo/vector-icons'
import { COLLECTIONS } from '@/constants'
import { appointmentManager } from '@/service/appointmentUtils'

export default function UpcomingAppointments() {
  const router = useRouter();
  const [upcomingAppointments, setUpcomingAppointments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [user, setUser] = useState(null);

  // Function to fetch appointments (extracted for reuse) - BASED ON HOMESCREEN SUCCESS
  const fetchUserAndAppointments = useCallback(async (showLoader = true) => {
    try {
      if (showLoader) {
        setIsLoading(true);
      } else {
        setIsRefreshing(true);
      }
      
      // Get current user
      const currentUser = await AuthService.getCurrentUser();
      setUser(currentUser);
      
      // Fetch user's appointments from Appwrite
      if (currentUser) {
        // Enhanced query with ordering to get newest first
        const queries = [
          Query.equal('user_id', currentUser.$id),
          Query.orderDesc('$createdAt'),
          Query.limit(100)
        ];
        
        const response = await DatabaseService.listDocuments(
          COLLECTIONS.APPOINTMENTS,
          queries
        );
        
        const appointmentDocuments = response.documents || [];
        
        // Filter for upcoming appointments (same logic as HomeScreen)
        const upcomingAppts = appointmentDocuments.filter(appointment => {
          // First check if appointment is cancelled or completed
          const status = appointment.status?.toLowerCase();
          if (status === 'cancelled' || status === 'completed') {
            return false;
          }
          
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
        const sortedUpcomingAppointments = upcomingAppts.sort((a, b) => {
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
        
        setUpcomingAppointments(sortedUpcomingAppointments);
      }
    } catch (error) {
      console.error('Error fetching upcoming appointments:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // SOLUTION 1: Use useFocusEffect to refetch data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchUserAndAppointments(false); // Don't show full loader when refocusing
    }, [fetchUserAndAppointments])
  );

  // SOLUTION 2: Set up real-time subscription for appointments
  useEffect(() => {
    let subscriptionKey = null;

    const setupRealtimeSubscription = async () => {
      try {
        const currentUser = await AuthService.getCurrentUser();
        if (currentUser) {
          subscriptionKey = appointmentManager.subscribeToAppointments(
            (event) => {
              // Check if this appointment belongs to the current user
              if (event.appointment?.user_id === currentUser.$id) {
                // ENHANCED RETRY LOGIC: Try multiple times to ensure we get the new appointment
                const retryFetch = async (attempt = 1, maxAttempts = 3) => {
                  await fetchUserAndAppointments(false);
                  
                  // Check if the new appointment is now in state
                  const newAppointmentId = event.appointment?.$id;
                  if (newAppointmentId && attempt < maxAttempts) {
                    // Add a small delay to let state update
                    setTimeout(() => {
                      setUpcomingAppointments(currentAppointments => {
                        const hasNewAppointment = currentAppointments.some(apt => apt.$id === newAppointmentId);
                        
                        if (!hasNewAppointment) {
                          setTimeout(() => retryFetch(attempt + 1, maxAttempts), 1500);
                        }
                        
                        return currentAppointments;
                      });
                    }, 500);
                  }
                };
                
                // Start the retry process with a delay
                setTimeout(() => retryFetch(), 1000);
              }
            }
          );
        }
      } catch (error) {
        console.error('Error setting up real-time subscription:', error);
      }
    };

    setupRealtimeSubscription();

    // Cleanup subscription on unmount
    return () => {
      if (subscriptionKey) {
        appointmentManager.unsubscribe(subscriptionKey);
      }
    };
  }, [fetchUserAndAppointments]);

  // Initial load
  useEffect(() => {
    fetchUserAndAppointments();
  }, [fetchUserAndAppointments]);

  // SOLUTION 3: Add pull-to-refresh functionality
  const onRefresh = useCallback(() => {
    fetchUserAndAppointments(false);
  }, [fetchUserAndAppointments]);

  const handleAppointmentClick = (appointment) => {
    router.push({
      pathname: '/profile/appointment-details',
      params: {
        appointment: JSON.stringify(appointment)
      }
    });
  };

  const renderAppointmentItem = (appointment) => {
    // Check if this is a family booking
    const isFamilyBooking = appointment.is_family_booking || false;
    const patientName = appointment.patient_name || 'Unknown Patient';

    return (
      <TouchableOpacity
        key={appointment.$id}
        style={styles.appointmentItem}
        onPress={() => handleAppointmentClick(appointment)}
        activeOpacity={0.7}
      >
        <View style={styles.appointmentHeader}>
          <View style={styles.appointmentInfo}>
            <Text style={styles.appointmentDoctor}>
              Dr. {appointment.doctor_name || 'Doctor'}
            </Text>
            <Text style={styles.appointmentSpecialization}>
              {appointment.doctor_specialization || appointment.service_name || 'General Practice'}
            </Text>
            {/* NEW: Show family member info if applicable */}
            {(isFamilyBooking || (patientName && patientName !== 'Unknown Patient')) && (
              <View style={styles.familyInfo}>
                <Ionicons 
                  name={isFamilyBooking ? "people" : "person"} 
                  size={12} 
                  color="#0AD476" 
                />
                <Text style={styles.familyText}>
                  {isFamilyBooking ? `${patientName} (Family)` : patientName}
                </Text>
              </View>
            )}
          </View>
          <View style={styles.statusBadge}>
            <Text style={styles.statusBadgeText}>Upcoming</Text>
          </View>
        </View>
        
        <View style={styles.appointmentDetails}>
          <View style={styles.appointmentDetailRow}>
            <Ionicons name="calendar-outline" size={14} color="#8E8E93" />
            <Text style={styles.appointmentDetailText}>
              {appointment.date || 'Date not set'}
            </Text>
          </View>
          <View style={styles.appointmentDetailRow}>
            <Ionicons name="time-outline" size={14} color="#8E8E93" />
            <Text style={styles.appointmentDetailText}>
              {appointment.time_slot || appointment.time || 'Time not set'}
            </Text>
          </View>
          <View style={styles.appointmentDetailRow}>
            <Ionicons name="location-outline" size={14} color="#8E8E93" />
            <Text style={styles.appointmentDetailText} numberOfLines={1}>
              {appointment.branch_name || appointment.hospital_name || 'Location not specified'}
            </Text>
          </View>
        </View>
        
        <View style={styles.appointmentFooter}>
          <Text style={styles.appointmentId}>
            ID: {appointment.$id?.substring(0, 8) || 'N/A'}
          </Text>
          <Ionicons name="chevron-forward-outline" size={16} color="#8E8E93" />
        </View>
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0AD476" />
        <Text style={styles.loadingText}>Loading upcoming appointments...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Upcoming Appointments</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Summary Card */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryContent}>
          <Ionicons name="time" size={24} color="#0AD476" />
          <View style={styles.summaryText}>
            <Text style={styles.summaryTitle}>
              {upcomingAppointments.length} Upcoming Appointments
            </Text>
            <Text style={styles.summarySubtitle}>
              Your scheduled appointments
            </Text>
          </View>
        </View>
      </View>

      {/* Appointments List */}
      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            colors={['#0AD476']} // Android
            tintColor="#0AD476" // iOS
          />
        }
      >
        {upcomingAppointments.length > 0 ? (
          <>
            {upcomingAppointments.map(appointment => renderAppointmentItem(appointment))}
            <View style={styles.bottomSpacing} />
          </>
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={64} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>No Upcoming Appointments</Text>
            <Text style={styles.emptySubtitle}>
              Your scheduled appointments will appear here
            </Text>
            <TouchableOpacity 
              style={styles.bookButton}
              onPress={() => router.push('/appointment/appointmentBooking')}
            >
              <Text style={styles.bookButtonText}>Book an Appointment</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
  },
  placeholder: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#8E8E93',
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginTop: 20,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  summaryContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryText: {
    marginLeft: 16,
    flex: 1,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
  },
  summarySubtitle: {
    fontSize: 14,
    color: '#8E8E93',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 20,
  },
  appointmentItem: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginVertical: 6,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  appointmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  appointmentInfo: {
    flex: 1,
    marginRight: 12,
  },
  appointmentDoctor: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 2,
  },
  appointmentSpecialization: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 4,
  },
  // NEW: Family info styles
  familyInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  familyText: {
    fontSize: 12,
    color: '#0AD476',
    fontWeight: '500',
    marginLeft: 4,
  },
  statusBadge: {
    backgroundColor: '#0AD476',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  appointmentDetails: {
    marginBottom: 12,
  },
  appointmentDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  appointmentDetailText: {
    fontSize: 14,
    color: '#666666',
    marginLeft: 8,
    flex: 1,
  },
  appointmentFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  appointmentId: {
    fontSize: 12,
    color: '#8E8E93',
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  bookButton: {
    backgroundColor: '#0AD476',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  bookButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  bottomSpacing: {
    height: 100,
  },
});