// app/doctor/patients/index.jsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import PageHeader from '../../../components/PageHeader';
import { DatabaseService, Query } from '../../../configs/AppwriteConfig';
import { getLocalStorage } from '../../../service/Storage';
import { COLLECTIONS } from '../../../constants';

export default function PatientsManagement() {
  const [patients, setPatients] = useState([]);
  const [filteredPatients, setFilteredPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLetter, setSelectedLetter] = useState('');
  const [patientAppointments, setPatientAppointments] = useState({});

  useEffect(() => {
    loadPatients();
  }, []);

  useEffect(() => {
    filterPatients();
  }, [searchQuery, selectedLetter, patients]);

  const loadPatients = async () => {
    try {
      setLoading(true);
      
      const userData = await getLocalStorage('userDetail');
      if (!userData?.uid) {
        Alert.alert('Error', 'User data not found');
        return;
      }

      // Load all users (patients) - using COLLECTIONS constant
      const usersResponse = await DatabaseService.listDocuments(
        COLLECTIONS.PATIENT_PROFILES,
        []
      );
      
      let allPatients = usersResponse.documents || [];
      
      // Filter out doctors if there's a role field
      allPatients = allPatients.filter(user => 
        !user.role || user.role !== 'doctor'
      );
      
      // Sort patients alphabetically by name
      allPatients.sort((a, b) => {
        const nameA = getPatientDisplayName(a).toLowerCase();
        const nameB = getPatientDisplayName(b).toLowerCase();
        return nameA.localeCompare(nameB);
      });
      
      setPatients(allPatients);
      
      // Load appointment counts for each patient
      await loadPatientAppointmentCounts(allPatients);
      
    } catch (error) {
      console.error('Error loading patients:', error);
      Alert.alert('Error', 'Failed to load patients');
    } finally {
      setLoading(false);
    }
  };

  const loadPatientAppointmentCounts = async (patientList) => {
    try {
      // Load all appointments - using COLLECTIONS constant
      const appointmentsResponse = await DatabaseService.listDocuments(
        COLLECTIONS.APPOINTMENTS,
        []
      );
      
      const appointments = appointmentsResponse.documents || [];
      const appointmentCounts = {};
      const familyMembers = {}; // Track family members
      
      // First, identify family members from appointments
      appointments.forEach(apt => {
        if (apt.is_family_booking && apt.patient_name && apt.patient_id && apt.user_id) {
          const familyKey = `${apt.user_id}-${apt.patient_name}`;
          if (!familyMembers[familyKey]) {
            familyMembers[familyKey] = {
              patientId: apt.patient_id,
              patientName: apt.patient_name,
              accountHolderUserId: apt.user_id,
              appointments: []
            };
          }
          familyMembers[familyKey].appointments.push(apt);
        }
      });
      
      // Add family members to patient list
      const familyMemberProfiles = Object.values(familyMembers).map(fm => ({
        $id: fm.patientId,
        userId: fm.patientId, // Use patient_id as userId for family members
        fullName: fm.patientName,
        name: fm.patientName,
        displayName: fm.patientName,
        isFamilyMember: true,
        accountHolderUserId: fm.accountHolderUserId
      }));
      
      // Add family members to the patients list
      patientList.push(...familyMemberProfiles);
      
      // Count appointments for each patient (including family members)
      [...patientList, ...familyMemberProfiles].forEach(patient => {
        const patientId = patient.userId || patient.$id;
        const patientDocId = patient.$id; // Document ID from patient profiles
        
        // Enhanced: Filter appointments using multiple criteria
        const patientAppointments = appointments.filter(apt => {
          // For family members, match by patient_name and patient_id
          if (patient.isFamilyMember) {
            return apt.is_family_booking && 
                   apt.patient_name === patient.fullName && 
                   apt.patient_id === patient.$id;
          }
          
          // For regular patients
          // Method 1: Check if appointment patient_id matches this patient's document ID
          if (apt.patient_id === patientDocId) {
            return true;
          }
          
          // Method 2: Check if appointment user_id matches this patient's userId (non-family bookings)
          if (apt.user_id === patientId && !apt.is_family_booking) {
            return true;
          }
          
          return false;
        });
        
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        
        appointmentCounts[patientId] = {
          total: patientAppointments.length,
          upcoming: patientAppointments.filter(apt => {
            const aptDate = parseAppointmentDate(apt.date);
            return aptDate >= now && apt.status !== 'Cancelled' && apt.status !== 'Completed';
          }).length,
          lastVisit: patientAppointments.length > 0 ? 
            patientAppointments
              .sort((a, b) => parseAppointmentDate(b.date) - parseAppointmentDate(a.date))[0].date 
            : null
        };
      });
      
      // Update the main patients state to include family members
      setPatients(prevPatients => {
        const combined = [...prevPatients, ...familyMemberProfiles];
        // Remove duplicates and sort
        const unique = combined.filter((patient, index, self) => 
          index === self.findIndex(p => (p.userId || p.$id) === (patient.userId || patient.$id))
        );
        return unique.sort((a, b) => {
          const nameA = getPatientDisplayName(a).toLowerCase();
          const nameB = getPatientDisplayName(b).toLowerCase();
          return nameA.localeCompare(nameB);
        });
      });
      
      setPatientAppointments(appointmentCounts);
      
    } catch (error) {
      console.error('Error loading appointment counts:', error);
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

  const getPatientDisplayName = (patient) => {
    return patient.fullName || patient.name || patient.displayName || 
           (patient.userId && patient.userId.includes('@') ? 
            patient.userId.split('@')[0].replace(/[._-]/g, ' ') : 
            `Patient ${(patient.userId || patient.$id).substring(0, 8)}`);
  };

  const filterPatients = () => {
    let filtered = [...patients];
    
    // Filter by search query
    if (searchQuery.trim()) {
      filtered = filtered.filter(patient => {
        const name = getPatientDisplayName(patient).toLowerCase();
        const userId = (patient.userId || patient.$id).toLowerCase();
        const query = searchQuery.toLowerCase();
        
        return name.includes(query) || userId.includes(query);
      });
    }
    
    // Filter by selected letter
    if (selectedLetter) {
      filtered = filtered.filter(patient => {
        const name = getPatientDisplayName(patient);
        return name.charAt(0).toUpperCase() === selectedLetter;
      });
    }
    
    setFilteredPatients(filtered);
  };

  const getAvailableLetters = () => {
    const letters = new Set();
    patients.forEach(patient => {
      const name = getPatientDisplayName(patient);
      letters.add(name.charAt(0).toUpperCase());
    });
    return Array.from(letters).sort();
  };

  const groupPatientsByLetter = () => {
    const grouped = {};
    filteredPatients.forEach(patient => {
      const name = getPatientDisplayName(patient);
      const letter = name.charAt(0).toUpperCase();
      if (!grouped[letter]) {
        grouped[letter] = [];
      }
      grouped[letter].push(patient);
    });
    return grouped;
  };

  const scrollToLetter = (letter) => {
    setSelectedLetter(selectedLetter === letter ? '' : letter);
  };

  const navigateToPatientDetail = (patient) => {
    // For family members, use the patient_id and patient name
    const patientId = patient.isFamilyMember ? patient.$id : (patient.userId || patient.$id);
    const patientName = getPatientDisplayName(patient);
    
    console.log('Navigating to patient detail:', {
      patientId,
      patientName,
      isFamilyMember: patient.isFamilyMember,
      originalPatient: patient
    });
    
    router.push({
      pathname: '/doctor/patients/detail',
      params: { 
        patientId: patientId,
        patientName: patientName
      }
    });
  };

  const getPatientInitials = (patient) => {
    const name = getPatientDisplayName(patient);
    const words = name.split(' ');
    if (words.length >= 2) {
      return (words[0].charAt(0) + words[1].charAt(0)).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const renderAlphabetNavigation = () => {
    const availableLetters = getAvailableLetters();
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

    return (
      <View style={styles.alphabetNav}>
        {alphabet.map(letter => (
          <TouchableOpacity
            key={letter}
            style={[
              styles.alphabetLetter,
              availableLetters.includes(letter) && styles.alphabetLetterActive,
              selectedLetter === letter && styles.alphabetLetterSelected
            ]}
            onPress={() => scrollToLetter(letter)}
            disabled={!availableLetters.includes(letter)}
          >
            <Text style={[
              styles.alphabetLetterText,
              availableLetters.includes(letter) && styles.alphabetLetterTextActive,
              selectedLetter === letter && styles.alphabetLetterTextSelected
            ]}>
              {letter}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderPatientCard = (patient, index) => {
    const patientId = patient.userId || patient.$id;
    const appointmentData = patientAppointments[patientId] || { total: 0, upcoming: 0, lastVisit: null };

    return (
        <TouchableOpacity
        key={`patient-card-${patientId}-${index}`} // Unique key with index
        style={styles.patientCard}
        onPress={() => navigateToPatientDetail(patient)}
        >
        <View style={styles.patientInfo}>
            <View style={styles.patientAvatar}>
            <Text style={styles.patientAvatarText}>
                {getPatientInitials(patient)}
            </Text>
            </View>
            <View style={styles.patientDetails}>
            <Text style={styles.patientName}>
                {getPatientDisplayName(patient)}
                {patient.isFamilyMember && <Text style={styles.familyMemberBadge}> (Family)</Text>}
            </Text>
            <Text style={styles.patientMeta}>
                ID: {patientId.substring(0, 12)}
                {appointmentData.lastVisit && ` • Last visit: ${appointmentData.lastVisit}`}
            </Text>
            <View style={styles.appointmentStats}>
                <View style={styles.statItem}>
                <Text style={styles.statNumber}>{appointmentData.total}</Text>
                <Text style={styles.statLabel}>Total Visits</Text>
                </View>
                <View style={styles.statItem}>
                <Text style={styles.statNumber}>{appointmentData.upcoming}</Text>
                <Text style={styles.statLabel}>Upcoming</Text>
                </View>
            </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
        </View>
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
        <Text style={styles.headerTitle}>Patients</Text>
      </View>

      <View style={styles.content}>
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search patients by name or ID..."
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color="#666" />
            </TouchableOpacity>
          )}
        </View>

        {/* Alphabet Navigation */}
        {renderAlphabetNavigation()}

        {/* Patient Count */}
        <View style={styles.statsContainer}>
          <Text style={styles.patientCount}>
            {filteredPatients.length} of {patients.length} patients
            {selectedLetter && ` starting with "${selectedLetter}"`}
            {searchQuery && ` matching "${searchQuery}"`}
          </Text>
        </View>

        {/* Patients List */}
       <ScrollView style={styles.patientsList} showsVerticalScrollIndicator={false}>
        {loading ? (
            <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#1a8e2d" />
            <Text style={styles.loadingText}>Loading patients...</Text>
            </View>
        ) : filteredPatients.length === 0 ? (
            <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={50} color="#ccc" />
            <Text style={styles.emptyStateText}>
                {searchQuery || selectedLetter ? 'No patients found' : 'No patients registered'}
            </Text>
            {(searchQuery || selectedLetter) && (
                <TouchableOpacity 
                style={styles.clearFiltersButton}
                onPress={() => {
                    setSearchQuery('');
                    setSelectedLetter('');
                }}
                >
                <Text style={styles.clearFiltersText}>Clear filters</Text>
                </TouchableOpacity>
            )}
            </View>
        ) : (
            Object.entries(groupPatientsByLetter()).map(([letter, letterPatients]) => (
            <View key={`section-${letter}`} style={styles.patientSection}>
                <Text style={styles.sectionLetter}>{letter}</Text>
                {letterPatients.map((patient, index) => renderPatientCard(patient, index))}
            </View>
            ))
        )}
        </ScrollView>
      </View>
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
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  alphabetNav: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: 16,
    justifyContent: 'center',
  },
  alphabetLetter: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 14,
  },
  alphabetLetterActive: {
    backgroundColor: '#e8f5e8',
  },
  alphabetLetterSelected: {
    backgroundColor: '#4CAF50',
  },
  alphabetLetterText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ccc',
  },
  alphabetLetterTextActive: {
    color: '#4CAF50',
  },
  alphabetLetterTextSelected: {
    color: 'white',
  },
  statsContainer: {
    paddingVertical: 8,
    marginBottom: 12,
  },
  patientCount: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  patientsList: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
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
    textAlign: 'center',
  },
  clearFiltersButton: {
    marginTop: 16,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#4CAF50',
    borderRadius: 8,
  },
  clearFiltersText: {
    color: 'white',
    fontWeight: '600',
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
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#4CAF50',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
  },
  patientAvatarText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  patientDetails: {
    flex: 1,
  },
  patientName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  familyMemberBadge: {
    fontSize: 12,
    fontWeight: '500',
    color: '#4CAF50',
    fontStyle: 'italic',
  },
  patientMeta: {
    color: '#666',
    fontSize: 12,
    marginBottom: 8,
  },
  appointmentStats: {
    flexDirection: 'row',
    gap: 20,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  statLabel: {
    fontSize: 10,
    color: '#666',
    marginTop: 2,
  },
});