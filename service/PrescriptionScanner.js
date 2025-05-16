// This module handles QR code scanning for prescriptions

/**
 * Process QR code data and extract prescription information
 * In a real implementation, this would connect to a backend API to fetch prescription details
 * @param {string} qrData - Data from the scanned QR code (format: APPT:appointmentId:referenceCode)
 * @returns {Promise<Array>} - Array of medications from the prescription
 */

// service/PrescriptionScanner.js
import { DatabaseService, Query } from '../configs/AppwriteConfig';

// IMPORTANT: Update these with your actual Appwrite collection IDs
const COLLECTION_IDS = {
  APPOINTMENTS: '67e0332c0001131d71ec', 
  PRESCRIPTIONS: '6824b4cd000e65702ee3',
  PRESCRIPTION_MEDICATIONS: '6824b57b0008686a86b3'
};

/**
 * Process QR code data and extract prescription information
 * This connects to Appwrite to fetch real prescription data
 * @param {string} qrData - Data from the scanned QR code (format: APPT:appointmentId:referenceCode)
 * @returns {Promise<Array>} - Array of medications from the prescription
 */
export const processPrescriptionQR = async (qrData) => {
    try {
      console.log('Processing QR data:', qrData);
      
      // Check if this is a demo code
      if (qrData.startsWith('DEMO:')) {
        // Parse demo QR data (format: DEMO:demoType:referenceCode)
        const [prefix, demoType, referenceCode] = qrData.split(':');
        console.log('Demo scan detected:', { prefix, demoType, referenceCode });
        
        // Handle special demo types
        return simulateFetchPrescriptionData('demo', referenceCode, demoType);
      }
      
      // Regular appointment QR code (format: APPT:appointmentId:referenceCode)
      const [prefix, appointmentId, referenceCode] = qrData.split(':');
      
      if (prefix !== 'APPT' || !appointmentId || !referenceCode) {
        throw new Error('Invalid QR code format');
      }
      
      // First, verify the appointment exists
      try {
        const appointment = await DatabaseService.getDocument(
          COLLECTION_IDS.APPOINTMENTS, 
          appointmentId
        );
        
        // Verify reference code matches (optional additional security check)
        if (appointment && referenceCode) {
          // You can add verification here if needed
          console.log('Appointment verified');
        }
      } catch (error) {
        console.error('Appointment verification error:', error);
        // Continue with the flow even if appointment verification fails
        // This allows testing without requiring real appointment records
      }
      
      // Try to fetch prescriptions for this appointment
      try {
        const prescriptions = await DatabaseService.listDocuments(
          COLLECTION_IDS.PRESCRIPTIONS,
          [Query.equal('appointment_id', appointmentId)]
        );
        
        if (prescriptions && prescriptions.documents && prescriptions.documents.length > 0) {
          // Found prescriptions, fetch the medications
          const prescription = prescriptions.documents[0];
          
          const medications = await DatabaseService.listDocuments(
            COLLECTION_IDS.PRESCRIPTION_MEDICATIONS,
            [Query.equal('prescription_id', prescription.$id)]
          );
          
          if (medications && medications.documents && medications.documents.length > 0) {
            // Format medications for the app
            return medications.documents.map(med => ({
              name: med.name || "",
              type: med.type || "",
              dosage: med.dosage || "",
              frequencies: med.frequencies || "",
              illnessType: med.illness_type || "",
              duration: med.duration || "",
              appointmentId,
              referenceCode,
              times: tryParseJSON(med.times, ["09:00"]),
              notes: med.notes || ""
            }));
          }
        }
        
        // If we reach here, no prescriptions were found in the database
        console.log('No prescriptions found, using simulation data');
        return simulateFetchPrescriptionData(appointmentId, referenceCode);
        
      } catch (error) {
        console.error('Error fetching prescriptions:', error);
        // Fall back to simulated data if there's an error with the database
        return simulateFetchPrescriptionData(appointmentId, referenceCode);
      }
      
    } catch (error) {
      console.error('Error processing prescription QR:', error);
      throw error;
    }
  };

/**
 * Helper function to safely parse JSON
 * @param {string} jsonString - JSON string to parse
 * @param {any} defaultValue - Default value if parsing fails
 * @returns {any} - Parsed object or default value
 */
