import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Image } from 'react-native'
import React, { useEffect, useState } from 'react'
import { useRouter } from 'expo-router'
import { account, DatabaseService, Query } from '@/configs/AppwriteConfig'
import { removeSpecificStorageKey } from '@/service/Storage'
import Toast from 'react-native-toast-message'
import { Ionicons } from '@expo/vector-icons'
import { COLLECTIONS } from '@/constants'

export default function Profile() {
  const router = useRouter();
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    const loadProfile = async () => {
      try {
        setIsLoading(true);
        const currentUser = await account.get();
        
        if (currentUser) {
          // Check if profile exists
          try {
            const response = await DatabaseService.listDocuments(
              COLLECTIONS.PATIENT_PROFILES,
              [Query.equal('userId', currentUser.$id)],
              1
            );
            
            if (response.documents.length > 0) {
              setProfile(response.documents[0]);
            }
          } catch (error) {
            console.error('Error loading profile:', error);
          }
        }
      } catch (error) {
        console.error('Error in auth:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadProfile();
  }, []);
  
  const handleLogout = async () => {
    try {
      console.log("Starting logout process...");
      
      // Sign out from Appwrite by deleting the current session
      try {
        await account.deleteSession('current');
        console.log("Appwrite session deleted successfully");
      } catch (sessionError) {
        console.log("Error deleting Appwrite session:", sessionError);
        // Continue with logout even if session deletion fails
      }
      
      // Only clear authentication-related data
      await removeSpecificStorageKey('userDetail');
      console.log("User details removed from storage");
      
      // Show success message
      Toast.show({
        type: 'success',
        text1: 'Logged Out',
        text2: 'You have been successfully logged out',
      });
      
      // Redirect to login screen
      console.log("Redirecting to login screen...");
      router.replace('/login');
    } catch (error) {
      console.error("Logout error:", error);
      
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to log out. Please try again.',
      });
    }
  }
  
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
  
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Profile</Text>
      </View>
      
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0AD476" />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      ) : profile ? (
        <View>
          {/* Profile Summary */}
          <View style={styles.profileSummary}>
            <View style={styles.profileImageContainer}>
              <Text style={styles.profileInitials}>
                {profile.fullName ? profile.fullName.charAt(0).toUpperCase() : '?'}
              </Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{profile.fullName || 'No Name'}</Text>
              <Text style={styles.profileDetail}>{profile.email || 'No Email'}</Text>
              <Text style={styles.profileDetail}>{profile.phoneNumber || 'No Phone'}</Text>
            </View>
          </View>
          
          {/* Completion indicator */}
          <View style={styles.completionContainer}>
            <Text style={styles.completionText}>Profile {calculateProfileCompletion()}% complete</Text>
            <View style={styles.progressBarBackground}>
              <View style={[styles.progressBar, { width: `${calculateProfileCompletion()}%` }]} />
            </View>
          </View>
          
          {/* Profile Details */}
          <View style={styles.detailsContainer}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Personal Information</Text>
            </View>
            
            <View style={styles.detailRow}>
              <Ionicons name="person-outline" size={20} color="#666" />
              <Text style={styles.detailLabel}>Full Name:</Text>
              <Text style={styles.detailValue}>{profile.fullName || 'Not provided'}</Text>
            </View>
            
            <View style={styles.detailRow}>
              <Ionicons name="mail-outline" size={20} color="#666" />
              <Text style={styles.detailLabel}>Email:</Text>
              <Text style={styles.detailValue}>{profile.email || 'Not provided'}</Text>
            </View>
            
            <View style={styles.detailRow}>
              <Ionicons name="call-outline" size={20} color="#666" />
              <Text style={styles.detailLabel}>Phone:</Text>
              <Text style={styles.detailValue}>{profile.phoneNumber || 'Not provided'}</Text>
            </View>
            
            <View style={styles.detailRow}>
              <Ionicons name="transgender-outline" size={20} color="#666" />
              <Text style={styles.detailLabel}>Gender:</Text>
              <Text style={styles.detailValue}>
                {profile.gender ? profile.gender.charAt(0).toUpperCase() + profile.gender.slice(1) : 'Not provided'}
              </Text>
            </View>
            
            <View style={styles.detailRow}>
              <Ionicons name="calendar-outline" size={20} color="#666" />
              <Text style={styles.detailLabel}>Birth Date:</Text>
              <Text style={styles.detailValue}>{profile.birthDate || 'Not provided'}</Text>
            </View>
            
            <View style={styles.detailRow}>
              <Ionicons name="location-outline" size={20} color="#666" />
              <Text style={styles.detailLabel}>Address:</Text>
              <Text style={styles.detailValue}>{profile.address || 'Not provided'}</Text>
            </View>
            
            {/* Medical Info Section */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Medical Information</Text>
            </View>
            
            <View style={styles.detailRow}>
              <Ionicons name="water-outline" size={20} color="#666" />
              <Text style={styles.detailLabel}>Blood Type:</Text>
              <Text style={styles.detailValue}>
                {profile.bloodType && profile.bloodType.length > 0 ? profile.bloodType[0] : 'Not provided'}
              </Text>
            </View>
            
            <View style={styles.detailRow}>
              <Ionicons name="alert-circle-outline" size={20} color="#666" />
              <Text style={styles.detailLabel}>Allergies:</Text>
              <Text style={styles.detailValue}>{profile.allergies || 'None'}</Text>
            </View>
            
            <View style={styles.detailRow}>
              <Ionicons name="medkit-outline" size={20} color="#666" />
              <Text style={styles.detailLabel}>Medications:</Text>
              <Text style={styles.detailValue}>{profile.currentMedication || 'None'}</Text>
            </View>
            
            {/* Emergency Contact */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Emergency Contact</Text>
            </View>
            
            <View style={styles.detailRow}>
              <Ionicons name="person-outline" size={20} color="#666" />
              <Text style={styles.detailLabel}>Name:</Text>
              <Text style={styles.detailValue}>{profile.emergencyContactName || 'Not provided'}</Text>
            </View>
            
            <View style={styles.detailRow}>
              <Ionicons name="call-outline" size={20} color="#666" />
              <Text style={styles.detailLabel}>Phone:</Text>
              <Text style={styles.detailValue}>{profile.emergencyContactNumber || 'Not provided'}</Text>
            </View>
          </View>
          
          {/* Actions */}
          <View style={styles.actionContainer}>
            <TouchableOpacity 
              style={styles.editButton}
              onPress={() => router.push('/profile')}
            >
              <Ionicons name="create-outline" size={20} color="white" />
              <Text style={styles.buttonText}>Edit Profile</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={styles.emptyProfile}>
          <Ionicons name="person-circle-outline" size={80} color="#e5e7eb" />
          <Text style={styles.emptyTitle}>No Profile Found</Text>
          <Text style={styles.emptyText}>
            Complete your patient profile to book appointments more easily
          </Text>
          <TouchableOpacity 
            style={styles.createButton}
            onPress={() => router.push('/profile')}
          >
            <Text style={styles.buttonText}>Create Profile</Text>
          </TouchableOpacity>
        </View>
      )}
      
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={20} color="white" />
        <Text style={styles.buttonText}>Logout</Text>
      </TouchableOpacity>
      
      <Toast />
      
      {/* Add some space at the bottom */}
      <View style={{ height: 40 }} />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    padding: 25,
    paddingTop: 60,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 10,
    color: '#6b7280',
  },
  profileSummary: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 20,
    alignItems: 'center',
  },
  profileImageContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#0AD476',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInitials: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
  },
  profileInfo: {
    marginLeft: 15,
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  profileDetail: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 2,
  },
  completionContainer: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  completionText: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
  progressBarBackground: {
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#0AD476',
  },
  detailsContainer: {
    backgroundColor: '#fff',
    marginTop: 15,
    paddingBottom: 10,
  },
  sectionHeader: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  detailRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 15,
    color: '#6b7280',
    width: 90,
    marginLeft: 10,
  },
  detailValue: {
    fontSize: 15,
    color: '#111827',
    flex: 1,
  },
  actionContainer: {
    padding: 20,
  },
  editButton: {
    backgroundColor: '#0AD476',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
  },
  logoutButton: {
    backgroundColor: '#ef4444',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    marginHorizontal: 20,
    marginTop: 10,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    marginLeft: 8,
  },
  emptyProfile: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    backgroundColor: '#fff',
    marginTop: 15,
    marginHorizontal: 0,
    borderRadius: 0,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginTop: 15,
    marginBottom: 5,
  },
  emptyText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 20,
  },
  createButton: {
    backgroundColor: '#0AD476',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
});