import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native'
import React, { useEffect, useState } from 'react'
import { useRouter } from 'expo-router'
import { account, DatabaseService, Query } from '@/configs/AppwriteConfig'
import { getLocalStorage, clearUserData } from '@/service/Storage'
import { useAuth } from '@/app/_layout';
import Toast from 'react-native-toast-message'
import { Ionicons } from '@expo/vector-icons'
import { COLLECTIONS } from '@/constants'

export default function Profile() {
  const router = useRouter();
  const [profile, setProfile] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const { logout } = useAuth();

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

  useEffect(() => {
    loadProfileAndAppointments();
  }, []);

  const loadProfileAndAppointments = async () => {
    try {
      setIsLoading(true);
      const currentUser = await account.get();
      
      if (currentUser) {
        // Load profile and appointments in parallel
        const [profileResponse, appointmentsResponse] = await Promise.all([
          DatabaseService.listDocuments(
            COLLECTIONS.PATIENT_PROFILES,
            [Query.equal('userId', currentUser.$id)],
            1
          ),
          DatabaseService.listDocuments(
            COLLECTIONS.APPOINTMENTS,
            [Query.equal('user_id', currentUser.$id)],
            100
          )
        ]);
        
        if (profileResponse.documents.length > 0) {
          setProfile(profileResponse.documents[0]);
        }
        
        // Sort appointments by date, most recent first (latest dates first)
        const sortedAppointments = appointmentsResponse.documents.sort((a, b) => {
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
        
        setAppointments(sortedAppointments);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      Toast.show({
        type: 'success',
        text1: 'Logging Out',
        text2: 'Please wait...',
      });
      
      const userDetail = await getLocalStorage('userDetail');
      const userId = userDetail?.uid || 'anonymous';
      
      await clearUserData(userId);
      
      setTimeout(async () => {
        try {
          await logout();
        } catch (error) {
          console.error("Error during logout:", error);
          router.replace('/login/signIn');
        }
      }, 300);
    } catch (error) {
      console.error("Logout preparation error:", error);
      
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to log out. Please try again.',
      });
      
      setTimeout(() => {
        router.replace('/login/signIn');
      }, 1000);
    }
  };

  const calculateProfileCompletion = () => {
    if (!profile) return 0;
    
    const requiredFields = ['fullName', 'email', 'phoneNumber', 'gender', 'birthDate', 'address'];
    const optionalFields = ['age', 'emergencyContactName', 'emergencyContactNumber', 'allergies', 'currentMedication', 'bloodType'];
    
    const filledRequired = requiredFields.filter(field => profile[field]?.trim()).length;
    const filledOptional = optionalFields.filter(field => {
      if (Array.isArray(profile[field])) {
        return profile[field].length > 0;
      }
      return profile[field]?.trim?.();
    }).length;
    
    const requiredWeight = 0.7;
    const optionalWeight = 0.3;
    
    const requiredCompletion = (filledRequired / requiredFields.length) * requiredWeight;
    const optionalCompletion = (filledOptional / optionalFields.length) * optionalWeight;
    
    return Math.round((requiredCompletion + optionalCompletion) * 100);
  };

  const isDatePast = (dateString) => {
    if (!dateString) return false;
    
    try {
      const parts = dateString.match(/(\w+), (\d+) (\w+) (\d+)/);
      if (!parts) return false;
      
      const months = {
        'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
        'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
      };
      
      const appointmentDate = new Date(
        parseInt(parts[4]),
        months[parts[3]],
        parseInt(parts[2])
      );
      
      appointmentDate.setHours(23, 59, 59, 999);
      return appointmentDate < new Date();
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

  const renderAppointmentItem = (appointment, isPast = false) => {
    const statusColor = isPast ? '#8E8E93' : '#0AD476';
    const statusText = isPast ? 'Completed' : 'Upcoming';
    
    return (
      <TouchableOpacity
        key={appointment.$id}
        style={[styles.appointmentItem, isPast && styles.pastAppointmentItem]}
        onPress={() => handleAppointmentClick(appointment)}
        activeOpacity={0.7}
      >
        <View style={styles.appointmentHeader}>
          <View style={styles.appointmentInfo}>
            <Text style={[styles.appointmentDoctor, isPast && styles.pastText]}>
              {appointment.doctor_name || 'Doctor'}
            </Text>
            <Text style={[styles.appointmentSpecialization, isPast && styles.pastText]}>
              {appointment.doctor_specialization || 'General Practice'}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <Text style={styles.statusBadgeText}>{statusText}</Text>
          </View>
        </View>
        
        <View style={styles.appointmentDetails}>
          <View style={styles.appointmentDetailRow}>
            <Ionicons name="calendar-outline" size={14} color={isPast ? '#8E8E93' : '#666'} />
            <Text style={[styles.appointmentDetailText, isPast && styles.pastText]}>
              {appointment.date || 'Date not set'}
            </Text>
          </View>
          <View style={styles.appointmentDetailRow}>
            <Ionicons name="time-outline" size={14} color={isPast ? '#8E8E93' : '#666'} />
            <Text style={[styles.appointmentDetailText, isPast && styles.pastText]}>
              {appointment.time || 'Time not set'}
            </Text>
          </View>
          <View style={styles.appointmentDetailRow}>
            <Ionicons name="location-outline" size={14} color={isPast ? '#8E8E93' : '#666'} />
            <Text style={[styles.appointmentDetailText, isPast && styles.pastText]} numberOfLines={1}>
              {appointment.hospital_name || 'Hospital not specified'}
            </Text>
          </View>
        </View>
        
        <View style={styles.appointmentFooter}>
          <Text style={[styles.appointmentId, isPast && styles.pastText]}>
            ID: {appointment.$id?.substring(0, 8) || 'N/A'}
          </Text>
          <Ionicons name="chevron-forward-outline" size={16} color={isPast ? '#8E8E93' : '#0AD476'} />
        </View>
      </TouchableOpacity>
    );
  };

  // Separate appointments into upcoming and past
  const upcomingAppointments = appointments.filter(app => !isDatePast(app.date));
  const pastAppointments = appointments.filter(app => isDatePast(app.date));

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        {isLoading ? (
          <ActivityIndicator size="large" color="#0AD476" />
        ) : profile ? (
          <View style={styles.profileHeader}>
            <View style={styles.avatarContainer}>
              <Text style={styles.avatarText}>
                {profile.fullName ? profile.fullName.charAt(0).toUpperCase() : '?'}
              </Text>
            </View>
            <Text style={styles.userName}>{profile.fullName || 'User'}</Text>
            <Text style={styles.userEmail}>{profile.email || 'user@example.com'}</Text>
          </View>
        ) : (
          <View style={styles.profileHeader}>
            <View style={styles.avatarContainer}>
              <Ionicons name="person" size={30} color="#fff" />
            </View>
            <Text style={styles.userName}>Create Profile</Text>
            <Text style={styles.userEmail}>Complete your profile to get started</Text>
          </View>
        )}
      </View>

      {/* Account Settings Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account Setting</Text>
        
        <TouchableOpacity 
          style={styles.menuItem}
          onPress={() => router.push('/profile')}
        >
          <View style={styles.menuItemLeft}>
            <Ionicons name="person-outline" size={20} color="#666" />
            <Text style={styles.menuItemText}>Personal Information</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color="#999" />
        </TouchableOpacity>

        {/* Appointment Summary Cards */}
        {upcomingAppointments.length > 0 && (
          <View style={styles.infoCard}>
            <Ionicons name="time-outline" size={16} color="#0AD476" />
            <Text style={styles.infoText}>
              You have {upcomingAppointments.length} upcoming appointment{upcomingAppointments.length > 1 ? 's' : ''}
            </Text>
          </View>
        )}

        {pastAppointments.length > 0 && (
          <TouchableOpacity 
            style={styles.pastInfoCard}
            onPress={() => router.push('/profile/past-appointments')}
            activeOpacity={0.7}
          >
            <Ionicons name="checkmark-circle-outline" size={16} color="#8E8E93" />
            <Text style={styles.pastInfoText}>
              You have {pastAppointments.length} completed appointment{pastAppointments.length > 1 ? 's' : ''}
            </Text>
            <Ionicons name="chevron-forward" size={14} color="#8E8E93" />
          </TouchableOpacity>
        )}

        {appointments.length > 0 && (
          <View style={styles.totalInfoCard}>
            <Ionicons name="calendar" size={16} color="#0AD476" />
            <Text style={styles.totalInfoText}>
              Total appointments: {appointments.length}
            </Text>
          </View>
        )}
      </View>

      {/* Upcoming Appointments Section */}
      {upcomingAppointments.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Upcoming Appointments</Text>
          {upcomingAppointments.slice(0, 3).map(appointment => 
            renderAppointmentItem(appointment, false)
          )}
          {upcomingAppointments.length > 3 && (
            <TouchableOpacity 
              style={styles.viewAllButton}
              onPress={() => router.push('/profile/upcoming-appointments')}
            >
              <Text style={styles.viewAllText}>View All Upcoming ({upcomingAppointments.length})</Text>
              <Ionicons name="chevron-forward" size={16} color="#0AD476" />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Recent Past Appointments Section */}
      {pastAppointments.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Appointments</Text>
          {pastAppointments.slice(0, 2).map(appointment => 
            renderAppointmentItem(appointment, true)
          )}
          <TouchableOpacity 
            style={styles.viewAllButton}
            onPress={() => router.push('/profile/past-appointments')}
          >
            <Text style={[styles.viewAllText, { color: '#8E8E93' }]}>
              View All Past ({pastAppointments.length})
            </Text>
            <Ionicons name="chevron-forward" size={16} color="#8E8E93" />
          </TouchableOpacity>
        </View>
      )}

      {/* Other Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Other</Text>
        
        <TouchableOpacity style={styles.menuItem}>
          <View style={styles.menuItemLeft}>
            <Ionicons name="help-circle-outline" size={20} color="#666" />
            <Text style={styles.menuItemText}>Help Center</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color="#999" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem}>
          <View style={styles.menuItemLeft}>
            <Ionicons name="information-circle-outline" size={20} color="#666" />
            <Text style={styles.menuItemText}>About</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color="#999" />
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.menuItem, styles.logoutItem]}
          onPress={handleLogout}
        >
          <View style={styles.menuItemLeft}>
            <Ionicons name="log-out-outline" size={20} color="#FF3B30" />
            <Text style={[styles.menuItemText, styles.logoutText]}>Logout</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color="#FF3B30" />
        </TouchableOpacity>
      </View>

      {/* Profile Completion Indicator */}
      {profile && (
        <View style={styles.completionCard}>
          <View style={styles.completionHeader}>
            <Text style={styles.completionTitle}>Profile Completion</Text>
            <Text style={styles.completionPercentage}>{calculateProfileCompletion()}%</Text>
          </View>
          <View style={styles.progressBarBackground}>
            <View style={[styles.progressBar, { width: `${calculateProfileCompletion()}%` }]} />
          </View>
          <Text style={styles.completionSubtext}>
            Complete your profile to unlock all features
          </Text>
        </View>
      )}

      <Toast />
      <View style={{ height: 100 }} />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingTop: 60,
    paddingBottom: 30,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  profileHeader: {
    alignItems: 'center',
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#0AD476',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  userName: {
    fontSize: 24,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 16,
    color: '#8E8E93',
  },
  section: {
    backgroundColor: '#FFFFFF',
    marginTop: 20,
    paddingVertical: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: '#F0F0F0',
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuItemText: {
    fontSize: 16,
    color: '#000000',
    marginLeft: 12,
  },
  logoutItem: {
    borderBottomWidth: 0,
  },
  logoutText: {
    color: '#FF3B30',
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    marginHorizontal: 20,
    marginVertical: 8,
    padding: 12,
    borderRadius: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#0AD476',
    marginLeft: 8,
    flex: 1,
  },
  pastInfoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    marginHorizontal: 20,
    marginVertical: 8,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E5E7',
  },
  pastInfoText: {
    fontSize: 14,
    color: '#8E8E93',
    marginLeft: 8,
    flex: 1,
  },
  totalInfoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    marginHorizontal: 20,
    marginVertical: 8,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#0AD476',
  },
  totalInfoText: {
    fontSize: 14,
    color: '#0AD476',
    marginLeft: 8,
    flex: 1,
    fontWeight: '500',
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
  pastAppointmentItem: {
    backgroundColor: '#FAFAFA',
    borderColor: '#E5E5E7',
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
  },
  statusBadge: {
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
  pastText: {
    color: '#8E8E93',
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginHorizontal: 20,
    marginTop: 8,
  },
  viewAllText: {
    fontSize: 14,
    color: '#0AD476',
    fontWeight: '500',
    marginRight: 4,
  },
  completionCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginTop: 20,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  completionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  completionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  completionPercentage: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0AD476',
  },
  progressBarBackground: {
    height: 6,
    backgroundColor: '#F0F0F0',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#0AD476',
  },
  completionSubtext: {
    fontSize: 14,
    color: '#8E8E93',
  },
});