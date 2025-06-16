// app/doctor/patients/detail.jsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import PageHeader from '../../../components/PageHeader';
import { DatabaseService, Query } from '../../../configs/AppwriteConfig';
import { COLLECTIONS } from '../../../constants';

export default function PatientDetail() {
  const params = useLocalSearchParams();
  const { patientId, patientName } = params;
  
  const [patient, setPatient] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'appointments', 'prescriptions'

  useEffect(() => {
    if (patientId) {
      console.log('=== PATIENT DETAIL DEBUG ===');
      console.log('Patient ID from params:', patientId);
      console.log('Patient Name from params:', patientName);
      console.log('============================');
      
      loadPatientData();
      loadPatientAppointments();
    }
  }, [patientId]);

  const loadPatientData = async () => {
    try {
      console.log('Loading patient data for ID:', patientId, 'Name:', patientName);
      
      let foundPatient = null;
      
      // PRIORITY 1: If we have a patient name, check if this is a family member first
      if (patientName) {
        // First check if this is a family booking by looking at appointments
        const appointmentsResponse = await DatabaseService.listDocuments(
          COLLECTIONS.APPOINTMENTS,
          []
        );
        
        const familyAppointment = appointmentsResponse.documents.find(apt => 
          apt.is_family_booking && 
          apt.patient_name && 
          apt.patient_name.toLowerCase().trim() === patientName.toLowerCase().trim()
        );
        
        if (familyAppointment && familyAppointment.patient_id) {
          console.log('Found family booking, trying patient_id:', familyAppointment.patient_id);
          
          // Try to get the family member's patient profile
          try {
            foundPatient = await DatabaseService.getDocument(COLLECTIONS.PATIENT_PROFILES, familyAppointment.patient_id);
            console.log('Found family member by patient_id:', foundPatient);
          } catch (e) {
            console.log('Family member patient profile not found, creating virtual profile');
            // Create virtual patient profile for family member
            foundPatient = {
              $id: familyAppointment.patient_id,
              fullName: patientName,
              name: patientName,
              displayName: patientName,
              userId: familyAppointment.patient_id,
              email: 'Family Member',
              isVirtualProfile: true // Flag to indicate this is a virtual profile
            };
          }
        }
      }
      
      // PRIORITY 2: If not found as family member, try to find by userId
      if (!foundPatient) {
        const usersResponse = await DatabaseService.listDocuments(
          COLLECTIONS.PATIENT_PROFILES,
          [Query.equal('userId', patientId)]
        );
        
        if (usersResponse.documents && usersResponse.documents.length > 0) {
          foundPatient = usersResponse.documents[0];
          console.log('Found patient by userId:', foundPatient);
        }
      }
      
      // PRIORITY 3: Try to get by document ID
      if (!foundPatient) {
        try {
          foundPatient = await DatabaseService.getDocument(COLLECTIONS.PATIENT_PROFILES, patientId);
          console.log('Found patient by document ID:', foundPatient);
        } catch (e) {
          console.log('Patient not found by ID either');
        }
      }
      
      // PRIORITY 4: Last resort - search by name in all profiles
      if (!foundPatient && patientName) {
        const nameSearchResponse = await DatabaseService.listDocuments(
          COLLECTIONS.PATIENT_PROFILES,
          []
        );
        
        const matchingPatients = nameSearchResponse.documents.filter(patient => {
          const patientDisplayName = patient.fullName || patient.name || patient.displayName || '';
          return patientDisplayName.toLowerCase().includes(patientName.toLowerCase()) ||
                 patientName.toLowerCase().includes(patientDisplayName.toLowerCase());
        });
        
        if (matchingPatients.length > 0) {
          foundPatient = matchingPatients[0];
          console.log('Found patient by name search:', foundPatient);
        }
      }
      
      if (!foundPatient) {
        console.log('Patient not found anywhere');
        Alert.alert('Error', 'Patient not found');
      }
      
      setPatient(foundPatient);
      console.log('Final patient set:', foundPatient);
      
    } catch (error) {
      console.error('Error loading patient data:', error);
      Alert.alert('Error', 'Failed to load patient information');
    }
  };

  const loadPatientAppointments = async () => {
    try {
      const appointmentsResponse = await DatabaseService.listDocuments(
        COLLECTIONS.APPOINTMENTS,
        []
      );
      
      // ENHANCED: Use the same comprehensive logic as appointment details for consistency
      const allAppointments = appointmentsResponse.documents || [];
      console.log('Loading appointments for patient:', patientId, 'with name:', patientName);
      console.log('Total appointments to filter:', allAppointments.length);
      
      const patientAppointments = allAppointments.filter(apt => {
        console.log('Checking appointment:', apt.$id, {
          is_family_booking: apt.is_family_booking,
          patient_name: apt.patient_name,
          patient_id: apt.patient_id,
          user_id: apt.user_id
        });
        
        // PRIORITY 1: For family members, match by patient_name exactly
        if (patientName && apt.is_family_booking && apt.patient_name) {
          const aptPatientName = apt.patient_name.toLowerCase().trim();
          const currentPatientName = patientName.toLowerCase().trim();
          
          console.log('Comparing family names:', aptPatientName, 'vs', currentPatientName);
          
          if (aptPatientName === currentPatientName) {
            console.log('✅ Matched by family booking patient name (exact)');
            return true;
          }
        }
        
        // PRIORITY 2: Check if appointment patient_id matches this patient's ID
        if (patient && apt.patient_id === patient.$id) {
          console.log('✅ Matched by patient document ID');
          return true;
        }
        
        // PRIORITY 3: For account holders (non-family bookings), check user_id
        if (apt.user_id === patientId && !apt.is_family_booking) {
          console.log('✅ Matched by user_id (account holder booking)');
          return true;
        }
        
        // PRIORITY 4: If patient name matches the current patient name and user_id matches
        if (patientName && patient && !patient.isVirtualProfile && apt.user_id === patientId) {
          const patientDisplayName = getPatientDisplayName().toLowerCase().trim();
          if (patientDisplayName === patientName.toLowerCase().trim()) {
            console.log('✅ Matched by user_id (name verification)');
            return true;
          }
        }
        
        console.log('❌ No match found');
        return false;
      });
      
      console.log('Filtered appointments found:', patientAppointments.length);
      patientAppointments.forEach(apt => {
        console.log('- Appointment:', apt.date, apt.time_slot, 'Patient:', apt.patient_name || 'N/A');
      });
      
      // Sort appointments by date (newest first)
      patientAppointments.sort((a, b) => {
        const dateA = parseAppointmentDate(a.date);
        const dateB = parseAppointmentDate(b.date);
        return dateB - dateA;
      });
      
      setAppointments(patientAppointments);
    } catch (error) {
      console.error('Error loading patient appointments:', error);
    } finally {
      setLoading(false);
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

  const getPatientDisplayName = () => {
    // For virtual/family member profiles, use the name passed in params
    if (patient?.isVirtualProfile && patientName) {
      return patientName;
    }
    
    if (!patient) return patientName || 'Unknown Patient';
    return patient.fullName || patient.name || patient.displayName || patientName || 'Unknown Patient';
  };

  const getPatientInitials = () => {
    const name = getPatientDisplayName();
    const words = name.split(' ');
    if (words.length >= 2) {
      return (words[0].charAt(0) + words[1].charAt(0)).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  // UPDATED: Enhanced appointment stats calculation
  const getAppointmentStats = () => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    
    const upcoming = appointments.filter(apt => {
      const aptDate = parseAppointmentDate(apt.date);
      const status = apt.status?.toLowerCase();
      return aptDate >= now && status !== 'cancelled' && status !== 'completed';
    }).length;
    
    const past = appointments.filter(apt => {
      const aptDate = parseAppointmentDate(apt.date);
      return aptDate < now;
    }).length;
    
    const withPrescriptions = appointments.filter(apt => apt.has_prescription).length;
    
    // Additional stats
    const completed = appointments.filter(apt => apt.status?.toLowerCase() === 'completed').length;
    const cancelled = appointments.filter(apt => apt.status?.toLowerCase() === 'cancelled').length;
    
    return { 
      total: appointments.length, 
      upcoming, 
      past, 
      withPrescriptions, 
      completed, 
      cancelled 
    };
  };

  // Helper function to get status color (same as Doctor Dashboard)
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

  const renderOverviewTab = () => {
    const stats = getAppointmentStats();
    
    return (
      <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
        {/* Patient Info Card */}
        <View style={styles.infoCard}>
          <View style={styles.patientHeader}>
            <View style={styles.patientAvatar}>
              <Text style={styles.patientAvatarText}>{getPatientInitials()}</Text>
            </View>
            <View style={styles.patientHeaderInfo}>
              <Text style={styles.patientHeaderName}>{getPatientDisplayName()}</Text>
              <Text style={styles.patientHeaderId}>
                ID: {patientId}
                {patient?.isVirtualProfile && <Text style={styles.familyMemberNote}> (Family Member)</Text>}
              </Text>
              {patient?.email && patient.email !== 'Family Member' && (
                <Text style={styles.patientHeaderEmail}>{patient.email}</Text>
              )}
              {patient?.isVirtualProfile && (
                <Text style={styles.familyMemberInfo}>Limited profile information available</Text>
              )}
            </View>
          </View>
        </View>

        {/* Enhanced Stats Grid - More compact */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <View style={styles.statIconContainer}>
              <Ionicons name="calendar-outline" size={20} color="#4CAF50" />
            </View>
            <Text style={styles.statNumber}>{stats.total}</Text>
            <Text style={styles.statLabel}>Total Visits</Text>
          </View>
          <View style={styles.statCard}>
            <View style={styles.statIconContainer}>
              <Ionicons name="time-outline" size={20} color="#FF9800" />
            </View>
            <Text style={styles.statNumber}>{stats.upcoming}</Text>
            <Text style={styles.statLabel}>Upcoming</Text>
          </View>
          <View style={styles.statCard}>
            <View style={styles.statIconContainer}>
              <Ionicons name="checkmark-circle-outline" size={20} color="#2196F3" />
            </View>
            <Text style={styles.statNumber}>{stats.completed}</Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>
          <View style={styles.statCard}>
            <View style={styles.statIconContainer}>
              <Ionicons name="medical-outline" size={20} color="#9C27B0" />
            </View>
            <Text style={styles.statNumber}>{stats.withPrescriptions}</Text>
            <Text style={styles.statLabel}>Prescriptions</Text>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActionsGrid}>
            <TouchableOpacity 
              style={styles.quickActionCard}
              onPress={() => setActiveTab('appointments')}
            >
              <View style={styles.quickActionIcon}>
                <Ionicons name="calendar" size={24} color="#4CAF50" />
              </View>
              <Text style={styles.quickActionText}>View All Appointments</Text>
              <Text style={styles.quickActionSubtext}>({stats.total} total)</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.quickActionCard}
              onPress={() => setActiveTab('prescriptions')}
            >
              <View style={styles.quickActionIcon}>
                <Ionicons name="medical" size={24} color="#9C27B0" />
              </View>
              <Text style={styles.quickActionText}>View Prescriptions</Text>
              <Text style={styles.quickActionSubtext}>({stats.withPrescriptions} available)</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.quickActionCard}
              onPress={() => {
                if (patient?.isVirtualProfile) {
                  Alert.alert('Information', 'This is a family member. Full profile details are not available.');
                } else {
                  Alert.alert('Patient Information', `Full Name: ${getPatientDisplayName()}\nID: ${patientId}\nEmail: ${patient?.email || 'N/A'}\nPhone: ${patient?.phoneNumber || 'N/A'}`);
                }
              }}
            >
              <View style={styles.quickActionIcon}>
                <Ionicons name="person" size={24} color="#2196F3" />
              </View>
              <Text style={styles.quickActionText}>Patient Information</Text>
              <Text style={styles.quickActionSubtext}>View details</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Patient Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Summary</Text>
          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Patient Since:</Text>
              <Text style={styles.summaryValue}>
                {appointments.length > 0 ? 
                  parseAppointmentDate(appointments[appointments.length - 1].date).toLocaleDateString() : 
                  'N/A'
                }
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Last Visit:</Text>
              <Text style={styles.summaryValue}>
                {appointments.length > 0 ? appointments[0].date : 'No visits yet'}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Most Common Service:</Text>
              <Text style={styles.summaryValue}>
                {appointments.length > 0 ? 
                  appointments.reduce((acc, apt) => {
                    const service = apt.service_name || 'General Consultation';
                    acc[service] = (acc[service] || 0) + 1;
                    return acc;
                  }, {}) && Object.entries(appointments.reduce((acc, apt) => {
                    const service = apt.service_name || 'General Consultation';
                    acc[service] = (acc[service] || 0) + 1;
                    return acc;
                  }, {})).sort(([,a], [,b]) => b - a)[0]?.[0] || 'N/A' : 'N/A'
                }
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    );
  };

  const renderAppointmentsTab = () => (
    <ScrollView style={styles.tabContent}>
      <Text style={styles.sectionTitle}>All Appointments ({appointments.length})</Text>
      
      {appointments.map(appointment => (
        <View key={appointment.$id} style={styles.appointmentCard}>
          <View style={styles.appointmentHeader}>
            <View style={styles.appointmentDateContainer}>
              <Text style={styles.appointmentDate}>{appointment.date}</Text>
              <Text style={styles.appointmentTime}>🕘 {appointment.time_slot}</Text>
            </View>
            <View style={styles.statusContainer}>
              <View style={[
                styles.statusDot,
                { backgroundColor: getStatusColor(appointment.status) }
              ]} />
              <Text style={[
                styles.statusText,
                { color: getStatusColor(appointment.status) }
              ]}>
                {appointment.status || 'Booked'}
              </Text>
            </View>
          </View>
          
          <Text style={styles.appointmentService}>{appointment.service_name || 'General Consultation'}</Text>
          
          {appointment.branch_name && (
            <View style={styles.branchInfo}>
              <Ionicons name="location" size={12} color="#666" />
              <Text style={styles.branchText}>{appointment.branch_name}</Text>
            </View>
          )}
          
          <View style={styles.appointmentActions}>
            {!appointment.has_prescription && appointment.status?.toLowerCase() !== 'cancelled' && (
              <TouchableOpacity 
                style={styles.addPrescriptionBtn}
                onPress={() => router.push({
                  pathname: '/doctor/prescriptions/create',
                  params: { appointmentId: appointment.$id }
                })}
              >
                <Ionicons name="medical" size={14} color="white" />
                <Text style={styles.addPrescriptionText}>Add Prescription</Text>
              </TouchableOpacity>
            )}
            
            {appointment.has_prescription && (
              <TouchableOpacity 
                style={styles.viewPrescriptionBtn}
                onPress={() => router.push({
                  pathname: '/doctor/prescriptions/view',
                  params: { appointmentId: appointment.$id }
                })}
              >
                <Ionicons name="eye" size={14} color="#4CAF50" />
                <Text style={styles.viewPrescriptionText}>View Prescription</Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity 
              style={styles.viewDetailsBtn}
              onPress={() => router.push({
                pathname: '/doctor/appointments/detail',
                params: { appointmentId: appointment.$id }
              })}
            >
              <Ionicons name="information-circle" size={14} color="#2196F3" />
              <Text style={styles.viewDetailsText}>View Details</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}
      
      {appointments.length === 0 && (
        <View style={styles.emptyState}>
          <Ionicons name="calendar-outline" size={50} color="#ccc" />
          <Text style={styles.emptyStateText}>No appointments found for this patient</Text>
        </View>
      )}
    </ScrollView>
  );

  const renderPrescriptionsTab = () => {
    const appointmentsWithPrescriptions = appointments.filter(apt => apt.has_prescription);
    
    return (
      <ScrollView style={styles.tabContent}>
        <Text style={styles.sectionTitle}>Prescriptions ({appointmentsWithPrescriptions.length})</Text>
        
        {appointmentsWithPrescriptions.map(appointment => (
          <View key={appointment.$id} style={styles.prescriptionCard}>
            <View style={styles.prescriptionHeader}>
              <View style={styles.prescriptionInfo}>
                <Text style={styles.prescriptionDate}>📋 {appointment.date}</Text>
                <Text style={styles.prescriptionService}>{appointment.service_name || 'General Consultation'}</Text>
                <View style={styles.prescriptionStatus}>
                  <View style={[
                    styles.statusDot,
                    { backgroundColor: getStatusColor(appointment.status) }
                  ]} />
                  <Text style={styles.prescriptionStatusText}>{appointment.status || 'Booked'}</Text>
                </View>
              </View>
              <View style={styles.qrCodePlaceholder}>
                <Ionicons name="qr-code" size={24} color="#666" />
              </View>
            </View>
            
            <View style={styles.prescriptionActions}>
              <TouchableOpacity 
                style={styles.viewPrescriptionBtn}
                onPress={() => router.push({
                  pathname: '/doctor/prescriptions/view',
                  params: { appointmentId: appointment.$id }
                })}
              >
                <Ionicons name="eye" size={14} color="#4CAF50" />
                <Text style={styles.viewPrescriptionText}>View Details</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.shareBtn}>
                <Ionicons name="share" size={14} color="white" />
                <Text style={styles.shareBtnText}>Share QR</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
        
        {appointmentsWithPrescriptions.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="medical-outline" size={50} color="#ccc" />
            <Text style={styles.emptyStateText}>No prescriptions found for this patient</Text>
          </View>
        )}
      </ScrollView>
    );
  };

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
          <Text style={styles.headerTitle}>Patient Details</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1a8e2d" />
          <Text style={styles.loadingText}>Loading patient information...</Text>
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
        <Text style={styles.headerTitle}>{getPatientDisplayName()}</Text>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabNavigation}>
        <TouchableOpacity 
          style={[styles.tabButton, activeTab === 'overview' && styles.tabButtonActive]}
          onPress={() => setActiveTab('overview')}
        >
          <Text style={[styles.tabButtonText, activeTab === 'overview' && styles.tabButtonTextActive]}>
            Overview
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.tabButton, activeTab === 'appointments' && styles.tabButtonActive]}
          onPress={() => setActiveTab('appointments')}
        >
          <Text style={[styles.tabButtonText, activeTab === 'appointments' && styles.tabButtonTextActive]}>
            Appointments ({appointments.length})
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.tabButton, activeTab === 'prescriptions' && styles.tabButtonActive]}
          onPress={() => setActiveTab('prescriptions')}
        >
          <Text style={[styles.tabButtonText, activeTab === 'prescriptions' && styles.tabButtonTextActive]}>
            Prescriptions ({appointments.filter(apt => apt.has_prescription).length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
      <View style={styles.content}>
        {activeTab === 'overview' && renderOverviewTab()}
        {activeTab === 'appointments' && renderAppointmentsTab()}
        {activeTab === 'prescriptions' && renderPrescriptionsTab()}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
  },
  tabNavigation: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabButtonActive: {
    borderBottomColor: '#4CAF50',
  },
  tabButtonText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  tabButtonTextActive: {
    color: '#4CAF50',
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  tabContent: {
    flex: 1,
    padding: 16,
  },
  infoCard: {
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
  patientHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  patientAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#4CAF50',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  patientAvatarText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 20,
  },
  patientHeaderInfo: {
    flex: 1,
  },
  patientHeaderName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  patientHeaderId: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  patientHeaderEmail: {
    fontSize: 14,
    color: '#4CAF50',
  },
  familyMemberNote: {
    fontSize: 12,
    color: '#4CAF50',
    fontStyle: 'italic',
  },
  familyMemberInfo: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 2,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    minWidth: '22%',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f8f9fa',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 10,
    color: '#666',
    textAlign: 'center',
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  appointmentCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  appointmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  appointmentDateContainer: {
    flex: 1,
  },
  appointmentDate: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  appointmentTime: {
    fontSize: 11,
    color: '#666',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  appointmentService: {
    fontSize: 13,
    color: '#4CAF50',
    marginBottom: 6,
    fontWeight: '500',
  },
  branchInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 4,
  },
  branchText: {
    fontSize: 11,
    color: '#666',
  },
  appointmentActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 6,
    marginTop: 6,
  },
  addPrescriptionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  addPrescriptionText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 4,
  },
  viewPrescriptionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#4CAF50',
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  viewPrescriptionText: {
    color: '#4CAF50',
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 4,
  },
  viewDetailsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2196F3',
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  viewDetailsText: {
    color: '#2196F3',
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 4,
  },
  prescriptionCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  prescriptionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  prescriptionInfo: {
    flex: 1,
  },
  prescriptionDate: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  prescriptionService: {
    fontSize: 14,
    color: '#4CAF50',
    marginBottom: 4,
  },
  prescriptionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  prescriptionStatusText: {
    fontSize: 10,
    color: '#666',
    fontWeight: '500',
  },
  qrCodePlaceholder: {
    width: 40,
    height: 40,
    backgroundColor: '#e0e0e0',
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  prescriptionActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  shareBtnText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 8,
  },
  quickActionCard: {
    flex: 1,
    minWidth: '30%',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  quickActionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginBottom: 2,
  },
  quickActionSubtext: {
    fontSize: 11,
    color: '#666',
    textAlign: 'center',
  },
  summaryCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
    maxWidth: '60%',
    textAlign: 'right',
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
});