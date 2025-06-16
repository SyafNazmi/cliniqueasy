// app/doctor/index.jsx - Enhanced dashboard with cancellation requests section
import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Modal, Image } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { getLocalStorage } from '../../service/Storage';
import { useAuth } from '../_layout';
import { DatabaseService, Query, account } from '../../configs/AppwriteConfig';
import { COLLECTIONS } from '../../constants';
import RoleProtected from '../../components/RoleProtected';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { appointmentManager, CANCELLATION_STATUS } from '../../service/appointmentUtils'; // Enhanced import

export default function DoctorDashboard() {
  return (
    <RoleProtected requiredRole="doctor" redirectPath="(tabs)">
      <DoctorDashboardContent />
    </RoleProtected>
  );
}

function DoctorDashboardContent() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('today');
  const [upcomingAppointments, setUpcomingAppointments] = useState([]);
  const [allAppointments, setAllAppointments] = useState([]);
  const [allPatients, setAllPatients] = useState([]);
  const [loadingAppointments, setLoadingAppointments] = useState(true);
  const [loadingPatients, setLoadingPatients] = useState(true);
  const [patientNames, setPatientNames] = useState({});
  const [branchNames, setBranchNames] = useState({});
  const [serviceNames, setServiceNames] = useState({});
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarDays, setCalendarDays] = useState([]);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [selectedDayAppointments, setSelectedDayAppointments] = useState([]);
  const [selectedDay, setSelectedDay] = useState(null);

  // NEW: Cancellation request stats
  const [cancellationStats, setCancellationStats] = useState({
    pending: 0,
    approved: 0,
    denied: 0,
    total: 0
  });

  const { logout } = useAuth();
  
  useEffect(() => {
    loadUserData();
  }, []);

  // ADDED: Focus effect to refresh data when returning to screen
  useFocusEffect(
    useCallback(() => {
      if (user?.uid) {
        loadAppointments(user.uid, false); // Don't show loader when refocusing
        loadPatients(user.uid);
      }
    }, [user?.uid])
  );

  const loadUserData = async () => {
    try {
      const userData = await getLocalStorage('userDetail');
      setUser(userData);
      
      if (userData && userData.uid) {
        loadAppointments(userData.uid);
        loadPatients(userData.uid);
        generateCalendarDays();
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  // ENHANCED: loadAppointments now includes cancellation stats calculation
  const loadAppointments = async (doctorId, showLoader = true) => {
    try {
      if (showLoader) {
        setLoadingAppointments(true);
      }
      
      // Enhanced query with ordering (same as patient HomeScreen)
      const queries = [
        Query.orderDesc('$createdAt'),
        Query.limit(100)
      ];
      
      const appointmentsResponse = await DatabaseService.listDocuments(
        COLLECTIONS.APPOINTMENTS, 
        queries
      );
      
      let allAppointments = appointmentsResponse.documents || [];
      
      // Sort appointments by date (same logic as patient screen)
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
      
      setAllAppointments(allAppointments);
      
      // Fetch patient names and branch names
      await Promise.all([
        fetchPatientNames(allAppointments),
        fetchBranchNames(allAppointments)
      ]);
      
      // NEW: Calculate cancellation request statistics
      calculateCancellationStats(allAppointments);
      
      // UPDATED: Filter upcoming appointments (same logic as patient HomeScreen)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const upcoming = allAppointments.filter(apt => {
        // First check if appointment is cancelled or completed (same as patient screen)
        const status = apt.status?.toLowerCase();
        if (status === 'cancelled' || status === 'completed') {
          return false;
        }
        
        const aptDate = parseAppointmentDate(apt.date);
        return aptDate >= today;
      });
      
      // Sort upcoming appointments by date (earliest first)
      const sortedUpcoming = [...upcoming].sort((a, b) => {
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
          return (a.time_slot || '').localeCompare(b.time_slot || '');
        }
        
        return dateA - dateB;
      });
      
      setUpcomingAppointments(sortedUpcoming.slice(0, 5));
      
    } catch (error) {
      console.error('Error loading appointments:', error);
    } finally {
      if (showLoader) {
        setLoadingAppointments(false);
      }
    }
  };

  // NEW: Calculate cancellation request statistics
  const calculateCancellationStats = (appointments) => {
    const stats = {
      pending: 0,
      approved: 0,
      denied: 0,
      total: 0
    };

    appointments.forEach(apt => {
      if (apt.cancellation_status === CANCELLATION_STATUS.REQUESTED) {
        stats.pending++;
        stats.total++;
      } else if (apt.cancellation_status === CANCELLATION_STATUS.APPROVED) {
        stats.approved++;
        stats.total++;
      } else if (apt.cancellation_status === CANCELLATION_STATUS.DENIED) {
        stats.denied++;
        stats.total++;
      }
    });

    setCancellationStats(stats);
  };

  // ADDED: Set up real-time subscription for appointments (same as patient HomeScreen)
  useEffect(() => {
    let subscriptionKey = null;

    const setupRealtimeSubscription = async () => {
      try {
        const userData = await getLocalStorage('userDetail');
        if (userData?.uid) {
          subscriptionKey = appointmentManager.subscribeToAppointments(
            (event) => {
              console.log('Doctor dashboard received appointment update:', event);
              
              // Refresh appointments when any appointment changes
              // Enhanced retry logic for real-time updates
              const retryFetch = async (attempt = 1, maxAttempts = 3) => {
                await loadAppointments(userData.uid, false);
                
                // Check if the appointment change is reflected
                const appointmentId = event.appointment?.$id;
                if (appointmentId && attempt < maxAttempts) {
                  setTimeout(() => {
                    setAllAppointments(currentAppointments => {
                      const hasAppointment = currentAppointments.some(apt => apt.$id === appointmentId);
                      
                      if (!hasAppointment && event.type !== 'delete') {
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
          );
        }
      } catch (error) {
        console.error('Error setting up doctor real-time subscription:', error);
      }
    };

    setupRealtimeSubscription();

    // Cleanup subscription on unmount
    return () => {
      if (subscriptionKey) {
        appointmentManager.unsubscribe(subscriptionKey);
      }
    };
  }, [user?.uid]);

  // Enhanced patient name fetching function (same logic as appointments management)
  const fetchPatientNames = async (appointments) => {
    try {
      const nameMap = {};
      
      for (const appointment of appointments) {
        let patientName = 'Unknown Patient';
        
        try {
          // Check if this is a family booking with patient_name
          if (appointment.is_family_booking && appointment.patient_name) {
            patientName = appointment.patient_name;
          } 
          // If family booking but no patient_name, try to fetch by patient_id
          else if (appointment.is_family_booking && appointment.patient_id) {
            try {
              const patientResponse = await DatabaseService.listDocuments(
                COLLECTIONS.PATIENT_PROFILES,
                [Query.equal('$id', appointment.patient_id)]
              );
              
              if (patientResponse.documents && patientResponse.documents.length > 0) {
                const patient = patientResponse.documents[0];
                patientName = patient.fullName || patient.name || patient.displayName || appointment.patient_name || 'Family Member';
              } else {
                patientName = appointment.patient_name || 'Family Member';
              }
            } catch (error) {
              patientName = appointment.patient_name || 'Family Member';
            }
          }
          // Regular booking - fetch by user_id
          else if (appointment.user_id) {
            try {
              const usersResponse = await DatabaseService.listDocuments(
                COLLECTIONS.PATIENT_PROFILES,
                [Query.equal('userId', appointment.user_id)]
              );
              
              if (usersResponse.documents && usersResponse.documents.length > 0) {
                const user = usersResponse.documents[0];
                patientName = user.fullName || user.name || user.displayName || 
                  (appointment.user_id.includes('@') ? appointment.user_id.split('@')[0].replace(/[._-]/g, ' ') : 
                   `Patient ${appointment.user_id.substring(0, 8)}`);
              } else {
                patientName = appointment.user_id.includes('@') ? 
                  appointment.user_id.split('@')[0].replace(/[._-]/g, ' ') : 
                  `Patient ${appointment.user_id.substring(0, 8)}`;
              }
            } catch (error) {
              patientName = `Patient ${appointment.user_id.substring(0, 8)}`;
            }
          }
          
          const appointmentKey = `${appointment.$id}`;
          nameMap[appointmentKey] = patientName;
          
        } catch (error) {
          console.error(`Error fetching patient name for appointment ${appointment.$id}:`, error);
          const appointmentKey = `${appointment.$id}`;
          nameMap[appointmentKey] = appointment.patient_name || 'Unknown Patient';
        }
      }
      
      setPatientNames(nameMap);
    } catch (error) {
      console.error('Error fetching patient names:', error);
    }
  };

  // Enhanced branch names fetching function
  const fetchBranchNames = async (appointments) => {
    try {
      const branchIds = [...new Set(appointments.map(apt => apt.branch_id).filter(Boolean))];
      const branchMap = {};
      
      for (const branchId of branchIds) {
        try {
          const branchResponse = await DatabaseService.listDocuments(
            COLLECTIONS.BRANCHES,
            [Query.equal('branch_id', branchId)]
          );
          
          if (branchResponse.documents && branchResponse.documents.length > 0) {
            const branch = branchResponse.documents[0];
            branchMap[branchId] = {
              name: branch.name || 'Unknown Branch',
              region: branch.region_id || 'Unknown Region',
              regionId: branch.region_id
            };
          }
        } catch (error) {
          branchMap[branchId] = {
            name: 'Unknown Branch',
            region: 'Unknown Region',
            regionId: null
          };
        }
      }
      
      setBranchNames(branchMap);
    } catch (error) {
      console.error('Error fetching branch names:', error);
    }
  };

  const loadPatients = async (doctorId) => {
    try {
      setLoadingPatients(true);
      const usersResponse = await DatabaseService.listDocuments(COLLECTIONS.PATIENT_PROFILES, []);
      let patients = usersResponse.documents || [];
      
      patients = patients.filter(user => !user.role || user.role !== 'doctor');
      patients.sort((a, b) => {
        const nameA = getPatientDisplayName(a).toLowerCase();
        const nameB = getPatientDisplayName(b).toLowerCase();
        return nameA.localeCompare(nameB);
      });
      
      setAllPatients(patients);
    } catch (error) {
      console.error('Error loading patients:', error);
    } finally {
      setLoadingPatients(false);
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
    
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day);
    }
    
    setCalendarDays(days);
  };

  const navigateMonth = (direction) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(currentDate.getMonth() + direction);
    setCurrentDate(newDate);
    setTimeout(generateCalendarDays, 0);
  };

  const getAppointmentsForDay = (day) => {
    if (!day) return [];
    
    const targetDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    return allAppointments.filter(apt => {
      const aptDate = parseAppointmentDate(apt.date);
      return aptDate.toDateString() === targetDate.toDateString();
    });
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

  const getPatientDisplayName = (patient) => {
    return patient.fullName || patient.name || patient.displayName || 
           (patient.userId && patient.userId.includes('@') ? 
            patient.userId.split('@')[0].replace(/[._-]/g, ' ') : 
            `Patient ${(patient.userId || patient.$id).substring(0, 8)}`);
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

  // Helper function to get patient name (updated for appointment-specific keys)
  const getPatientName = (appointment) => {
    if (!appointment) return "Unknown Patient";
    
    // Check if this is a family booking with patient_name
    if (appointment.is_family_booking && appointment.patient_name) {
      return appointment.patient_name;
    }
    
    // Use the patientNames state with appointment-specific key
    const appointmentKey = `${appointment.$id}`;
    return patientNames[appointmentKey] || appointment.patient_name || "Unknown Patient";
  };

  // Helper function to get branch name
  const getBranchName = (branchId) => {
    if (!branchId) return "Unknown Branch";
    
    const branchInfo = branchNames[branchId];
    return branchInfo?.name || "Unknown Branch";
  };

  // Helper function to get status color
  const getStatusColor = (status) => {
    switch (status) {
      case 'Confirmed':
        return '#0AD476';
      case 'Completed':
        return '#3B82F6';
      case 'Cancelled':
        return '#EF4444';
      case 'Rescheduled':
        return '#F59E0B';
      case 'No Show':
        return '#8B5CF6';
      default:
        return '#6B7280'; // Booked
    }
  };

  // Helper function to format full date
  const getFullDateString = (day) => {
    if (!day) return '';
    
    const targetDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    return targetDate.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const handleSignOut = async () => {
    try {
      try {
        await account.deleteSession('current');
      } catch (e) {
        console.log('Session deletion error (can be ignored):', e);
      }
      
      if (typeof logout === 'function') {
        await logout();
      } else {
        await AsyncStorage.removeItem('userDetail');
        await AsyncStorage.removeItem('current_user_is_doctor');
        router.replace('/login/signIn');
      }
    } catch (error) {
      console.error("Logout error:", error);
      router.replace('/login/signIn');
    }
  };

  const navigateToAppointments = () => {
    router.push('/doctor/appointments');
  };

  const navigateToPatients = () => {
    router.push('/doctor/patients');
  };

  const navigateToPrescriptions = () => {
    router.push('/doctor/prescriptions');
  };

  const navigateToReports = () => {
    router.push('/doctor/reports');
  };

  const getDoctorInitials = () => {
    const name = user?.displayName || user?.fullName || 'Dr';
    const words = name.split(' ');
    if (words.length >= 2) {
      return (words[0].charAt(0) + words[1].charAt(0)).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  // NEW: Cancellation Requests Section Component
  const renderCancellationRequestsSection = () => {
    if (cancellationStats.total === 0) return null;

    return (
      <View style={styles.cancellationSection}>
        <View style={styles.cancellationHeader}>
          <View style={styles.cancellationTitleContainer}>
            <Ionicons name="hourglass" size={20} color="#F59E0B" />
            <Text style={styles.cancellationTitle}>Cancellation Requests</Text>
            {cancellationStats.pending > 0 && (
              <View style={styles.pendingBadge}>
                <Text style={styles.pendingBadgeText}>{cancellationStats.pending}</Text>
              </View>
            )}
          </View>
          <TouchableOpacity 
            style={styles.viewAllRequestsButton}
            onPress={() => router.push('/doctor/appointments/cancellation-requests')}
          >
            <Text style={styles.viewAllRequestsText}>View All</Text>
            <Ionicons name="arrow-forward" size={16} color="#F59E0B" />
          </TouchableOpacity>
        </View>
        
        <View style={styles.cancellationStatsGrid}>
          <View style={styles.cancellationStatItem}>
            <Text style={styles.cancellationStatNumber}>{cancellationStats.pending}</Text>
            <Text style={styles.cancellationStatLabel}>Pending</Text>
            <View style={[styles.cancellationStatIndicator, { backgroundColor: '#F59E0B' }]} />
          </View>
          <View style={styles.cancellationStatItem}>
            <Text style={styles.cancellationStatNumber}>{cancellationStats.approved}</Text>
            <Text style={styles.cancellationStatLabel}>Approved</Text>
            <View style={[styles.cancellationStatIndicator, { backgroundColor: '#10B981' }]} />
          </View>
          <View style={styles.cancellationStatItem}>
            <Text style={styles.cancellationStatNumber}>{cancellationStats.denied}</Text>
            <Text style={styles.cancellationStatLabel}>Denied</Text>
            <View style={[styles.cancellationStatIndicator, { backgroundColor: '#EF4444' }]} />
          </View>
        </View>

        {/* Quick Action Button for pending requests */}
        {cancellationStats.pending > 0 && (
          <TouchableOpacity 
            style={styles.quickReviewButton}
            onPress={() => router.push('/doctor/appointments/cancellation-requests')}
          >
            <Ionicons name="flash" size={16} color="white" />
            <Text style={styles.quickReviewText}>
              Review {cancellationStats.pending} Pending Request{cancellationStats.pending > 1 ? 's' : ''}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  // Appointment Modal Component
  const AppointmentModal = () => (
    <Modal
      visible={showAppointmentModal}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowAppointmentModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.appointmentModalContent}>
          <View style={styles.appointmentModalHeader}>
            <View style={styles.appointmentModalTitle}>
              <Ionicons name="calendar" size={24} color="#4CAF50" />
              <Text style={styles.appointmentModalTitleText}>
                Appointments for {getFullDateString(selectedDay)}
              </Text>
            </View>
            <TouchableOpacity 
              onPress={() => setShowAppointmentModal(false)}
              style={styles.modalCloseButton}
            >
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.appointmentModalBody}>
            {selectedDayAppointments.length > 0 ? (
              selectedDayAppointments.map((appointment, index) => (
                <View key={appointment.$id} style={styles.modalAppointmentCard}>
                  <View style={styles.modalAppointmentHeader}>
                    <View style={styles.modalPatientIcon}>
                      <Text style={styles.modalPatientIconText}>
                        {getPatientName(appointment).substring(0, 2).toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.modalAppointmentInfo}>
                      <Text style={styles.modalPatientName}>
                        {getPatientName(appointment)}
                      </Text>
                      <View style={styles.modalAppointmentDetails}>
                        <View style={styles.modalDetailRow}>
                          <Ionicons name="time-outline" size={16} color="#4CAF50" />
                          <Text style={styles.modalDetailText}>
                            {appointment.time_slot || 'No time specified'}
                          </Text>
                        </View>
                        <View style={styles.modalDetailRow}>
                          <Ionicons name="location-outline" size={16} color="#FF9800" />
                          <Text style={styles.modalDetailText}>
                            {getBranchName(appointment.branch_id)}
                          </Text>
                        </View>
                        <View style={styles.modalDetailRow}>
                          <Ionicons name="medical-outline" size={16} color="#2196F3" />
                          <Text style={styles.modalDetailText}>
                            {appointment.service_name || 'General Consultation'}
                          </Text>
                        </View>
                        {/* NEW: Show cancellation request status in modal */}
                        {appointment.cancellation_status && appointment.cancellation_status !== CANCELLATION_STATUS.NONE && (
                          <View style={styles.modalDetailRow}>
                            <Ionicons 
                              name={
                                appointment.cancellation_status === CANCELLATION_STATUS.REQUESTED ? "hourglass" :
                                appointment.cancellation_status === CANCELLATION_STATUS.APPROVED ? "checkmark-circle" :
                                "close-circle"
                              }
                              size={16} 
                              color={
                                appointment.cancellation_status === CANCELLATION_STATUS.REQUESTED ? '#F59E0B' :
                                appointment.cancellation_status === CANCELLATION_STATUS.APPROVED ? '#10B981' :
                                '#EF4444'
                              } 
                            />
                            <Text style={[
                              styles.modalDetailText,
                              { 
                                color: appointment.cancellation_status === CANCELLATION_STATUS.REQUESTED ? '#F59E0B' :
                                       appointment.cancellation_status === CANCELLATION_STATUS.APPROVED ? '#10B981' :
                                       '#EF4444',
                                fontWeight: '600'
                              }
                            ]}>
                              {appointment.cancellation_status === CANCELLATION_STATUS.REQUESTED ? 'Cancellation Requested' :
                               appointment.cancellation_status === CANCELLATION_STATUS.APPROVED ? 'Cancellation Approved' :
                               'Cancellation Denied'}
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                    <View style={styles.modalStatusContainer}>
                      <View style={[
                        styles.modalStatusDot,
                        { backgroundColor: getStatusColor(appointment.status) }
                      ]} />
                      <Text style={[
                        styles.modalStatusText,
                        { color: getStatusColor(appointment.status) }
                      ]}>
                        {appointment.status || 'Booked'}
                      </Text>
                    </View>
                  </View>
                  
                  {appointment.notes && (
                    <View style={styles.modalNotesSection}>
                      <Ionicons name="document-text-outline" size={14} color="#666" />
                      <Text style={styles.modalNotesText}>{appointment.notes}</Text>
                    </View>
                  )}

                  <View style={styles.modalAppointmentActions}>
                    <TouchableOpacity 
                      style={styles.modalActionButton}
                      onPress={() => {
                        setShowAppointmentModal(false);
                        router.push({
                          pathname: '/doctor/appointments/detail',
                          params: { appointmentId: appointment.$id }
                        });
                      }}
                    >
                      <Ionicons name="eye-outline" size={16} color="#4CAF50" />
                      <Text style={styles.modalActionText}>View Details</Text>
                    </TouchableOpacity>
                  </View>

                  {index < selectedDayAppointments.length - 1 && (
                    <View style={styles.modalAppointmentDivider} />
                  )}
                </View>
              ))
            ) : (
              <View style={styles.modalEmptyState}>
                <Ionicons name="calendar-clear-outline" size={48} color="#E0E0E0" />
                <Text style={styles.modalEmptyText}>No appointments for this day</Text>
              </View>
            )}
          </ScrollView>

          <View style={styles.appointmentModalFooter}>
            <TouchableOpacity 
              style={styles.modalViewAllButton}
              onPress={() => {
                setShowAppointmentModal(false);
                navigateToAppointments();
              }}
            >
              <Text style={styles.modalViewAllText}>Manage All Appointments</Text>
              <Ionicons name="arrow-forward" size={16} color="#4CAF50" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const ProfileModal = () => (
    <Modal
      visible={showProfileModal}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setShowProfileModal(false)}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={() => setShowProfileModal(false)}
      >
        <View style={styles.profileModal}>
          <View style={styles.profileHeader}>
            <View style={styles.profileAvatarLarge}>
              <Ionicons name="medical" size={30} color="white" />
            </View>
            <Text style={styles.profileName}>{user?.displayName || 'Doctor'}</Text>
            <Text style={styles.profileEmail}>{user?.email || 'doctor@permaipolyclinic.com'}</Text>
            <Text style={styles.clinicName}>Permai Polyclinic Management</Text>
          </View>
          
          <View style={styles.profileOptions}>
            <TouchableOpacity style={styles.profileOption}>
              <Ionicons name="person-outline" size={20} color="#4CAF50" />
              <Text style={styles.profileOptionText}>Edit Profile</Text>
              <Ionicons name="chevron-forward" size={20} color="#ccc" />
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.profileOption}>
              <Ionicons name="settings-outline" size={20} color="#4CAF50" />
              <Text style={styles.profileOptionText}>Settings</Text>
              <Ionicons name="chevron-forward" size={20} color="#ccc" />
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.profileOption}>
              <Ionicons name="help-circle-outline" size={20} color="#4CAF50" />
              <Text style={styles.profileOptionText}>Help & Support</Text>
              <Ionicons name="chevron-forward" size={20} color="#ccc" />
            </TouchableOpacity>
            
            <View style={styles.divider} />
            
            <TouchableOpacity 
              style={[styles.profileOption, styles.logoutOption]}
              onPress={() => {
                setShowProfileModal(false);
                Alert.alert(
                  'Logout',
                  'Are you sure you want to logout?',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Logout', style: 'destructive', onPress: handleSignOut }
                  ]
                );
              }}
            >
              <Ionicons name="log-out-outline" size={20} color="#FF4747" />
              <Text style={[styles.profileOptionText, { color: '#FF4747' }]}>Logout</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );

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
            setSelectedDay(day);
            setSelectedDayAppointments(dayAppointments);
            setShowAppointmentModal(true);
          }
        }}
        disabled={!hasAppointments}
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
              <View style={styles.appointmentIndicator}>
                <Text style={styles.appointmentCount}>
                  {dayAppointments.length}
                </Text>
              </View>
            )}
          </>
        )}
      </TouchableOpacity>
    );
  };

  const renderTodayTab = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      {/* Welcome Banner */}
      <View style={styles.welcomeBanner}>
        <LinearGradient
          colors={["#4CAF50", "#45A049"]}
          style={styles.welcomeBannerGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.welcomeContent}>
            <View style={styles.welcomeText}>
              <Text style={styles.welcomeTitle}>Good Morning, Dr. {user?.displayName || ''}</Text>
              <Text style={styles.welcomeSubtitle}>You have {upcomingAppointments.length} appointments today</Text>
              <Text style={styles.clinicWelcome}>Permai Polyclinic Management</Text>
            </View>
            <View style={styles.medicalIcon}>
              <Ionicons name="medical" size={40} color="rgba(255,255,255,0.8)" />
            </View>
          </View>
        </LinearGradient>
      </View>

      {/* NEW: Cancellation Requests Section */}
      {renderCancellationRequestsSection()}

      {/* Statistics Dashboard */}
      <View style={styles.statsSection}>
        <Text style={styles.sectionTitle}>Today's Overview</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <View style={styles.statIconContainer}>
              <Ionicons name="calendar-outline" size={24} color="#4CAF50" />
            </View>
            <Text style={styles.statNumber}>{upcomingAppointments.length}</Text>
            <Text style={styles.statLabel}>Appointments</Text>
          </View>
          
          <View style={styles.statCard}>
            <View style={styles.statIconContainer}>
              <Ionicons name="medical-outline" size={24} color="#FF9800" />
            </View>
            <Text style={styles.statNumber}>
              {upcomingAppointments.filter(apt => !apt.has_prescription).length}
            </Text>
            <Text style={styles.statLabel}>Pending Prescriptions</Text>
          </View>
          
          <View style={styles.statCard}>
            <View style={styles.statIconContainer}>
              <Ionicons name="people-outline" size={24} color="#2196F3" />
            </View>
            <Text style={styles.statNumber}>{allPatients.length}</Text>
            <Text style={styles.statLabel}>Total Patients</Text>
          </View>
          
          <View style={styles.statCard}>
            <View style={styles.statIconContainer}>
              <Ionicons name="checkmark-circle-outline" size={24} color="#9C27B0" />
            </View>
            <Text style={styles.statNumber}>
              {allAppointments.filter(apt => apt.has_prescription).length}
            </Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>
        </View>
      </View>
      
      {/* Next Appointments Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Next Appointments</Text>
          {upcomingAppointments.length > 3 && (
            <TouchableOpacity onPress={navigateToAppointments}>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          )}
        </View>
        
        {loadingAppointments ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4CAF50" />
            <Text style={styles.loadingText}>Loading appointments...</Text>
          </View>
        ) : upcomingAppointments.length === 0 ? (
          <View style={styles.emptyStateContainer}>
            <View style={styles.emptyStateIcon}>
              <Ionicons name="calendar-clear-outline" size={50} color="#E0E0E0" />
            </View>
            <Text style={styles.emptyStateText}>No appointments scheduled</Text>
            <Text style={styles.emptyStateSubtext}>Your day is looking clear!</Text>
          </View>
        ) : (
          upcomingAppointments.slice(0, 3).map((appointment) => (
            <View key={appointment.$id} style={styles.appointmentCard}>
              <View style={styles.appointmentCardHeader}>
                <View style={styles.patientIcon}>
                  <Ionicons name="person" size={20} color="#4CAF50" />
                </View>
                <View style={styles.appointmentInfo}>
                  <Text style={styles.patientName}>
                    {getPatientName(appointment)}
                  </Text>
                  <Text style={styles.appointmentTime}>
                    {appointment.time_slot || 'No time'} • {appointment.date || 'Today'}
                  </Text>
                  <View style={styles.serviceContainer}>
                    <Ionicons name="medical" size={12} color="#666" />
                    <Text style={styles.serviceText}>
                      {appointment.service_name || 'General appointment'}
                    </Text>
                  </View>
                  {/* NEW: Show cancellation request indicator on appointment cards */}
                  {appointment.cancellation_status && appointment.cancellation_status !== CANCELLATION_STATUS.NONE && (
                    <View style={styles.cancellationRequestIndicator}>
                      <Ionicons 
                        name={
                          appointment.cancellation_status === CANCELLATION_STATUS.REQUESTED ? "hourglass" :
                          appointment.cancellation_status === CANCELLATION_STATUS.APPROVED ? "checkmark-circle" :
                          "close-circle"
                        }
                        size={12} 
                        color={
                          appointment.cancellation_status === CANCELLATION_STATUS.REQUESTED ? '#F59E0B' :
                          appointment.cancellation_status === CANCELLATION_STATUS.APPROVED ? '#10B981' :
                          '#EF4444'
                        } 
                      />
                      <Text style={[
                        styles.cancellationRequestText,
                        { color: 
                          appointment.cancellation_status === CANCELLATION_STATUS.REQUESTED ? '#F59E0B' :
                          appointment.cancellation_status === CANCELLATION_STATUS.APPROVED ? '#10B981' :
                          '#EF4444'
                        }
                      ]}>
                        {appointment.cancellation_status === CANCELLATION_STATUS.REQUESTED ? 'Cancellation Requested' :
                         appointment.cancellation_status === CANCELLATION_STATUS.APPROVED ? 'Cancellation Approved' :
                         'Cancellation Denied'}
                      </Text>
                    </View>
                  )}
                </View>
                <View style={styles.appointmentStatus}>
                  {appointment.has_prescription ? (
                    <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                  ) : (
                    <Ionicons name="time-outline" size={20} color="#FF9800" />
                  )}
                </View>
              </View>
            </View>
          ))
        )}
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickActionsGrid}>
          <TouchableOpacity style={styles.quickActionCard} onPress={navigateToAppointments}>
            <View style={styles.quickActionIcon}>
              <Ionicons name="calendar" size={24} color="#4CAF50" />
            </View>
            <Text style={styles.quickActionText}>Manage Appointments</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.quickActionCard} onPress={navigateToPatients}>
            <View style={styles.quickActionIcon}>
              <Ionicons name="people" size={24} color="#2196F3" />
            </View>
            <Text style={styles.quickActionText}>View Patients</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.quickActionCard} onPress={navigateToPrescriptions}>
            <View style={styles.quickActionIcon}>
              <Ionicons name="medical" size={24} color="#FF9800" />
            </View>
            <Text style={styles.quickActionText}>Prescriptions</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.quickActionCard} onPress={navigateToReports}>
            <View style={styles.quickActionIcon}>
              <Ionicons name="analytics" size={24} color="#9C27B0" />
            </View>
            <Text style={styles.quickActionText}>View Reports</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );

  // OPTIMIZED APPOINTMENTS TAB WITH COMPACT LAYOUT
  const renderAppointmentsTab = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      {/* Calendar at the top */}
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
          {calendarDays.map((day, index) => renderCalendarDay(day, index))}
        </View>
      </View>
      
      <TouchableOpacity 
        style={styles.viewFullButton}
        onPress={navigateToAppointments}
      >
        <Text style={styles.viewFullButtonText}>Manage Appointments</Text>
        <Ionicons name="open-outline" size={16} color="#4CAF50" />
      </TouchableOpacity>

      {/* Compact Appointment Statistics */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Stats</Text>
        <View style={styles.compactStatsGrid}>
          {/* Total and Today Row */}
          <View style={styles.statsRow}>
            <View style={styles.compactStatCard}>
              <View style={styles.compactStatContent}>
                <Ionicons name="calendar-outline" size={18} color="#4CAF50" />
                <View style={styles.compactStatText}>
                  <Text style={styles.compactStatNumber}>{allAppointments.length}</Text>
                  <Text style={styles.compactStatLabel}>Total</Text>
                </View>
              </View>
            </View>

            <View style={styles.compactStatCard}>
              <View style={styles.compactStatContent}>
                <Ionicons name="today-outline" size={18} color="#2196F3" />
                <View style={styles.compactStatText}>
                  <Text style={styles.compactStatNumber}>
                    {allAppointments.filter(apt => {
                      const today = new Date();
                      const aptDate = parseAppointmentDate(apt.date);
                      return aptDate.toDateString() === today.toDateString();
                    }).length}
                  </Text>
                  <Text style={styles.compactStatLabel}>Today</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Upcoming and Tomorrow Row */}
          <View style={styles.statsRow}>
            <View style={styles.compactStatCard}>
              <View style={styles.compactStatContent}>
                <Ionicons name="calendar-number-outline" size={18} color="#FF9800" />
                <View style={styles.compactStatText}>
                  <Text style={styles.compactStatNumber}>
                    {allAppointments.filter(apt => {
                      const tomorrow = new Date();
                      tomorrow.setDate(tomorrow.getDate() + 1);
                      const aptDate = parseAppointmentDate(apt.date);
                      return aptDate.toDateString() === tomorrow.toDateString();
                    }).length}
                  </Text>
                  <Text style={styles.compactStatLabel}>Tomorrow</Text>
                </View>
              </View>
            </View>

            <View style={styles.compactStatCard}>
              <View style={styles.compactStatContent}>
                <Ionicons name="trending-up-outline" size={18} color="#9C27B0" />
                <View style={styles.compactStatText}>
                  <Text style={styles.compactStatNumber}>
                    {allAppointments.filter(apt => {
                      const today = new Date();
                      const aptDate = parseAppointmentDate(apt.date);
                      return aptDate >= today && apt.status !== 'Cancelled' && apt.status !== 'Completed';
                    }).length}
                  </Text>
                  <Text style={styles.compactStatLabel}>Upcoming</Text>
                </View>
              </View>
            </View>
          </View>
        </View>
      </View>

      {/* Compact Recent Appointments Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Appointments</Text>
          <TouchableOpacity onPress={navigateToAppointments}>
            <Text style={styles.seeAllText}>View All</Text>
          </TouchableOpacity>
        </View>
        
        {loadingAppointments ? (
          <View style={styles.compactLoadingContainer}>
            <ActivityIndicator size="large" color="#4CAF50" />
            <Text style={styles.compactLoadingText}>Loading...</Text>
          </View>
        ) : allAppointments.length === 0 ? (
          <View style={styles.compactEmptyState}>
            <Ionicons name="calendar-clear-outline" size={32} color="#C0C0C0" />
            <Text style={styles.compactEmptyText}>No appointments scheduled</Text>
          </View>
        ) : (
          allAppointments.slice(0, 5).map((appointment) => (
            <View key={appointment.$id} style={styles.compactAppointmentCard}>
              <View style={styles.compactCardHeader}>
                <View style={styles.compactPatientIcon}>
                  <Ionicons name="person" size={16} color="#4CAF50" />
                </View>
                <View style={styles.compactAppointmentInfo}>
                  <Text style={styles.compactPatientName} numberOfLines={1}>
                    {getPatientName(appointment)}
                  </Text>
                  <Text style={styles.compactAppointmentTime}>
                    {appointment.time_slot || 'No time'} • {appointment.date || 'Today'}
                  </Text>
                </View>
                <View style={styles.statusIndicator}>
                  <View style={[
                    styles.statusDot, 
                    { backgroundColor: getStatusColor(appointment.status) }
                  ]} />
                </View>
              </View>
              <View style={styles.compactServiceRow}>
                <View style={styles.compactServiceInfo}>
                  <Ionicons name="medical" size={10} color="#666" />
                  <Text style={styles.compactServiceText} numberOfLines={1}>
                    {appointment.service_name || 'General appointment'}
                  </Text>
                </View>
                <View style={styles.compactBranchInfo}>
                  <Ionicons name="location" size={10} color="#666" />
                  <Text style={styles.compactBranchText} numberOfLines={1}>
                    {getBranchName(appointment.branch_id)}
                  </Text>
                </View>
              </View>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );

  const renderPatientsTab = () => {
    const groupedPatients = {};
    allPatients.forEach((patient, index) => {
      const name = getPatientDisplayName(patient);
      const firstLetter = name.charAt(0).toUpperCase();
      if (!groupedPatients[firstLetter]) {
        groupedPatients[firstLetter] = [];
      }
      if (groupedPatients[firstLetter].length < 3) {
        groupedPatients[firstLetter].push({ ...patient, _uniqueIndex: index });
      }
    });

    const availableLetters = Object.keys(groupedPatients).sort().slice(0, 5);

    return (
      <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Patients ({allPatients.length})</Text>
          <TouchableOpacity onPress={navigateToPatients}>
            <Text style={styles.seeAllText}>See All</Text>
          </TouchableOpacity>
        </View>
        
        <TouchableOpacity 
          style={styles.viewFullButton}
          onPress={navigateToPatients}
        >
          <Text style={styles.viewFullButtonText}>View Full Patient Directory & Search</Text>
          <Ionicons name="open-outline" size={16} color="#4CAF50" />
        </TouchableOpacity>
        
        {loadingPatients ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4CAF50" />
            <Text style={styles.loadingText}>Loading patients...</Text>
          </View>
        ) : (
          availableLetters.map(letter => (
            <View key={letter} style={styles.patientSection}>
              <Text style={styles.sectionLetter}>{letter}</Text>
              {groupedPatients[letter].map(patient => (
                <TouchableOpacity
                  key={`patient-${patient.$id || patient.userId}-${patient._uniqueIndex}`}
                  style={styles.patientCard}
                  onPress={() => router.push({
                    pathname: '/doctor/patients/detail',
                    params: { 
                      patientId: patient.userId || patient.$id,
                      patientName: getPatientDisplayName(patient)
                    }
                  })}
                >
                  <View style={styles.patientInfo}>
                    <View style={styles.patientAvatar}>
                      <Text style={styles.patientAvatarText}>
                        {getPatientDisplayName(patient).substring(0, 2).toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.patientDetails}>
                      <Text style={styles.patientName}>
                        {getPatientDisplayName(patient)}
                      </Text>
                      <Text style={styles.patientMeta}>
                        ID: {(patient.userId || patient.$id).substring(0, 12)}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#ccc" />
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ))
        )}
      </ScrollView>
    );
  };

  const renderPrescriptionsTab = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Prescription Management</Text>
        <TouchableOpacity onPress={navigateToPrescriptions}>
          <Text style={styles.seeAllText}>View All</Text>
        </TouchableOpacity>
      </View>
      
      <TouchableOpacity 
        style={styles.viewFullButton}
        onPress={navigateToPrescriptions}
      >
        <Text style={styles.viewFullButtonText}>Open Full Prescription Management</Text>
        <Ionicons name="open-outline" size={16} color="#4CAF50" />
      </TouchableOpacity>
      
      {allAppointments.filter(apt => apt.has_prescription).slice(0, 5).map(appointment => (
        <View key={appointment.$id} style={styles.prescriptionInfoCard}>
          <View style={styles.prescriptionHeader}>
            <View style={styles.prescriptionPatientInfo}>
              <Text style={styles.prescriptionPatientName}>
                {getPatientName(appointment)}
              </Text>
              <Text style={styles.prescriptionDate}>
                {appointment.date || 'Unknown date'}
              </Text>
              <Text style={styles.prescriptionService}>
                {appointment.service_name || 'General Consultation'}
              </Text>
            </View>
            <View style={styles.qrCodePlaceholder}>
              <Ionicons name="qr-code" size={30} color="#666" />
            </View>
          </View>
          
          <View style={styles.prescriptionActions}>
            <TouchableOpacity 
              style={styles.viewPrescriptionButton}
              onPress={() => router.push({
                pathname: '/doctor/prescriptions/view',
                params: { appointmentId: appointment.$id }
              })}
            >
              <Ionicons name="eye" size={16} color="#4CAF50" />
              <Text style={styles.viewPrescriptionText}>View Details</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.shareQRButton}>
              <Ionicons name="share" size={16} color="white" />
              <Text style={styles.shareQRText}>Share</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}
      
      {allAppointments.filter(apt => apt.has_prescription).length === 0 && (
        <View style={styles.emptyStateContainer}>
          <View style={styles.emptyStateIcon}>
            <Ionicons name="medical-outline" size={50} color="#E0E0E0" />
          </View>
          <Text style={styles.emptyStateText}>No prescriptions found</Text>
          <Text style={styles.emptyStateSubtext}>Prescriptions will appear here once you add them</Text>
        </View>
      )}
    </ScrollView>
  );

  return (
    <View style={styles.container}>
      {/* Enhanced Header with Polyclinic Logo */}
      <LinearGradient 
        colors={["#1a8e2d", "#146922"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <View style={styles.polyclinicInfo}>
              <Image 
                source={require('../../assets/images/polyclinic-logo.png')}
                style={styles.polyclinicLogo}
                resizeMode="contain"
              />
              <View style={styles.polyclinicText}>
                <Text style={styles.polyclinicName}>Permai Polyclinic</Text>
                <Text style={styles.headerSubtitle}>Management System</Text>
              </View>
            </View>
          </View>
          
          <TouchableOpacity 
            style={styles.profileButton} 
            onPress={() => setShowProfileModal(true)}
          >
            <View style={styles.profileAvatar}>
              <Text style={styles.profileAvatarText}>{getDoctorInitials()}</Text>
            </View>
            <View style={styles.profileBadge}>
              <Ionicons name="medical" size={12} color="white" />
            </View>
          </TouchableOpacity>
        </View>
      </LinearGradient>
      
      <ProfileModal />
      <AppointmentModal />
      
      <View style={styles.content}>
        {activeTab === 'today' && renderTodayTab()}
        {activeTab === 'appointments' && renderAppointmentsTab()}
        {activeTab === 'patients' && renderPatientsTab()}
        {activeTab === 'prescriptions' && renderPrescriptionsTab()}
      </View>
      
      {/* Enhanced Tab Bar with Cancellation Request Badge */}
      <View style={styles.tabBar}>
        <TouchableOpacity 
          style={[styles.tabItem, activeTab === 'appointments' && styles.tabItemActive]}
          onPress={() => setActiveTab('appointments')}
        >
          <Ionicons 
            name="calendar" 
            size={20} 
            color={activeTab === 'appointments' ? '#4CAF50' : '#666'} 
          />
          <Text style={[styles.tabLabel, activeTab === 'appointments' && styles.tabLabelActive]}>
            Appointments
          </Text>
          {/* NEW: Show cancellation requests badge */}
          {cancellationStats.pending > 0 && (
            <View style={styles.cancellationBadge}>
              <Text style={styles.cancellationBadgeText}>{cancellationStats.pending}</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.tabItem, activeTab === 'prescriptions' && styles.tabItemActive]}
          onPress={() => setActiveTab('prescriptions')}
        >
          <Ionicons 
            name="medical" 
            size={20} 
            color={activeTab === 'prescriptions' ? '#4CAF50' : '#666'} 
          />
          <Text style={[styles.tabLabel, activeTab === 'prescriptions' && styles.tabLabelActive]}>
            Prescriptions
          </Text>
        </TouchableOpacity>
        
        {/* Centered Today Tab */}
        <TouchableOpacity 
          style={[styles.tabItem, styles.todayTab, activeTab === 'today' && styles.todayTabActive]}
          onPress={() => setActiveTab('today')}
        >
          <Ionicons 
            name="home" 
            size={24} 
            color="white" 
          />
          <Text style={styles.todayTabLabel}>Dashboard</Text>
          {upcomingAppointments.filter(apt => !apt.has_prescription).length > 0 && (
            <View style={styles.tabBadge}>
              <Text style={styles.tabBadgeText}>
                {upcomingAppointments.filter(apt => !apt.has_prescription).length}
              </Text>
            </View>
          )}
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.tabItem, activeTab === 'patients' && styles.tabItemActive]}
          onPress={() => setActiveTab('patients')}
        >
          <Ionicons 
            name="people" 
            size={20} 
            color={activeTab === 'patients' ? '#4CAF50' : '#666'} 
          />
          <Text style={[styles.tabLabel, activeTab === 'patients' && styles.tabLabelActive]}>
            Patients
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// Enhanced styles with cancellation request components
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    paddingTop: 50,
    paddingBottom: 25,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  headerLeft: {
    flex: 1,
  },
  polyclinicInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  polyclinicLogo: {
    width: 40,
    height: 40,
    marginRight: 12,
  },
  polyclinicText: {
    flex: 1,
  },
  polyclinicName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  profileButton: {
    position: 'relative',
  },
  profileAvatar: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  profileAvatarText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  profileBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#4CAF50',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  
  // Profile Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileModal: {
    width: '85%',
    backgroundColor: 'white',
    borderRadius: 15,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  profileHeader: {
    backgroundColor: '#4CAF50',
    padding: 20,
    alignItems: 'center',
  },
  profileAvatarLarge: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  profileName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 4,
  },
  clinicName: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    fontStyle: 'italic',
  },
  profileOptions: {
    paddingVertical: 8,
  },
  profileOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  profileOptionText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    marginLeft: 15,
  },
  logoutOption: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  divider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginVertical: 8,
  },

  // Welcome Banner
  welcomeBanner: {
    marginBottom: 20,
    borderRadius: 15,
    overflow: 'hidden',
  },
  welcomeBannerGradient: {
    padding: 20,
  },
  welcomeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  welcomeText: {
    flex: 1,
  },
  welcomeTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  welcomeSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 4,
  },
  clinicWelcome: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    fontStyle: 'italic',
  },
  medicalIcon: {
    opacity: 0.7,
  },

  // Cancellation Requests
    cancellationSection: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginBottom: 16, // Reduced from 20
    borderRadius: 12, // Reduced from 16
    padding: 12, // Reduced from 16
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 }, // Reduced shadow
    shadowOpacity: 0.05, // Reduced opacity
    shadowRadius: 2, // Reduced radius
    elevation: 2, // Reduced elevation
  },
  
  cancellationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10, // Reduced from 16
  },
  
  cancellationTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  
  cancellationTitle: {
    fontSize: 15, // Reduced from 16
    fontWeight: '600',
    color: '#333',
    marginLeft: 6, // Reduced from 8
  },
  
  pendingBadge: {
    backgroundColor: '#EF4444',
    borderRadius: 8, // Reduced from 10
    paddingHorizontal: 5, // Reduced from 6
    paddingVertical: 1, // Reduced from 2
    marginLeft: 6, // Reduced from 8
    minWidth: 16, // Reduced from 20
    alignItems: 'center',
  },
  
  pendingBadgeText: {
    color: 'white',
    fontSize: 10, // Reduced from 11
    fontWeight: 'bold',
  },
  
  viewAllRequestsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3, // Reduced from 4
  },
  
  viewAllRequestsText: {
    fontSize: 13, // Reduced from 14
    fontWeight: '600',
    color: '#F59E0B',
  },
  
  // Compact stats grid
  cancellationStatsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 8, // Reduced from 12
    paddingVertical: 4, // Added small padding
  },
  
  cancellationStatItem: {
    alignItems: 'center',
    position: 'relative',
    paddingVertical: 2, // Added small padding
  },
  
  cancellationStatNumber: {
    fontSize: 20, // Reduced from 24
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2, // Reduced from 4
  },
  
  cancellationStatLabel: {
    fontSize: 11, // Reduced from 12
    color: '#666',
    fontWeight: '500',
  },
  
  cancellationStatIndicator: {
    position: 'absolute',
    bottom: -6, // Reduced from -8
    width: 16, // Reduced from 20
    height: 2, // Reduced from 3
    borderRadius: 1,
  },
  
  // Compact quick review button
  quickReviewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F59E0B',
    paddingVertical: 8, // Reduced from 10
    paddingHorizontal: 12, // Reduced from 16
    borderRadius: 6, // Reduced from 8
    gap: 4, // Reduced from 6
    marginTop: 4, // Reduced from 8
  },
  
  quickReviewText: {
    color: 'white',
    fontSize: 12, // Reduced from 13
    fontWeight: '600',
  },
  
  // Compact cancellation request indicators on appointment cards
  cancellationRequestIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF4E6',
    paddingHorizontal: 4, // Reduced from 6
    paddingVertical: 1, // Reduced from 2
    borderRadius: 4, // Reduced from 6
    marginTop: 3, // Reduced from 4
    alignSelf: 'flex-start',
    gap: 3, // Reduced from 4
  },
  
  cancellationRequestText: {
    fontSize: 9, // Reduced from 10
    fontWeight: '600',
  },
  
  // Smaller cancellation badge on tab bar
  cancellationBadge: {
    position: 'absolute',
    top: 3, // Reduced from 4
    right: 6, // Reduced from 8
    backgroundColor: '#F59E0B',
    borderRadius: 8, // Reduced from 10
    minWidth: 16, // Reduced from 18
    height: 16, // Reduced from 18
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  cancellationBadgeText: {
    color: 'white',
    fontSize: 9, // Reduced from 10
    fontWeight: 'bold',
  },
  
  // Stats Section
  statsSection: {
    marginBottom: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: '22%',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    color: '#666',
    textAlign: 'center',
  },

  content: {
    flex: 1,
  },
  tabContent: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  seeAllText: {
    color: '#4CAF50',
    fontWeight: '600',
    fontSize: 14,
  },

  // Enhanced Empty State
  emptyStateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 12,
  },
  emptyStateIcon: {
    marginBottom: 12,
  },
  emptyStateText: {
    color: '#6b7280',
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  emptyStateSubtext: {
    color: '#9ca3af',
    fontSize: 14,
    textAlign: 'center',
  },

  // Loading
  loadingContainer: {
    padding: 30,
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
  },
  loadingText: {
    marginTop: 10,
    textAlign: 'center',
    color: '#6b7280',
  },

  // Enhanced Appointment Card
  appointmentCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },

  appointmentCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  patientIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E8F5E8',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },

  appointmentInfo: {
    flex: 1,
  },

  patientName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4,
    lineHeight: 20,
  },

  appointmentTime: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '500',
    marginBottom: 6,
  },

  serviceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },

  serviceText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
    fontWeight: '400',
  },

  appointmentStatus: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  // COMPACT APPOINTMENT STYLES
  compactStatsGrid: {
    marginTop: 8,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    gap: 8,
  },
  compactStatCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  compactStatContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  compactStatText: {
    flex: 1,
  },
  compactStatNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    lineHeight: 20,
  },
  compactStatLabel: {
    fontSize: 10,
    color: '#666',
    fontWeight: '400',
    lineHeight: 12,
  },

  // Compact Appointment Cards
  compactAppointmentCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#4CAF50',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  compactCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  compactPatientIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E8F5E8',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  compactAppointmentInfo: {
    flex: 1,
  },
  compactPatientName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 2,
    lineHeight: 16,
  },
  compactAppointmentTime: {
    fontSize: 11,
    color: '#4CAF50',
    fontWeight: '500',
  },
  statusIndicator: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  compactServiceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  compactServiceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    backgroundColor: '#F8F9FA',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
    marginRight: 6,
  },
  compactServiceText: {
    fontSize: 10,
    color: '#666',
    marginLeft: 3,
    fontWeight: '400',
    flex: 1,
  },
  compactBranchInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
  },
  compactBranchText: {
    fontSize: 10,
    color: '#1a8e2d',
    marginLeft: 3,
    fontWeight: '400',
    flex: 1,
  },

  // Compact Empty State
  compactEmptyState: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
    gap: 8,
  },
  compactEmptyText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },

  // Compact Loading
  compactLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
    gap: 8,
  },
  compactLoadingText: {
    fontSize: 12,
    color: '#666',
  },

  // Enhanced Quick Actions
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  quickActionCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  quickActionIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#f8f9fa',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  quickActionText: {
    color: '#333',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },

  // Calendar Styles
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
    paddingHorizontal: 10,
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

  // Appointment Modal Styles
  appointmentModalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    minHeight: '50%',
    width: '100%',
    position: 'absolute',
    bottom: 0,
  },
  appointmentModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  appointmentModalTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  appointmentModalTitleText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flexShrink: 1,
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  appointmentModalBody: {
    flex: 1,
    padding: 20,
  },
  modalAppointmentCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  modalAppointmentHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  modalPatientIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#4CAF50',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  modalPatientIconText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalAppointmentInfo: {
    flex: 1,
  },
  modalPatientName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  modalAppointmentDetails: {
    gap: 6,
  },
  modalDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalDetailText: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  modalStatusContainer: {
    alignItems: 'center',
    gap: 4,
  },
  modalStatusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  modalStatusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  modalNotesSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 8,
    padding: 8,
    backgroundColor: '#F0F0F0',
    borderRadius: 8,
  },
  modalNotesText: {
    fontSize: 12,
    color: '#666',
    flex: 1,
    fontStyle: 'italic',
  },
  modalAppointmentActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  modalActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#4CAF50',
    backgroundColor: 'white',
  },
  modalActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4CAF50',
  },
  modalAppointmentDivider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginVertical: 16,
  },
  modalEmptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  modalEmptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 8,
  },
  appointmentModalFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  modalViewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    backgroundColor: '#F0FDF4',
    borderRadius: 8,
  },
  modalViewAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4CAF50',
  },
  calendarDayTextWithAppointments: {
    color: '#2e7d32',
    fontWeight: '600',
  },
  appointmentIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 16,
    height: 16,
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appointmentCount: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  viewFullButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e8f5e8',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  viewFullButtonText: {
    color: '#4CAF50',
    fontWeight: '600',
    fontSize: 14,
  },
  patientSection: {
    marginBottom: 24,
  },
  sectionLetter: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 12,
    paddingLeft: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  patientCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  patientInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  patientAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4CAF50',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  patientAvatarText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  patientDetails: {
    flex: 1,
  },
  patientMeta: {
    color: '#666',
    fontSize: 12,
    marginTop: 2,
  },

  // Enhanced Prescription Styles
  prescriptionInfoCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  prescriptionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  prescriptionPatientInfo: {
    flex: 1,
  },
  prescriptionPatientName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  prescriptionDate: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  prescriptionService: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '600',
  },
  qrCodePlaceholder: {
    width: 60,
    height: 60,
    backgroundColor: '#e0e0e0',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  prescriptionActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  viewPrescriptionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#4CAF50',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  viewPrescriptionText: {
    color: '#4CAF50',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  shareQRButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  shareQRText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },

  // Enhanced Tab Bar
  tabBar: {
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingVertical: 8,
    paddingHorizontal: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 5,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    position: 'relative',
  },
  tabItemActive: {
    // Active state for regular tabs
  },
  todayTab: {
    backgroundColor: '#4CAF50',
    borderRadius: 20,
    marginHorizontal: 8,
    paddingVertical: 12,
    transform: [{ translateY: -10 }],
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
    position: 'relative',
  },
  todayTabActive: {
    // Today tab is always styled as active
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: '#666',
    marginTop: 4,
  },
  tabLabelActive: {
    color: '#4CAF50',
  },
  todayTabLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
    marginTop: 4,
  },
  tabBadge: {
    position: 'absolute',
    top: 4,
    right: 16,
    backgroundColor: '#f44336',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
});