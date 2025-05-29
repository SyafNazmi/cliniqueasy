import { DatabaseService, Query } from './AppwriteConfig';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Constants
const DOCTOR_ROLE_CACHE_KEY = 'user_role_doctor_';
const ROLE_FLAG_KEY = 'current_user_is_doctor';
const CACHE_EXPIRY_MS = 1000 * 60 * 60 * 24; // 24 hours - longer cache for better persistence

// Collection IDs - update these to match your Appwrite collections
const DOCTORS_COLLECTION_ID = '67e03390000a3c6f3599'; // Update with your doctors collection ID
const USERS_COLLECTION_ID = '67e032ec0025cf1956ff'; // Your main users collection

/**
 * Role management service to handle user role verification
 */
const RoleManager = {
  /**
   * Get user role (for compatibility with your signin code)
   * @param {string} userId - The user ID to check
   * @param {Array} labels - Optional user labels from Appwrite
   * @returns {Promise<string>} - 'doctor' or 'patient'
   */
  getUserRole: async (userId, labels = []) => {
    try {
      console.log("Getting user role for:", userId);
      console.log("Labels provided:", labels);
      
      // First try from labels (fastest way)
      if (labels && labels.length > 0) {
        if (labels.includes('doctor')) {
          console.log("Doctor role found in labels");
          await RoleManager.setGlobalRoleFlag(true);
          await RoleManager.cacheRole(userId, true);
          return {
            role: 'doctor',
            isDoctor: true
          };
        }
      }
      
      // If no doctor label found, check if user is a doctor using other methods
      const isDoctor = await RoleManager.isDoctor(userId);
      return {
        role: isDoctor ? 'doctor' : 'patient',
        isDoctor: isDoctor
      };
    } catch (error) {
      console.error('Error in getUserRole:', error);
      return {
        role: 'patient',
        isDoctor: false
      }; // Default to patient on error
    }
  },

  /**
 * Set user role and additional metadata
 * @param {string} userId - The user ID
 * @param {string} role - 'doctor' or 'patient'
 * @param {Object} accountInstance - Appwrite account instance
 * @param {Object} additionalData - Additional data like doctorLicense
 */
setUserRole: async (userId, role, accountInstance, additionalData = {}) => {
    try {
      console.log(`Setting user role to: ${role} for user: ${userId}`);
      
      // Prepare preferences object
      const preferences = {
        role: role,
        isDoctor: role === 'doctor',
        ...additionalData
      };
      
      console.log('Setting user preferences:', preferences);
      
      // Update user preferences
      await accountInstance.updatePrefs(preferences);
      
      // Also update our local cache
      await RoleManager.cacheRole(userId, role === 'doctor');
      await RoleManager.setGlobalRoleFlag(role === 'doctor');
      
      console.log(`User role and preferences updated successfully`);
      return true;
    } catch (error) {
      console.error('Error setting user role:', error);
      throw error;
    }
  },
  
  /**
   * Get user preferences including doctor license
   * @param {Object} accountInstance - Appwrite account instance
   * @returns {Promise<Object>} User preferences
   */
  getUserPreferences: async (accountInstance) => {
    try {
      const user = await accountInstance.get();
      return user.prefs || {};
    } catch (error) {
      console.error('Error getting user preferences:', error);
      return {};
    }
  },

  /**
   * Checks if a user is a doctor
   * @param {string} userId - The user ID to check
   * @returns {Promise<boolean>} - True if user is a doctor
   */
  isDoctor: async (userId) => {
    try {
      if (!userId) {
        console.log('No userId provided to isDoctor check');
        return false;
      }
      
      // First check global flag (for immediate response after reload)
      const globalFlag = await RoleManager.getGlobalRoleFlag();
      if (globalFlag !== null) {
        console.log(`Using global role flag: ${globalFlag ? 'doctor' : 'patient'}`);
        // Don't return here - continue checking but use this as fast path
        // We'll still verify and update the flag if needed
      }
      
      // Then check user-specific cache
      const cachedResult = await RoleManager.getCachedRole(userId);
      if (cachedResult !== null) {
        console.log(`Using cached role for user ${userId}: ${cachedResult ? 'doctor' : 'patient'}`);
        // Update the global flag to match (in case they're different)
        await RoleManager.setGlobalRoleFlag(cachedResult);
        return cachedResult;
      }
      
      console.log(`Checking if user ${userId} is a doctor (not in cache)`);
      
      // Strategy 1: Check if user has isDoctor or role field directly
      try {
        const userDoc = await DatabaseService.getDocument(
          USERS_COLLECTION_ID,
          userId
        );
        
        if (userDoc) {
          // Debug log entire user object to see all available fields
          console.log(`User document fields:`, Object.keys(userDoc));
          
          // Check if user has role field set to doctor
          if (userDoc.role === 'doctor' || userDoc.isDoctor === true) {
            console.log(`User ${userId} is a doctor based on user document role/isDoctor field`);
            await RoleManager.cacheRole(userId, true);
            await RoleManager.setGlobalRoleFlag(true);
            return true;
          }
        }
      } catch (e) {
        console.log(`Could not find user document directly: ${e.message}`);
      }
      
      // Strategy 2: Query with userId field (which we know works from previous debugging)
      try {
        const usersResponse = await DatabaseService.listDocuments(
          USERS_COLLECTION_ID,
          [Query.equal('userId', userId)]
        );
        
        if (usersResponse.documents && usersResponse.documents.length > 0) {
          const user = usersResponse.documents[0];
          console.log(`Found user via userId field query, checking role fields`);
          
          if (user.role === 'doctor' || user.isDoctor === true) {
            console.log(`User ${userId} is a doctor based on userId field query`);
            await RoleManager.cacheRole(userId, true);
            await RoleManager.setGlobalRoleFlag(true);
            return true;
          }
        }
      } catch (e) {
        console.log(`Error querying by userId: ${e.message}`);
      }
      
      // Strategy 3: Check doctors collection - may be separate from users
      try {
        // Try querying by doctor_id or userId field
        const doctorsResponse = await DatabaseService.listDocuments(
          DOCTORS_COLLECTION_ID,
          [Query.equal('user_id', userId)]
        );
        
        if (doctorsResponse.documents && doctorsResponse.documents.length > 0) {
          console.log(`User ${userId} is a doctor (found in doctors collection by user_id field)`);
          await RoleManager.cacheRole(userId, true);
          await RoleManager.setGlobalRoleFlag(true);
          return true;
        }
        
        // Try with userId field
        const doctorsAltResponse = await DatabaseService.listDocuments(
          DOCTORS_COLLECTION_ID,
          [Query.equal('userId', userId)]
        );
        
        if (doctorsAltResponse.documents && doctorsAltResponse.documents.length > 0) {
          console.log(`User ${userId} is a doctor (found in doctors collection by userId field)`);
          await RoleManager.cacheRole(userId, true);
          await RoleManager.setGlobalRoleFlag(true);
          return true;
        }
      } catch (e) {
        console.log(`Error checking doctors collection: ${e.message}`);
      }
      
      // If we get here, user is not a doctor
      console.log(`User ${userId} is NOT a doctor (all checks failed)`);
      await RoleManager.cacheRole(userId, false);
      await RoleManager.setGlobalRoleFlag(false);
      return false;
      
    } catch (error) {
      console.error('Error in isDoctor check:', error);
      // If there's an error, use the global flag as fallback if available
      const globalFlag = await RoleManager.getGlobalRoleFlag();
      if (globalFlag !== null) {
        return globalFlag;
      }
      return false;
    }
  },
  
  /**
   * Global doctor role flag for immediate response after app reload
   * This is separate from user-specific cache
   */
  setGlobalRoleFlag: async (isDoctor) => {
    try {
      await AsyncStorage.setItem(ROLE_FLAG_KEY, isDoctor ? 'true' : 'false');
      console.log(`Global role flag set to: ${isDoctor ? 'doctor' : 'patient'}`);
    } catch (e) {
      console.error('Error setting global role flag:', e);
    }
  },
  
  getGlobalRoleFlag: async () => {
    try {
      const flag = await AsyncStorage.getItem(ROLE_FLAG_KEY);
      if (flag === null) return null;
      return flag === 'true';
    } catch (e) {
      console.error('Error getting global role flag:', e);
      return null;
    }
  },
  
  /**
   * Cache the user's role to avoid repeated database lookups
   */
  cacheRole: async (userId, isDoctor) => {
    try {
      const cacheData = {
        isDoctor,
        timestamp: Date.now()
      };
      await AsyncStorage.setItem(DOCTOR_ROLE_CACHE_KEY + userId, JSON.stringify(cacheData));
    } catch (e) {
      console.error('Error caching role:', e);
    }
  },
  
  /**
   * Get cached role if available and not expired
   * @returns {Promise<boolean|null>} - Role or null if not cached/expired
   */
  getCachedRole: async (userId) => {
    try {
      const cachedData = await AsyncStorage.getItem(DOCTOR_ROLE_CACHE_KEY + userId);
      if (!cachedData) return null;
      
      const parsedData = JSON.parse(cachedData);
      const now = Date.now();
      
      // Check if cache is still valid
      if (now - parsedData.timestamp < CACHE_EXPIRY_MS) {
        console.log(`Using cached role for user ${userId}: ${parsedData.isDoctor ? 'doctor' : 'patient'}`);
        return parsedData.isDoctor;
      } else {
        console.log(`Cache expired for user ${userId}, will check database`);
        return null;
      }
    } catch (e) {
      console.error('Error getting cached role:', e);
      return null;
    }
  },
  
  /**
   * Clear role cache for testing purposes
   */
  clearRoleCache: async (userId) => {
    try {
      await AsyncStorage.removeItem(DOCTOR_ROLE_CACHE_KEY + userId);
      await AsyncStorage.removeItem(ROLE_FLAG_KEY);
      console.log('Role cache and global flag cleared');
    } catch (e) {
      console.error('Error clearing role cache:', e);
    }
  }
};

export default RoleManager;