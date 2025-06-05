import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native'
import React, { useEffect, useState } from 'react'
import { useRouter } from 'expo-router'
import { account, DatabaseService, Query } from '@/configs/AppwriteConfig'
import { Ionicons } from '@expo/vector-icons'
import { COLLECTIONS } from '@/constants'

export default function PastAppointments() {
  const router = useRouter();
  const [pastAppointments, setPastAppointments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadPastAppointments();
  }, []);

  const loadPastAppointments = async () => {
    try {
      setIsLoading(true);
      const currentUser = await account.get();
      
      if (currentUser) {
        const appointmentsResponse = await DatabaseService.listDocuments(
          COLLECTIONS.APPOINTMENTS,
          [Query.equal('user_id', currentUser.$id)],
          100
        );
        
        console.log('Raw appointments data:', appointmentsResponse.documents); // Debug log
        
        // Filter and sort past appointments
        const pastAppts = appointmentsResponse.documents
          .filter(app => isDatePast(app.date))
          .sort((a, b) => {
            if (!a.date || !b.date) return 0;
            
            try {
              const dateA = parseAppointmentDate(a.date);
              const dateB = parseAppointmentDate(b.date);
              
              // Sort by most recent first (latest dates first)
              return dateB.getTime() - dateA.getTime();
            } catch (error) {
              console.error('Error sorting appointments:', error);
              return 0;
            }
          });
        
        console.log('Filtered past appointments:', pastAppts); // Debug log
        setPastAppointments(pastAppts);
      }
    } catch (error) {
      console.error('Error loading past appointments:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const parseAppointmentDate = (dateString) => {
    if (!dateString) return new Date(0);
    
    try {
      // Handle different date formats
      // Format: "Day, DD Mon YYYY" (e.g., "Monday, 15 Jan 2024")
      const parts = dateString.match(/(\w+), (\d+) (\w+) (\d+)/);
      if (parts) {
        const months = {
          'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
          'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
        };
        
        return new Date(
          parseInt(parts[4]), // year
          months[parts[3]], // month
          parseInt(parts[2]) // day
        );
      }
      
      // Fallback: try to parse as standard date string
      return new Date(dateString);
    } catch (error) {
      console.error('Error parsing date:', dateString, error);
      return new Date(0); // Return epoch if parsing fails
    }
  };

  const isDatePast = (dateString) => {
    if (!dateString) return false;
    
    try {
      const appointmentDate = parseAppointmentDate(dateString);
      appointmentDate.setHours(23, 59, 59, 999);
      const today = new Date();
      
      return appointmentDate < today;
    } catch (error) {
      console.error('Error parsing date:', dateString, error);
      return false;
    }
  };

  const handleAppointmentClick = (appointment) => {
    router.push({
      pathname: '/profile/appointment-details',
      params: {
        appointment: JSON.stringify(appointment)
      }
    });
  };

  const renderAppointmentItem = (appointment) => {
    // Debug log to see actual appointment data
    console.log('Rendering appointment:', appointment);
    
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
              {appointment.doctor_name || 'Doctor'}
            </Text>
            <Text style={styles.appointmentSpecialization}>
              {appointment.doctor_specialization || appointment.service_name || 'General Practice'}
            </Text>
          </View>
          <View style={styles.statusBadge}>
            <Text style={styles.statusBadgeText}>Completed</Text>
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
        <Text style={styles.loadingText}>Loading past appointments...</Text>
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
        <Text style={styles.headerTitle}>Past Appointments</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Summary Card */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryContent}>
          <Ionicons name="checkmark-circle" size={24} color="#0AD476" />
          <View style={styles.summaryText}>
            <Text style={styles.summaryTitle}>
              {pastAppointments.length} Completed Appointments
            </Text>
            <Text style={styles.summarySubtitle}>
              Your appointment history
            </Text>
          </View>
        </View>
      </View>

      {/* Appointments List */}
      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {pastAppointments.length > 0 ? (
          <>
            {pastAppointments.map(appointment => renderAppointmentItem(appointment))}
            <View style={styles.bottomSpacing} />
          </>
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={64} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>No Past Appointments</Text>
            <Text style={styles.emptySubtitle}>
              Your completed appointments will appear here
            </Text>
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
    backgroundColor: '#FAFAFA',
    marginHorizontal: 20,
    marginVertical: 6,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5E7',
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
    color: '#8E8E93',
    marginBottom: 2,
  },
  appointmentSpecialization: {
    fontSize: 14,
    color: '#8E8E93',
  },
  statusBadge: {
    backgroundColor: '#8E8E93',
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
    color: '#8E8E93',
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
  },
  bottomSpacing: {
    height: 100,
  },
});