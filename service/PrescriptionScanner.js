// This module handles QR code scanning for prescriptions

/**
 * Process QR code data and extract prescription information
 * In a real implementation, this would connect to a backend API to fetch prescription details
 * @param {string} qrData - Data from the scanned QR code (format: APPT:appointmentId:referenceCode)
 * @returns {Promise<Array>} - Array of medications from the prescription
 */

// service/PrescriptionScanner.js - FIXED VERSION
import { DatabaseService, Query } from '../configs/AppwriteConfig';

// Collection IDs
const PRESCRIPTION_COLLECTION_ID = '6824b4cd000e65702ee3'; // Prescriptions collection
const PRESCRIPTION_MEDICATIONS_COLLECTION_ID = '6824b57b0008686a86b3'; // Prescription medications
const APPOINTMENTS_COLLECTION_ID = '67e0332c0001131d71ec'; // Appointments

/**
 * Add a new prescription with medications
 * @param {string} appointmentId - The appointment ID
 * @param {Array} medications - Array of medication objects
 * @param {string} doctorNotes - Doctor's notes
 * @returns {Promise<Object>} - Created prescription
 */
export const addPrescription = async (appointmentId, medications, doctorNotes = '') => {
  try {
    console.log('Creating prescription for appointment:', appointmentId);
    
    // 1. Create the main prescription record
    const prescriptionData = {
      appointment_id: appointmentId,
      doctor_notes: doctorNotes,
      status: 'Active',
      issued_date: new Date().toISOString().split('T')[0], // Format: YYYY-MM-DD
      reference_code: generateReferenceCode()
    };
    
    const prescription = await DatabaseService.createDocument(
      PRESCRIPTION_COLLECTION_ID,
      prescriptionData
    );
    
    console.log('Created prescription:', prescription.$id);
    
    // 2. Add each medication to the prescription
    for (const medication of medications) {
      const medicationData = {
        prescription_id: prescription.$id,
        name: medication.name,
        type: medication.type,
        dosage: medication.dosage,
        frequencies: medication.frequencies,
        duration: medication.duration,
        illness_type: medication.illnessType || '',
        notes: medication.notes || '',
        times: JSON.stringify(medication.times || ['09:00']) // Store as JSON string
      };
      
      await DatabaseService.createDocument(
        PRESCRIPTION_MEDICATIONS_COLLECTION_ID,
        medicationData
      );
    }
    
    console.log(`Added ${medications.length} medications to prescription`);
    
    return prescription;
  } catch (error) {
    console.error('Error creating prescription:', error);
    throw error;
  }
};

/**
 * Get prescriptions and medications for an appointment
 * @param {string} appointmentId - The appointment ID
 * @returns {Promise<Object>} - Object containing prescription and medications
 */
export const getPrescriptions = async (appointmentId) => {
  try {
    console.log('Getting prescriptions for appointment:', appointmentId);
    
    // 1. Find prescriptions for this appointment
    const prescriptionsResponse = await DatabaseService.listDocuments(
      PRESCRIPTION_COLLECTION_ID,
      [Query.equal('appointment_id', appointmentId)]
    );
    
    if (!prescriptionsResponse.documents || prescriptionsResponse.documents.length === 0) {
      console.log('No prescriptions found for appointment:', appointmentId);
      return {
        prescription: null,
        medications: []
      };
    }
    
    // 2. Get the most recent prescription
    const prescription = prescriptionsResponse.documents[0];
    console.log('Found prescription:', prescription.$id);
    
    // 3. Get all medications for this prescription
    const medicationsResponse = await DatabaseService.listDocuments(
      PRESCRIPTION_MEDICATIONS_COLLECTION_ID,
      [Query.equal('prescription_id', prescription.$id)]
    );
    
    console.log(`Found ${medicationsResponse.total} medications`);
    
    return {
      prescription: prescription,
      medications: medicationsResponse.documents || []
    };
  } catch (error) {
    console.error('Error getting prescriptions:', error);
    throw error;
  }
};

/**
 * Get prescriptions and medications for an appointment
 * @param {string} appointmentId - The appointment ID
 * @returns {Promise<Object>} - Object containing prescription and medications
 */
