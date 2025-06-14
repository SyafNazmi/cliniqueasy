// app/doctor/profile.jsx - Dedicated profile screen
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, TextInput, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import PageHeader from '../../components/PageHeader';
import { getLocalStorage, setLocalStorage } from '../../service/Storage';
import { useAuth } from '../_layout';
import { account } from '../../configs/AppwriteConfig';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function DoctorProfile() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editedUser, setEditedUser] = useState({});
  
  const { logout } = useAuth();

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const userData = await getLocalStorage('userDetail');
      setUser(userData);
      setEditedUser(userData || {});
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDoctorInitials = () => {
    const name = user?.displayName || user?.fullName || 'Dr';
    const words = name.split(' ');
    if (words.length >= 2) {
      return (words[0].charAt(0) + words[1].charAt(0)).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const handleSignOut = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Logout', 
          style: 'destructive', 
          onPress: async () => {
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
          }
        }
      ]
    );
  };

  const handleSaveProfile = async () => {
    try {
      // Update local storage with edited user data
      await setLocalStorage('userDetail', editedUser);
      setUser(editedUser);
      setEditModalVisible(false);
      Alert.alert('Success', 'Profile updated successfully');
    } catch (error) {
      console.error('Error saving profile:', error);
      Alert.alert('Error', 'Failed to update profile');
    }
  };

  const EditProfileModal = () => (
    <Modal
      visible={editModalVisible}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setEditModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.editModal}>
          <View style={styles.editModalHeader}>
            <Text style={styles.editModalTitle}>Edit Profile</Text>
            <TouchableOpacity onPress={() => setEditModalVisible(false)}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.editModalContent}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Display Name</Text>
              <TextInput
                style={styles.input}
                value={editedUser.displayName || ''}
                onChangeText={(text) => setEditedUser({...editedUser, displayName: text})}
                placeholder="Enter your display name"
              />
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Full Name</Text>
              <TextInput
                style={styles.input}
                value={editedUser.fullName || ''}
                onChangeText={(text) => setEditedUser({...editedUser, fullName: text})}
                placeholder="Enter your full name"
              />
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email</Text>
              <TextInput
                style={[styles.input, styles.inputDisabled]}
                value={editedUser.email || ''}
                editable={false}
                placeholder="Email address"
              />
              <Text style={styles.inputHint}>Email cannot be changed</Text>
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Specialization</Text>
              <TextInput
                style={styles.input}
                value={editedUser.specialization || ''}
                onChangeText={(text) => setEditedUser({...editedUser, specialization: text})}
                placeholder="e.g., Cardiology, General Practice"
              />
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Phone Number</Text>
              <TextInput
                style={styles.input}
                value={editedUser.phone || ''}
                onChangeText={(text) => setEditedUser({...editedUser, phone: text})}
                placeholder="Enter phone number"
                keyboardType="phone-pad"
              />
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Medical License Number</Text>
              <TextInput
                style={styles.input}
                value={editedUser.licenseNumber || ''}
                onChangeText={(text) => setEditedUser({...editedUser, licenseNumber: text})}
                placeholder="Enter license number"
              />
            </View>
          </ScrollView>
          
          <View style={styles.editModalActions}>
            <TouchableOpacity 
              style={styles.cancelButton}
              onPress={() => setEditModalVisible(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.saveButton}
              onPress={handleSaveProfile}
            >
              <Text style={styles.saveButtonText}>Save Changes</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  if (loading) {
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
          <Text style={styles.headerTitle}>Profile</Text>
        </View>
        <View style={styles.loadingContainer}>
          <Text>Loading profile...</Text>
        </View>
      </View>
    );
  }

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
        <Text style={styles.headerTitle}>Profile</Text>
      </View>

      <EditProfileModal />

      <ScrollView style={styles.content}>
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <LinearGradient
            colors={["#4CAF50", "#45A049"]}
            style={styles.profileHeaderGradient}
          >
            <View style={styles.profileAvatarContainer}>
              <View style={styles.profileAvatar}>
                <Text style={styles.profileAvatarText}>{getDoctorInitials()}</Text>
              </View>
              <View style={styles.profileBadge}>
                <Ionicons name="medical" size={16} color="white" />
              </View>
            </View>
            
            <Text style={styles.profileName}>{user?.displayName || user?.fullName || 'Doctor'}</Text>
            <Text style={styles.profileEmail}>{user?.email || 'doctor@healthcare.com'}</Text>
            <Text style={styles.profileRole}>Healthcare Professional</Text>
          </LinearGradient>
        </View>

        {/* Profile Information */}
        <View style={styles.profileInfo}>
          <Text style={styles.sectionTitle}>Personal Information</Text>
          
          <View style={styles.infoCard}>
            <View style={styles.infoItem}>
              <Ionicons name="person-outline" size={20} color="#4CAF50" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Full Name</Text>
                <Text style={styles.infoValue}>{user?.fullName || 'Not provided'}</Text>
              </View>
            </View>
            
            <View style={styles.infoItem}>
              <Ionicons name="mail-outline" size={20} color="#4CAF50" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Email</Text>
                <Text style={styles.infoValue}>{user?.email || 'Not provided'}</Text>
              </View>
            </View>
            
            <View style={styles.infoItem}>
              <Ionicons name="call-outline" size={20} color="#4CAF50" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Phone</Text>
                <Text style={styles.infoValue}>{user?.phone || 'Not provided'}</Text>
              </View>
            </View>
            
            <View style={styles.infoItem}>
              <Ionicons name="medical-outline" size={20} color="#4CAF50" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Specialization</Text>
                <Text style={styles.infoValue}>{user?.specialization || 'General Practice'}</Text>
              </View>
            </View>
            
            <View style={styles.infoItem}>
              <Ionicons name="document-text-outline" size={20} color="#4CAF50" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>License Number</Text>
                <Text style={styles.infoValue}>{user?.licenseNumber || 'Not provided'}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Account Settings */}
        <View style={styles.settingsSection}>
          <Text style={styles.sectionTitle}>Account Settings</Text>
          
          <View style={styles.settingsCard}>
            <TouchableOpacity 
              style={styles.settingItem}
              onPress={() => setEditModalVisible(true)}
            >
              <View style={styles.settingIcon}>
                <Ionicons name="create-outline" size={20} color="#4CAF50" />
              </View>
              <View style={styles.settingContent}>
                <Text style={styles.settingTitle}>Edit Profile</Text>
                <Text style={styles.settingDescription}>Update your personal information</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#ccc" />
            </TouchableOpacity>
            
            <View style={styles.settingDivider} />
            
            <TouchableOpacity style={styles.settingItem}>
              <View style={styles.settingIcon}>
                <Ionicons name="lock-closed-outline" size={20} color="#4CAF50" />
              </View>
              <View style={styles.settingContent}>
                <Text style={styles.settingTitle}>Change Password</Text>
                <Text style={styles.settingDescription}>Update your account password</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#ccc" />
            </TouchableOpacity>
            
            <View style={styles.settingDivider} />
            
            <TouchableOpacity style={styles.settingItem}>
              <View style={styles.settingIcon}>
                <Ionicons name="notifications-outline" size={20} color="#4CAF50" />
              </View>
              <View style={styles.settingContent}>
                <Text style={styles.settingTitle}>Notifications</Text>
                <Text style={styles.settingDescription}>Manage notification preferences</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#ccc" />
            </TouchableOpacity>
            
            <View style={styles.settingDivider} />
            
            <TouchableOpacity style={styles.settingItem}>
              <View style={styles.settingIcon}>
                <Ionicons name="shield-checkmark-outline" size={20} color="#4CAF50" />
              </View>
              <View style={styles.settingContent}>
                <Text style={styles.settingTitle}>Privacy & Security</Text>
                <Text style={styles.settingDescription}>Manage privacy settings</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#ccc" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Support Section */}
        <View style={styles.supportSection}>
          <Text style={styles.sectionTitle}>Support</Text>
          
          <View style={styles.settingsCard}>
            <TouchableOpacity style={styles.settingItem}>
              <View style={styles.settingIcon}>
                <Ionicons name="help-circle-outline" size={20} color="#4CAF50" />
              </View>
              <View style={styles.settingContent}>
                <Text style={styles.settingTitle}>Help & FAQ</Text>
                <Text style={styles.settingDescription}>Get help and find answers</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#ccc" />
            </TouchableOpacity>
            
            <View style={styles.settingDivider} />
            
            <TouchableOpacity style={styles.settingItem}>
              <View style={styles.settingIcon}>
                <Ionicons name="mail-outline" size={20} color="#4CAF50" />
              </View>
              <View style={styles.settingContent}>
                <Text style={styles.settingTitle}>Contact Support</Text>
                <Text style={styles.settingDescription}>Reach out to our support team</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#ccc" />
            </TouchableOpacity>
            
            <View style={styles.settingDivider} />
            
            <TouchableOpacity style={styles.settingItem}>
              <View style={styles.settingIcon}>
                <Ionicons name="information-circle-outline" size={20} color="#4CAF50" />
              </View>
              <View style={styles.settingContent}>
                <Text style={styles.settingTitle}>About</Text>
                <Text style={styles.settingDescription}>App version and information</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#ccc" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Logout Section */}
        <View style={styles.logoutSection}>
          <TouchableOpacity style={styles.logoutButton} onPress={handleSignOut}>
            <Ionicons name="log-out-outline" size={20} color="#FF4747" />
            <Text style={styles.logoutButtonText}>Logout</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
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
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Profile Header
  profileHeader: {
    marginBottom: 20,
    marginHorizontal: 20,
    borderRadius: 15,
    overflow: 'hidden',
  },
  profileHeaderGradient: {
    padding: 30,
    alignItems: 'center',
  },
  profileAvatarContainer: {
    position: 'relative',
    marginBottom: 15,
  },
  profileAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  profileAvatarText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 24,
  },
  profileBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#1a8e2d',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  profileName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 4,
  },
  profileRole: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  // Profile Information
  profileInfo: {
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  infoCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  infoContent: {
    flex: 1,
    marginLeft: 15,
  },
  infoLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },

  // Settings Section
  settingsSection: {
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  settingsCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f9ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingContent: {
    flex: 1,
    marginLeft: 15,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 12,
    color: '#666',
  },
  settingDivider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginLeft: 71,
  },

  // Support Section
  supportSection: {
    marginBottom: 20,
    paddingHorizontal: 20,
  },

  // Logout Section
  logoutSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FF4747',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  logoutButtonText: {
    color: '#FF4747',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },

  // Edit Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  editModal: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    paddingBottom: 20,
  },
  editModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  editModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  editModalContent: {
    maxHeight: 400,
    paddingHorizontal: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  inputDisabled: {
    backgroundColor: '#f0f0f0',
    color: '#999',
  },
  inputHint: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  editModalActions: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '500',
  },
  saveButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#4CAF50',
    alignItems: 'center',
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});