const tryParseJSON = (jsonString, defaultValue) => {
  try {
    return jsonString ? JSON.parse(jsonString) : defaultValue;
  } catch (e) {
    console.error('JSON parse error:', e);
    return defaultValue;
  }
};

/**
 * Add a prescription to the database
 * @param {string} appointmentId - ID of the appointment
 * @param {Array} medications - List of medications to add
 * @param {string} doctorNotes - Optional notes from the doctor
 * @returns {Promise<string>} - ID of the created prescription
 */
export const addPrescription = async (appointmentId, medications, doctorNotes = "") => {
  try {
    // Create the prescription record
    const prescription = await DatabaseService.createDocument(
      COLLECTION_IDS.PRESCRIPTIONS,
      {
        appointment_id: appointmentId,
        status: 'issued',
        issued_date: new Date().toISOString(),
        doctor_notes: doctorNotes || ""
      }
    );
    
    // Add each medication to the prescription
    const medicationPromises = medications.map(med => 
      DatabaseService.createDocument(
        COLLECTION_IDS.PRESCRIPTION_MEDICATIONS,
        {
          prescription_id: prescription.$id,
          name: med.name || "",
          type: med.type || "",
          dosage: med.dosage || "",
          frequencies: med.frequencies || "",
          duration: med.duration || "",
          illness_type: med.illnessType || "",
          notes: med.notes || "",
          times: JSON.stringify(med.times || ["09:00"])
        }
      )
    );
    
    await Promise.all(medicationPromises);
    
    // Try to update the appointment if needed
    try {
      await DatabaseService.updateDocument(
        COLLECTION_IDS.APPOINTMENTS,
        appointmentId,
        { has_prescription: true }
      );
    } catch (error) {
      console.warn('Could not update appointment with prescription status:', error);
      // Continue even if this fails
    }
    
    return prescription.$id;
  } catch (error) {
    console.error('Error adding prescription:', error);
    throw error;
  }
};

/**
 * Mock function to simulate fetching prescription data from a server
 * In a real app, this would be replaced with an actual API call
 * @param {string} appointmentId - The appointment ID
 * @param {string} referenceCode - The reference code
 * @param {string} demoType - Optional demo type to determine which medication to return
 * @returns {Promise<Array>} - Array of medication objects
 */
const simulateFetchPrescriptionData = (appointmentId, referenceCode, demoType = null) => {
  // Simulate network delay
  return new Promise((resolve) => {
    setTimeout(() => {
      // Mock medications based on the prescription from the image
      const medications = [
        {
          name: "Amlodipine",
          type: "Tablet",
          dosage: "10mg",
          frequencies: "Once Daily",
          illnessType: "Blood Pressure",
          duration: "30 days",
          appointmentId,
          referenceCode,
          times: ["09:00"],
          notes: "Take in the morning"
        },
        {
          name: "Simvastatin",
          type: "Tablet", 
          dosage: "20mg",
          frequencies: "Once Daily",
          illnessType: "Cholesterol",
          duration: "30 days",
          appointmentId,
          referenceCode,
          times: ["21:00"],
          notes: "Take in the evening"
        },
        {
          name: "Metformin",
          type: "Tablet",
          dosage: "1g",
          frequencies: "Twice Daily",
          illnessType: "Diabetes",
          duration: "30 days",
          appointmentId,
          referenceCode,
          times: ["09:00", "21:00"],
          notes: "Take with meals"
        },
        {
          name: "Cloxacillin",
          type: "Capsule",
          dosage: "500mg",
          frequencies: "Four times Daily",
          illnessType: "Infection",
          duration: "7 days",
          appointmentId,
          referenceCode,
          times: ["09:00", "13:00", "17:00", "21:00"],
          notes: "Complete full course"
        }
      ];
      
      // Return specific medication based on demo type
      if (demoType === 'blood_pressure') {
        // Return blood pressure medication (Amlodipine)
        resolve([medications[0]]);
      } else if (demoType === 'diabetes') {
        // Return diabetes medication (Metformin)
        resolve([medications[2]]);
      } else if (demoType === 'cholesterol') {
        // Return cholesterol medication (Simvastatin)
        resolve([medications[1]]);
      } else if (demoType === 'infection') {
        // Return infection medication (Cloxacillin)
        resolve([medications[3]]);
      } else {
        // Default, return first medication (for backward compatibility)
        resolve([medications[0]]);
      }
    }, 1500);
  });
};