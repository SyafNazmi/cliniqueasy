import AsyncStorage from "@react-native-async-storage/async-storage";

// Constants for storage keys
export const MEDICATIONS_KEY = "@medications";
export const DOSE_HISTORY_KEY = "@dose_history";

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

/**
 * Get all medications from storage
 * @returns {Promise<Medication[]>} Array of medications
 */
export async function getMedications() {
  try {
    const data = await getLocalStorage(MEDICATIONS_KEY);
    return data || [];
  } catch (error) {
    console.error("Error getting medications:", error);
    return [];
  }
}

/**
 * Add a medication to storage
 * @param {Medication} medication The medication to add
 * @returns {Promise<void>}
 */
export async function addMedication(medication) {
  try {
    const medications = await getMedications();
    medications.push(medication);
    await setLocalStorage(MEDICATIONS_KEY, medications);
  } catch (error) {
    console.error("Error adding medication:", error);
    throw error;
  }
}

/**
 * Update an existing medication
 * @param {Medication} updatedMedication The updated medication
 * @returns {Promise<void>}
 */
export async function updateMedication(updatedMedication) {
  try {
    const medications = await getMedications();
    const index = medications.findIndex((med) => med.id === updatedMedication.id);
    if (index !== -1) {
      medications[index] = updatedMedication;
      await setLocalStorage(MEDICATIONS_KEY, medications);
    }
  } catch (error) {
    console.error("Error updating medication:", error);
    throw error;
  }
}

/**
 * Delete a medication by id
 * @param {string} id The medication id to delete
 * @returns {Promise<void>}
 */
export async function deleteMedication(id) {
  try {
    const medications = await getMedications();
    const updatedMedications = medications.filter((med) => med.id !== id);
    await setLocalStorage(MEDICATIONS_KEY, updatedMedications);
  } catch (error) {
    console.error("Error deleting medication:", error);
    throw error;
  }
}

/**
 * Get all dose history
 * @returns {Promise<DoseHistory[]>} Array of dose history entries
 */
export async function getDoseHistory() {
  try {
    const data = await getLocalStorage(DOSE_HISTORY_KEY);
    return data || [];
  } catch (error) {
    console.error("Error getting dose history:", error);
    return [];
  }
}

/**
 * Get only today's doses
 * @returns {Promise<DoseHistory[]>} Array of today's dose entries
 */
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

/**
 * Record a dose taken or skipped
 * @param {string} medicationId The medication id
 * @param {boolean} taken Whether the dose was taken or skipped
 * @param {string} timestamp When the dose was taken/skipped
 * @returns {Promise<void>}
 */
export async function recordDose(medicationId, taken, timestamp) {
  try {
    const history = await getDoseHistory();
    const newDose = {
      id: Math.random().toString(36).substr(2, 9),
      medicationId,
      timestamp,
      taken,
    };
    history.push(newDose);
    await setLocalStorage(DOSE_HISTORY_KEY, history);
    
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

/**
 * Clear all application data
 * @returns {Promise<void>}
 */
export async function clearAllData() {
  try {
    await AsyncStorage.multiRemove([MEDICATIONS_KEY, DOSE_HISTORY_KEY]);
  } catch (error) {
    console.error("Error clearing data:", error);
    throw error;
  }
}