// app/profile/family-members.jsx
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  ActivityIndicator,
  RefreshControl,
  Alert
} from 'react-native';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { DatabaseService, account, Query } from '@/configs/AppwriteConfig';
import { COLLECTIONS, PROFILE_TYPES } from '@/constants';

// Family Member Card Component
const FamilyMemberCard = ({ member, onEdit, onDelete }) => {
  const formatDate = (dateString) => {
    if (!dateString) return 'Not specified';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getGenderIcon = (gender) => {
    switch(gender?.toLowerCase()) {
      case 'male': return 'man';
      case 'female': return 'woman';
      default: return 'person';
    }
  };

  const capitalizeFirst = (str) => {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  };

  return (
    <View style={styles.memberCard}>
      <View style={styles.memberHeader}>
        <View style={styles.memberInfo}>
          <View style={styles.nameRow}>
            <Ionicons 
              name={getGenderIcon(member.gender)} 
              size={20} 
              color="#0AD476" 
              style={styles.genderIcon}
            />
            <Text style={styles.memberName}>{member.fullName}</Text>
          </View>
          <Text style={styles.memberDetail}>
            <Ionicons name="mail-outline" size={14} color="#666" /> {member.email}
          </Text>
          <Text style={styles.memberDetail}>
            <Ionicons name="call-outline" size={14} color="#666" /> {member.phoneNumber}
          </Text>
          {member.age && (
            <Text style={styles.memberDetail}>
              <Ionicons name="calendar-outline" size={14} color="#666" /> Age: {member.age}
            </Text>
          )}
          {member.gender && (
            <Text style={styles.memberDetail}>
              <Ionicons name="person-outline" size={14} color="#666" /> {capitalizeFirst(member.gender)}
            </Text>
          )}
        </View>
        
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => onEdit(member.$id)}
          >
            <Ionicons name="pencil" size={18} color="#0AD476" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.actionButton, styles.deleteButton]}
            onPress={() => onDelete(member.$id, member.fullName)}
          >
            <Ionicons name="trash-outline" size={18} color="#FF6B6B" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Additional Info Section */}
      <View style={styles.additionalInfo}>
        {member.birthDate && (
          <Text style={styles.infoText}>
            <Text style={styles.infoLabel}>Birth Date: </Text>
            {formatDate(member.birthDate)}
          </Text>
        )}
        {member.bloodType && member.bloodType.length > 0 && (
          <Text style={styles.infoText}>
            <Text style={styles.infoLabel}>Blood Type: </Text>
            {Array.isArray(member.bloodType) ? member.bloodType[0] : member.bloodType}
          </Text>
        )}
        {member.emergencyContactName && (
          <Text style={styles.infoText}>
            <Text style={styles.infoLabel}>Emergency Contact: </Text>
            {member.emergencyContactName}
            {member.emergencyContactNumber && ` (${member.emergencyContactNumber})`}
          </Text>
        )}
      </View>
    </View>
  );
};

export default function FamilyMembers() {
  const router = useRouter();
  const [familyMembers, setFamilyMembers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    initializeData();
  }, []);

  const initializeData = async () => {
    try {
      const user = await account.get();
      setCurrentUser(user);
      await loadFamilyMembers(user.$id);
    } catch (error) {
      console.error('Error initializing data:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to load user data.',
      });
    }
  };

  // Backward compatible version that handles both old and new data
