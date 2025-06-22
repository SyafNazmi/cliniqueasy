// app/doctor/prescriptions/create.jsx - Updated to use shared constants

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Platform, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import PageHeader from '../../../components/PageHeader';
import { DatabaseService, Query } from '../../../configs/AppwriteConfig';
import { addPrescription } from '../../../service/PrescriptionScanner';
import { getLocalStorage } from '../../../service/Storage';
import { COLLECTIONS } from '../../../constants';

// 🚨 UPDATED: Import shared constants for consistency
import {
  MEDICATION_TYPES,
  ILLNESS_TYPES,
  FREQUENCIES,
  DURATIONS,
  convertMedicationTypesToArray,
  convertIllnessTypesToArray,
  convertFrequenciesToArray,
  convertDurationsToArray
} from '../../../constants/MedicationConstants';

// Convert to simple arrays for dropdown compatibility
const MEDICATION_TYPE_OPTIONS = convertMedicationTypesToArray();
const FREQUENCY_OPTIONS = convertFrequenciesToArray();
const DURATION_OPTIONS = convertDurationsToArray();
const ILLNESS_TYPE_OPTIONS = convertIllnessTypesToArray();

export default function CreatePrescriptionScreen() {
  const params = useLocalSearchParams();
  const { appointmentId } = params;
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [appointment, setAppointment] = useState(null);
  const [patientName, setPatientName] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [medications, setMedications] = useState([
    {
      name: '',
      type: 'Tablet',
      dosage: '',
      frequencies: 'Once Daily',
      duration: '30 days',
      illnessType: '',
      notes: '',
      times: ['09:00']
    }
  ]);
  const [doctorNotes, setDoctorNotes] = useState('');
  
  // UI state for dropdowns
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [dropdownType, setDropdownType] = useState('');
  const [dropdownOptions, setDropdownOptions] = useState([]);
  const [currentMedicationIndex, setCurrentMedicationIndex] = useState(0);
  const [currentField, setCurrentField] = useState('');
  
  useEffect(() => {
    loadInitialData();
  }, [appointmentId]);
  
  const loadInitialData = async () => {
    try {
      setLoading(true);
      
      // Load current user info
      const userData = await getLocalStorage('userDetail');
      setCurrentUser(userData);
      
      if (appointmentId) {
        await loadAppointment();
      }
    } catch (error) {
      console.error('Error loading initial data:', error);
      Alert.alert('Error', 'Failed to load initial data');
    } finally {
      setLoading(false);
    }
  };
  
  const loadAppointment = async () => {
    try {
      const appointmentData = await DatabaseService.getDocument(
        '67e0332c0001131d71ec', // Your appointments collection ID
        appointmentId
      );
      setAppointment(appointmentData);
      
      // Fetch patient name using the entire appointment object
      if (appointmentData) {
        await fetchPatientName(appointmentData);
      }
    } catch (error) {
      console.error('Error loading appointment:', error);
      Alert.alert('Error', 'Could not load appointment information');
    }
  };
  
  // Patient name lookup function (same as existing logic)
  const fetchPatientName = async (appointmentData) => {
    try {
      console.log('Fetching patient info for appointment:', appointmentData.$id);
      
      let patientName = 'Unknown Patient';
      
      if (appointmentData.is_family_booking && appointmentData.patient_name) {
        patientName = appointmentData.patient_name;
      } 
      else if (appointmentData.is_family_booking && appointmentData.patient_id) {
        try {
          const patientResponse = await DatabaseService.listDocuments(
            '67e032ec0025cf1956ff',
            [Query.equal('$id', appointmentData.patient_id)]
          );
          
          if (patientResponse.documents && patientResponse.documents.length > 0) {
            const patientData = patientResponse.documents[0];
            patientName = patientData.fullName || patientData.name || patientData.displayName || 'Family Member';
          } else {
            patientName = 'Family Member';
          }
        } catch (error) {
          patientName = 'Family Member';
        }
      }
      else if (appointmentData.user_id) {
        try {
          const usersResponse = await DatabaseService.listDocuments(
            '67e032ec0025cf1956ff',
            [Query.equal('userId', appointmentData.user_id)]
          );
          
          if (usersResponse.documents && usersResponse.documents.length > 0) {
            const user = usersResponse.documents[0];
            patientName = user.fullName || user.name || user.displayName || 
              (appointmentData.user_id.includes('@') ? 
                appointmentData.user_id.split('@')[0].replace(/[._-]/g, ' ') : 
                `Patient ${appointmentData.user_id.substring(0, 8)}`);
          } else {
            patientName = appointmentData.user_id.includes('@') ? 
              appointmentData.user_id.split('@')[0].replace(/[._-]/g, ' ') : 
              `Patient ${appointmentData.user_id.substring(0, 8)}`;
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
      const fallbackName = appointmentData?.patient_name || 
                          (appointmentData?.user_id?.includes('@') ? 
                            appointmentData.user_id.split('@')[0].replace(/[._-]/g, ' ') : 
                            'Unknown Patient');
      setPatientName(fallbackName);
    }
  };
  
  // Medication management functions
  const addMedication = () => {
    setMedications([
      ...medications,
      {
        name: '',
        type: 'Tablet',
        dosage: '',
        frequencies: 'Once Daily',
        duration: '30 days',
        illnessType: '',
        notes: '',
        times: ['09:00']
      }
    ]);
  };
  
  const updateMedication = (index, field, value) => {
    const updatedMedications = [...medications];
    updatedMedications[index][field] = value;
    
    // 🚨 UPDATED: Auto-update times when frequency changes using shared constants
    if (field === 'frequencies') {
      const frequencyData = FREQUENCIES.find(freq => freq.label === value);
      if (frequencyData && frequencyData.times) {
        updatedMedications[index]['times'] = [...frequencyData.times];
      }
    }
    
    setMedications(updatedMedications);
  };
  
  const removeMedication = (index) => {
    if (medications.length > 1) {
      const updatedMedications = [...medications];
      updatedMedications.splice(index, 1);
      setMedications(updatedMedications);
    }
  };
  
  // 🚨 UPDATED: Dropdown functions using shared constants
  const openDropdown = (type, index, field) => {
    let options = [];
    switch (type) {
      case 'medicationType':
        options = MEDICATION_TYPE_OPTIONS;
        break;
      case 'frequency':
        options = FREQUENCY_OPTIONS;
        break;
      case 'duration':
        options = DURATION_OPTIONS;
        break;
      case 'illness':
        options = ILLNESS_TYPE_OPTIONS;
        break;
      default:
        return;
    }
    
    setDropdownType(type);
    setDropdownOptions(options);
    setCurrentMedicationIndex(index);
    setCurrentField(field);
    setDropdownVisible(true);
  };
  
  const selectOption = (option) => {
    updateMedication(currentMedicationIndex, currentField, option);
    setDropdownVisible(false);
  };
  
  // UPDATED: Submit function using your existing addPrescription function
  const handleSubmit = async () => {
  try {
    // Validate required fields
    const invalidMeds = medications.filter(med => 
      !med.name || !med.dosage || !med.type || !med.frequencies || !med.duration
    );
    
    if (invalidMeds.length > 0) {
      Alert.alert('Missing Information', 'Please fill in all required fields for all medications');
      return;
    }
    
    setSubmitting(true);
    
    // Format medications with proper times array and illness types
    const formattedMedications = medications.map(med => {
      const formattedMed = {...med};
      
      // Ensure times is an array (your system expects this)
      if (!Array.isArray(formattedMed.times)) {
        if (typeof formattedMed.times === 'string') {
          try {
            if (formattedMed.times.startsWith('[') && formattedMed.times.endsWith(']')) {
              formattedMed.times = JSON.parse(formattedMed.times);
            } else {
              formattedMed.times = [formattedMed.times];
            }
          } catch (e) {
            formattedMed.times = [formattedMed.times];
          }
        } else if (!formattedMed.times) {
          // Use shared constants to get default times for frequency
          const frequencyData = FREQUENCIES.find(freq => freq.label === med.frequencies);
          formattedMed.times = frequencyData ? frequencyData.times : ['09:00'];
        } else {
          formattedMed.times = [String(formattedMed.times)];
        }
      }
      
      // Ensure all times are strings
      formattedMed.times = formattedMed.times.map(time => String(time));
      
      // Ensure illness_type field uses correct naming
      formattedMed.illness_type = formattedMed.illnessType || '';
      
      return formattedMed;
    });
    
    console.log("Creating prescription with formatted medications:", formattedMedications);
    
    // Use existing addPrescription function
    const prescription = await addPrescription(
      appointmentId,
      formattedMedications,
      doctorNotes
    );
    
    console.log("Prescription created successfully:", prescription);
    
    // 🚨 FIX: Update the appointment to mark it as having a prescription
    try {
      await DatabaseService.updateDocument(
        COLLECTIONS.APPOINTMENTS, // Use your appointments collection ID
        appointmentId,
        { has_prescription: true }
      );
      console.log("✅ Appointment marked as having prescription");
    } catch (updateError) {
      console.error("⚠️ Failed to update appointment flag:", updateError);
      // Don't fail the whole operation for this
    }
    
    // Generate QR code content using the format your system expects
    const qrContent = `APPT:${appointmentId}:${prescription.reference_code}`;
    
    Alert.alert(
      'Success',
      `Prescription created successfully!\n\nReference Code: ${prescription.reference_code}\n\nThe patient can scan the QR code: ${qrContent}\n\nThis will add all ${formattedMedications.length} medications to their tracker with synchronized illness types.`,
      [
        { 
          text: 'View Prescription', 
          onPress: () => router.replace({
            pathname: '/doctor/prescriptions/view',
            params: { 
              appointmentId,
              new: 'true' // Flag to show success modal
            }
          })
        }
      ]
    );
    
  } catch (error) {
    console.error('Error creating prescription:', error);
    Alert.alert(
      'Error', 
      `Failed to create prescription: ${error.message}\n\nPlease try again.`
    );
  } finally {
    setSubmitting(false);
  }
};
  
  // Render dropdown modal
  const renderDropdownModal = () => (
    <Modal
      visible={dropdownVisible}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setDropdownVisible(false)}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={() => setDropdownVisible(false)}
      >
        <View style={styles.dropdownContainer}>
          <View style={styles.dropdownHeader}>
            <Text style={styles.dropdownTitle}>
              {dropdownType === 'medicationType' ? 'Select Medication Type' : 
               dropdownType === 'frequency' ? 'Select Frequency' :
               dropdownType === 'duration' ? 'Select Duration' : 'Select Illness Type'}
            </Text>
            <TouchableOpacity onPress={() => setDropdownVisible(false)}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.dropdownOptionsContainer}>
            {dropdownOptions.map((option, index) => (
              <TouchableOpacity
                key={index}
                style={styles.dropdownOption}
                onPress={() => selectOption(option)}
              >
                <Text style={styles.dropdownOptionText}>{option}</Text>
                {medications[currentMedicationIndex][currentField] === option && (
                  <Ionicons name="checkmark" size={20} color="#0AD476" />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
          
          {/* 🚨 NEW: Show count of available options */}
          <View style={styles.dropdownFooter}>
            <Text style={styles.dropdownFooterText}>
              {dropdownOptions.length} {dropdownType === 'illness' ? 'illness types' : 'options'} available
            </Text>
          </View>
        </View>
      </TouchableOpacity>
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
          <Text style={styles.headerTitle}>Create Prescription</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1a8e2d" />
          <Text style={styles.loadingText}>Loading appointment details...</Text>
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
        <Text style={styles.headerTitle}>Create Prescription</Text>
      </View>
      
      {renderDropdownModal()}
      
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
        
        {/* 🚨 NEW: Consistency notice */}
        <View style={styles.consistencyNotice}>
          <View style={styles.consistencyHeader}>
            <Ionicons name="sync-outline" size={20} color="#1a8e2d" />
            <Text style={styles.consistencyTitle}>Synchronized with Patient App</Text>
          </View>
          <Text style={styles.consistencyText}>
            Illness types and medication details will appear exactly the same in the patient's medication tracker.
          </Text>
        </View>
        
        <Text style={styles.sectionTitle}>Medications</Text>
        
        {medications.map((medication, index) => (
          <View key={index} style={styles.medicationCard}>
            <View style={styles.medicationHeader}>
              <Text style={styles.medicationNumber}>Medication {index + 1}</Text>
              {medications.length > 1 && (
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => removeMedication(index)}
                >
                  <Ionicons name="trash" size={20} color="#FF4747" />
                </TouchableOpacity>
              )}
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                Medication Name<Text style={styles.requiredAsterisk}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                value={medication.name}
                onChangeText={(text) => updateMedication(index, 'name', text)}
                placeholder="Enter medication name"
                placeholderTextColor="#999"
              />
            </View>
            
            <View style={styles.inputRow}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
                <Text style={styles.inputLabel}>
                  Type<Text style={styles.requiredAsterisk}>*</Text>
                </Text>
                <TouchableOpacity
                  style={styles.dropdownButton}
                  onPress={() => openDropdown('medicationType', index, 'type')}
                >
                  <Text style={styles.dropdownButtonText}>{medication.type}</Text>
                  <Ionicons name="chevron-down" size={20} color="#666" />
                </TouchableOpacity>
              </View>
              
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>
                  Dosage<Text style={styles.requiredAsterisk}>*</Text>
                </Text>
                <TextInput
                  style={styles.input}
                  value={medication.dosage}
                  onChangeText={(text) => updateMedication(index, 'dosage', text)}
                  placeholder="e.g. 500mg"
                  placeholderTextColor="#999"
                />
              </View>
            </View>
            
            <View style={styles.inputRow}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
                <Text style={styles.inputLabel}>
                  Frequency<Text style={styles.requiredAsterisk}>*</Text>
                </Text>
                <TouchableOpacity
                  style={styles.dropdownButton}
                  onPress={() => openDropdown('frequency', index, 'frequencies')}
                >
                  <Text style={styles.dropdownButtonText}>{medication.frequencies}</Text>
                  <Ionicons name="chevron-down" size={20} color="#666" />
                </TouchableOpacity>
              </View>
              
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>
                  Duration<Text style={styles.requiredAsterisk}>*</Text>
                </Text>
                <TouchableOpacity
                  style={styles.dropdownButton}
                  onPress={() => openDropdown('duration', index, 'duration')}
                >
                  <Text style={styles.dropdownButtonText}>{medication.duration}</Text>
                  <Ionicons name="chevron-down" size={20} color="#666" />
                </TouchableOpacity>
              </View>
            </View>
            
            {/* 🚨 HIGHLIGHTED: Synchronized illness type field */}
            <View style={styles.inputGroup}>
              <View style={styles.illnessTypeHeader}>
                <Text style={styles.inputLabel}>Illness Type</Text>
              </View>
              <TouchableOpacity
                style={styles.dropdownButton}
                onPress={() => openDropdown('illness', index, 'illnessType')}
              >
                <Text style={styles.dropdownButtonText}>
                  {medication.illnessType || "Select illness type"}
                </Text>
                <Ionicons name="chevron-down" size={20} color="#666" />
              </TouchableOpacity>
            </View>
            
            {/* 🚨 NEW: Show medication times if frequency is set */}
            {medication.frequencies && medication.frequencies !== 'As Needed' && (
              <View style={styles.timesPreview}>
                <Text style={styles.timesPreviewLabel}>Reminder Times:</Text>
                <View style={styles.timesPreviewList}>
                  {medication.times.map((time, timeIndex) => (
                    <View key={timeIndex} style={styles.timePreviewChip}>
                      <Ionicons name="time-outline" size={14} color="#1a8e2d" />
                      <Text style={styles.timePreviewText}>{time}</Text>
                    </View>
                  ))}
                </View>
                <Text style={styles.timesPreviewNote}>
                  Patient can customize these times in their app
                </Text>
              </View>
            )}
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Instructions</Text>
              <TextInput
                style={styles.textArea}
                value={medication.notes}
                onChangeText={(text) => updateMedication(index, 'notes', text)}
                placeholder="Special instructions for this medication"
                placeholderTextColor="#999"
                multiline
                numberOfLines={3}
              />
            </View>
          </View>
        ))}
        
        <TouchableOpacity
          style={styles.addMedicationButton}
          onPress={addMedication}
        >
          <Ionicons name="add-circle" size={20} color="#1a8e2d" />
          <Text style={styles.addMedicationText}>Add Another Medication</Text>
        </TouchableOpacity>
        
        <View style={styles.divider} />
        
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Doctor's Notes</Text>
          <TextInput
            style={styles.textArea}
            value={doctorNotes}
            onChangeText={setDoctorNotes}
            placeholder="Additional notes for the patient"
            placeholderTextColor="#999"
            multiline
            numberOfLines={4}
          />
        </View>
        
        <TouchableOpacity
          style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          <LinearGradient
            colors={["#1a8e2d", "#146922"]}
            style={styles.submitButtonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Text style={styles.submitButtonText}>
              {submitting ? "Creating Prescription..." : "Create Prescription"}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
        
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
  
  // 🚨 NEW: Consistency notice styles
  consistencyNotice: {
    backgroundColor: '#f0f9f0',
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#1a8e2d20',
  },
  consistencyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  consistencyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a8e2d',
    marginLeft: 8,
  },
  consistencyText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
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
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  medicationCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  medicationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  medicationNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  removeButton: {
    padding: 5,
  },
  inputGroup: {
    marginBottom: 15,
  },
  inputRow: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4b5563',
    marginBottom: 8,
  },
  requiredAsterisk: {
    color: '#FF4747',
    fontWeight: 'bold',
  },
  
  // Illness type header 
  illnessTypeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },

  input: {
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e5e5e5',
  },
  dropdownButton: {
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e5e5e5',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dropdownButtonText: {
    fontSize: 16,
    color: '#333',
  },
  
  // 🚨 NEW: Times preview styles
  timesPreview: {
    backgroundColor: '#f8fdf9',
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#e6f7e9',
  },
  timesPreviewLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a8e2d',
    marginBottom: 8,
  },
  timesPreviewList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  timePreviewChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e6f7e9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1a8e2d20',
  },
  timePreviewText: {
    fontSize: 12,
    color: '#1a8e2d',
    fontWeight: '500',
    marginLeft: 4,
  },
  timesPreviewNote: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  
  textArea: {
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e5e5e5',
    minHeight: 100,
    textAlignVertical: 'top',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdownContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    width: '80%',
    maxHeight: '70%',
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  dropdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    marginBottom: 10,
  },
  dropdownTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  dropdownOptionsContainer: {
    maxHeight: 400,
  },
  dropdownOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  dropdownOptionText: {
    fontSize: 16,
    color: '#333',
  },
  
  // 🚨 NEW: Dropdown footer
  dropdownFooter: {
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    marginTop: 10,
  },
  dropdownFooterText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  
  addMedicationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    backgroundColor: '#e6f7e9',
    borderRadius: 10,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#1a8e2d20',
  },
  addMedicationText: {
    color: '#1a8e2d',
    fontWeight: 'bold',
    marginLeft: 10,
  },
  divider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginBottom: 20,
  },
  submitButton: {
    borderRadius: 10,
    overflow: 'hidden',
    marginTop: 10,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonGradient: {
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});