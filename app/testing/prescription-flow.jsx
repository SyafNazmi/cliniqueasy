// app/testing/prescription-flow.jsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Alert, ActivityIndicator, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import PageHeader from '../../components/PageHeader';
import { DatabaseService, ID } from '../../configs/AppwriteConfig';
import { addPrescription } from '../../service/PrescriptionScanner';
import QRCode from 'react-native-qrcode-svg';

// IMPORTANT: Update these with your actual Appwrite collection IDs
const COLLECTION_IDS = {
  APPOINTMENTS: '6823d6d020010cd4f7fa', // Replace with your appointments collection ID
  PRESCRIPTIONS: '6824b4cd000e65702ee3',
  PRESCRIPTION_MEDICATIONS: '6824b57b0008686a86b3'
};

export default function PrescriptionFlowTestScreen() {
  const [loading, setLoading] = useState(false);
  const [testAppointment, setTestAppointment] = useState(null);
  const [doctorName, setDoctorName] = useState('Dr. Test');
  const [patientName, setPatientName] = useState('Test Patient');
  const [serviceName, setServiceName] = useState('General Checkup');
  const [appointmentDate, setAppointmentDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Step 1: Create a test appointment
  const createTestAppointment = async () => {
    try {
      setLoading(true);
      
      // Generate a unique ID for the appointment
      const appointmentId = ID.unique();
      
      // Create the appointment in Appwrite
      const appointment = await DatabaseService.createDocument(
        COLLECTION_IDS.APPOINTMENTS,
        {
          user_id: patientName,
          doctor_id: 'test-doctor-id',
          doctor_name: doctorName,
          date: appointmentDate,
          time_slot: '10:00 AM',
          status: 'completed',
          service_name: serviceName,
          branch_id: 'test-branch-id',
          branch_name: 'Test Branch',
          service_id: 'test-service-id',
          created_at: new Date().toISOString(),
          has_prescription: false,
        },
        appointmentId // Optional: specify the ID directly instead of letting it be generated
      );
      
      // Save the created appointment to state
      setTestAppointment(appointment);
      
      Alert.alert('Success', 'Test appointment created successfully');
    } catch (error) {
      console.error('Error creating test appointment:', error);
      Alert.alert('Error', 'Failed to create test appointment: ' + error.message);
    } finally {
      setLoading(false);
    }
  };
  
  // Step 2: Create a test prescription
  const createTestPrescription = async () => {
    if (!testAppointment) {
      Alert.alert('Error', 'Please create a test appointment first');
      return;
    }
    
    try {
      setLoading(true);
      
      // Sample medications for the test prescription
      const medications = [
        {
          name: "Amoxicillin",
          type: "Capsule",
          dosage: "500mg",
          frequencies: "Three times Daily",
          duration: "7 days",
          illnessType: "Infection",
          notes: "Take with food",
          times: ["09:00", "14:00", "21:00"]
        }
      ];
      
      // Add the prescription using our service
      const prescriptionId = await addPrescription(
        testAppointment.$id,
        medications,
        "Test prescription for medication flow testing"
      );
      
      // Update the test appointment
      const updatedAppointment = await DatabaseService.updateDocument(
        COLLECTION_IDS.APPOINTMENTS,
        testAppointment.$id,
        {
          has_prescription: true
        }
      );
      
      setTestAppointment(updatedAppointment);
      
      Alert.alert('Success', 'Test prescription created successfully with ID: ' + prescriptionId);
    } catch (error) {
      console.error('Error creating test prescription:', error);
      Alert.alert('Error', 'Failed to create test prescription: ' + error.message);
    } finally {
      setLoading(false);
    }
  };
  
  // Step 3: Test the QR scanning flow
  const testQRScanFlow = () => {
    if (!testAppointment) {
      Alert.alert('Error', 'Please create a test appointment first');
      return;
    }
    
    // Navigate to the add medication screen
    router.push('/medications/add');
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
        <Text style={styles.headerTitle}>Prescription Flow Testing</Text>
      </View>
      
      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Step 1: Create Test Appointment</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Doctor Name</Text>
            <TextInput 
              style={styles.input}
              value={doctorName}
              onChangeText={setDoctorName}
              placeholder="Enter doctor name"
            />
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Patient Name</Text>
            <TextInput 
              style={styles.input}
              value={patientName}
              onChangeText={setPatientName}
              placeholder="Enter patient name"
            />
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Service</Text>
            <TextInput 
              style={styles.input}
              value={serviceName}
              onChangeText={setServiceName}
              placeholder="Enter service name"
            />
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Date</Text>
            <TextInput 
              style={styles.input}
              value={appointmentDate}
              onChangeText={setAppointmentDate}
              placeholder="YYYY-MM-DD"
            />
          </View>
          
          <TouchableOpacity 
            style={styles.button}
            onPress={createTestAppointment}
            disabled={loading}
          >
            <LinearGradient
              colors={["#1a8e2d", "#146922"]}
              style={styles.buttonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={styles.buttonText}>
                {loading ? "Creating..." : "Create Test Appointment"}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
        
        {testAppointment && (
          <View style={styles.appointmentCard}>
            <Text style={styles.appointmentTitle}>Test Appointment Created</Text>
            <Text style={styles.appointmentId}>ID: {testAppointment.$id}</Text>
            <Text style={styles.appointmentDetail}>Doctor: {testAppointment.doctor_name}</Text>
            <Text style={styles.appointmentDetail}>Patient: {testAppointment.user_id}</Text>
            <Text style={styles.appointmentDetail}>Date: {testAppointment.date}</Text>
            <Text style={styles.appointmentDetail}>Service: {testAppointment.service_name}</Text>
            <Text style={styles.appointmentDetail}>Status: {testAppointment.status}</Text>
            <Text style={styles.appointmentDetail}>
              Has Prescription: {testAppointment.has_prescription ? "Yes" : "No"}
            </Text>
            
            <View style={styles.qrContainer}>
              <QRCode
                value={`APPT:${testAppointment.$id}:${testAppointment.$id.substring(0, 8).toUpperCase()}`}
                size={150}
                color="#000000"
                backgroundColor="#FFFFFF"
              />
              <Text style={styles.qrText}>Scan this QR code in the Add Medication screen</Text>
            </View>
          </View>
        )}
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Step 2: Create Test Prescription</Text>
          <Text style={styles.description}>
            This will create a test prescription with sample medications for the appointment.
          </Text>
          
          <TouchableOpacity 
            style={[styles.button, !testAppointment && styles.disabledButton]}
            onPress={createTestPrescription}
            disabled={!testAppointment || loading}
          >
            <LinearGradient
              colors={["#1a8e2d", "#146922"]}
              style={styles.buttonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={styles.buttonText}>
                {loading ? "Creating..." : "Create Test Prescription"}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Step 3: Test QR Scanning</Text>
          <Text style={styles.description}>
            Go to the Add Medication screen and scan the QR code above to test the prescription import flow.
          </Text>
          
          <TouchableOpacity 
            style={[styles.button, !testAppointment && styles.disabledButton]}
            onPress={testQRScanFlow}
            disabled={!testAppointment}
          >
            <LinearGradient
              colors={["#1a8e2d", "#146922"]}
              style={styles.buttonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={styles.buttonText}>Go to Add Medication</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
        
        {/* For direct testing of the doctor prescription creation screen */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Doctor Prescription Creation</Text>
          <Text style={styles.description}>
            Test the doctor's prescription creation screen directly.
          </Text>
          
          <TouchableOpacity 
            style={[styles.button, !testAppointment && styles.disabledButton]}
            onPress={() => {
              if (!testAppointment) {
                Alert.alert('Error', 'Please create a test appointment first');
                return;
              }
              router.push({
                pathname: '/doctor/prescriptions/create',
                params: { appointmentId: testAppointment.$id }
              });
            }}
            disabled={!testAppointment}
          >
            <LinearGradient
              colors={["#1a8e2d", "#146922"]}
              style={styles.buttonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={styles.buttonText}>Test Doctor Prescription Screen</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
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
  section: {
    marginBottom: 25,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 15,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  description: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
    lineHeight: 20,
  },
  inputGroup: {
    marginBottom: 15,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4b5563',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e5e5e5',
  },
  button: {
    borderRadius: 10,
    overflow: 'hidden',
    marginTop: 10,
  },
  buttonGradient: {
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  disabledButton: {
    opacity: 0.5,
  },
  appointmentCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 25,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  appointmentTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  appointmentId: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a8e2d',
    marginBottom: 10,
  },
  appointmentDetail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  qrContainer: {
    alignItems: 'center',
    marginTop: 20,
    padding: 15,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
  },
  qrText: {
    marginTop: 10,
    color: '#6b7280',
    fontSize: 14,
    textAlign: 'center',
  },
});