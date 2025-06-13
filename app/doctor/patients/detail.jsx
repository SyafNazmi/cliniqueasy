// app/doctor/patients/detail.jsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import PageHeader from '../../../components/PageHeader';
import { DatabaseService, Query } from '../../../configs/AppwriteConfig';

const USERS_COLLECTION_ID = '67e032ec0025cf1956ff';
const APPOINTMENTS_COLLECTION_ID = '67e0332c0001131d71ec';

export default function PatientDetail() {
  const params = useLocalSearchParams();
  const { patientId, patientName } = params;
  
  const [patient, setPatient] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'appointments', 'prescriptions'

  useEffect(() => {
    if (patientId) {
      loadPatientData();
      loadPatientAppointments();
    }
  }, [patientId]);

  const loadPatientData = async () => {
    try {
      // Try to find patient by userId first
      const usersResponse = await DatabaseService.listDocuments(
        USERS_COLLECTION_ID,
        [Query.equal('userId', patientId)]
      );
      
      if (usersResponse.documents && usersResponse.documents.length > 0) {
        setPatient(usersResponse.documents[0]);
      } else {
        // Try to get by document ID
        try {
          const patientDoc = await DatabaseService.getDocument(USERS_COLLECTION_ID, patientId);
          setPatient(patientDoc);
        } catch (e) {
          console.log('Patient not found by ID either');
          Alert.alert('Error', 'Patient not found');
        }
      }
    } catch (error) {
      console.error('Error loading patient data:', error);
      Alert.alert('Error', 'Failed to load patient information');
    }
  };

  const loadPatientAppointments = async () => {
    try {
      const appointmentsResponse = await DatabaseService.listDocuments(
        APPOINTMENTS_COLLECTION_ID,
        []
      );
      
      const patientAppointments = appointmentsResponse.documents.filter(apt => 
        apt.user_id === patientId
      );
      
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

  const getAppointmentStats = () => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    
    const upcoming = appointments.filter(apt => {
      const aptDate = parseAppointmentDate(apt.date);
      return aptDate >= now;
    }).length;
    
    const past = appointments.filter(apt => {
      const aptDate = parseAppointmentDate(apt.date);
      return aptDate < now;
    }).length;
    
    const withPrescriptions = appointments.filter(apt => apt.has_prescription).length;
    
    return { total: appointments.length, upcoming, past, withPrescriptions };
  };

  const renderOverviewTab = () => {
    const stats = getAppointmentStats();
    
    return (
      <ScrollView style={styles.tabContent}>
        {/* Patient Info Card */}
        <View style={styles.infoCard}>
          <View style={styles.patientHeader}>
            <View style={styles.patientAvatar}>
              <Text style={styles.patientAvatarText}>{getPatientInitials()}</Text>
            </View>
            <View style={styles.patientHeaderInfo}>
              <Text style={styles.patientHeaderName}>{getPatientDisplayName()}</Text>
              <Text style={styles.patientHeaderId}>ID: {patientId}</Text>
              {patient?.email && (
                <Text style={styles.patientHeaderEmail}>{patient.email}</Text>
              )}
            </View>
          </View>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{stats.total}</Text>
            <Text style={styles.statLabel}>Total Visits</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{stats.upcoming}</Text>
            <Text style={styles.statLabel}>Upcoming</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{stats.past}</Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{stats.withPrescriptions}</Text>
            <Text style={styles.statLabel}>Prescriptions</Text>
          </View>
        </View>

        {/* Recent Appointments */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Appointments</Text>
          {appointments.slice(0, 3).map(appointment => (
            <View key={appointment.$id} style={styles.appointmentCard}>
              <View style={styles.appointmentHeader}>
                <Text style={styles.appointmentDate}>{appointment.date}</Text>
                <View style={[
                  styles.statusBadge,
                  { backgroundColor: appointment.has_prescription ? '#e6f7e9' : '#f9fafb' }
                ]}>
                  <Text style={[
                    styles.statusText,
                    { color: appointment.has_prescription ? '#0AD476' : '#6b7280' }
                  ]}>
                    {appointment.has_prescription ? 'With Prescription' : 'No Prescription'}
                  </Text>
                </View>
              </View>
              <Text style={styles.appointmentService}>{appointment.service_name || 'General Consultation'}</Text>
              <Text style={styles.appointmentTime}>🕘 {appointment.time_slot}</Text>
            </View>
          ))}
          
          {appointments.length > 3 && (
            <TouchableOpacity 
              style={styles.seeAllButton}
              onPress={() => setActiveTab('appointments')}
            >
              <Text style={styles.seeAllText}>See All Appointments</Text>
              <Ionicons name="chevron-forward" size={16} color="#4CAF50" />
            </TouchableOpacity>
          )}
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
            <Text style={styles.appointmentDate}>{appointment.date}</Text>
            <View style={[
              styles.statusBadge,
              { backgroundColor: appointment.has_prescription ? '#e6f7e9' : '#f9fafb' }
            ]}>
              <Text style={[
                styles.statusText,
                { color: appointment.has_prescription ? '#0AD476' : '#6b7280' }
              ]}>
                {appointment.has_prescription ? 'With Prescription' : 'No Prescription'}
              </Text>
            </View>
          </View>
          
          <Text style={styles.appointmentService}>{appointment.service_name || 'General Consultation'}</Text>
          <Text style={styles.appointmentTime}>🕘 {appointment.time_slot}</Text>
          
          <View style={styles.appointmentActions}>
            {!appointment.has_prescription && (
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
          </View>
        </View>
      ))}
      
      {appointments.length === 0 && (
        <View style={styles.emptyState}>
          <Ionicons name="calendar-outline" size={50} color="#ccc" />
          <Text style={styles.emptyStateText}>No appointments found</Text>
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
            <Text style={styles.emptyStateText}>No prescriptions found</Text>
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
    padding: 20,
  },
  infoCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
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
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    minWidth: '22%',
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
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  section: {
    marginBottom: 20,
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
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  appointmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  appointmentDate: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  appointmentService: {
    fontSize: 14,
    color: '#4CAF50',
    marginBottom: 4,
  },
  appointmentTime: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  appointmentActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  addPrescriptionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  addPrescriptionText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  viewPrescriptionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#4CAF50',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  viewPrescriptionText: {
    color: '#4CAF50',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    marginTop: 8,
  },
  seeAllText: {
    color: '#4CAF50',
    fontWeight: '600',
    marginRight: 4,
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
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyStateText: {
    marginTop: 10,
    color: '#6b7280',
    fontSize: 16,
  },
});