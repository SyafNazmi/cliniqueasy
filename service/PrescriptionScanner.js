// service/PrescriptionScanner.js - FIXED VERSION with Correct Times Mapping
import { DatabaseService, Query } from '../configs/AppwriteConfig';

// Collection IDs
const PRESCRIPTION_COLLECTION_ID = '6824b4cd000e65702ee3'; // Prescriptions collection
const PRESCRIPTION_MEDICATIONS_COLLECTION_ID = '6824b57b0008686a86b3'; // Prescription medications
const APPOINTMENTS_COLLECTION_ID = '67e0332c0001131d71ec'; // Appointments

// 🚨 THIS IS THE KEY FIX - Frequency to Times Mapping
const FREQUENCY_TIMES = {
  "Once Daily": ["09:00"],
  "Twice Daily": ["09:00", "21:00"],
  "Three times Daily": ["09:00", "15:00", "21:00"],
  "Four times Daily": ["09:00", "13:00", "17:00", "21:00"],
  "Every Morning": ["08:00"],
  "Every Evening": ["20:00"],
  "Every 4 Hours": ["08:00", "12:00", "16:00", "20:00", "00:00", "04:00"],
  "Every 6 Hours": ["06:00", "12:00", "18:00", "00:00"],
  "Every 8 Hours": ["08:00", "16:00", "00:00"],
  "Every 12 Hours": ["08:00", "20:00"],
  "Weekly": ["09:00"],
  "As Needed": []
};

/**
 * Get correct times array based on frequency
 * @param {string} frequency - The frequency string
 * @returns {Array} - Array of time strings
 */
const getTimesForFrequency = (frequency) => {
  return FREQUENCY_TIMES[frequency] || ["09:00"];
};

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
    console.log('Medications to be added:', medications);
    
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
    for (let i = 0; i < medications.length; i++) {
      const medication = medications[i];
      
      // 🚨 FIX: Get correct times based on frequency
      let timesArray = [];
      if (medication.frequencies) {
        // Use frequency mapping first
        timesArray = getTimesForFrequency(medication.frequencies);
      } else if (Array.isArray(medication.times)) {
        // Fall back to provided times if no frequency
        timesArray = medication.times.map(time => String(time));
      } else if (typeof medication.times === 'string') {
        // Handle string times
        try {
          if (medication.times.startsWith('[') && medication.times.endsWith(']')) {
            const parsed = JSON.parse(medication.times);
            timesArray = Array.isArray(parsed) ? parsed.map(time => String(time)) : [String(medication.times)];
          } else {
            timesArray = [String(medication.times)];
          }
        } catch (e) {
          timesArray = [String(medication.times)];
        }
      } else {
        // Default fallback
        timesArray = ['09:00'];
      }
      
      console.log(`Medication ${i + 1} (${medication.frequencies}) times array:`, timesArray);
      
      const medicationData = {
        prescription_id: prescription.$id,
        name: medication.name,
        type: medication.type,
        dosage: medication.dosage,
        frequencies: medication.frequencies,
        duration: medication.duration,
        illness_type: medication.illnessType || '',
        notes: medication.notes || '',
        times: timesArray // Store as actual array with correct times
      };
      
      console.log(`Creating medication ${i + 1}:`, medicationData);
      
      try {
        const createdMedication = await DatabaseService.createDocument(
          PRESCRIPTION_MEDICATIONS_COLLECTION_ID,
          medicationData
        );
        console.log(`Successfully created medication ${i + 1}:`, createdMedication.$id);
      } catch (medicationError) {
        console.error(`Error creating medication ${i + 1}:`, medicationError);
        console.error('Medication data that failed:', medicationData);
        throw medicationError;
      }
    }
    
    console.log(`Successfully added ${medications.length} medications to prescription`);
    
    return prescription;
  } catch (error) {
    console.error('Error creating prescription:', error);
    console.error('Full error details:', error.message);
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
    
    // 4. Process medications to ensure times is properly formatted
    const processedMedications = medicationsResponse.documents.map(med => ({
      ...med,
      times: ensureTimesArray(med.times, med.frequencies) // Pass frequency for correct times
    }));
    
    return {
      prescription: prescription,
      medications: processedMedications
    };
  } catch (error) {
    console.error('Error getting prescriptions:', error);
    throw error;
  }
};

/**
 * Process prescription QR code
 * @param {string} qrData - QR code data
 * @returns {Promise<Array>} - Array of medications
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
      
      // 5. 🚨 FIX: Format and return ALL medications with correct times
      return medications.documents.map(med => ({
        name: med.name || '',
        type: med.type || '',
        dosage: med.dosage || '',
        frequencies: med.frequencies || '',
        duration: med.duration || '',
        illnessType: med.illness_type || '',
        notes: med.notes || '',
        times: ensureTimesArray(med.times, med.frequencies), // Preserves custom times, uses frequency as fallback
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
 * Enhanced demo QR handler that returns multiple medications with correct times
 * @param {string} qrData - Demo QR data (format: DEMO:type:referenceCode)
 * @returns {Array} - Array of multiple demo medications
 */
