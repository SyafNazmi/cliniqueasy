// service/PrescriptionScanner.js - FIXED VERSION with Security Validation

import { DatabaseService, Query } from '../configs/AppwriteConfig';
import { getLocalStorage } from './Storage';
import { COLLECTIONS } from '../constants/index';
import { FREQUENCIES } from '../constants/MedicationConstants'; // ✅ Import centralized frequencies

/**
 * ✅ Get correct times array based on frequency using centralized constants
 * @param {string} frequency - The frequency string
 * @returns {Array} - Array of time strings
 */
const getTimesForFrequency = (frequency) => {
  const frequencyData = FREQUENCIES.find(freq => freq.label === frequency);
  return frequencyData ? frequencyData.times : ["09:00"];
};

/**
 * 🔒 Generate secure reference code with better entropy
 */
const generateSecureReferenceCode = () => {
  const timestamp = Date.now().toString();
  const random1 = Math.random().toString(36).substr(2, 6).toUpperCase();
  const random2 = Math.random().toString(36).substr(2, 4).toUpperCase();
  
  // Create a more secure reference code: RX + last 8 digits of timestamp + 10 random chars
  return `RX${timestamp.slice(-8)}${random1}${random2}`;
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
    
    // 1. Create the main prescription record with secure reference code
    const prescriptionData = {
      appointment_id: appointmentId,
      doctor_notes: doctorNotes,
      status: 'Active',
      issued_date: new Date().toISOString().split('T')[0],
      reference_code: generateSecureReferenceCode()
    };
    
    const prescription = await DatabaseService.createDocument(
      COLLECTIONS.PRESCRIPTIONS,
      prescriptionData
    );
    
    console.log('Created prescription with secure reference:', prescription.reference_code);
    
    // 2. Add medications
    for (let i = 0; i < medications.length; i++) {
      const medication = medications[i];
      
      let timesArray = getTimesForFrequency(medication.frequencies) || ['09:00'];
      
      const medicationData = {
        prescription_id: prescription.$id,
        name: medication.name,
        type: medication.type,
        dosage: medication.dosage,
        frequencies: medication.frequencies,
        duration: medication.duration,
        illness_type: medication.illnessType || '',
        notes: medication.notes || '',
        times: timesArray
      };
      
      await DatabaseService.createDocument(
        COLLECTIONS.PRESCRIPTION_MEDICATIONS,
        medicationData
      );
    }
    
    console.log(`Successfully added ${medications.length} medications to prescription`);
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
      COLLECTIONS.PRESCRIPTIONS,
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
      COLLECTIONS.PRESCRIPTION_MEDICATIONS,
      [Query.equal('prescription_id', prescription.$id)]
    );
    
    console.log(`Found ${medicationsResponse.total} medications`);
    
    // 4. Process medications to ensure times is properly formatted
    const processedMedications = medicationsResponse.documents.map(med => ({
      ...med,
      times: ensureTimesArray(med.times, med.frequencies)
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
 * 🔒 MAIN SECURITY FUNCTION: Process prescription QR code with comprehensive validation
 * @param {string} qrData - QR code data
 * @returns {Promise<Array>} - Array of medications (only if authorized)
 */
export const processPrescriptionQR = async (qrData) => {
  try {
    console.log('🔒 SECURE SCAN: Processing QR code:', qrData);
    
    // 1. 🔒 Get current user context - SECURITY CHECKPOINT 1
    const currentUser = await getLocalStorage('userDetail');
    if (!currentUser || (!currentUser.uid && !currentUser.userId && !currentUser.$id)) {
      console.error('🔒 SECURITY: No valid user found');
      throw new Error('Please log in to scan prescriptions.');
    }
    
    const userId = currentUser.uid || currentUser.userId || currentUser.$id;
    console.log('🔒 SECURITY: Authorized user:', userId);
    
    // 2. Handle demo codes first (no security needed for demos)
    if (qrData.startsWith('DEMO:')) {
      console.log('🔒 Demo QR detected, skipping security checks');
      return processDemoQR(qrData);
    }
    
    // 3. 🔒 Parse and validate QR format - SECURITY CHECKPOINT 2
    const parts = qrData.split(':');
    if (parts.length < 3 || parts[0] !== 'APPT') {
      await logSecurityEvent(userId, 'UNKNOWN', 'INVALID_QR_FORMAT', 'MEDIUM');
      throw new Error('Invalid QR code format. Please scan a valid prescription QR code from your healthcare provider.');
    }
    
    const appointmentId = parts[1];
    const referenceCode = parts[2];
    
    console.log(`🔒 SECURITY: Validating appointment ${appointmentId} with reference ${referenceCode}`);
    
    // 4. 🔒 SECURITY CHECKPOINT 3: Verify appointment exists and ownership
    let appointment;
    try {
      appointment = await DatabaseService.getDocument(COLLECTIONS.APPOINTMENTS, appointmentId);
    } catch (error) {
      await logSecurityEvent(userId, appointmentId, 'APPOINTMENT_NOT_FOUND', 'HIGH');
      throw new Error('Appointment not found. Please verify the QR code is valid and not expired.');
    }
    
    // 5. 🔒 SECURITY CHECKPOINT 4: Verify patient access (most critical check)
    const isAuthorized = await verifyPatientAccess(appointment, currentUser);
    if (!isAuthorized) {
      // Log critical security violation
      await logSecurityEvent(userId, appointmentId, 'UNAUTHORIZED_QR_SCAN_ATTEMPT', 'CRITICAL');
      throw new Error('🚫 Access denied: This prescription belongs to another patient. You can only scan your own prescriptions.');
    }
    
    console.log('🔒 SECURITY: Patient access verified ✓');
    
    // 6. 🔒 SECURITY CHECKPOINT 5: Validate prescription and reference code
    const prescriptions = await DatabaseService.listDocuments(
      COLLECTIONS.PRESCRIPTIONS,
      [Query.equal('appointment_id', appointmentId)]
    );
    
    if (!prescriptions.documents || prescriptions.documents.length === 0) {
      await logSecurityEvent(userId, appointmentId, 'NO_PRESCRIPTION_FOUND', 'MEDIUM');
      throw new Error('No prescription found for this appointment. Please contact your healthcare provider.');
    }
    
    const validPrescription = prescriptions.documents.find(
      prescription => prescription.reference_code === referenceCode
    );
    
    if (!validPrescription) {
      await logSecurityEvent(userId, appointmentId, 'INVALID_REFERENCE_CODE', 'HIGH');
      throw new Error('Invalid prescription code. The QR code may be tampered with or expired.');
    }
    
    console.log('🔒 SECURITY: Reference code verified ✓');
    
    // 7. Get medications (only after all security checks pass)
    const medications = await DatabaseService.listDocuments(
      COLLECTIONS.PRESCRIPTION_MEDICATIONS,
      [Query.equal('prescription_id', validPrescription.$id)]
    );
    
    if (!medications.documents || medications.documents.length === 0) {
      throw new Error('No medications found in this prescription.');
    }
    
    // 8. Log successful secure access
    await logSecurityEvent(userId, appointmentId, 'QR_SCAN_SUCCESS', 'INFO');
    console.log('🔒 SECURITY: All checks passed ✓ Returning medications');
    
    // 9. Format and return medications with security metadata
    return medications.documents.map(med => ({
      name: med.name || '',
      type: med.type || '',
      dosage: med.dosage || '',
      frequencies: med.frequencies || '',
      duration: med.duration || '',
      illnessType: med.illness_type || '',
      notes: med.notes || '',
      times: getTimesForFrequency(med.frequencies),
      appointmentId,
      referenceCode,
      prescriptionId: validPrescription.$id,
      verifiedAccess: true,
      securityValidated: true
    }));
    
  } catch (error) {
    console.error('🔒 SECURE SCAN FAILED:', error.message);
    throw error;
  }
};

/**
 * 🔒 CRITICAL SECURITY FUNCTION: Verify patient has access to this appointment
 * This is the core security check that prevents cross-patient access
 * @param {Object} appointment - The appointment document
 * @param {Object} currentUser - The current logged-in user
 * @returns {Promise<boolean>} - True if access is authorized
 */
const verifyPatientAccess = async (appointment, currentUser) => {
  try {
    const userId = currentUser.uid || currentUser.userId || currentUser.$id;
    
    console.log('🔒 CRITICAL SECURITY CHECK:');
    console.log('🔒 Current user ID:', userId);
    console.log('🔒 Appointment user_id:', appointment.user_id);
    console.log('🔒 Is family booking:', appointment.is_family_booking);
    console.log('🔒 Appointment patient name:', appointment.patient_name);
    
    // Primary check: Direct appointment owner
    if (appointment.user_id === userId) {
      console.log('🔒 ✅ AUTHORIZED: Direct appointment owner');
      return true;
    }
    
    // Secondary check: Family booking account holder
    if (appointment.is_family_booking && appointment.user_id === userId) {
      console.log('🔒 ✅ AUTHORIZED: Family booking account holder');
      return true;
    }
    
    // Additional check: If there's a primary_user_id field (some systems use this)
    if (appointment.primary_user_id && appointment.primary_user_id === userId) {
      console.log('🔒 ✅ AUTHORIZED: Primary user match');
      return true;
    }
    
    // Log the failed authorization attempt with details
    console.log('🔒 ❌ UNAUTHORIZED: Access denied');
    console.log('🔒 Attempted access by user:', userId);
    console.log('🔒 Appointment belongs to:', appointment.user_id);
    
    return false;
    
  } catch (error) {
    console.error('🔒 CRITICAL ERROR in patient access verification:', error);
    // Fail secure - deny access on any error
    return false;
  }
};

/**
 * 🔒 Security event logging function - FIXED
 * @param {string} userId - User ID who performed the action
 * @param {string} appointmentId - Appointment ID involved
 * @param {string} event - Type of security event
 * @param {string} severity - Severity level (INFO, MEDIUM, HIGH, CRITICAL)
 */
const logSecurityEvent = async (userId, appointmentId, event, severity) => {
  try {
    // ✅ FIXED: Match the exact database schema
    const logData = {
      action: event,                    // ✅ Changed from 'event_type' to 'action'
      userId: userId,                   // ✅ Changed from 'user_id' to 'userId'
      timestamp: new Date().toISOString(),
      userAgent: 'mobile_app',          // ✅ Changed from 'user_agent' to 'userAgent'
      ip: 'mobile_app',                 // ✅ Changed from 'ip_address' to 'ip'
      metadata: JSON.stringify({        // ✅ Store extra data in metadata field
        appointment_id: appointmentId,
        severity: severity,
        source: 'QR_SCANNER'
      })
    };
    
    console.log('🔒 AUDIT LOG DATA:', logData);
    
    // Try to create audit log, but don't fail the operation if logging fails
    try {
      await DatabaseService.createDocument(COLLECTIONS.AUDIT_LOGS, logData);
      console.log(`🔒 AUDIT: ${severity} - ${event} logged for user ${userId}`);
    } catch (logError) {
      console.error('🔒 Database logging failed:', logError);
      // Fallback: At least log to console if database logging fails
      console.warn('🔒 AUDIT FALLBACK:', logData);
    }
    
  } catch (error) {
    console.error('🔒 Failed to log security event:', error);
    // Security logging failure should not break the main flow
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
          times: getTimesForFrequency('Once Daily'),
          appointmentId: 'demo',
          referenceCode,
          isDemo: true
        },
        {
          name: 'Hydrochlorothiazide',
          type: 'Tablet',
          dosage: '25mg',
          frequencies: 'Once Daily',
          duration: '30 days',
          illnessType: 'Blood Pressure',
          notes: 'Take with plenty of water',
          times: getTimesForFrequency('Once Daily'),
          appointmentId: 'demo',
          referenceCode,
          isDemo: true
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
          times: getTimesForFrequency('Twice Daily'),
          appointmentId: 'demo',
          referenceCode,
          isDemo: true
        },
        {
          name: 'Glipizide',
          type: 'Tablet',
          dosage: '5mg',
          frequencies: 'Once Daily',
          duration: '30 days',
          illnessType: 'Diabetes',
          notes: 'Take 30 minutes before breakfast',
          times: getTimesForFrequency('Once Daily'),
          appointmentId: 'demo',
          referenceCode,
          isDemo: true
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
          times: getTimesForFrequency('Three times Daily'),
          appointmentId: 'demo',
          referenceCode,
          isDemo: true
        },
        {
          name: 'Ibuprofen',
          type: 'Tablet',
          dosage: '400mg',
          frequencies: 'Three times Daily',
          duration: '5 days',
          illnessType: 'Pain Relief',
          notes: 'Take with food to prevent stomach irritation',
          times: getTimesForFrequency('Three times Daily'),
          appointmentId: 'demo',
          referenceCode,
          isDemo: true
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
          times: getTimesForFrequency('Every Evening'),
          appointmentId: 'demo',
          referenceCode,
          isDemo: true
        },
        {
          name: 'Omega-3',
          type: 'Capsule',
          dosage: '1000mg',
          frequencies: 'Twice Daily',
          duration: '90 days',
          illnessType: 'Cholesterol',
          notes: 'Take with meals',
          times: getTimesForFrequency('Twice Daily'),
          appointmentId: 'demo',
          referenceCode,
          isDemo: true
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
  console.log("Creating demo medications for:", appointmentId);
  
  const medications = [
    {
      name: 'Paracetamol',
      type: 'Tablet',
      dosage: '300mg',
      frequencies: 'Three times Daily',
      duration: '7 days',
      illnessType: 'Infection',
      notes: 'Eat after Taking Meal',
      times: getTimesForFrequency('Three times Daily'),
      appointmentId,
      referenceCode,
      isDemo: true
    },
    {
      name: 'Pospan',
      type: 'Liquid',
      dosage: '100mg',
      frequencies: 'Twice Daily',
      duration: '7 days',
      illnessType: 'Inflammation',
      notes: 'Eat after Taking Meal',
      times: getTimesForFrequency('Twice Daily'),
      appointmentId,
      referenceCode,
      isDemo: true
    },
    {
      name: 'Amoxicillin',
      type: 'Tablet',
      dosage: '500mg',
      frequencies: 'Once Daily',
      duration: '7 days',
      illnessType: 'Infection',
      notes: 'Eat after Taking Meal',
      times: getTimesForFrequency('Once Daily'),
      appointmentId,
      referenceCode,
      isDemo: true
    }
  ];

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
    // Always prioritize frequency mapping if frequency is provided
    if (frequency) {
      const frequencyData = FREQUENCIES.find(freq => freq.label === frequency);
      if (frequencyData) {
        const mappedTimes = frequencyData.times;
        console.log(`Using frequency mapping for "${frequency}":`, mappedTimes);
        return mappedTimes;
      }
    }
    
    // Only use existing times if no frequency is provided
    if (Array.isArray(times) && times.length > 0) {
      return times.map(time => String(time));
    }
    
    // If it's a string, handle different cases
    if (typeof times === 'string' && times.trim() !== '') {
      // Check if it's a JSON string (legacy data)
      if (times.startsWith('[') && times.endsWith(']')) {
        try {
          const parsed = JSON.parse(times);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed.map(time => String(time));
          }
        } catch (e) {
          console.warn('Failed to parse times JSON string:', times);
        }
      }
      
      // If it's a single time as string, return as array
      return [String(times)];
    }
    
    // Default fallback
    return ['09:00'];
  } catch (error) {
    console.error('Error ensuring times array:', error);
    return ['09:00']; // Default fallback
  }
};

// Export the frequency mapping function for use in other components
export { getTimesForFrequency };