// app/doctor/prescriptions/view.jsx - FIXED VERSION
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Platform, Share } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import PageHeader from '../../../components/PageHeader';
import { DatabaseService, Query } from '../../../configs/AppwriteConfig';
import { getPrescriptions } from '../../../service/PrescriptionScanner'; // ✅ Fixed import
import QRCode from 'react-native-qrcode-svg';

// Collection IDs from your database
const APPOINTMENTS_COLLECTION_ID = '67e0332c0001131d71ec';

export default function ViewPrescriptionScreen() {
  const params = useLocalSearchParams();
  const { appointmentId } = params;
  
  const [loading, setLoading] = useState(true);
  const [appointment, setAppointment] = useState(null);
  const [patientName, setPatientName] = useState('');
  const [prescription, setPrescription] = useState(null);
  const [medications, setMedications] = useState([]);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  
  useEffect(() => {
    if (appointmentId) {
      loadData();
    } else {
      setLoading(false);
    }
  }, [appointmentId]);
  
  // FIXED: Updated loadData function for View Prescription
  const loadData = async () => {
    try {
      setLoading(true);
      console.log("Loading prescription for appointment:", appointmentId);
      
      // First load the appointment details
      const appointmentData = await DatabaseService.getDocument(
        APPOINTMENTS_COLLECTION_ID, 
        appointmentId
      );
      setAppointment(appointmentData);
      
      // Get patient name using the entire appointment object (FIXED)
      if (appointmentData) {
        await fetchPatientName(appointmentData); // Pass entire appointment object
      }
      
      // Get the prescription and medications using the correct function
      const prescriptionData = await getPrescriptions(appointmentId);
      console.log("Prescription data:", prescriptionData);
      
      if (prescriptionData.prescription) {
        setPrescription(prescriptionData.prescription);
        setMedications(prescriptionData.medications);
        
        // Show success modal if this is the first time viewing after creation
        const isNewPrescription = params.new === 'true';
        if (isNewPrescription) {
          setShowSuccessModal(true);
        }
      } else {
        // No prescription found
        Alert.alert(
          "No Prescription",
          "No prescription found for this appointment",
          [{ text: "OK", onPress: () => router.back() }]
        );
      }
    } catch (error) {
      console.error("Error loading prescription:", error);
      Alert.alert(
        "Error",
        "Failed to load prescription data: " + error.message,
        [{ text: "OK", onPress: () => router.back() }]
      );
    } finally {
      setLoading(false);
    }
    const result = await getPrescriptions(appointmentId);
    setPrescription(result.prescription);
    setMedications(result.medications);
  };

  // FIXED: Updated fetchPatientName function to match appointment detail logic
  const fetchPatientName = async (appointmentData) => {
    try {
      console.log('Fetching patient info for appointment:', appointmentData.$id);
      console.log('Is family booking:', appointmentData?.is_family_booking);
      console.log('Patient name from appointment:', appointmentData?.patient_name);
      console.log('Patient ID from appointment:', appointmentData?.patient_id);
      console.log('User ID from appointment:', appointmentData?.user_id);
      
      let patientName = 'Unknown Patient';
      
      // Use the same logic as the appointment detail view for consistency
      if (appointmentData.is_family_booking && appointmentData.patient_name) {
        // Family booking with patient name - use it directly
        patientName = appointmentData.patient_name;
        console.log(`Using family booking patient name: ${patientName}`);
      } 
      else if (appointmentData.is_family_booking && appointmentData.patient_id) {
        // Family booking with patient_id but no name
        try {
          const patientResponse = await DatabaseService.listDocuments(
            '67e032ec0025cf1956ff', // Patient profiles collection
            [Query.equal('$id', appointmentData.patient_id)]
          );
          
          if (patientResponse.documents && patientResponse.documents.length > 0) {
            const patientData = patientResponse.documents[0];
            patientName = patientData.fullName || patientData.name || patientData.displayName || 'Family Member';
            console.log(`Found family member by patient_id: ${patientName}`);
          } else {
            patientName = 'Family Member';
            console.log('Family member not found in patient profiles, using default');
          }
        } catch (error) {
          console.log('Error fetching family member by patient_id:', error);
          patientName = 'Family Member';
        }
      }
      else if (appointmentData.user_id) {
        // Regular booking - fetch by user_id
        try {
          const usersResponse = await DatabaseService.listDocuments(
            '67e032ec0025cf1956ff', // Users collection
            [Query.equal('userId', appointmentData.user_id)]
          );
          
          if (usersResponse.documents && usersResponse.documents.length > 0) {
            const user = usersResponse.documents[0];
            patientName = user.fullName || user.name || user.displayName || 
              (appointmentData.user_id.includes('@') ? 
                appointmentData.user_id.split('@')[0].replace(/[._-]/g, ' ') : 
                `Patient ${appointmentData.user_id.substring(0, 8)}`);
            console.log(`Found account holder by user_id: ${patientName}`);
          } else {
            // Fallback formatting for user_id
            patientName = appointmentData.user_id.includes('@') ? 
              appointmentData.user_id.split('@')[0].replace(/[._-]/g, ' ') : 
              `Patient ${appointmentData.user_id.substring(0, 8)}`;
            console.log(`Using fallback formatting for user_id: ${patientName}`);
          }
        } catch (error) {
          console.error('Error fetching account holder by user_id:', error);
          patientName = `Patient ${appointmentData.user_id.substring(0, 8)}`;
        }
      }
      
      setPatientName(patientName);
      console.log(`Final patient name set: ${patientName}`);
      
    } catch (error) {
      console.error('Error in fetchPatientName:', error);
      // Fallback to appointment data
      const fallbackName = appointmentData?.patient_name || 
                          (appointmentData?.user_id?.includes('@') ? 
                            appointmentData.user_id.split('@')[0].replace(/[._-]/g, ' ') : 
                            'Unknown Patient');
      setPatientName(fallbackName);
    }
  };
  
  const shareWithPatient = async () => {
    try {
      // Generate QR code content
      // Format: APPT:{appointmentId}:{referenceCode}
      const qrContent = `APPT:${appointmentId}:${prescription?.reference_code || 'REF123'}`;
      
      // Create a message to share with the patient
      const message = `Your doctor has created a prescription for you. To add it to your medication tracker, open the app and scan this code or enter it manually: ${qrContent}`;
      
      // Use the share API
      const result = await Share.share({
        message,
        title: "Prescription Ready",
      });
      
      if (result.action === Share.sharedAction) {
        console.log("Prescription shared successfully");
      }
    } catch (error) {
      console.error("Error sharing prescription:", error);
      Alert.alert("Error", "Failed to share prescription");
    }
  };
  
  // Success Modal Component
  const SuccessModal = () => (
    <View style={styles.modalOverlay}>
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <LinearGradient
            colors={["#1a8e2d", "#146922"]}
            style={styles.modalHeaderGradient}
          >
            <Ionicons name="checkmark-circle" size={60} color="white" />
            <Text style={styles.modalTitle}>Prescription Created</Text>
            <Text style={styles.modalSubtitle}>Successfully created prescription for {patientName}</Text>
          </LinearGradient>
        </View>
        
        <View style={styles.modalContent}>
          <Text style={styles.modalMessage}>
            The prescription has been created and is ready to be shared with the patient.
            They can scan this QR code in their medication tracker app.
          </Text>
          
          <View style={styles.qrContainer}>
            <QRCode
              value={`APPT:${appointmentId}:${prescription?.reference_code || 'REF123'}`}
              size={150}
              color="#000000"
              backgroundColor="#FFFFFF"
            />
          </View>
          
          <Text style={styles.instructionText}>
            Instruct the patient to:
          </Text>
          <Text style={styles.instructionDetail}>
            1. Open their medication tracker app
          </Text>
          <Text style={styles.instructionDetail}>
            2. Tap "Add Medication"
          </Text>
          <Text style={styles.instructionDetail}>
            3. Scan this QR code or enter it manually
          </Text>
          
          <View style={styles.modalActions}>
            <TouchableOpacity 
              style={styles.shareButton}
              onPress={shareWithPatient}
            >
              <Ionicons name="share-outline" size={20} color="white" />
              <Text style={styles.shareButtonText}>Share with Patient</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.dismissButton}
              onPress={() => setShowSuccessModal(false)}
            >
              <Text style={styles.dismissButtonText}>View Prescription</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
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
          <Text style={styles.headerTitle}>Prescription</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1a8e2d" />
          <Text style={styles.loadingText}>Loading prescription...</Text>
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
        <Text style={styles.headerTitle}>Prescription</Text>
      </View>
      
      {showSuccessModal && <SuccessModal />}
      
      <ScrollView style={styles.content}>
        {appointment && (
          <View style={styles.appointmentCard}>
            <Text style={styles.appointmentCardTitle}>Appointment Details</Text>
            <View style={styles.appointmentDetail}>
              <Ionicons name="person" size={16} color="#0AD476" />
              <Text style={styles.appointmentDetailLabel}>Patient:</Text>
              <Text style={styles.appointmentDetailValue}>{patientName}</Text>
            </View>
            <View style={styles.appointmentDetail}>
              <Ionicons name="calendar" size={16} color="#0AD476" />
              <Text style={styles.appointmentDetailLabel}>Date:</Text>
              <Text style={styles.appointmentDetailValue}>{appointment.date}</Text>
            </View>
            <View style={styles.appointmentDetail}>
              <Ionicons name="time" size={16} color="#0AD476" />
              <Text style={styles.appointmentDetailLabel}>Time:</Text>
              <Text style={styles.appointmentDetailValue}>{appointment.time_slot}</Text>
            </View>
            <View style={styles.appointmentDetail}>
              <Ionicons name="medkit" size={16} color="#0AD476" />
              <Text style={styles.appointmentDetailLabel}>Service:</Text>
              <Text style={styles.appointmentDetailValue}>{appointment.service_name}</Text>
            </View>
          </View>
        )}
        
        {prescription && (
          <View style={styles.prescriptionCard}>
            <View style={styles.prescriptionHeader}>
              <View>
                <Text style={styles.prescriptionTitle}>Prescription</Text>
                <Text style={styles.prescriptionStatus}>{prescription.status}</Text>
              </View>
              
              <View style={styles.prescriptionDate}>
                <Text style={styles.dateLabel}>Issued:</Text>
                <Text style={styles.dateValue}>{prescription.issued_date}</Text>
              </View>
            </View>
            
            <View style={styles.divider} />
            
            <Text style={styles.medicationsTitle}>Medications</Text>
            
            {medications.length > 0 ? (
              medications.map((medication, index) => (
                <View key={medication.$id || index} style={styles.medicationItem}>
                  <View style={styles.medicationHeader}>
                    <Text style={styles.medicationName}>{medication.name}</Text>
                    <View style={styles.medicationTypeBadge}>
                      <Text style={styles.medicationTypeText}>{medication.type}</Text>
                    </View>
                  </View>
                  
                  <View style={styles.medicationDetail}>
                    <Text style={styles.detailLabel}>Dosage:</Text>
                    <Text style={styles.detailValue}>{medication.dosage}</Text>
                  </View>
                  
                  <View style={styles.medicationDetail}>
                    <Text style={styles.detailLabel}>Frequency:</Text>
                    <Text style={styles.detailValue}>{medication.frequencies}</Text>
                  </View>
                  
                  <View style={styles.medicationDetail}>
                    <Text style={styles.detailLabel}>Duration:</Text>
                    <Text style={styles.detailValue}>{medication.duration}</Text>
                  </View>
                  
                  {medication.illness_type && (
                    <View style={styles.medicationDetail}>
                      <Text style={styles.detailLabel}>For:</Text>
                      <Text style={styles.detailValue}>{medication.illness_type}</Text>
                    </View>
                  )}
                  
                  {medication.notes && (
                    <View style={styles.medicationNotes}>
                      <Text style={styles.notesLabel}>Instructions:</Text>
                      <Text style={styles.notesValue}>{medication.notes}</Text>
                    </View>
                  )}
                </View>
              ))
            ) : (
              <Text style={styles.noMedicationsText}>No medications found in this prescription</Text>
            )}
            
            {prescription.doctor_notes && (
              <View style={styles.doctorNotesContainer}>
                <Text style={styles.doctorNotesLabel}>Doctor's Notes:</Text>
                <Text style={styles.doctorNotesText}>{prescription.doctor_notes}</Text>
              </View>
            )}
            
            <View style={styles.qrSection}>
              <Text style={styles.qrTitle}>Patient QR Code</Text>
              <Text style={styles.qrInstructions}>
                Patient can scan this QR code in their medication tracker app to 
                automatically add these medications to their schedule.
              </Text>
              
              <View style={styles.qrWrapper}>
                <QRCode
                  value={`APPT:${appointmentId}:${prescription.reference_code || 'REF123'}`}
                  size={180}
                  color="#000000"
                  backgroundColor="#FFFFFF"
                />
              </View>
              
              <TouchableOpacity 
                style={styles.shareButton}
                onPress={shareWithPatient}
              >
                <Ionicons name="share-outline" size={20} color="white" />
                <Text style={styles.shareButtonText}>Share with Patient</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  headerGradient: {
    height: Platform.OS === 'ios' ? 120 : 100,
    width: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
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
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: '#333',
  },
  appointmentCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  appointmentCardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  appointmentDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  appointmentDetailLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4b5563',
    marginLeft: 10,
    width: 60,
  },
  appointmentDetailValue: {
    fontSize: 14,
    color: '#1f2937',
    flex: 1,
  },
  prescriptionCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  prescriptionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  prescriptionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  prescriptionStatus: {
    fontSize: 14,
    color: '#0AD476',
    marginTop: 5,
  },
  prescriptionDate: {
    alignItems: 'flex-end',
  },
  dateLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
  dateValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  divider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginBottom: 15,
  },
  medicationsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  medicationItem: {
    backgroundColor: '#f9fafb',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  medicationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  medicationName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  medicationTypeBadge: {
    backgroundColor: '#e6f7e9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 15,
  },
  medicationTypeText: {
    fontSize: 12,
    color: '#0AD476',
    fontWeight: '600',
  },
  medicationDetail: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    width: 85,
  },
  detailValue: {
    fontSize: 14,
    color: '#1f2937',
    flex: 1,
  },
  medicationNotes: {
    marginTop: 5,
  },
  notesLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 5,
  },
  notesValue: {
    fontSize: 14,
    color: '#1f2937',
    backgroundColor: '#f3f4f6',
    padding: 10,
    borderRadius: 8,
  },
  noMedicationsText: {
    fontSize: 14,
    color: '#6b7280',
    fontStyle: 'italic',
    textAlign: 'center',
    padding: 20,
  },
  doctorNotesContainer: {
    marginTop: 10,
    padding: 15,
    backgroundColor: '#f3f4f6',
    borderRadius: 10,
  },
  doctorNotesLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 5,
  },
  doctorNotesText: {
    fontSize: 14,
    color: '#1f2937',
  },
  qrSection: {
    marginTop: 25,
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  qrTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  qrInstructions: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 15,
  },
  qrWrapper: {
    padding: 15,
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  shareButton: {
    flexDirection: 'row',
    backgroundColor: '#0AD476',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  // Success Modal Styles
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: 'white',
    borderRadius: 15,
    overflow: 'hidden',
  },
  modalHeader: {
    overflow: 'hidden',
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
  },
  modalHeaderGradient: {
    padding: 20,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: 'white',
    marginTop: 10,
  },
  modalSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 5,
    textAlign: 'center',
  },
  modalContent: {
    padding: 20,
  },
  modalMessage: {
    fontSize: 16,
    color: '#4b5563',
    textAlign: 'center',
    marginBottom: 20,
  },
  qrContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    marginBottom: 20,
    alignSelf: 'center',
  },
  instructionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4b5563',
    marginBottom: 10,
  },
  instructionDetail: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 5,
    marginLeft: 10,
  },
  modalActions: {
    marginTop: 25,
  },
  dismissButton: {
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  dismissButtonText: {
    color: '#6b7280',
    fontSize: 16,
    fontWeight: '500',
  },
});