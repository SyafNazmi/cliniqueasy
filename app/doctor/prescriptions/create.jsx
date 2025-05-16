// app/doctor/prescriptions/create.jsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import PageHeader from '../../../components/PageHeader';
import { DatabaseService, Query } from '../../../configs/AppwriteConfig';
import { addPrescription } from '../../../service/PrescriptionScanner';

export default function CreatePrescriptionScreen() {
  const params = useLocalSearchParams();
  const { appointmentId } = params;
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [appointment, setAppointment] = useState(null);
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
  
  useEffect(() => {
    if (appointmentId) {
      loadAppointment();
    } else {
      setLoading(false);
    }
  }, [appointmentId]);
  
  const loadAppointment = async () => {
    try {
      const appointmentData = await DatabaseService.getDocument('appointments', appointmentId);
      setAppointment(appointmentData);
    } catch (error) {
      console.error('Error loading appointment:', error);
      Alert.alert('Error', 'Could not load appointment information');
    } finally {
      setLoading(false);
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
      
      // Add prescription to database
      await addPrescription(appointmentId, medications, doctorNotes);
      
      // Update appointment to indicate it has a prescription
      await DatabaseService.updateDocument('appointments', appointmentId, {
        has_prescription: true
      });
      
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
      
      <ScrollView style={styles.content}>
        {appointment && (
          <View style={styles.appointmentCard}>
            <Text style={styles.appointmentCardTitle}>Appointment Details</Text>
            <View style={styles.appointmentDetail}>
              <Ionicons name="person" size={16} color="#0AD476" />
              <Text style={styles.appointmentDetailLabel}>Patient:</Text>
              <Text style={styles.appointmentDetailValue}>{appointment.user_id}</Text>
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
              <Text style={styles.inputLabel}>Medication Name*</Text>
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
                <Text style={styles.inputLabel}>Type*</Text>
                <View style={styles.pickerContainer}>
                  <TextInput
                    style={styles.input}
                    value={medication.type}
                    onChangeText={(text) => updateMedication(index, 'type', text)}
                    placeholder="e.g. Tablet"
                    placeholderTextColor="#999"
                  />
                </View>
              </View>
              
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>Dosage*</Text>
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
                <Text style={styles.inputLabel}>Frequency*</Text>
                <TextInput
                  style={styles.input}
                  value={medication.frequencies}
                  onChangeText={(text) => updateMedication(index, 'frequencies', text)}
                  placeholder="e.g. Once Daily"
                  placeholderTextColor="#999"
                />
              </View>
              
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>Duration*</Text>
                <TextInput
                  style={styles.input}
                  value={medication.duration}
                  onChangeText={(text) => updateMedication(index, 'duration', text)}
                  placeholder="e.g. 30 days"
                  placeholderTextColor="#999"
                />
              </View>
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Illness Type</Text>
              <TextInput
                style={styles.input}
                value={medication.illnessType}
                onChangeText={(text) => updateMedication(index, 'illnessType', text)}
                placeholder="e.g. Diabetes"
                placeholderTextColor="#999"
              />
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
  input: {
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e5e5e5',
  },
  pickerContainer: {
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e5e5',
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