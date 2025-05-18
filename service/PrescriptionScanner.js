// This module handles QR code scanning for prescriptions

/**
 * Process QR code data and extract prescription information
 * In a real implementation, this would connect to a backend API to fetch prescription details
 * @param {string} qrData - Data from the scanned QR code (format: APPT:appointmentId:referenceCode)
 * @returns {Promise<Array>} - Array of medications from the prescription
 */

// service/PrescriptionScanner.js
import { DatabaseService, Query, ID } from '../configs/AppwriteConfig';

// Collection IDs from your screenshots
const PRESCRIPTION_COLLECTION_ID = '6824b4cd000e65702ee3'; // Prescriptions collection
const PRESCRIPTION_MEDICATIONS_COLLECTION_ID = '6824b57b0008686a86b3'; // Prescription medications
const APPOINTMENTS_COLLECTION_ID = '67e0332c0001131d71ec'; // Appointments

/**
 * Add a prescription for an appointment
 * @param {string} appointmentId - The ID of the appointment
 * @param {Array} medications - Array of medication objects
 * @param {string} doctorNotes - Optional notes from the doctor
 * @returns {Promise<boolean>}
 */
export const addPrescription = async (appointmentId, medications, doctorNotes = '') => {
  try {
    console.log("Adding prescription for appointment:", appointmentId);
    
    // 1. First create the prescription entry
    const prescriptionData = {
      appointment_id: appointmentId,
      status: 'Active',
      issued_date: new Date().toISOString().split('T')[0], // Today's date in YYYY-MM-DD
      doctor_notes: doctorNotes || '',
      reference_code: Math.random().toString(36).substring(2, 10) // Random reference code
    };
    
    console.log("Creating prescription record:", prescriptionData);
    
    const prescription = await DatabaseService.createDocument(
      PRESCRIPTION_COLLECTION_ID,
      prescriptionData
    );
    
    console.log("Prescription created with ID:", prescription.$id);
    
    // 2. Then add each medication linked to this prescription
    const formattedMedications = medications.map(med => ({
      ...med,
      times: Array.isArray(med.times) ? med.times : [med.times || '09:00']
    }));
    
    // Create an entry for each medication in the prescription medications collection
    for (const medication of formattedMedications) {
      // Make one final check to ensure times is an array of strings
      const medWithValidTimes = {
        ...medication,
        times: Array.isArray(medication.times) 
          ? medication.times.map(t => String(t)) 
          : ['09:00']
      };
      
      console.log("Adding medication to prescription:", medWithValidTimes.name);
      
      await DatabaseService.createDocument(
        PRESCRIPTION_MEDICATIONS_COLLECTION_ID,
        {
          prescription_id: prescription.$id, // Link to the prescription we just created
          name: medWithValidTimes.name,
          type: medWithValidTimes.type,
          dosage: medWithValidTimes.dosage,
          frequencies: medWithValidTimes.frequencies,
          duration: medWithValidTimes.duration,
          illness_type: medWithValidTimes.illnessType || '',
          notes: medWithValidTimes.notes || '',
          times: medWithValidTimes.times // This is now guaranteed to be an array
        }
      );
    }
    
    // 3. Update the appointment to mark it as having a prescription
    await DatabaseService.updateDocument(
      APPOINTMENTS_COLLECTION_ID,
      appointmentId,
      {
        has_prescription: true
      }
    );
    
    console.log("All medications added successfully and appointment updated");
    
    return true;
  } catch (error) {
    console.error('Error adding prescription:', error);
    throw error;
  }
};

/**
 * Get prescriptions for an appointment
 * @param {string} appointmentId - The ID of the appointment
 * @returns {Promise<Object>} - Prescription with medications
 */
export const getPrescriptions = async (appointmentId) => {
  try {
    // First get the prescription record
    const prescriptionsResponse = await DatabaseService.listDocuments(
      PRESCRIPTION_COLLECTION_ID,
      [Query.equal('appointment_id', appointmentId)]
    );
    
    if (!prescriptionsResponse.documents || prescriptionsResponse.documents.length === 0) {
      return { prescription: null, medications: [] };
    }
    
    const prescription = prescriptionsResponse.documents[0];
    
    // Then get the medications for this prescription
    const medicationsResponse = await DatabaseService.listDocuments(
      PRESCRIPTION_MEDICATIONS_COLLECTION_ID,
      [Query.equal('prescription_id', prescription.$id)]
    );
    
    return {
      prescription,
      medications: medicationsResponse.documents || []
    };
  } catch (error) {
    console.error('Error getting prescriptions:', error);
    return { prescription: null, medications: [] };
  }
};

/**
 * Delete a specific prescription and its medications
 * @param {string} prescriptionId - The document ID of the prescription
 * @returns {Promise<boolean>}
 */
export const deletePrescription = async (prescriptionId) => {
  try {
    // First delete all medications associated with this prescription
    const medicationsResponse = await DatabaseService.listDocuments(
      PRESCRIPTION_MEDICATIONS_COLLECTION_ID,
      [Query.equal('prescription_id', prescriptionId)]
    );
    
    if (medicationsResponse.documents && medicationsResponse.documents.length > 0) {
      for (const med of medicationsResponse.documents) {
        await DatabaseService.deleteDocument(
          PRESCRIPTION_MEDICATIONS_COLLECTION_ID,
          med.$id
        );
      }
    }
    
    // Then delete the prescription itself
    await DatabaseService.deleteDocument(
      PRESCRIPTION_COLLECTION_ID,
      prescriptionId
    );
    
    return true;
  } catch (error) {
    console.error('Error deleting prescription:', error);
    return false;
  }
};

// Export constants for use elsewhere
export const COLLECTIONS = {
  PRESCRIPTIONS: PRESCRIPTION_COLLECTION_ID,
  PRESCRIPTION_MEDICATIONS: PRESCRIPTION_MEDICATIONS_COLLECTION_ID,
  APPOINTMENTS: APPOINTMENTS_COLLECTION_ID
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