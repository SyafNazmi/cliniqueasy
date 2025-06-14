// app/doctor/index.jsx - Clean main dashboard with centralized constants
import React, { useEffect, useState } from 'react';
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
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarDays, setCalendarDays] = useState([]);
  const [showProfileModal, setShowProfileModal] = useState(false);

  const { logout } = useAuth();
  
  useEffect(() => {
    loadUserData();
  }, []);

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

  const loadAppointments = async (doctorId) => {
    try {
      setLoadingAppointments(true);
      const appointmentsResponse = await DatabaseService.listDocuments(COLLECTIONS.APPOINTMENTS, []);
      let allAppointments = appointmentsResponse.documents || [];
      
      // Sort appointments by date
      allAppointments.sort((a, b) => {
        try {
          let dateA, dateB;
          
          if (a.date && a.date.includes(',')) {
            const [, datePart] = a.date.split(', ');
            const [day, month, year] = datePart.split(' ');
            const monthIndex = getMonthIndex(month);
            dateA = new Date(year, monthIndex, parseInt(day));
          } else {
            dateA = new Date(a.$createdAt);
          }
          
          if (b.date && b.date.includes(',')) {
            const [, datePart] = b.date.split(', ');
            const [day, month, year] = datePart.split(' ');
            const monthIndex = getMonthIndex(month);
            dateB = new Date(year, monthIndex, parseInt(day));
          } else {
            dateB = new Date(b.$createdAt);
          }
          
          if (dateA.getTime() === dateB.getTime()) {
            if (a.time_slot && b.time_slot) {
              const timeA = convert12HourTo24Hour(a.time_slot);
              const timeB = convert12HourTo24Hour(b.time_slot);
              return timeA.localeCompare(timeB);
            }
          }
          
          return dateB - dateA;
        } catch (error) {
          return 0;
        }
      });
      
      setAllAppointments(allAppointments);
      setUpcomingAppointments(allAppointments.slice(0, 5));
      await fetchPatientNames(allAppointments);
      
    } catch (error) {
      console.error('Error loading appointments:', error);
    } finally {
      setLoadingAppointments(false);
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

  const fetchPatientNames = async (appointments) => {
    try {
      const userIds = [...new Set(appointments.map(apt => apt.user_id))];
      const nameMap = {};
      
      for (const userId of userIds) {
        try {
          const usersResponse = await DatabaseService.listDocuments(
            COLLECTIONS.PATIENT_PROFILES,
            [Query.equal('userId', userId)]
          );
          
          if (usersResponse.documents && usersResponse.documents.length > 0) {
            const user = usersResponse.documents[0];
            if (user.fullName) {
              nameMap[userId] = user.fullName;
              continue;
            }
            
            const nameFields = ['name', 'displayName', 'full_name'];
            for (const field of nameFields) {
              if (user[field]) {
                nameMap[userId] = user[field];
                break;
              }
            }
          }
          
          if (!nameMap[userId]) {
            if (userId.includes('@')) {
              const name = userId.split('@')[0].replace(/[._-]/g, ' ');
              const formattedName = name.charAt(0).toUpperCase() + name.slice(1);
              nameMap[userId] = formattedName;
            } else {
              nameMap[userId] = `Patient ${userId.substring(0, 8)}`;
            }
          }
        } catch (error) {
          nameMap[userId] = `Patient ${userId.substring(0, 8)}`;
        }
      }
      
      setPatientNames(nameMap);
    } catch (error) {
      console.error("Error in fetchPatientNames:", error);
      setPatientNames({});
    }
  };

  const getPatientName = (userId) => {
    if (!userId) return "Unknown Patient";
    return patientNames[userId] || "Patient";
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

  // Profile Modal Component
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
                    {getPatientName(appointment.user_id)}
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

    {/* Appointment Statistics */}
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Appointment Statistics</Text>
      <View style={styles.appointmentStatsGrid}>
        {/* Total Appointments */}
        <View style={styles.appointmentStatCard}>
          <View style={styles.statIconContainer}>
            <Ionicons name="calendar-outline" size={24} color="#4CAF50" />
          </View>
          <Text style={styles.statNumber}>{allAppointments.length}</Text>
          <Text style={styles.statLabel}>Total{'\n'}Appointments</Text>
        </View>

        {/* Today's Appointments */}
        <View style={styles.appointmentStatCard}>
          <View style={styles.statIconContainer}>
            <Ionicons name="today-outline" size={24} color="#2196F3" />
          </View>
          <Text style={styles.statNumber}>
            {allAppointments.filter(apt => {
              const today = new Date();
              const aptDate = parseAppointmentDate(apt.date);
              return aptDate.toDateString() === today.toDateString();
            }).length}
          </Text>
          <Text style={styles.statLabel}>Today's{'\n'}Appointments</Text>
        </View>

        {/* Tomorrow's Appointments */}
        <View style={styles.appointmentStatCard}>
          <View style={styles.statIconContainer}>
            <Ionicons name="calendar-number-outline" size={24} color="#FF9800" />
          </View>
          <Text style={styles.statNumber}>
            {allAppointments.filter(apt => {
              const tomorrow = new Date();
              tomorrow.setDate(tomorrow.getDate() + 1);
              const aptDate = parseAppointmentDate(apt.date);
              return aptDate.toDateString() === tomorrow.toDateString();
            }).length}
          </Text>
          <Text style={styles.statLabel}>Tomorrow's{'\n'}Appointments</Text>
        </View>
      </View>
    </View>

    {/* Recent Appointments Section */}
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Recent Appointments</Text>
        <TouchableOpacity onPress={navigateToAppointments}>
          <Text style={styles.seeAllText}>View All</Text>
        </TouchableOpacity>
      </View>
      
      {loadingAppointments ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.loadingText}>Loading appointments...</Text>
        </View>
      ) : allAppointments.length === 0 ? (
        <View style={styles.emptyStateContainer}>
          <View style={styles.emptyStateIcon}>
            <Ionicons name="calendar-clear-outline" size={40} color="#C0C0C0" />
          </View>
          <Text style={styles.emptyStateText}>No appointments scheduled</Text>
          <Text style={styles.emptyStateSubtext}>Your calendar is looking clear!</Text>
        </View>
      ) : (
        allAppointments.slice(0, 5).map((appointment) => (
          <View key={appointment.$id} style={styles.appointmentOverviewCard}>
            <View style={styles.appointmentCardHeader}>
              <View style={styles.patientIcon}>
                <Ionicons name="person" size={20} color="#4CAF50" />
              </View>
              <View style={styles.appointmentInfo}>
                <Text style={styles.patientName}>
                  {getPatientName(appointment.user_id)}
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
                {getPatientName(appointment.user_id)}
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
      
      <View style={styles.content}>
        {activeTab === 'today' && renderTodayTab()}
        {activeTab === 'appointments' && renderAppointmentsTab()}
        {activeTab === 'patients' && renderPatientsTab()}
        {activeTab === 'prescriptions' && renderPrescriptionsTab()}
      </View>
      
      {/* Enhanced Tab Bar */}
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
  appointmentOverviewCard: {
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

// Remove the redundant appointmentDetailsRow - we don't need it anymore
// The information is already clearly displayed in the header

// Simplified Statistics Grid
appointmentStatsGrid: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  marginTop: 12,
  gap: 12,
},

appointmentStatCard: {
  flex: 1,
  backgroundColor: 'white',
  borderRadius: 12,
  padding: 20,
  alignItems: 'center',
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.05,
  shadowRadius: 8,
  elevation: 2,
},

statIconContainer: {
  width: 48,
  height: 48,
  borderRadius: 24,
  backgroundColor: '#F8F9FA',
  justifyContent: 'center',
  alignItems: 'center',
  marginBottom: 12,
},

statNumber: {
  fontSize: 28,
  fontWeight: '700',
  color: '#1A1A1A',
  marginBottom: 4,
},

statLabel: {
  fontSize: 12,
  color: '#666',
  textAlign: 'center',
  lineHeight: 16,
  fontWeight: '400',
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