import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Platform, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import PageHeader from '../../../components/PageHeader';
import { DatabaseService, Query } from '../../../configs/AppwriteConfig';
import { addPrescription } from '../../../service/PrescriptionScanner';

// Predefined options for medication fields
const MEDICATION_TYPES = [
  'Tablet', 'Capsule', 'Liquid', 'Injection', 'Topical', 'Inhaler', 'Patch', 'Drops'
];

const FREQUENCY_OPTIONS = [
  'Once Daily', 'Twice Daily', 'Three times Daily', 'Four times Daily',
  'Every Morning', 'Every Evening', 'Every 4 Hours', 'Every 6 Hours',
  'Every 8 Hours', 'Every 12 Hours', 'Weekly', 'As Needed'
];

const DURATION_OPTIONS = [
  '7 days', '14 days', '30 days', '90 days', 'On going'
];

const ILLNESS_TYPES = [
  'Hypertension', 'Diabetes', 'Asthma', 'Cholesterol', 'Anxiety',
  'Depression', 'Blood Pressure', 'Thyroid', 'Allergies', 'Pain Relief',
  'Inflammation', 'Infection', 'Prenatal Care', 'Vitamin Deficiency', 'Heart Condition'
];

export default function CreatePrescriptionScreen() {
  const params = useLocalSearchParams();
  const { appointmentId } = params;
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [appointment, setAppointment] = useState(null);
  const [patientName, setPatientName] = useState('');
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
    if (appointmentId) {
      loadAppointment();
    } else {
      setLoading(false);
    }
  }, [appointmentId]);
  
  const loadAppointment = async () => {
    try {
      const appointmentData = await DatabaseService.getDocument('67e0332c0001131d71ec', appointmentId);
      setAppointment(appointmentData);
      
      // Fetch patient name
      if (appointmentData && appointmentData.user_id) {
        await fetchPatientName(appointmentData.user_id);
      }
    } catch (error) {
      console.error('Error loading appointment:', error);
      Alert.alert('Error', 'Could not load appointment information');
    } finally {
      setLoading(false);
    }
  };
  
  // Optimized patient name lookup function based on the discovered data structure
  const fetchPatientName = async (userId) => {
    try {
      console.log("Fetching patient name for user ID:", userId);
      
      // Query by userId field (which we now know is the correct field)
      const usersResponse = await DatabaseService.listDocuments(
        '67e032ec0025cf1956ff', // Users collection
        [Query.equal('userId', userId)]
      );
      
      if (usersResponse.documents && usersResponse.documents.length > 0) {
        const user = usersResponse.documents[0];
        
        // We know fullName is the correct field
        if (user.fullName) {
          setPatientName(user.fullName);
          console.log(`Found patient name: ${user.fullName}`);
          return;
        }
      }
      
      // Fallback if lookup fails for any reason
      if (userId.includes('@')) {
        // Extract from email
        const name = userId.split('@')[0].replace(/[._-]/g, ' ');
        const formattedName = name.charAt(0).toUpperCase() + name.slice(1);
        setPatientName(formattedName);
      } else {
        const patientLabel = `Patient ${userId.substring(0, 8)}`;
        setPatientName(patientLabel);
      }
    } catch (error) {
      console.error('Error fetching patient name:', error);
      setPatientName(`Patient ${userId.substring(0, 8)}`);
    }
  };
  
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
    setMedications(updatedMedications);
  };
  
  const removeMedication = (index) => {
    if (medications.length > 1) {
      const updatedMedications = [...medications];
      updatedMedications.splice(index, 1);
      setMedications(updatedMedications);
    }
  };
  
  const openDropdown = (type, index, field) => {
    let options = [];
    switch (type) {
      case 'medicationType':
        options = MEDICATION_TYPES;
        break;
      case 'frequency':
        options = FREQUENCY_OPTIONS;
        break;
      case 'duration':
        options = DURATION_OPTIONS;
        break;
      case 'illness':
        options = ILLNESS_TYPES;
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
      
      // Make sure each medication has times as a proper array
      const formattedMedications = medications.map(med => {
        // Create a copy of the medication to avoid mutating the original
        const formattedMed = {...med};
        
        // Ensure times is an array
        if (!Array.isArray(formattedMed.times)) {
          // If times is a string, try to parse it
          if (typeof formattedMed.times === 'string') {
            try {
              // Check if it looks like JSON
              if (formattedMed.times.startsWith('[') && formattedMed.times.endsWith(']')) {
                formattedMed.times = JSON.parse(formattedMed.times);
              } else {
                // If it's a single time as string, put it in an array
                formattedMed.times = [formattedMed.times];
              }
            } catch (e) {
              // If parsing fails, default to an array with a single time
              formattedMed.times = [formattedMed.times];
            }
          } else if (!formattedMed.times) {
            // If times is null/undefined, default to an empty array or a default time
            formattedMed.times = ['09:00'];
          } else {
            // For any other non-array value, convert to string and wrap in array
            formattedMed.times = [String(formattedMed.times)];
          }
        }
        
        // Make sure all times in the array are strings
        formattedMed.times = formattedMed.times.map(time => String(time));
        
        return formattedMed;
      });
      
      console.log("Formatted medications with proper times arrays:", formattedMedications);
      
      // Add prescription to database
      await addPrescription(appointmentId, formattedMedications, doctorNotes);
      
      // Update appointment to indicate it has a prescription
      await DatabaseService.updateDocument(
        '67e0332c0001131d71ec', // Use the APPOINTMENTS_COLLECTION_ID constant here
        appointmentId, 
        {
          has_prescription: true
        }
      );
      
      Alert.alert(
        'Success',
        'Prescription created successfully',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error) {
      console.error('Error creating prescription:', error);
      Alert.alert('Error', 'Failed to create prescription. Please try again.');
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
              <Text style={styles.appointmentDetailValue}>
                {patientName || appointment.user_id}
              </Text>
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
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Illness Type</Text>
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