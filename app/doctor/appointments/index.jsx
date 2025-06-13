// app/doctor/appointments/index.jsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import PageHeader from '../../../components/PageHeader';
import { DatabaseService, Query } from '../../../configs/AppwriteConfig';
import { getLocalStorage } from '../../../service/Storage';

const APPOINTMENTS_COLLECTION_ID = '67e0332c0001131d71ec';
const USERS_COLLECTION_ID = '67e032ec0025cf1956ff';

export default function AppointmentsManagement() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('upcoming'); // 'upcoming', 'past', 'all'
  const [patientNames, setPatientNames] = useState({});
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarDays, setCalendarDays] = useState([]);

  useEffect(() => {
    loadAppointments();
    generateCalendarDays();
  }, []);

  const loadAppointments = async () => {
    try {
      setLoading(true);
      
      const userData = await getLocalStorage('userDetail');
      if (!userData?.uid) {
        Alert.alert('Error', 'User data not found');
        return;
      }

      const appointmentsResponse = await DatabaseService.listDocuments(
        APPOINTMENTS_COLLECTION_ID,
        []
      );
      
      let allAppointments = appointmentsResponse.documents || [];
      
      // Sort appointments by date
      allAppointments.sort((a, b) => {
        try {
          const dateA = parseAppointmentDate(a.date);
          const dateB = parseAppointmentDate(b.date);
          
          if (dateA.getTime() === dateB.getTime()) {
            return convert12HourTo24Hour(a.time_slot || '').localeCompare(
              convert12HourTo24Hour(b.time_slot || '')
            );
          }
          
          return dateB - dateA;
        } catch (error) {
          return 0;
        }
      });
      
      setAppointments(allAppointments);
      await fetchPatientNames(allAppointments);
      
    } catch (error) {
      console.error('Error loading appointments:', error);
      Alert.alert('Error', 'Failed to load appointments');
    } finally {
      setLoading(false);
    }
  };

  const parseAppointmentDate = (dateString) => {
    try {
      if (dateString && dateString.includes(',')) {
        const [, datePart] = dateString.split(', ');
        const [day, month, year] = datePart.split(' ');
        const monthIndex = getMonthIndex(month);
        return new Date(year, monthIndex, parseInt(day));
      }
      return new Date();
    } catch (error) {
      return new Date();
    }
  };

  const getMonthIndex = (monthName) => {
    const months = {
      'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
      'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
    };
    return months[monthName] || 0;
  };

  const convert12HourTo24Hour = (timeString) => {
    try {
      if (!timeString) return '';
      
      const [time, modifier] = timeString.split(' ');
      let [hours, minutes] = time.split(':');
      
      hours = parseInt(hours);
      
      if (modifier === 'PM' && hours < 12) {
        hours += 12;
      } else if (modifier === 'AM' && hours === 12) {
        hours = 0;
      }
      
      return `${hours.toString().padStart(2, '0')}:${minutes}`;
    } catch (e) {
      return timeString;
    }
  };

  const fetchPatientNames = async (appointments) => {
    try {
      const userIds = [...new Set(appointments.map(apt => apt.user_id))];
      const nameMap = {};
      
      for (const userId of userIds) {
        try {
          const usersResponse = await DatabaseService.listDocuments(
            USERS_COLLECTION_ID,
            [Query.equal('userId', userId)]
          );
          
          if (usersResponse.documents && usersResponse.documents.length > 0) {
            const user = usersResponse.documents[0];
            nameMap[userId] = user.fullName || user.name || user.displayName || `Patient ${userId.substring(0, 8)}`;
          } else {
            nameMap[userId] = `Patient ${userId.substring(0, 8)}`;
          }
        } catch (error) {
          nameMap[userId] = `Patient ${userId.substring(0, 8)}`;
        }
      }
      
      setPatientNames(nameMap);
    } catch (error) {
      console.error('Error fetching patient names:', error);
    }
  };

  const generateCalendarDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    const days = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day);
    }
    
    setCalendarDays(days);
  };

  const navigateMonth = (direction) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(currentDate.getMonth() + direction);
    setCurrentDate(newDate);
    
    // Regenerate calendar days for the new month
    setTimeout(generateCalendarDays, 0);
  };

  const getAppointmentsForDay = (day) => {
    if (!day) return [];
    
    const targetDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    return appointments.filter(apt => {
      const aptDate = parseAppointmentDate(apt.date);
      return aptDate.toDateString() === targetDate.toDateString();
    });
  };

  const getFilteredAppointments = () => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    
    switch (filter) {
      case 'upcoming':
        return appointments.filter(apt => {
          const aptDate = parseAppointmentDate(apt.date);
          return aptDate >= now;
        });
      case 'past':
        return appointments.filter(apt => {
          const aptDate = parseAppointmentDate(apt.date);
          return aptDate < now;
        });
      default:
        return appointments;
    }
  };

  const getPatientName = (userId) => {
    return patientNames[userId] || 'Unknown Patient';
  };

  const renderCalendarDay = (day, index) => {
    const isToday = day && 
      day === new Date().getDate() && 
      currentDate.getMonth() === new Date().getMonth() && 
      currentDate.getFullYear() === new Date().getFullYear();
    
    const dayAppointments = day ? getAppointmentsForDay(day) : [];
    const hasAppointments = dayAppointments.length > 0;

    return (
      <TouchableOpacity
        key={index}
        style={[
          styles.calendarDay,
          isToday && styles.calendarDayToday,
          hasAppointments && styles.calendarDayWithAppointments
        ]}
        onPress={() => {
          if (hasAppointments) {
            Alert.alert(
              `Appointments for ${day}`,
              dayAppointments.map(apt => 
                `${getPatientName(apt.user_id)} at ${apt.time_slot}`
              ).join('\n')
            );
          }
        }}
      >
        {day && (
          <>
            <Text style={[
              styles.calendarDayText,
              isToday && styles.calendarDayTextToday,
              hasAppointments && styles.calendarDayTextWithAppointments
            ]}>
              {day}
            </Text>
            {hasAppointments && (
              <View style={styles.appointmentIndicator} />
            )}
          </>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient 
        colors={["#1a8e2d", "#146922"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      />
      <View style={styles.header}>
        <PageHeader onPress={() => router.back()} />
        <Text style={styles.headerTitle}>Appointments</Text>
      </View>

      <ScrollView style={styles.content}>
        {/* Calendar View */}
        <View style={styles.calendarContainer}>
          <View style={styles.calendarHeader}>
            <TouchableOpacity 
              style={styles.calendarNav}
              onPress={() => navigateMonth(-1)}
            >
              <Ionicons name="chevron-back" size={20} color="white" />
            </TouchableOpacity>
            
            <Text style={styles.calendarTitle}>
              {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </Text>
            
            <TouchableOpacity 
              style={styles.calendarNav}
              onPress={() => navigateMonth(1)}
            >
              <Ionicons name="chevron-forward" size={20} color="white" />
            </TouchableOpacity>
          </View>

          {/* Day Headers */}
          <View style={styles.calendarGrid}>
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <View key={day} style={styles.calendarDayHeader}>
                <Text style={styles.calendarDayHeaderText}>{day}</Text>
              </View>
            ))}
            
            {/* Calendar Days */}
            {calendarDays.map((day, index) => renderCalendarDay(day, index))}
          </View>
        </View>

        {/* Filter Buttons */}
        <View style={styles.filterContainer}>
          <TouchableOpacity 
            style={[styles.filterButton, filter === 'upcoming' && styles.filterButtonActive]}
            onPress={() => setFilter('upcoming')}
          >
            <Text style={[styles.filterButtonText, filter === 'upcoming' && styles.filterButtonTextActive]}>
              Upcoming
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.filterButton, filter === 'past' && styles.filterButtonActive]}
            onPress={() => setFilter('past')}
          >
            <Text style={[styles.filterButtonText, filter === 'past' && styles.filterButtonTextActive]}>
              Past
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.filterButton, filter === 'all' && styles.filterButtonActive]}
            onPress={() => setFilter('all')}
          >
            <Text style={[styles.filterButtonText, filter === 'all' && styles.filterButtonTextActive]}>
              All
            </Text>
          </TouchableOpacity>
        </View>

        {/* Appointments List */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#1a8e2d" />
            <Text style={styles.loadingText}>Loading appointments...</Text>
          </View>
        ) : (
          <View style={styles.appointmentsList}>
            {getFilteredAppointments().map((appointment) => (
              <View key={appointment.$id} style={styles.appointmentCard}>
                <View style={styles.appointmentHeader}>
                  <Text style={styles.patientName}>
                    {getPatientName(appointment.user_id)}
                  </Text>
                  <View style={[
                    styles.statusBadge,
                    { backgroundColor: appointment.has_prescription ? '#e6f7e9' : '#f9fafb' }
                  ]}>
                    <Text style={[
                      styles.statusText,
                      { color: appointment.has_prescription ? '#0AD476' : '#6b7280' }
                    ]}>
                      {appointment.has_prescription ? 'Prescription Added' : 'No Prescription'}
                    </Text>
                  </View>
                </View>
                
                <View style={styles.appointmentDetails}>
                  <View style={styles.appointmentDetail}>
                    <Ionicons name="calendar" size={16} color="#0AD476" />
                    <Text style={styles.detailText}>{appointment.date || 'No date'}</Text>
                  </View>
                  
                  <View style={styles.appointmentDetail}>
                    <Ionicons name="time" size={16} color="#0AD476" />
                    <Text style={styles.detailText}>{appointment.time_slot || 'No time'}</Text>
                  </View>
                  
                  <View style={styles.appointmentDetail}>
                    <Ionicons name="medkit" size={16} color="#0AD476" />
                    <Text style={styles.detailText}>{appointment.service_name || 'General appointment'}</Text>
                  </View>
                </View>
                
                <View style={styles.actionButtons}>
                  {!appointment.has_prescription && (
                    <TouchableOpacity 
                      style={styles.prescriptionButton}
                      onPress={() => router.push({
                        pathname: '/doctor/prescriptions/create',
                        params: { appointmentId: appointment.$id }
                      })}
                    >
                      <Ionicons name="medical" size={16} color="white" />
                      <Text style={styles.prescriptionButtonText}>Add Prescription</Text>
                    </TouchableOpacity>
                  )}
                  
                  {appointment.has_prescription && (
                    <TouchableOpacity 
                      style={styles.viewButton}
                      onPress={() => router.push({
                        pathname: '/doctor/prescriptions/view',
                        params: { appointmentId: appointment.$id }
                      })}
                    >
                      <Ionicons name="eye" size={16} color="#0AD476" />
                      <Text style={styles.viewButtonText}>View Prescription</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))}
            
            {getFilteredAppointments().length === 0 && (
              <View style={styles.emptyState}>
                <Ionicons name="calendar-outline" size={50} color="#ccc" />
                <Text style={styles.emptyStateText}>No appointments found</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  headerGradient: {
    height: 100,
    width: '100%',
    position: 'absolute',
    top: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    marginLeft: 15,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  calendarContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  calendarNav: {
    backgroundColor: '#4CAF50',
    width: 35,
    height: 35,
    borderRadius: 17.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calendarDayHeader: {
    width: '14.28%',
    alignItems: 'center',
    paddingVertical: 8,
  },
  calendarDayHeaderText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  calendarDay: {
    width: '14.28%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    marginBottom: 4,
    position: 'relative',
  },
  calendarDayToday: {
    backgroundColor: '#4CAF50',
  },
  calendarDayWithAppointments: {
    backgroundColor: '#e8f5e8',
  },
  calendarDayText: {
    fontSize: 14,
    color: '#333',
  },
  calendarDayTextToday: {
    color: 'white',
    fontWeight: 'bold',
  },
  calendarDayTextWithAppointments: {
    color: '#2e7d32',
    fontWeight: '600',
  },
  appointmentIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 6,
    height: 6,
    backgroundColor: '#4CAF50',
    borderRadius: 3,
  },
  filterContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  filterButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    backgroundColor: 'white',
    borderRadius: 20,
  },
  filterButtonActive: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  filterButtonText: {
    fontSize: 14,
    color: '#666',
  },
  filterButtonTextActive: {
    fontSize: 14,
    color: 'white',
    fontWeight: '600',
  },
  appointmentsList: {
    marginBottom: 20,
  },
  loadingContainer: {
    padding: 30,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
  },
  appointmentCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  appointmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  patientName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 15,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  appointmentDetails: {
    marginBottom: 15,
  },
  appointmentDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  detailText: {
    fontSize: 14,
    color: '#4b5563',
    marginLeft: 10,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  prescriptionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0AD476',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 5,
  },
  prescriptionButtonText: {
    color: 'white',
    fontWeight: '600',
    marginLeft: 5,
  },
  viewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#0AD476',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 5,
  },
  viewButtonText: {
    color: '#0AD476',
    fontWeight: '600',
    marginLeft: 5,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyStateText: {
    marginTop: 10,
    color: '#6b7280',
    fontSize: 16,
  },
});