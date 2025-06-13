// app/doctor/index.jsx - Optimized version that works with your existing files
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Dimensions } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { getLocalStorage } from '../../service/Storage';
import { useAuth } from '../_layout';
import { DatabaseService, Query, account } from '../../configs/AppwriteConfig';
import RoleProtected from '../../components/RoleProtected';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

// Collection IDs from your existing code
const APPOINTMENTS_COLLECTION_ID = '67e0332c0001131d71ec';
const USERS_COLLECTION_ID = '67e032ec0025cf1956ff';

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

  const { logout } = useAuth();
  
  useEffect(() => {
    const loadUserData = async () => {
      try {
        const userData = await getLocalStorage('userDetail');
        console.log('User data loaded:', userData);
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
    
    loadUserData();
  }, []);

  const loadAppointments = async (doctorId) => {
    try {
      setLoadingAppointments(true);
      console.log("Loading appointments for doctor:", doctorId);
      
      const appointmentsResponse = await DatabaseService.listDocuments(
        APPOINTMENTS_COLLECTION_ID,
        []
      );
      
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
          console.log("Date sorting error:", error);
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
      
      const usersResponse = await DatabaseService.listDocuments(
        USERS_COLLECTION_ID,
        []
      );
      
      let patients = usersResponse.documents || [];
      
      // Filter out doctors if there's a role field
      patients = patients.filter(user => 
        !user.role || user.role !== 'doctor'
      );
      
      // Sort patients alphabetically by name
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
      console.log("Time conversion error:", e);
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
              const patientLabel = `Patient ${userId.substring(0, 8)}`;
              nameMap[userId] = patientLabel;
            }
          }
        } catch (error) {
          console.error(`Error processing user ${userId}:`, error);
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
      console.log("Starting doctor logout process...");
      
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

  // Navigation functions that link to your existing files
  const navigateToAppointments = () => {
    router.push('/doctor/appointments');
  };

  const navigateToPatients = () => {
    router.push('/doctor/patients');
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

  const renderTodayTab = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{upcomingAppointments.length}</Text>
          <Text style={styles.statLabel}>Today's Appointments</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>
            {upcomingAppointments.filter(apt => !apt.has_prescription).length}
          </Text>
          <Text style={styles.statLabel}>Pending Prescriptions</Text>
        </View>
      </View>
      
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>🕐 Next Appointments</Text>
        {upcomingAppointments.length > 3 && (
          <TouchableOpacity onPress={navigateToAppointments}>
            <Text style={styles.seeAllText}>See All</Text>
          </TouchableOpacity>
        )}
      </View>
      
      {loadingAppointments ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0AD476" />
          <Text style={styles.loadingText}>Loading appointments...</Text>
        </View>
      ) : upcomingAppointments.length === 0 ? (
        <View style={styles.emptyStateContainer}>
          <Ionicons name="calendar-outline" size={50} color="#ccc" />
          <Text style={styles.emptyStateText}>No appointments found</Text>
        </View>
      ) : (
        upcomingAppointments.slice(0, 3).map((appointment) => (
          <View key={appointment.$id} style={styles.appointmentCard}>
            <Text style={styles.patientName}>
              {getPatientName(appointment.user_id)}
            </Text>
            <Text style={styles.appointmentTime}>
              🕘 {appointment.time_slot || 'No time'} - {appointment.date || 'Today'}
            </Text>
            <View style={styles.appointmentTypeContainer}>
              <Text style={styles.appointmentType}>
                {appointment.service_name || 'General appointment'}
              </Text>
            </View>
          </View>
        ))
      )}
      
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>📋 Today's Tasks</Text>
      </View>
      <View style={styles.appointmentCard}>
        <Text style={styles.patientName}>⚠️ Prescription Review</Text>
        <Text style={styles.appointmentTime}>
          {upcomingAppointments.filter(apt => !apt.has_prescription).length} pending prescriptions need review
        </Text>
      </View>

      {/* Quick Actions */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>⚡ Quick Actions</Text>
      </View>
      <View style={styles.quickActionsGrid}>
        <TouchableOpacity style={styles.quickActionCard} onPress={navigateToAppointments}>
          <Ionicons name="calendar" size={24} color="#4CAF50" />
          <Text style={styles.quickActionText}>Manage Appointments</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.quickActionCard} onPress={navigateToPatients}>
          <Ionicons name="people" size={24} color="#4CAF50" />
          <Text style={styles.quickActionText}>View Patients</Text>
        </TouchableOpacity>
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
            <Text style={styles.calendarNavText}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.calendarTitle}>
            {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </Text>
          <TouchableOpacity 
            style={styles.calendarNav}
            onPress={() => navigateMonth(1)}
          >
            <Text style={styles.calendarNavText}>›</Text>
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
      
      <View style={styles.appointmentFilters}>
        <TouchableOpacity style={[styles.filterBtn, styles.filterBtnActive]}>
          <Text style={styles.filterBtnTextActive}>Upcoming</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.filterBtn}>
          <Text style={styles.filterBtnText}>Past</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.filterBtn}>
          <Text style={styles.filterBtnText}>All</Text>
        </TouchableOpacity>
      </View>
      
      <TouchableOpacity 
        style={styles.viewFullButton}
        onPress={navigateToAppointments}
      >
        <Text style={styles.viewFullButtonText}>View Full Calendar & Manage Appointments</Text>
        <Ionicons name="open-outline" size={16} color="#4CAF50" />
      </TouchableOpacity>
      
      {loadingAppointments ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0AD476" />
          <Text style={styles.loadingText}>Loading appointments...</Text>
        </View>
      ) : (
        allAppointments.slice(0, 6).map((appointment) => (
          <View key={appointment.$id} style={styles.appointmentCard}>
            <View style={styles.patientInfoRow}>
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
        ))
      )}
    </ScrollView>
  );

  const renderPatientsTab = () => {
    // Group patients by first letter (showing first few from each group)
    const groupedPatients = {};
    allPatients.forEach(patient => {
      const name = getPatientDisplayName(patient);
      const firstLetter = name.charAt(0).toUpperCase();
      if (!groupedPatients[firstLetter]) {
        groupedPatients[firstLetter] = [];
      }
      if (groupedPatients[firstLetter].length < 3) { // Limit to 3 per letter for overview
        groupedPatients[firstLetter].push(patient);
      }
    });

    const availableLetters = Object.keys(groupedPatients).sort().slice(0, 5); // Show first 5 letters

    return (
      <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>👥 Patients ({allPatients.length})</Text>
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
            <ActivityIndicator size="large" color="#0AD476" />
            <Text style={styles.loadingText}>Loading patients...</Text>
          </View>
        ) : (
          availableLetters.map(letter => (
            <View key={letter} style={styles.patientSection}>
              <Text style={styles.sectionLetter}>{letter}</Text>
              {groupedPatients[letter].map(patient => (
                <TouchableOpacity
                  key={patient.$id || patient.userId}
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
      <Text style={styles.sectionTitle}>Prescription Information</Text>
      
      {/* Enhanced prescription information display */}
      {allAppointments.filter(apt => apt.has_prescription).slice(0, 10).map(appointment => (
        <View key={appointment.$id} style={styles.prescriptionInfoCard}>
          <View style={styles.prescriptionHeader}>
            <View style={styles.prescriptionPatientInfo}>
              <Text style={styles.prescriptionPatientName}>
                {getPatientName(appointment.user_id)}
              </Text>
              <Text style={styles.prescriptionDate}>
                📋 {appointment.date || 'Unknown date'}
              </Text>
              <Text style={styles.prescriptionService}>
                💊 {appointment.service_name || 'General Consultation'}
              </Text>
            </View>
            <View style={styles.qrCodePlaceholder}>
              <Ionicons name="qr-code" size={30} color="#666" />
            </View>
          </View>
          
          <View style={styles.prescriptionDetails}>
            <Text style={styles.prescriptionDetailText}>
              📄 Prescription ID: {appointment.$id.substring(0, 8)}
            </Text>
            <Text style={styles.prescriptionDetailText}>
              🕐 Time: {appointment.time_slot || 'Not specified'}
            </Text>
            <Text style={styles.prescriptionDetailText}>
              ✅ Status: Prescription Added
            </Text>
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
              <Text style={styles.shareQRText}>Share QR</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}
      
      {allAppointments.filter(apt => apt.has_prescription).length === 0 && (
        <View style={styles.emptyStateContainer}>
          <Ionicons name="medical-outline" size={50} color="#ccc" />
          <Text style={styles.emptyStateText}>No prescriptions found</Text>
          <Text style={styles.emptyStateSubtext}>Prescriptions will appear here once you add them to appointments</Text>
        </View>
      )}
      
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <TouchableOpacity 
        style={styles.quickActionCard}
        onPress={() => router.push('/testing/prescription-flow')}
      >
        <Ionicons name="flask" size={24} color="#0AD476" />
        <View style={styles.quickActionContent}>
          <Text style={styles.quickActionText}>🧪 Test Prescription Flow</Text>
          <Text style={styles.quickActionSubtext}>Access prescription testing tools</Text>
        </View>
      </TouchableOpacity>
    </ScrollView>
  );

  return (
    <View style={styles.container}>
      <LinearGradient 
        colors={["#1a8e2d", "#146922"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.welcomeText}>Welcome, Dr. {user?.displayName || ''}</Text>
            <Text style={styles.subtitle}>Doctor Dashboard</Text>
          </View>
          <TouchableOpacity style={styles.logoutButton} onPress={handleSignOut}>
            <Ionicons name="log-out-outline" size={24} color="white" />
          </TouchableOpacity>
        </View>
      </LinearGradient>
      
      <View style={styles.content}>
        {activeTab === 'today' && renderTodayTab()}
        {activeTab === 'appointments' && renderAppointmentsTab()}
        {activeTab === 'patients' && renderPatientsTab()}
        {activeTab === 'prescriptions' && renderPrescriptionsTab()}
      </View>
      
      {/* Enhanced Tab Bar with Centered Today */}
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
          <Text style={styles.todayTabLabel}>Today</Text>
          {upcomingAppointments.filter(apt => !apt.has_prescription).length > 0 && (
            <View style={styles.tabBadge}>
              <Text style={styles.tabBadgeText}>
                {upcomingAppointments.filter(apt => !apt.has_prescription).length}
              </Text>
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
  welcomeText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: 'white',
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 5,
  },
  logoutButton: {
    padding: 10,
  },
  content: {
    flex: 1,
  },
  tabContent: {
    flex: 1,
    padding: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  seeAllText: {
    color: '#4CAF50',
    fontWeight: '600',
    fontSize: 14,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#4CAF50',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  loadingContainer: {
    padding: 30,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    textAlign: 'center',
    color: '#6b7280',
  },
  emptyStateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  emptyStateText: {
    marginTop: 10,
    color: '#6b7280',
    fontSize: 16,
    textAlign: 'center',
  },
  emptyStateSubtext: {
    marginTop: 5,
    color: '#9ca3af',
    fontSize: 14,
    textAlign: 'center',
  },
  appointmentCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  patientInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    flexWrap: 'wrap',
    gap: 8,
  },
  patientName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  appointmentTime: {
    color: '#666',
    fontSize: 14,
    marginBottom: 8,
  },
  appointmentTypeContainer: {
    alignSelf: 'flex-start',
  },
  appointmentType: {
    backgroundColor: '#e8f5e8',
    color: '#2e7d32',
    padding: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    fontSize: 12,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 15,
    minWidth: 120,
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
  calendarNavText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
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
  appointmentFilters: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  filterBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    backgroundColor: 'white',
    borderRadius: 20,
  },
  filterBtnActive: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  filterBtnText: {
    fontSize: 14,
    color: '#666',
  },
  filterBtnTextActive: {
    fontSize: 14,
    color: 'white',
    fontWeight: '600',
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
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
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
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
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
  prescriptionDetails: {
    backgroundColor: '#f0f9f0',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  prescriptionDetailText: {
    fontSize: 13,
    color: '#4b5563',
    marginBottom: 4,
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
  quickActionCard: {
    backgroundColor: '#f9fafb',
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  quickActionContent: {
    marginLeft: 12,
  },
  quickActionText: {
    color: '#4b5563',
    fontSize: 16,
    fontWeight: '500',
  },
  quickActionSubtext: {
    color: '#6b7280',
    fontSize: 14,
    marginTop: 4,
  },
  tabBar: {
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingVertical: 8,
    paddingHorizontal: 8,
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