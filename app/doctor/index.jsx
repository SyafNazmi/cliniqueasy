import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { getLocalStorage } from '../../service/Storage';
import { DatabaseService, Query, account } from '../../configs/AppwriteConfig';
import RoleProtected from '../../components/RoleProtected';

// IMPORTANT: Update with your Appwrite collection IDs
const APPOINTMENTS_COLLECTION_ID = '67e0332c0001131d71ec'; // Your appointments collection
const USERS_COLLECTION_ID = '67e032ec0025cf1956ff'; // Your users collection if you have one

export default function DoctorDashboard() {
  return (
    <RoleProtected requiredRole="doctor" redirectPath="(tabs)">
      <DoctorDashboardContent />
    </RoleProtected>
  );
}

function DoctorDashboardContent() {
  const [user, setUser] = useState(null);
  const [upcomingAppointments, setUpcomingAppointments] = useState([]);
  const [loadingAppointments, setLoadingAppointments] = useState(true);
  const [patientNames, setPatientNames] = useState({}); // Map of user_id to user names
  
  useEffect(() => {
    const loadUserData = async () => {
      try {
        const userData = await getLocalStorage('userDetail');
        console.log('User data loaded:', userData);
        setUser(userData);
        
        if (userData && userData.uid) {
          loadAppointments(userData.uid);
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
      
      // TROUBLESHOOTING APPROACH: Load all appointments first, then filter if needed
      try {
        // Load all appointments without filtering to ensure we get data
        const appointmentsResponse = await DatabaseService.listDocuments(
          APPOINTMENTS_COLLECTION_ID,
          [] // No filters to get all data
        );
        
        console.log("Total appointments found:", appointmentsResponse.total);
        
        // Get all appointments
        let allAppointments = appointmentsResponse.documents || [];
        
        // For debugging: Log appointment structure to see fields
        if (allAppointments.length > 0) {
          console.log("Sample appointment structure:", Object.keys(allAppointments[0]));
          
          // Check if doctor_id field exists in any form
          const sampleAppointment = allAppointments[0];
          const doctorFields = Object.keys(sampleAppointment).filter(key => 
            key.toLowerCase().includes('doctor')
          );
          
          if (doctorFields.length > 0) {
            console.log("Possible doctor fields found:", doctorFields);
          }
          
          // For demo purposes, if we want to still filter on frontend:
          // Try to match by doctor ID if such field exists
          if (doctorFields.length > 0) {
            const filteredAppointments = allAppointments.filter(appointment => {
              return doctorFields.some(field => appointment[field] === doctorId);
            });
            
            if (filteredAppointments.length > 0) {
              console.log(`Found ${filteredAppointments.length} appointments for this doctor`);
              allAppointments = filteredAppointments;
            }
          }
        }
        
        // Sort appointments by date (newest first)
        allAppointments.sort((a, b) => {
          // Parse dates from appointment.date
          try {
            // Handle different date formats
            let dateA, dateB;
            
            // Format: "Monday, 7 Apr 2025" or "Tuesday, 8 Apr 2025"
            if (a.date && a.date.includes(',')) {
              const [, datePart] = a.date.split(', ');
              const [day, month, year] = datePart.split(' ');
              const monthIndex = getMonthIndex(month);
              dateA = new Date(year, monthIndex, parseInt(day));
            } else {
              // If date not present or in unexpected format, use creation date
              dateA = new Date(a.$createdAt);
            }
            
            if (b.date && b.date.includes(',')) {
              const [, datePart] = b.date.split(', ');
              const [day, month, year] = datePart.split(' ');
              const monthIndex = getMonthIndex(month);
              dateB = new Date(year, monthIndex, parseInt(day));
            } else {
              // If date not present or in unexpected format, use creation date
              dateB = new Date(b.$createdAt);
            }
            
            // For same dates, sort by time if available
            if (dateA.getTime() === dateB.getTime()) {
              // If time_slot exists, try to use it for sorting
              if (a.time_slot && b.time_slot) {
                // Convert 12-hour format to 24-hour for comparison
                const timeA = convert12HourTo24Hour(a.time_slot);
                const timeB = convert12HourTo24Hour(b.time_slot);
                return timeA.localeCompare(timeB);
              }
            }
            
            // Sort newest first (descending order)
            return dateB - dateA;
          } catch (error) {
            console.log("Date sorting error:", error);
            return 0; // Keep original order on error
          }
        });
        
        console.log("Appointments sorted by newest date first");
        
        // Limit to first 5 appointments for demo
        if (allAppointments.length > 5) {
          allAppointments = allAppointments.slice(0, 5);
        }
        
        console.log(`Using ${allAppointments.length} appointments for display`);
        setUpcomingAppointments(allAppointments);
        
        // Fetch patient names for each appointment
        await fetchPatientNames(allAppointments);
        
      } catch (error) {
        console.error("Error fetching appointments:", error);
        Alert.alert("Error", "Could not load appointments: " + error.message);
      }
      
    } catch (error) {
      console.error('Error loading appointments:', error);
    } finally {
      setLoadingAppointments(false);
    }
  };
  
  // Helper function to get month index from month name
  const getMonthIndex = (monthName) => {
    const months = {
      'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
      'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
    };
    return months[monthName] || 0;
  };
  
  // Helper function to convert 12-hour time format to 24-hour for sorting
  const convert12HourTo24Hour = (timeString) => {
    try {
      if (!timeString) return '';
      
      // Handle formats like "9:30 AM" or "10:00 AM"
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
  
  // Enhanced fetchPatientNames function
  const fetchPatientNames = async (appointments) => {
    try {
      // Extract all unique user IDs from appointments
      const userIds = [...new Set(appointments.map(apt => apt.user_id))];
      console.log("User IDs to fetch:", userIds);
      
      if (userIds.length === 0) {
        console.log("No user IDs found in appointments");
        return;
      }
      
      // Create a map to store user_id -> name
      const nameMap = {};
      
      // Fixed approach: Only query by fields we know exist in the schema
      for (const userId of userIds) {
        try {
          console.log(`Looking up patient with ID: ${userId} in database`);
          
          // First try: Query by userId field which we've confirmed works
          const usersResponse = await DatabaseService.listDocuments(
            '67e032ec0025cf1956ff', // Users collection
            [Query.equal('userId', userId)]
          );
          
          if (usersResponse.documents && usersResponse.documents.length > 0) {
            const user = usersResponse.documents[0];
            console.log(`Found user via userId field:`, Object.keys(user));
            
            // Check for fullName field first
            if (user.fullName) {
              nameMap[userId] = user.fullName;
              console.log(`Found patient name: ${user.fullName}`);
              continue; // Skip to next user
            }
            
            // Try alternate name fields if fullName not found
            const nameFields = ['name', 'displayName', 'full_name'];
            for (const field of nameFields) {
              if (user[field]) {
                nameMap[userId] = user[field];
                console.log(`Found patient name in field "${field}": ${user[field]}`);
                break;
              }
            }
          }
          
          // If we still don't have a name, try with $id field as fallback
          // This shouldn't error since we're not using it in a query, just checking equality
          if (!nameMap[userId]) {
            try {
              const allUsers = await DatabaseService.listDocuments(
                '67e032ec0025cf1956ff', // Users collection
                [], // No query - get all documents (consider pagination for production)
                100 // Limit to 100 users max
              );
              
              const matchingUser = allUsers.documents.find(doc => doc.$id === userId);
              if (matchingUser) {
                if (matchingUser.fullName) {
                  nameMap[userId] = matchingUser.fullName;
                  console.log(`Found patient by $id match: ${matchingUser.fullName}`);
                  continue;
                }
              }
            } catch (e) {
              console.log("Error fetching all users:", e.message);
            }
          }
          
          // Fallback for users we couldn't find
          if (!nameMap[userId]) {
            if (userId.includes('@')) {
              // Format email nicely
              const name = userId.split('@')[0].replace(/[._-]/g, ' ');
              const formattedName = name.charAt(0).toUpperCase() + name.slice(1);
              nameMap[userId] = formattedName;
              console.log(`Using formatted email name: ${formattedName}`);
            } else {
              const patientLabel = `Patient ${userId.substring(0, 8)}`;
              nameMap[userId] = patientLabel;
              console.log(`Using patient label: ${patientLabel}`);
            }
          }
        } catch (error) {
          console.error(`Error processing user ${userId}:`, error);
          nameMap[userId] = `Patient ${userId.substring(0, 8)}`;
        }
      }
      
      console.log("Final patient names:", nameMap);
      setPatientNames(nameMap);
      
    } catch (error) {
      console.error("Error in fetchPatientNames:", error);
      // Set empty map in case of error
      setPatientNames({});
    }
  };
  
  // Helper function to get patient name
  const getPatientName = (userId) => {
    if (!userId) return "Unknown Patient";
    return patientNames[userId] || "Patient";
  };
  
  const handleSignOut = async () => {
    try {
      // Try to delete the session
      try {
        await account.deleteSession('current');
      } catch (e) {
        console.log('Session deletion error (can be ignored):', e);
      }
      
      // Navigate to sign in
      router.replace('/login/signIn');
    } catch (error) {
      console.error("Logout error:", error);
      router.replace('/login/signIn');
    }
  };
  
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
      
      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Appointments</Text>
          
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
            upcomingAppointments.map((appointment) => (
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
                
                {/* Show appointment ID in a smaller text for reference */}
                <Text style={styles.appointmentIdText}>ID: {appointment.$id}</Text>
                
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
        </View>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Access</Text>
          
          <TouchableOpacity 
            style={styles.quickAccessButton}
            onPress={() => router.push('/testing/prescription-flow')}
          >
            <Ionicons name="flask" size={24} color="#0AD476" />
            <Text style={styles.quickAccessText}>Test Prescription Flow</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
    padding: 20,
  },
  section: {
    marginBottom: 25,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
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
  },
  appointmentCard: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
  },
  patientInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    flexWrap: 'wrap',
    gap: 8, // Add gap between items
  },
  patientName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 15,
    minWidth: 120, // Ensure enough width for text
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  appointmentIdText: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 10,
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
  quickAccessButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  quickAccessText: {
    color: '#4b5563',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 10,
  },
});