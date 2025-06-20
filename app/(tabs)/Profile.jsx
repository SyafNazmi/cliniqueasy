// app/(tabs)/Profile.jsx - Enhanced with proper focus refresh
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native'
import React, { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'expo-router'
import { useFocusEffect } from '@react-navigation/native' // Add this import
import { account, DatabaseService, Query } from '@/configs/AppwriteConfig'
import { getLocalStorage, clearUserData } from '@/service/Storage'
import { useAuth } from '@/app/_layout';
import Toast from 'react-native-toast-message'
import { Ionicons } from '@expo/vector-icons'
import { COLLECTIONS, PROFILE_TYPES } from '@/constants'
import { CANCELLATION_STATUS } from '@/service/appointmentUtils'

export default function Profile() {
  const router = useRouter();
  const [profile, setProfile] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [familyMemberCount, setFamilyMemberCount] = useState(0);
  
  // Cancellation history state
  const [cancellationRequestsCount, setCancellationRequestsCount] = useState(0);
  const [pendingCancellationsCount, setPendingCancellationsCount] = useState(0);
  
  const { logout } = useAuth();

  // Enhanced date parsing function (matching HomeScreen logic)
  const parseAppointmentDate = (dateString) => {
    if (!dateString) return new Date(0);
    
    try {
      const parts = dateString.match(/(\w+), (\d+) (\w+) (\d+)/);
      if (!parts) {
        console.log('Date parsing failed for:', dateString);
        return new Date(dateString);
      }
      
      const [_, dayName, dayNum, monthName, year] = parts;
      const months = {
        'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
        'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
      };
      
      const monthIndex = months[monthName];
      if (monthIndex === undefined) {
        console.log('Unknown month:', monthName);
        return new Date(dateString);
      }
      
      return new Date(
        parseInt(year),
        monthIndex,
        parseInt(dayNum)
      );
    } catch (error) {
      console.error('Error parsing date:', dateString, error);
      return new Date(0);
    }
  };

  const isDatePast = (dateString) => {
    if (!dateString) return false;
    
    try {
      const appointmentDate = parseAppointmentDate(dateString);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      return appointmentDate < today;
    } catch (error) {
      console.error('Error checking if date is past:', dateString, error);
      return false;
    }
  };

  const getUpcomingAppointments = (appointmentsList) => {
    return appointmentsList.filter(appointment => {
      const status = appointment.status?.toLowerCase();
      if (status === 'cancelled' || status === 'completed') {
        return false;
      }
      
      return !isDatePast(appointment.date);
    });
  };

  const getPastAppointments = (appointmentsList) => {
    return appointmentsList.filter(appointment => {
      const status = appointment.status?.toLowerCase();
      const isPast = isDatePast(appointment.date);
      
      return status === 'completed' || (isPast && status !== 'cancelled');
    });
  };

  // ENHANCED: Extract all data loading into a reusable function
  const loadAllData = useCallback(async (showLoader = true) => {
    try {
      if (showLoader) {
        setIsLoading(true);
      } else {
        setIsRefreshing(true);
      }

      const currentUser = await account.get();
      
      if (currentUser) {
        // Load all data in parallel
        const [profileResponse, appointmentsResponse] = await Promise.all([
          DatabaseService.listDocuments(
            COLLECTIONS.PATIENT_PROFILES,
            [Query.equal('userId', currentUser.$id)],
            1
          ),
          DatabaseService.listDocuments(
            COLLECTIONS.APPOINTMENTS,
            [
              Query.equal('user_id', currentUser.$id),
              Query.orderDesc('$createdAt'),
              Query.limit(100)
            ]
          )
        ]);
        
        if (profileResponse.documents.length > 0) {
          setProfile(profileResponse.documents[0]);
        }
        
        // Sort appointments by date
        const sortedAppointments = appointmentsResponse.documents.sort((a, b) => {
          if (!a.date || !b.date) return 0;
          
          try {
            const dateA = parseAppointmentDate(a.date);
            const dateB = parseAppointmentDate(b.date);
            return dateB.getTime() - dateA.getTime();
          } catch (error) {
            console.error('Error sorting appointments:', error);
            return 0;
          }
        });
        
        setAppointments(sortedAppointments);
        
        // Load additional data
        await Promise.all([
          loadFamilyMemberCount(currentUser.$id),
          loadCancellationHistory(currentUser.$id)
        ]);
      }
    } catch (error) {
      console.error('Error loading profile data:', error);
      // Show user-friendly error
      if (!showLoader) {
        Toast.show({
          type: 'error',
          text1: 'Refresh Failed',
          text2: 'Unable to refresh data. Please try again.',
        });
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // ENHANCED: Make family member count loading more robust
  const loadFamilyMemberCount = async (userId) => {
    try {
      console.log('Loading family member count for user:', userId);
      
      // First try new data structure with profileType
      let queries = [
        DatabaseService.createQuery('equal', 'userId', userId),
        DatabaseService.createQuery('equal', 'profileType', PROFILE_TYPES.FAMILY_MEMBER)
      ];

      let response = await DatabaseService.listDocuments(
        COLLECTIONS.PATIENT_PROFILES,
        queries,
        100
      );

      let familyMemberCount = response.documents?.length || 0;
      console.log('Family members found with profileType:', familyMemberCount);

      // If no results with profileType, fall back to legacy method
      if (familyMemberCount === 0) {
        console.log('No profiles found with profileType, checking legacy data...');
        
        const legacyQueries = [
          DatabaseService.createQuery('equal', 'userId', userId)
        ];

        const legacyResponse = await DatabaseService.listDocuments(
          COLLECTIONS.PATIENT_PROFILES,
          legacyQueries,
          100
        );

        // Get current user email for filtering
        const currentUser = await account.get();
        
        // Filter out user's own profile by email (legacy method)
        const familyMembers = (legacyResponse.documents || []).filter(profile => {
          return profile.email !== currentUser.email;
        });

        familyMemberCount = familyMembers.length;
        console.log('Family members found with legacy method:', familyMemberCount);
      }
      
      setFamilyMemberCount(familyMemberCount);
      console.log('Final family member count set to:', familyMemberCount);
    } catch (error) {
      console.error('Error loading family member count:', error);
      setFamilyMemberCount(0);
    }
  };

  const loadCancellationHistory = async (userId) => {
    try {
      console.log('Loading cancellation history for user:', userId);
      
      const queries = [
        Query.equal('user_id', userId),
        Query.or([
          Query.equal('cancellation_status', CANCELLATION_STATUS.REQUESTED),
          Query.equal('cancellation_status', CANCELLATION_STATUS.APPROVED),
          Query.equal('cancellation_status', CANCELLATION_STATUS.DENIED)
        ])
      ];

      const response = await DatabaseService.listDocuments(
        COLLECTIONS.APPOINTMENTS,
        queries
      );

      console.log('Found cancellation requests:', response.documents.length);
      
      const requests = response.documents || [];
      setCancellationRequestsCount(requests.length);
      
      const pendingRequests = requests.filter(req => 
        req.cancellation_status === CANCELLATION_STATUS.REQUESTED
      );
      setPendingCancellationsCount(pendingRequests.length);
      
    } catch (error) {
      console.error('Error loading cancellation history:', error);
      setCancellationRequestsCount(0);
      setPendingCancellationsCount(0);
    }
  };

  // FIX: Use useFocusEffect to refresh data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      console.log('Profile screen focused, refreshing data...');
      loadAllData(false); // Don't show full loader when refocusing
    }, [loadAllData])
  );

  // Initial load
  useEffect(() => {
    loadAllData(true);
  }, [loadAllData]);

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

  // ADD: Pull-to-refresh functionality
  const onRefresh = useCallback(() => {
    console.log('Pull to refresh triggered');
    loadAllData(false);
  }, [loadAllData]);

  // Calculate appointment statistics using enhanced logic
  const upcomingAppointments = getUpcomingAppointments(appointments);
  const pastAppointments = getPastAppointments(appointments);
  const completion = calculateProfileCompletion();

  // Calculate family booking statistics
  const upcomingFamilyBookings = upcomingAppointments.filter(apt => apt.is_family_booking === true);
  const hasUpcomingFamilyBookings = upcomingFamilyBookings.length > 0;

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0AD476" />
        <Text style={styles.loadingText}>Loading your profile...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            {profile?.fullName ? (
              <Text style={styles.avatarText}>
                {profile.fullName.charAt(0).toUpperCase()}
              </Text>
            ) : (
              <Ionicons name="person" size={24} color="#fff" />
            )}
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.userName}>{profile?.fullName || 'Complete Your Profile'}</Text>
            <Text style={styles.userEmail}>{profile?.email || 'Add your information'}</Text>
          </View>
        </View>
      </View>

      {/* Profile Completion Card - Moved to top */}
      <View style={styles.completionCard}>
        <View style={styles.completionHeader}>
          <View style={styles.completionInfo}>
            <Text style={styles.completionTitle}>Profile Completion</Text>
            <Text style={styles.completionSubtext}>
              {completion === 100 ? 'Your profile is complete!' : 'Complete your profile to unlock all features'}
            </Text>
          </View>
          <View style={styles.completionPercentageContainer}>
            <Text style={styles.completionPercentage}>{completion}%</Text>
          </View>
        </View>
        <View style={styles.progressBarBackground}>
          <View style={[styles.progressBar, { width: `${completion}%` }]} />
        </View>
        {completion < 100 && (
          <TouchableOpacity 
            style={styles.completeProfileButton}
            onPress={() => router.push('/profile')}
          >
            <Text style={styles.completeProfileText}>Complete Profile</Text>
            <Ionicons name="chevron-forward" size={16} color="#0AD476" />
          </TouchableOpacity>
        )}
      </View>

      {/* Account Information */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account Information</Text>
        
        <TouchableOpacity 
          style={styles.menuItem}
          onPress={() => router.push('/profile')}
        >
          <View style={styles.menuItemLeft}>
            <View style={styles.iconContainer}>
              <Ionicons name="person-outline" size={20} color="#0AD476" />
            </View>
            <View>
              <Text style={styles.menuItemText}>Personal Information</Text>
              <Text style={styles.menuItemSubtext}>Update your profile details</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={16} color="#C7C7CC" />
        </TouchableOpacity>

        {/* Add Family Member Link */}
          <TouchableOpacity 
          style={[styles.menuItem, styles.familyButtonWithCount]}
          onPress={() => router.push('/profile/family-members')}
        >
          <View style={styles.menuItemLeft}>
            <View style={styles.iconContainer}>
              <Ionicons name="people" size={20} color="#0AD476" />
              {familyMemberCount > 0 && (
                <View style={styles.familyCountBadge}>
                  <Text style={styles.familyCountText}>{familyMemberCount}</Text>
                </View>
              )}
            </View>
            <View>
              <Text style={styles.menuItemText}>Family Members</Text>
              <Text style={styles.menuItemSubtext}>
                {familyMemberCount === 0 
                  ? "Add family members to your account" 
                  : `Manage ${familyMemberCount} family member${familyMemberCount !== 1 ? 's' : ''}`
                }
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={16} color="#C7C7CC" />
        </TouchableOpacity>
      </View>

      {/* Enhanced Appointments Summary */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Appointments</Text>
          {appointments.length > 0 && (
            <TouchableOpacity onPress={() => router.push('/appointment')}>
              <Text style={styles.viewAllLink}>View All</Text>
            </TouchableOpacity>
          )}
        </View>
        
        {appointments.length === 0 ? (
          <View style={styles.emptyAppointments}>
            <Ionicons name="calendar-outline" size={32} color="#C7C7CC" />
            <Text style={styles.emptyAppointmentsText}>No appointments yet</Text>
            <Text style={styles.emptyAppointmentsSubtext}>
              Your appointment history will appear here
            </Text>
            <TouchableOpacity 
              style={styles.bookFirstButton}
              onPress={() => router.push('/appointment/appointmentBooking')}
            >
              <Text style={styles.bookFirstButtonText}>Book Your First Appointment</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.appointmentsMenuContainer}>
            {/* Enhanced Upcoming Appointments */}
            {upcomingAppointments.length > 0 ? (
              <TouchableOpacity 
                style={styles.menuItem}
                onPress={() => router.push('/profile/upcoming-appointments')}
              >
                <View style={styles.menuItemLeft}>
                  <View style={[styles.iconContainer, { backgroundColor: '#E8F5E8' }]}>
                    <Ionicons name="time-outline" size={20} color="#0AD476" />
                  </View>
                  <View>
                    <Text style={styles.menuItemText}>Upcoming Appointments</Text>
                    <Text style={styles.menuItemSubtext}>
                      {upcomingAppointments.length} appointment{upcomingAppointments.length > 1 ? 's' : ''} scheduled
                      {hasUpcomingFamilyBookings && ' (including family)'}
                    </Text>
                  </View>
                </View>
                <View style={styles.appointmentBadge}>
                  <Text style={styles.appointmentBadgeText}>{upcomingAppointments.length}</Text>
                  {hasUpcomingFamilyBookings && (
                    <View style={styles.familyIndicatorSmall}>
                      <Ionicons name="people" size={10} color="#0AD476" />
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            ) : (
              <View style={styles.noUpcomingCard}>
                <View style={styles.menuItemLeft}>
                  <View style={[styles.iconContainer, { backgroundColor: '#F5F5F5' }]}>
                    <Ionicons name="calendar-outline" size={20} color="#8E8E93" />
                  </View>
                  <View>
                    <Text style={[styles.menuItemText, { color: '#8E8E93' }]}>No Upcoming Appointments</Text>
                    <Text style={styles.menuItemSubtext}>Schedule your next appointment</Text>
                  </View>
                </View>
                <TouchableOpacity 
                  style={styles.quickBookButton}
                  onPress={() => router.push('/appointment/appointmentBooking')}
                >
                  <Ionicons name="add" size={16} color="#0AD476" />
                </TouchableOpacity>
              </View>
            )}

            {/* NEW: Cancellation History */}
            {cancellationRequestsCount > 0 && (
              <TouchableOpacity 
                style={styles.menuItem}
                onPress={() => router.push('/profile/cancellation-history')}
              >
                <View style={styles.menuItemLeft}>
                  <View style={[styles.iconContainer, { backgroundColor: '#FEF3C7' }]}>
                    <Ionicons name="hourglass-outline" size={20} color="#F59E0B" />
                    {pendingCancellationsCount > 0 && (
                      <View style={styles.pendingCancellationBadge}>
                        <Text style={styles.pendingCancellationText}>{pendingCancellationsCount}</Text>
                      </View>
                    )}
                  </View>
                  <View>
                    <Text style={styles.menuItemText}>Cancellation History</Text>
                    <Text style={styles.menuItemSubtext}>
                      {cancellationRequestsCount} cancellation request{cancellationRequestsCount > 1 ? 's' : ''}
                      {pendingCancellationsCount > 0 && ` (${pendingCancellationsCount} pending)`}
                    </Text>
                  </View>
                </View>
                <View style={styles.cancellationBadgeContainer}>
                  {pendingCancellationsCount > 0 ? (
                    <View style={styles.pendingBadge}>
                      <Text style={styles.pendingBadgeText}>Pending</Text>
                    </View>
                  ) : (
                    <View style={[styles.appointmentBadge, { backgroundColor: '#FEF3C7' }]}>
                      <Text style={[styles.appointmentBadgeText, { color: '#F59E0B' }]}>
                        {cancellationRequestsCount}
                      </Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            )}

            {/* Enhanced Past Appointments */}
            {pastAppointments.length > 0 && (
              <TouchableOpacity 
                style={styles.menuItem}
                onPress={() => router.push('/profile/past-appointments')}
              >
                <View style={styles.menuItemLeft}>
                  <View style={[styles.iconContainer, { backgroundColor: '#F5F5F5' }]}>
                    <Ionicons name="checkmark-circle-outline" size={20} color="#8E8E93" />
                  </View>
                  <View>
                    <Text style={styles.menuItemText}>Past Appointments</Text>
                    <Text style={styles.menuItemSubtext}>
                      {pastAppointments.length} completed appointment{pastAppointments.length > 1 ? 's' : ''}
                    </Text>
                  </View>
                </View>
                <View style={[styles.appointmentBadge, { backgroundColor: '#F5F5F5' }]}>
                  <Text style={[styles.appointmentBadgeText, { color: '#8E8E93' }]}>{pastAppointments.length}</Text>
                </View>
              </TouchableOpacity>
            )}

            {/* All Appointments Summary */}
            <TouchableOpacity 
              style={[styles.menuItem, { borderBottomWidth: 0 }]}
              onPress={() => router.push('/appointment')}
            >
              <View style={styles.menuItemLeft}>
                <View style={[styles.iconContainer, { backgroundColor: '#F0FDF4' }]}>
                  <Ionicons name="calendar-outline" size={20} color="#0AD476" />
                </View>
                <View>
                  <Text style={styles.menuItemText}>All Appointments</Text>
                  <Text style={styles.menuItemSubtext}>
                    View complete appointment history ({appointments.length} total)
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#C7C7CC" />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Settings & Support */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Settings & Support</Text>
        
        <TouchableOpacity style={styles.menuItem}>
          <View style={styles.menuItemLeft}>
            <View style={styles.iconContainer}>
              <Ionicons name="help-circle-outline" size={20} color="#0AD476" />
            </View>
            <View>
              <Text style={styles.menuItemText}>Help Center</Text>
              <Text style={styles.menuItemSubtext}>Get help and support</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={16} color="#C7C7CC" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem}>
          <View style={styles.menuItemLeft}>
            <View style={styles.iconContainer}>
              <Ionicons name="information-circle-outline" size={20} color="#0AD476" />
            </View>
            <View>
              <Text style={styles.menuItemText}>About</Text>
              <Text style={styles.menuItemSubtext}>App version and info</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={16} color="#C7C7CC" />
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.menuItem, styles.logoutItem]}
          onPress={handleLogout}
        >
          <View style={styles.menuItemLeft}>
            <View style={[styles.iconContainer, { backgroundColor: '#FFE5E5' }]}>
              <Ionicons name="log-out-outline" size={20} color="#FF3B30" />
            </View>
            <View>
              <Text style={[styles.menuItemText, styles.logoutText]}>Sign Out</Text>
              <Text style={styles.menuItemSubtext}>Sign out of your account</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={16} color="#FF3B30" />
        </TouchableOpacity>
      </View>

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
  header: {
    backgroundColor: '#FFFFFF',
    paddingTop: 60,
    paddingBottom: 24,
    paddingHorizontal: 20,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#0AD476',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  profileInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 14,
    color: '#8E8E93',
  },
  completionCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginTop: 16,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  completionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  completionInfo: {
    flex: 1,
  },
  completionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 2,
  },
  completionSubtext: {
    fontSize: 13,
    color: '#8E8E93',
    lineHeight: 18,
  },
  completionPercentageContainer: {
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  completionPercentage: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0AD476',
  },
  progressBarBackground: {
    height: 6,
    backgroundColor: '#F0F0F0',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#0AD476',
    borderRadius: 3,
  },
  completeProfileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  completeProfileText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#0AD476',
    marginRight: 4,
  },
  section: {
    backgroundColor: '#FFFFFF',
    marginTop: 16,
    paddingVertical: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  viewAllLink: {
    fontSize: 14,
    color: '#0AD476',
    fontWeight: '500',
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
    flex: 1,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F0FDF4',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    position: 'relative',
  },
  familyCountBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#0AD476',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  familyCountText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  
  // NEW: Cancellation history specific styles
  pendingCancellationBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#DC2626',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  pendingCancellationText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  cancellationBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pendingBadge: {
    backgroundColor: '#DC2626',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  pendingBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  
  menuItemText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000000',
    marginBottom: 2,
  },
  menuItemSubtext: {
    fontSize: 13,
    color: '#8E8E93',
  },
  logoutItem: {
    borderBottomWidth: 0,
  },
  logoutText: {
    color: '#FF3B30',
  },
  emptyAppointments: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
  },
  emptyAppointmentsText: {
    fontSize: 16,
    color: '#8E8E93',
    marginTop: 8,
    marginBottom: 4,
  },
  emptyAppointmentsSubtext: {
    fontSize: 14,
    color: '#C7C7CC',
    marginBottom: 16,
    textAlign: 'center',
  },
  bookFirstButton: {
    backgroundColor: '#0AD476',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  bookFirstButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  appointmentsMenuContainer: {
    paddingHorizontal: 0,
  },
  appointmentBadge: {
    backgroundColor: '#E8F5E8',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  appointmentBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0AD476',
  },
  familyIndicatorSmall: {
    marginLeft: 4,
    backgroundColor: '#dcfce7',
    borderRadius: 8,
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noUpcomingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: '#F0F0F0',
  },
  quickBookButton: {
    backgroundColor: '#F0FDF4',
    borderRadius: 18,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E8F5E8',
  },
});