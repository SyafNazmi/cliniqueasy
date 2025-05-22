// This module handles QR code scanning for prescriptions

/**
 * Process QR code data and extract prescription information
 * In a real implementation, this would connect to a backend API to fetch prescription details
 * @param {string} qrData - Data from the scanned QR code (format: APPT:appointmentId:referenceCode)
 * @returns {Promise<Array>} - Array of medications from the prescription
 */

// service/PrescriptionScanner.js
import { DatabaseService, Query } from '../configs/AppwriteConfig';

// Collection IDs
const PRESCRIPTION_COLLECTION_ID = '6824b4cd000e65702ee3'; // Prescriptions collection
const PRESCRIPTION_MEDICATIONS_COLLECTION_ID = '6824b57b0008686a86b3'; // Prescription medications
const APPOINTMENTS_COLLECTION_ID = '67e0332c0001131d71ec'; // Appointments

/**
 * Get prescriptions and medications for an appointment
 * @param {string} appointmentId - The appointment ID
 * @returns {Promise<Object>} - Object containing prescription and medications
 */
export const getPrescriptions = async (appointmentId) => {
  try {
    console.log(`Getting prescriptions for appointment: ${appointmentId}`);
    
    // Find prescriptions for this appointment
    const prescriptions = await DatabaseService.listDocuments(
      PRESCRIPTION_COLLECTION_ID,
      [Query.equal('appointment_id', appointmentId)]
    );
    
    if (!prescriptions.documents || prescriptions.documents.length === 0) {
      console.log('No prescriptions found for this appointment');
      return { prescription: null, medications: [] };
    }
    
    // Get the most recent prescription
    const prescription = prescriptions.documents[0];
    
    // Get medications for this prescription
    const medications = await DatabaseService.listDocuments(
      PRESCRIPTION_MEDICATIONS_COLLECTION_ID,
      [Query.equal('prescription_id', prescription.$id)]
    );
    
    return {
      prescription: prescription,
      medications: medications.documents || []
    };
  } catch (error) {
    console.error('Error getting prescriptions:', error);
    throw error;
  }
};

/**
 * Process QR code data and extract prescription information
 * @param {string} qrData - Data from the scanned QR code (format: APPT:appointmentId:referenceCode)
 * @returns {Promise<Array>} - Array of medications from the prescription
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
        return getDefaultMedication(appointmentId, referenceCode);
      }
    } catch (error) {
      console.error('Error fetching prescriptions:', error.message);
      return getDefaultMedication(appointmentId, referenceCode);
    }
    
    // 3. Get the most recent prescription
    const prescription = prescriptions.documents[0];
    
    // 4. Get medications for this prescription
    try {
      const medications = await DatabaseService.listDocuments(
        PRESCRIPTION_MEDICATIONS_COLLECTION_ID,
        [Query.equal('prescription_id', prescription.$id)]
      );
      
      console.log(`Found ${medications.total} medications`);
      
      if (!medications.documents || medications.documents.length === 0) {
        console.log('No medications found, falling back to demo data');
        return getDefaultMedication(appointmentId, referenceCode);
      }
      
      // 5. Format and return the medications
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
      return getDefaultMedication(appointmentId, referenceCode);
    }
  } catch (error) {
    console.error('Error processing QR code:', error);
    throw error;
  }
};

/**
 * Handle demo QR codes
 * @param {string} qrData - Demo QR data (format: DEMO:type:referenceCode)
 * @returns {Array} - Array of demo medications
 */
const processDemoQR = (qrData) => {
  // Parse demo QR data (format: DEMO:demoType:referenceCode)
  const [prefix, demoType, referenceCode] = qrData.split(':');
  console.log('Demo scan detected:', { prefix, demoType, referenceCode });
  
  // Demo medications based on type
  switch (demoType.toLowerCase()) {
    case 'blood_pressure':
      return [{
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
      }];
      
    case 'diabetes':
      return [{
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
      }];
      
    case 'infection':
      return [{
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
      }];
      
    case 'cholesterol':
      return [{
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
      }];
      
    default:
      // Default medication
      return getDefaultMedication('demo', referenceCode);
  }
};

/**
 * Get a default medication if no prescription found
 * @param {string} appointmentId - The appointment ID
 * @param {string} referenceCode - The reference code
 * @returns {Array} - Array with one default medication
 */
const getDefaultMedication = (appointmentId, referenceCode) => {
  return [{
    name: 'Generic Medication',
    type: 'Tablet',
    dosage: '100mg',
    frequencies: 'Once Daily',
    duration: '30 days',
    illnessType: 'General',
    notes: 'This is a placeholder medication. Please consult your doctor for details.',
    times: ['09:00'],
    appointmentId,
    referenceCode
  }];
};

/**
 * Parse times array from database
 * @param {any} times - Times data from database
 * @returns {Array} - Parsed array of times
 */
const parseTimesArray = (times) => {
  if (Array.isArray(times)) {
    return times.map(t => String(t));
  }
  
  if (typeof times === 'string') {
    try {
      // Check if it looks like JSON
      if (times.startsWith('[') && times.endsWith(']')) {
        return JSON.parse(times);
      }
      return [times];
    } catch (e) {
      return [times];
    }
  }
  
  return ['09:00']; // Default
};

export {
  PRESCRIPTION_COLLECTION_ID,
  PRESCRIPTION_MEDICATIONS_COLLECTION_ID,
  APPOINTMENTS_COLLECTION_ID
};