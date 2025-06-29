import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect } from "react";


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

// In service/Storage.jsx
export const removeSpecificStorageKey = async (key) => {
  try {
    await AsyncStorage.removeItem(key);
  } catch (error) {
    console.error(`Error removing key ${key}`, error);
  }
};

// Add a new function to handle user-related storage cleanup
export const clearUserData = async (userId) => {
  try {
    // Remove user-specific medication and dose history data
    const userMedicationsKey = `${USER_PREFIX}${userId}_${MEDICATIONS_KEY}`;
    const userDoseHistoryKey = `${USER_PREFIX}${userId}_${DOSE_HISTORY_KEY}`;
    
    await AsyncStorage.removeItem(userMedicationsKey);
    await AsyncStorage.removeItem(userDoseHistoryKey);
    // Keep additional user-specific keys here if needed
    
    console.log("User-specific data cleared");
    return true;
  } catch (error) {
    console.error("Error clearing user data", error);
    return false;
  }
};

// Medication-specific functions

export async function migrateUserData(oldUserId, newUserId) {
  try {
    // Get medication data from old user ID
    const oldMedicationsKey = `${USER_PREFIX}${oldUserId}_${MEDICATIONS_KEY}`;
    const oldDoseHistoryKey = `${USER_PREFIX}${oldUserId}_${DOSE_HISTORY_KEY}`;
    
    const medications = await getLocalStorage(oldMedicationsKey) || [];
    const doseHistory = await getLocalStorage(oldDoseHistoryKey) || [];
    
    // Store medication data under new user ID
    const newMedicationsKey = `${USER_PREFIX}${newUserId}_${MEDICATIONS_KEY}`;
    const newDoseHistoryKey = `${USER_PREFIX}${newUserId}_${DOSE_HISTORY_KEY}`;
    
    await setLocalStorage(newMedicationsKey, medications);
    await setLocalStorage(newDoseHistoryKey, doseHistory);
    
    console.log("User data migrated successfully");
    return true;
  } catch (error) {
    console.error("Error migrating user data:", error);
    return false;
  }
}

export async function getMedications() {
  try {
    // Get the current user ID from storage
    const userDetail = await getLocalStorage('userDetail');
    const userId = userDetail?.uid || 'anonymous';
    
    // Use user-specific key for medications
    const userMedicationsKey = `${USER_PREFIX}${userId}_${MEDICATIONS_KEY}`;
    let data = await getLocalStorage(userMedicationsKey);
    
    // If no data found with user-specific key, try the anonymous key as fallback
    if (!data || data.length === 0) {
      const anonymousKey = `${USER_PREFIX}anonymous_${MEDICATIONS_KEY}`;
      data = await getLocalStorage(anonymousKey);
      
      // If data found in anonymous storage, save it to user-specific storage
      if (data && data.length > 0 && userId !== 'anonymous') {
        await setLocalStorage(userMedicationsKey, data);
        console.log("Migrated medication data from anonymous to user storage");
      }
    }
    
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
export async function updateMedication(medicationIdOrObject, updatedMedicationData = null) {
  try {
    const userDetail = await getLocalStorage('userDetail');
    const userId = userDetail?.uid || 'anonymous';
    
    const userMedicationsKey = `${USER_PREFIX}${userId}_${MEDICATIONS_KEY}`;
    const medications = await getMedications();
    
    let updatedMedication;
    let medicationId;
    
    // Handle both calling patterns:
    // updateMedication(medicationObject) - new pattern
    // updateMedication(id, medicationObject) - old pattern
    if (typeof medicationIdOrObject === 'object' && medicationIdOrObject.id) {
      // New pattern: first parameter is the medication object
      updatedMedication = medicationIdOrObject;
      medicationId = medicationIdOrObject.id;
    } else if (typeof medicationIdOrObject === 'string' && updatedMedicationData) {
      // Old pattern: first parameter is ID, second is medication object
      medicationId = medicationIdOrObject;
      updatedMedication = updatedMedicationData;
    } else {
      throw new Error('Invalid parameters for updateMedication');
    }
    
    console.log('Updating medication:', medicationId, updatedMedication);
    
    const index = medications.findIndex((med) => med.id === medicationId);
    if (index !== -1) {
      medications[index] = updatedMedication;
      await setLocalStorage(userMedicationsKey, medications);
      console.log('Medication updated successfully in storage');
    } else {
      throw new Error(`Medication with ID ${medicationId} not found`);
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


export const getTodaysDoses = async () => {
  try {
    const userDetail = await getLocalStorage('userDetail');
    const userId = userDetail?.uid || 'anonymous';
    
    const userDoseHistoryKey = `${USER_PREFIX}${userId}_${DOSE_HISTORY_KEY}`;
    const allDoses = await getLocalStorage(userDoseHistoryKey) || [];
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return allDoses.filter(dose => {
      const doseDate = new Date(dose.timestamp);
      doseDate.setHours(0, 0, 0, 0);
      return doseDate.getTime() === today.getTime();
    });
  } catch (error) {
    console.error("Error getting today's doses:", error);
    return [];
  }
};

export async function recordDose(medicationId, doseId, taken, timestamp) {
  try {
    const userDetail = await getLocalStorage('userDetail');
    const userId = userDetail?.uid || 'anonymous';

    const userDoseHistoryKey = `${USER_PREFIX}${userId}_${DOSE_HISTORY_KEY}`;
    const history = await getDoseHistory();

    const newDose = {
      id: Math.random().toString(36).substr(2, 9),
      medicationId,
      doseId, // Include this!
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