const loadFamilyMembers = async (userId = null) => {
  try {
    setIsLoading(true);
    
    const userIdToUse = userId || currentUser?.$id;
    if (!userIdToUse) {
      console.error('No user ID available');
      return;
    }

    // Get current user's account info for fallback filtering
    const currentUserAccount = await account.get();
    
    // First try to get profiles with profileType (new data)
    let queries = [
      DatabaseService.createQuery('equal', 'userId', userIdToUse),
      DatabaseService.createQuery('equal', 'profileType', PROFILE_TYPES.FAMILY_MEMBER)
    ];

    let response = await DatabaseService.listDocuments(
      COLLECTIONS.PATIENT_PROFILES,
      queries,
      100
    );

    let familyMembers = response.documents || [];

    // If no results with profileType, fall back to old method (legacy data)
    if (familyMembers.length === 0) {
      console.log('No profiles found with profileType, checking legacy data...');
      
      // Get all profiles for this user (legacy method)
      const legacyQueries = [
        DatabaseService.createQuery('equal', 'userId', userIdToUse)
      ];

      const legacyResponse = await DatabaseService.listDocuments(
        COLLECTIONS.PATIENT_PROFILES,
        legacyQueries,
        100
      );

      // Filter out user's own profile by email (legacy method)
      familyMembers = (legacyResponse.documents || []).filter(profile => {
        return profile.email !== currentUserAccount.email;
      });

      // Auto-migrate found profiles
      console.log('Auto-migrating legacy profiles...');
      for (const profile of legacyResponse.documents || []) {
        try {
          const profileType = profile.email === currentUserAccount.email 
            ? PROFILE_TYPES.OWNER 
            : PROFILE_TYPES.FAMILY_MEMBER;

          await DatabaseService.updateDocument(
            COLLECTIONS.PATIENT_PROFILES,
            profile.$id,
            { profileType }
          );
          
          console.log(`Auto-migrated profile ${profile.$id} as ${profileType}`);
        } catch (migrationError) {
          console.error('Auto-migration error:', migrationError);
        }
      }
    }
    
    console.log('Loaded family members:', familyMembers);
    setFamilyMembers(familyMembers);
  } catch (error) {
    console.error('Error loading family members:', error);
    Toast.show({
      type: 'error',
      text1: 'Error',
      text2: 'Failed to load family members.',
    });
  } finally {
    setIsLoading(false);
    setRefreshing(false);
  }
};

  const handleRefresh = () => {
    setRefreshing(true);
    loadFamilyMembers();
  };

  const handleAddMember = () => {
    router.push('/profile/add-family-member');
  };

  const handleEditMember = (memberId) => {
    router.push(`/profile/add-family-member?editMemberId=${memberId}`);
  };

  const handleDeleteMember = (memberId, memberName) => {
    Alert.alert(
      'Delete Family Member',
      `Are you sure you want to delete ${memberName}? This action cannot be undone.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => confirmDeleteMember(memberId),
        },
      ]
    );
  };

  const confirmDeleteMember = async (memberId) => {
    try {
      setIsLoading(true);
      await DatabaseService.deleteDocument(COLLECTIONS.PATIENT_PROFILES, memberId);
      
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Family member deleted successfully.',
      });

      // Reload the list
      await loadFamilyMembers();
    } catch (error) {
      console.error('Error deleting family member:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to delete family member.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="people-outline" size={80} color="#DDD" />
      <Text style={styles.emptyTitle}>No Family Members Yet</Text>
      <Text style={styles.emptySubtitle}>
        Add your first family member to get started
      </Text>
      <TouchableOpacity style={styles.addFirstButton} onPress={handleAddMember}>
        <Text style={styles.addFirstButtonText}>Add Family Member</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Family Members</Text>
        <TouchableOpacity onPress={handleAddMember} style={styles.addButton}>
          <Ionicons name="add" size={24} color="#0AD476" />
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#0AD476" />
            <Text style={styles.loadingText}>Loading family members...</Text>
          </View>
        ) : familyMembers.length === 0 ? (
          renderEmptyState()
        ) : (
          <View style={styles.membersList}>
            <Text style={styles.membersCount}>
              {familyMembers.length} Family Member{familyMembers.length !== 1 ? 's' : ''}
            </Text>
            {familyMembers.map((member) => (
              <FamilyMemberCard
                key={member.$id}
                member={member}
                onEdit={handleEditMember}
                onDelete={handleDeleteMember}
              />
            ))}
          </View>
        )}
      </ScrollView>

      {/* Floating Add Button */}
      {familyMembers.length > 0 && (
        <TouchableOpacity style={styles.fab} onPress={handleAddMember}>
          <Ionicons name="add" size={24} color="#FFF" />
        </TouchableOpacity>
      )}

      <Toast />
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
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
    flex: 1,
    textAlign: 'center',
  },
  addButton: {
    padding: 8,
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingTop: 100,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#333',
    marginTop: 20,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
  },
  addFirstButton: {
    backgroundColor: '#0AD476',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  addFirstButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  membersList: {
    padding: 20,
  },
  membersCount: {
    fontSize: 16,
    fontWeight: '500',
    color: '#666',
    marginBottom: 16,
  },
  memberCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  memberHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  memberInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  genderIcon: {
    marginRight: 8,
  },
  memberName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  memberDetail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButton: {
    backgroundColor: '#FFE5E5',
  },
  additionalInfo: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  infoLabel: {
    fontWeight: '500',
    color: '#333',
  },
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 30,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#0AD476',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});