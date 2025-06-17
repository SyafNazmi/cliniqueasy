import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native'
import React, { useEffect, useState, useCallback, useRef } from 'react'
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
  const [realtimeSubscription, setRealtimeSubscription] = useState(null);
  
  // ADD: Component mount tracking
  const isComponentMountedRef = useRef(true);

  // Function to fetch appointments with better error handling
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
      if (!isComponentMountedRef.current) return;
      
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
        
        if (!isComponentMountedRef.current) return;
        
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
      if (isComponentMountedRef.current) {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    }
  }, []);

  // Use useFocusEffect to refetch data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      console.log('Upcoming appointments screen focused, refreshing...');
      fetchUserAndAppointments(false);
    }, [fetchUserAndAppointments])
  );

  // ENHANCED: Real-time subscription with better handling
  const setupRealtimeSubscription = useCallback(async () => {
    if (!isComponentMountedRef.current) return;
    
    try {
      const currentUser = await AuthService.getCurrentUser();
      if (!currentUser || !isComponentMountedRef.current) return;
      
      console.log('Setting up real-time subscription for upcoming appointments...');
      
      const subscriptionKey = appointmentManager.subscribeToAppointments(
        (event) => {
          if (!isComponentMountedRef.current) return;
          
          console.log('Upcoming appointments received real-time event:', event);
          
          // Check if this appointment belongs to the current user
          if (event.appointment?.user_id === currentUser.$id) {
            // Simple refresh approach - more reliable than complex state updates
            setTimeout(() => {
              if (isComponentMountedRef.current) {
                console.log('Refreshing upcoming appointments due to real-time event');
                fetchUserAndAppointments(false);
              }
            }, 500);
          }
        }
      );
      
      setRealtimeSubscription(subscriptionKey);
      console.log('Real-time subscription established for upcoming appointments');
      
    } catch (error) {
      console.error('Error setting up real-time subscription:', error);
    }
  }, [fetchUserAndAppointments]);

  useEffect(() => {
    isComponentMountedRef.current = true;
    
    // Initial load
    fetchUserAndAppointments(true);
    
    // Set up real-time subscription after initial load
    const subscriptionTimeout = setTimeout(() => {
      if (isComponentMountedRef.current) {
        setupRealtimeSubscription();
      }
    }, 1000);

    // Cleanup function
    return () => {
      isComponentMountedRef.current = false;
      clearTimeout(subscriptionTimeout);
      
      if (realtimeSubscription) {
        appointmentManager.unsubscribe(realtimeSubscription);
        console.log('Cleaned up upcoming appointments real-time subscription');
      }
    };
  }, [fetchUserAndAppointments, setupRealtimeSubscription]);

  // Add pull-to-refresh functionality
  const onRefresh = useCallback(() => {
    console.log('Pull to refresh upcoming appointments');
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

  // ENHANCED: Get status info with reschedule highlighting
  const getAppointmentStatusInfo = (appointment) => {
    const isRescheduled = appointment.status === 'Rescheduled' || appointment.rescheduled_at;
    const hasOriginalDateTime = appointment.original_date && appointment.original_time_slot;
    
    if (isRescheduled) {
      return {
        color: '#FF9500',
        bgColor: '#FFF3E0',
        text: 'Rescheduled',
        icon: 'refresh-circle',
        showNewBadge: hasOriginalDateTime
      };
    }
    
    return {
      color: '#0AD476',
      bgColor: '#F0FDF4',
      text: 'Upcoming',
      icon: 'time',
      showNewBadge: false
    };
  };

  const renderAppointmentItem = (appointment) => {
    const isFamilyBooking = appointment.is_family_booking || false;
    const patientName = appointment.patient_name || 'Unknown Patient';
    const statusInfo = getAppointmentStatusInfo(appointment);
    const isRescheduled = statusInfo.showNewBadge;

    return (
      <TouchableOpacity
        key={appointment.$id}
        style={[
          styles.appointmentItem,
          isRescheduled && styles.rescheduledAppointmentItem
        ]}
        onPress={() => handleAppointmentClick(appointment)}
        activeOpacity={0.7}
      >
        {/* NEW: Rescheduled indicator stripe */}
        {isRescheduled && <View style={styles.rescheduledStripe} />}
        
        <View style={styles.appointmentHeader}>
          <View style={styles.appointmentInfo}>
            <Text style={styles.appointmentDoctor}>
              Dr. {appointment.doctor_name || 'Doctor'}
            </Text>
            <Text style={styles.appointmentSpecialization}>
              {appointment.doctor_specialization || appointment.service_name || 'General Practice'}
            </Text>
            
            {/* Family member info */}
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
          
          <View style={styles.statusContainer}>
            <View style={[styles.statusBadge, { backgroundColor: statusInfo.color }]}>
              <Ionicons name={statusInfo.icon} size={12} color="#FFFFFF" />
              <Text style={styles.statusBadgeText}>{statusInfo.text}</Text>
            </View>
            
            {/* NEW: "NEW" badge for rescheduled appointments */}
            {isRescheduled && (
              <View style={styles.newBadge}>
                <Text style={styles.newBadgeText}>NEW</Text>
              </View>
            )}
          </View>
        </View>
        
        <View style={styles.appointmentDetails}>
          {/* ENHANCED: Date with highlighting for rescheduled */}
          <View style={styles.appointmentDetailRow}>
            <Ionicons name="calendar-outline" size={14} color={isRescheduled ? "#FF9500" : "#8E8E93"} />
            <Text style={[
              styles.appointmentDetailText,
              isRescheduled && styles.rescheduledDetailText
            ]}>
              {appointment.date || 'Date not set'}
              {isRescheduled && (
                <Text style={styles.newIndicator}> (NEW)</Text>
              )}
            </Text>
          </View>
          
          {/* ENHANCED: Time with highlighting for rescheduled */}
          <View style={styles.appointmentDetailRow}>
            <Ionicons name="time-outline" size={14} color={isRescheduled ? "#FF9500" : "#8E8E93"} />
            <Text style={[
              styles.appointmentDetailText,
              isRescheduled && styles.rescheduledDetailText
            ]}>
              {appointment.time_slot || appointment.time || 'Time not set'}
              {isRescheduled && (
                <Text style={styles.newIndicator}> (NEW)</Text>
              )}
            </Text>
          </View>
          
          <View style={styles.appointmentDetailRow}>
            <Ionicons name="location-outline" size={14} color="#8E8E93" />
            <Text style={styles.appointmentDetailText} numberOfLines={1}>
              {appointment.branch_name || appointment.hospital_name || 'Location not specified'}
            </Text>
          </View>
          
          {/* NEW: Show original date/time for rescheduled appointments */}
          {isRescheduled && appointment.original_date && (
            <View style={styles.originalDateTimeContainer}>
              <View style={styles.originalDateTimeHeader}>
                <Ionicons name="swap-horizontal" size={12} color="#999" />
                <Text style={styles.originalDateTimeLabel}>Originally:</Text>
              </View>
              <Text style={styles.originalDateTime}>
                {appointment.original_date} at {appointment.original_time_slot}
              </Text>
            </View>
          )}
        </View>
        
        <View style={styles.appointmentFooter}>
          <Text style={styles.appointmentId}>
            ID: {appointment.$id?.substring(0, 8) || 'N/A'}
          </Text>
          <View style={styles.footerRight}>
            {/* NEW: Reschedule count indicator */}
            {isRescheduled && appointment.reschedule_count && (
              <View style={styles.rescheduleCountBadge}>
                <Ionicons name="refresh" size={10} color="#FF9500" />
                <Text style={styles.rescheduleCountText}>×{appointment.reschedule_count}</Text>
              </View>
            )}
            <Ionicons name="chevron-forward-outline" size={16} color="#8E8E93" />
          </View>
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

      {/* Summary Card with reschedule info */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryContent}>
          <Ionicons name="time" size={24} color="#0AD476" />
          <View style={styles.summaryText}>
            <Text style={styles.summaryTitle}>
              {upcomingAppointments.length} Upcoming Appointments
            </Text>
            <Text style={styles.summarySubtitle}>
              Your scheduled appointments
              {upcomingAppointments.some(apt => apt.rescheduled_at) && (
                <Text style={styles.rescheduledNote}> • Some rescheduled</Text>
              )}
            </Text>
          </View>
          
          {/* NEW: Real-time status indicator */}
          <View style={styles.realtimeIndicator}>
            <Ionicons 
              name={realtimeSubscription ? "wifi-sharp" : "wifi"} 
              size={16} 
              color={realtimeSubscription ? "#0AD476" : "#999"} 
            />
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
  rescheduledNote: {
    color: '#FF9500',
    fontWeight: '500',
  },
  realtimeIndicator: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 20,
  },
  
  // ENHANCED: Appointment item styles with reschedule highlighting
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
    position: 'relative',
    overflow: 'hidden',
  },
  rescheduledAppointmentItem: {
    borderColor: '#FF9500',
    borderWidth: 1.5,
    backgroundColor: '#FFFDF7',
  },
  rescheduledStripe: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 4,
    height: '100%',
    backgroundColor: '#FF9500',
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
  statusContainer: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  
  // NEW: New badge for rescheduled appointments
  newBadge: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginTop: 4,
  },
  newBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
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
  
  // NEW: Highlighted styles for rescheduled date/time
  rescheduledDetailText: {
    color: '#FF9500',
    fontWeight: '600',
  },
  newIndicator: {
    fontSize: 11,
    color: '#FF3B30',
    fontWeight: 'bold',
  },
  
  // NEW: Original date/time display
  originalDateTimeContainer: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 8,
    marginTop: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#E5E7EB',
  },
  originalDateTimeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  originalDateTimeLabel: {
    fontSize: 11,
    color: '#999',
    fontWeight: '500',
    marginLeft: 4,
  },
  originalDateTime: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
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
  footerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  // NEW: Reschedule count badge
  rescheduleCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginRight: 8,
  },
  rescheduleCountText: {
    fontSize: 10,
    color: '#FF9500',
    fontWeight: '600',
    marginLeft: 2,
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