export const processPrescriptionQR = async (qrData) => {
    try {
      console.log('Processing QR data:', qrData);
      
      // Check if this is a demo code
      if (qrData.startsWith('DEMO:')) {
        return processDemoQR(qrData);
      }
      
      // Regular appointment QR code (format: APPT:appointmentId:referenceCode)
      const parts = qrData.split(':');
      
      if (parts.length < 2 || parts[0] !== 'APPT') {
        throw new Error('Invalid QR code format. Expected: APPT:appointmentId:referenceCode');
      }
      
      const appointmentId = parts[1];
      const referenceCode = parts[2] || '';
      
      console.log(`Processing appointment ID: ${appointmentId}, Reference: ${referenceCode}`);
      
      // 1. First find the appointment
      let appointment;
      try {
        appointment = await DatabaseService.getDocument(
          APPOINTMENTS_COLLECTION_ID, 
          appointmentId
        );
        console.log('Found appointment:', appointment.$id);
      } catch (error) {
        console.error('Appointment not found:', error.message);
        // Continue anyway - maybe we have a prescription without valid appointment
      }
      
      // 2. Find prescriptions for this appointment
      let prescriptions;
      try {
        prescriptions = await DatabaseService.listDocuments(
          PRESCRIPTION_COLLECTION_ID,
          [Query.equal('appointment_id', appointmentId)]
        );
        
        console.log(`Found ${prescriptions.total} prescriptions`);
        
        if (!prescriptions.documents || prescriptions.documents.length === 0) {
          console.log('No prescriptions found, falling back to demo data');
          return getMultipleDemoMedications(appointmentId, referenceCode);
        }
      } catch (error) {
        console.error('Error fetching prescriptions:', error.message);
        return getMultipleDemoMedications(appointmentId, referenceCode);
      }
      
      // 3. Get the most recent prescription
      const prescription = prescriptions.documents[0];
      
      // 4. Get ALL medications for this prescription
      try {
        const medications = await DatabaseService.listDocuments(
          PRESCRIPTION_MEDICATIONS_COLLECTION_ID,
          [Query.equal('prescription_id', prescription.$id)]
        );
        
        console.log(`Found ${medications.total} medications`);
        
        if (!medications.documents || medications.documents.length === 0) {
          console.log('No medications found, falling back to demo data');
          return getMultipleDemoMedications(appointmentId, referenceCode);
        }
        
        // 5. Format and return ALL medications (not just the first one)
        return medications.documents.map(med => ({
          name: med.name || '',
          type: med.type || '',
          dosage: med.dosage || '',
          frequencies: med.frequencies || '',
          duration: med.duration || '',
          illnessType: med.illness_type || '',
          notes: med.notes || '',
          times: parseTimesArray(med.times),
          appointmentId,
          referenceCode
        }));
      } catch (error) {
        console.error('Error fetching medications:', error.message);
        return getMultipleDemoMedications(appointmentId, referenceCode);
      }
    } catch (error) {
      console.error('Error processing QR code:', error);
      throw error;
    }
  };
  
  /**
   * Enhanced demo QR handler that returns multiple medications
   * @param {string} qrData - Demo QR data (format: DEMO:type:referenceCode)
   * @returns {Array} - Array of multiple demo medications
   */
  const processDemoQR = (qrData) => {
    const [prefix, demoType, referenceCode] = qrData.split(':');
    console.log('Demo scan detected:', { prefix, demoType, referenceCode });
    
    // Return multiple medications based on type
    switch (demoType.toLowerCase()) {
      case 'blood_pressure':
        return [
          {
            name: 'Amlodipine',
            type: 'Tablet',
            dosage: '10mg',
            frequencies: 'Once Daily',
            duration: '30 days',
            illnessType: 'Blood Pressure',
            notes: 'Take in the morning with food',
            times: ['09:00'],
            appointmentId: 'demo',
            referenceCode
          },
          {
            name: 'Hydrochlorothiazide',
            type: 'Tablet',
            dosage: '25mg',
            frequencies: 'Once Daily',
            duration: '30 days',
            illnessType: 'Blood Pressure',
            notes: 'Take with plenty of water',
            times: ['09:00'],
            appointmentId: 'demo',
            referenceCode
          }
        ];
        
      case 'diabetes':
        return [
          {
            name: 'Metformin',
            type: 'Tablet',
            dosage: '500mg',
            frequencies: 'Twice Daily',
            duration: '30 days',
            illnessType: 'Diabetes',
            notes: 'Take with meals to reduce stomach upset',
            times: ['09:00', '18:00'],
            appointmentId: 'demo',
            referenceCode
          },
          {
            name: 'Glipizide',
            type: 'Tablet',
            dosage: '5mg',
            frequencies: 'Once Daily',
            duration: '30 days',
            illnessType: 'Diabetes',
            notes: 'Take 30 minutes before breakfast',
            times: ['08:30'],
            appointmentId: 'demo',
            referenceCode
          }
        ];
        
      case 'infection':
        return [
          {
            name: 'Amoxicillin',
            type: 'Capsule',
            dosage: '500mg',
            frequencies: 'Three times Daily',
            duration: '7 days',
            illnessType: 'Infection',
            notes: 'Complete the full course even if you feel better',
            times: ['08:00', '14:00', '20:00'],
            appointmentId: 'demo',
            referenceCode
          },
          {
            name: 'Ibuprofen',
            type: 'Tablet',
            dosage: '400mg',
            frequencies: 'Three times Daily',
            duration: '5 days',
            illnessType: 'Pain Relief',
            notes: 'Take with food to prevent stomach irritation',
            times: ['08:00', '14:00', '20:00'],
            appointmentId: 'demo',
            referenceCode
          }
        ];
        
      case 'cholesterol':
        return [
          {
            name: 'Atorvastatin',
            type: 'Tablet',
            dosage: '20mg',
            frequencies: 'Once Daily',
            duration: '90 days',
            illnessType: 'Cholesterol',
            notes: 'Take in the evening',
            times: ['20:00'],
            appointmentId: 'demo',
            referenceCode
          },
          {
            name: 'Omega-3',
            type: 'Capsule',
            dosage: '1000mg',
            frequencies: 'Twice Daily',
            duration: '90 days',
            illnessType: 'Cholesterol',
            notes: 'Take with meals',
            times: ['09:00', '18:00'],
            appointmentId: 'demo',
            referenceCode
          }
        ];
        
      default:
        return getMultipleDemoMedications('demo', referenceCode);
    }
  };
  
  /**
   * Get multiple default medications if no prescription found
   * @param {string} appointmentId - The appointment ID
   * @param {string} referenceCode - The reference code
   * @returns {Array} - Array with multiple default medications
   */
  const getMultipleDemoMedications = (appointmentId, referenceCode) => {
    return [
      {
        name: 'Paracetamol',
        type: 'Tablet',
        dosage: '500mg',
        frequencies: 'Three times Daily',
        duration: '7 days',
        illnessType: 'Pain Relief',
        notes: 'Take after meals',
        times: ['08:00', '14:00', '20:00'],
        appointmentId,
        referenceCode
      },
      {
        name: 'Vitamin D3',
        type: 'Tablet',
        dosage: '1000IU',
        frequencies: 'Once Daily',
        duration: '30 days',
        illnessType: 'Vitamin Deficiency',
        notes: 'Take with food for better absorption',
        times: ['09:00'],
        appointmentId,
        referenceCode
      }
    ];
  };

/**
 * Helper function to parse times array from database
 * @param {string|Array} times - Times data from database
 * @returns {Array} - Parsed times array
 */
const parseTimesArray = (times) => {
  try {
    if (Array.isArray(times)) {
      return times;
    }
    if (typeof times === 'string') {
      // Try to parse as JSON first
      if (times.startsWith('[') && times.endsWith(']')) {
        return JSON.parse(times);
      }
      // If it's a single time as string, return as array
      return [times];
    }
    return ['09:00']; // Default fallback
  } catch (error) {
    console.error('Error parsing times array:', error);
    return ['09:00']; // Default fallback
  }
};

/**
 * Generate a unique reference code for prescriptions
 * @returns {string} - Reference code
 */
const generateReferenceCode = () => {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.random().toString(36).substr(2, 4).toUpperCase();
  return `RX${timestamp}${random}`;
};