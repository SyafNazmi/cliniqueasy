import AsyncStorage from "@react-native-async-storage/async-storage";

// Constants for storage keys
const MEDICATIONS_KEY = 'medications';
const DOSE_HISTORY_KEY = 'doseHistory';
const USER_PREFIX = 'user_';
const LAST_USER_KEY = 'lastLoggedInUser';

/**
 * @typedef {Object} Medication
 * @property {string} id
 * @property {string} name
 * @property {string} dosage
 * @property {string[]} times
 * @property {string} startDate
 * @property {string} duration
 * @property {string} color
 * @property {boolean} reminderEnabled
 * @property {number} currentSupply
 * @property {number} totalSupply
 * @property {number} refillAt
 * @property {boolean} refillReminder
 * @property {string} [lastRefillDate]
 */

/**
 * @typedef {Object} DoseHistory
 * @property {string} id
 * @property {string} medicationId
 * @property {string} timestamp
 * @property {boolean} taken
 */

// Generic storage functions
export const setLocalStorage = async (key, value) => {
  try {
    const jsonValue = JSON.stringify(value);
    await AsyncStorage.setItem(key, jsonValue);
  } catch (error) {
    console.error("Error storing data", error);
    throw error;
  }
};

export const getLocalStorage = async (key) => {
  try {
    const jsonValue = await AsyncStorage.getItem(key);
    return jsonValue != null ? JSON.parse(jsonValue) : null;
  } catch (error) {
    console.error("Error retrieving data", error);
    return null;
  }
};

export const removeLocalStorage = async () => {
    try {
      // Check if AsyncStorage exists and is accessible before clearing
      const keys = await AsyncStorage.getAllKeys();
      if (keys.length > 0) {
        await AsyncStorage.clear();
      }
      return true;
    } catch (error) {
      console.error("Error clearing storage", error);
      // Return false instead of letting the error propagate
      return false;
    }
  };

export const removeSpecificStorageKey = async (key) => {
  try {
    await AsyncStorage.removeItem(key);
  } catch (error) {
    console.error(`Error removing key ${key}`, error);
  }
};

// Medication-specific functions

export async function getMedications() {
  try {
    // Get the current user ID from storage
    const userDetail = await getLocalStorage('userDetail');
    const userId = userDetail?.uid || 'anonymous';
    
    // Use user-specific key for medications
    const userMedicationsKey = `${USER_PREFIX}${userId}_${MEDICATIONS_KEY}`;
    const data = await getLocalStorage(userMedicationsKey);
    return data || [];
  } catch (error) {
    console.error("Error getting medications:", error);
    return [];
  }
}

// Modified addMedication function
export async function addMedication(medication) {
  try {
    const userDetail = await getLocalStorage('userDetail');
    const userId = userDetail?.uid || 'anonymous';
    
    // Use user-specific key
    const userMedicationsKey = `${USER_PREFIX}${userId}_${MEDICATIONS_KEY}`;
    const medications = await getMedications();
    medications.push(medication);
    await setLocalStorage(userMedicationsKey, medications);
  } catch (error) {
    console.error("Error adding medication:", error);
    throw error;
  }
}

// Similar updates for updateMedication and deleteMedication
export async function updateMedication(updatedMedication) {
  try {
    const userDetail = await getLocalStorage('userDetail');
    const userId = userDetail?.uid || 'anonymous';
    
    const userMedicationsKey = `${USER_PREFIX}${userId}_${MEDICATIONS_KEY}`;
    const medications = await getMedications();
    const index = medications.findIndex((med) => med.id === updatedMedication.id);
    if (index !== -1) {
      medications[index] = updatedMedication;
      await setLocalStorage(userMedicationsKey, medications);
    }
  } catch (error) {
    console.error("Error updating medication:", error);
    throw error;
  }
}

export async function deleteMedication(id) {
  try {
    const userDetail = await getLocalStorage('userDetail');
    const userId = userDetail?.uid || 'anonymous';
    
    const userMedicationsKey = `${USER_PREFIX}${userId}_${MEDICATIONS_KEY}`;
    const medications = await getMedications();
    const updatedMedications = medications.filter((med) => med.id !== id);
    await setLocalStorage(userMedicationsKey, updatedMedications);
  } catch (error) {
    console.error("Error deleting medication:", error);
    throw error;
  }
}

// Update dose history functions similarly
export async function getDoseHistory() {
  try {
    const userDetail = await getLocalStorage('userDetail');
    const userId = userDetail?.uid || 'anonymous';
    
    const userDoseHistoryKey = `${USER_PREFIX}${userId}_${DOSE_HISTORY_KEY}`;
    const data = await getLocalStorage(userDoseHistoryKey);
    return data || [];
  } catch (error) {
    console.error("Error getting dose history:", error);
    return [];
  }
}


export async function getTodaysDoses() {
  try {
    const history = await getDoseHistory();
    const today = new Date().toDateString();
    return history.filter(
      (dose) => new Date(dose.timestamp).toDateString() === today
    );
  } catch (error) {
    console.error("Error getting today's doses:", error);
    return [];
  }
}

export async function recordDose(medicationId, taken, timestamp) {
  try {
    const userDetail = await getLocalStorage('userDetail');
    const userId = userDetail?.uid || 'anonymous';
    
    const userDoseHistoryKey = `${USER_PREFIX}${userId}_${DOSE_HISTORY_KEY}`;
    const history = await getDoseHistory();
    const newDose = {
      id: Math.random().toString(36).substr(2, 9),
      medicationId,
      timestamp,
      taken,
    };
    history.push(newDose);
    await setLocalStorage(userDoseHistoryKey, history);
    
    // Update medication supply if taken
    if (taken) {
      const medications = await getMedications();
      const medication = medications.find((med) => med.id === medicationId);
      if (medication && medication.currentSupply > 0) {
        medication.currentSupply -= 1;
        await updateMedication(medication);
      }
    }
  } catch (error) {
    console.error("Error recording dose:", error);
    throw error;
  }
}