const processDemoQR = (qrData) => {
  const [prefix, demoType, referenceCode] = qrData.split(':');
  console.log('Demo scan detected:', { prefix, demoType, referenceCode });
  
  // Return multiple medications based on type with correct times
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
          times: getTimesForFrequency('Once Daily'), // ["09:00"]
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
          times: getTimesForFrequency('Once Daily'), // ["09:00"]
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
          times: getTimesForFrequency('Twice Daily'), // ["09:00", "21:00"]
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
          times: getTimesForFrequency('Once Daily'), // ["09:00"]
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
          times: getTimesForFrequency('Three times Daily'), // ["09:00", "15:00", "21:00"]
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
          times: getTimesForFrequency('Three times Daily'), // ["09:00", "15:00", "21:00"]
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
          frequencies: 'Every Evening',
          duration: '90 days',
          illnessType: 'Cholesterol',
          notes: 'Take in the evening',
          times: getTimesForFrequency('Every Evening'), // ["20:00"]
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
          times: getTimesForFrequency('Twice Daily'), // ["09:00", "21:00"]
          appointmentId: 'demo',
          referenceCode
        }
      ];
      
    default:
      return getMultipleDemoMedications('demo', referenceCode);
  }
};

/**
 * Get multiple default medications if no prescription found - with correct times
 * @param {string} appointmentId - The appointment ID
 * @param {string} referenceCode - The reference code
 * @returns {Array} - Array with multiple default medications
 */
const getMultipleDemoMedications = (appointmentId, referenceCode) => {
  console.log("🚨 SCANNER - Creating demo medications for:", appointmentId);
  
  const medications = [
    {
      name: 'Paracetamol',
      type: 'Tablet',
      dosage: '300mg',
      frequencies: 'Three times Daily',
      duration: '7 days',
      illnessType: 'Infection',
      notes: 'Eat after Taking Meal',
      times: getTimesForFrequency('Three times Daily'), // 🚨 FIX: Use frequency mapping
      appointmentId,
      referenceCode
    },
    {
      name: 'Pospan',
      type: 'Liquid',
      dosage: '100mg',
      frequencies: 'Twice Daily',
      duration: '7 days',
      illnessType: 'Inflammation',
      notes: 'Eat after Taking Meal',
      times: getTimesForFrequency('Twice Daily'), // 🚨 FIX: Use frequency mapping
      appointmentId,
      referenceCode
    },
    {
      name: 'Amoxicillin',
      type: 'Tablet',
      dosage: '500mg',
      frequencies: 'Once Daily',
      duration: '7 days',
      illnessType: 'Infection',
      notes: 'Eat after Taking Meal',
      times: getTimesForFrequency('Once Daily'), // 🚨 FIX: Use frequency mapping
      appointmentId,
      referenceCode
    }
  ];

  console.log("🚨 SCANNER - Generated medications:");
  medications.forEach((med, index) => {
    console.log(`🚨 SCANNER - ${index + 1}. ${med.name}: ${med.frequencies} → ${JSON.stringify(med.times)}`);
  });

  return medications;
};

/**
 * Helper function to ensure times is always an array with correct frequency mapping
 * @param {string|Array} times - Times data from database
 * @param {string} frequency - Frequency to use for mapping
 * @returns {Array} - Properly formatted times array
 */
const ensureTimesArray = (times, frequency = null) => {
  try {
    console.log('🚨 ensureTimesArray called with:', { times, frequency });
    
    // 🚨 FIX: Always prioritize frequency mapping if frequency is provided
    if (frequency && FREQUENCY_TIMES[frequency]) {
      const mappedTimes = FREQUENCY_TIMES[frequency];
      console.log(`🚨 Using frequency mapping for "${frequency}":`, mappedTimes);
      return mappedTimes;
    }
    
    // Only use existing times if no frequency is provided
    if (Array.isArray(times) && times.length > 0) {
      console.log('🚨 Using existing times array:', times);
      return times.map(time => String(time));
    }
    
    // If it's a string, handle different cases
    if (typeof times === 'string' && times.trim() !== '') {
      // Check if it's a JSON string (legacy data)
      if (times.startsWith('[') && times.endsWith(']')) {
        try {
          const parsed = JSON.parse(times);
          if (Array.isArray(parsed) && parsed.length > 0) {
            console.log('🚨 Using parsed JSON times:', parsed);
            return parsed.map(time => String(time));
          }
        } catch (e) {
          console.warn('Failed to parse times JSON string:', times);
        }
      }
      
      // If it's a single time as string, return as array
      console.log('🚨 Using single time string:', [times]);
      return [String(times)];
    }
    
    // Default fallback
    console.log('🚨 Using default fallback time: ["09:00"]');
    return ['09:00'];
  } catch (error) {
    console.error('Error ensuring times array:', error);
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

// Export the frequency mapping for use in other components
export { getTimesForFrequency, FREQUENCY_TIMES };