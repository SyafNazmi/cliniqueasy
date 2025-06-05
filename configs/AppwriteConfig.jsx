// configs/AppwriteConfig.jsx - ROBUST VERSION for Expo SDK 53

// Add polyfill at the top
import 'react-native-url-polyfill/auto';

import { Client, Account, Databases, ID, Query } from 'react-native-appwrite'; // Use react-native-appwrite instead of appwrite
import AsyncStorage from '@react-native-async-storage/async-storage';

// Enhanced localStorage polyfill with better error handling
if (typeof global.localStorage === 'undefined') {
  global.localStorage = {
    getItem: async (key) => {
      try {
        const value = await AsyncStorage.getItem(key);
        return value;
      } catch (error) {
        console.warn('Storage getItem error:', error);
        return null;
      }
    },
    setItem: async (key, value) => {
      try {
        await AsyncStorage.setItem(key, String(value));
      } catch (error) {
        console.warn('Storage setItem error:', error);
      }
    },
    removeItem: async (key) => {
      try {
        await AsyncStorage.removeItem(key);
      } catch (error) {
        console.warn('Storage removeItem error:', error);
      }
    },
    clear: async () => {
      try {
        await AsyncStorage.clear();
      } catch (error) {
        console.warn('Storage clear error:', error);
      }
    }
  };
}

// Also mock sessionStorage
if (typeof global.sessionStorage === 'undefined') {
  global.sessionStorage = global.localStorage;
}

// Appwrite Client Configuration with enhanced error handling
const client = new Client();

try {
  client
    .setEndpoint('https://cloud.appwrite.io/v1') // Your Appwrite cloud endpoint
    .setProject('67e0310c000b89e3feee'); // Your Project ID from Appwrite Console
} catch (error) {
  console.error('Failed to configure Appwrite client:', error);
}

// Create instances
const account = new Account(client);
const databases = new Databases(client);

// Enhanced Database Service with better error handling
const DatabaseService = {
    // Create a new document in a specific collection
    async createDocument(collectionId, documentData, permissions = []) {
        try {
          const databaseId = process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID;
          if (!databaseId) {
            throw new Error('Database ID is not defined in environment variables');
          }
          
          return await databases.createDocument(
            databaseId,
            collectionId,
            ID.unique(),
            documentData,
            permissions
          );
        } catch (error) {
          console.error('Error creating document:', error);
          throw error;
        }
      },

    // List documents in a collection with optional queries
    async listDocuments(collectionId, queries = [], limit = 25) {
        try {
          const databaseId = process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID;
          if (!databaseId) {
            throw new Error('Database ID is not defined in environment variables');
          }
          
          return await databases.listDocuments(
            databaseId,
            collectionId,
            queries,
            limit
          );
        } catch (error) {
          console.error('Error listing documents:', error);
          throw error;
        }
      },

    // Get a specific document by its ID
    async getDocument(collectionId, documentId) {
        try {
            const databaseId = process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID;
            if (!databaseId) {
              throw new Error('Database ID is not defined in environment variables');
            }
            
            return await databases.getDocument(
                databaseId,
                collectionId,
                documentId
            );
        } catch (error) {
            console.error('Error getting document:', error);
            throw error;
        }
    },

    // Update a document
    async updateDocument(collectionId, documentId, data, permissions = []) {
        try {
            const databaseId = process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID;
            if (!databaseId) {
              throw new Error('Database ID is not defined in environment variables');
            }
            
            return await databases.updateDocument(
                databaseId,
                collectionId,
                documentId,
                data,
                permissions
            );
        } catch (error) {
            console.error('Error updating document:', error);
            throw error;
        }
    },

    // Delete a document
    async deleteDocument(collectionId, documentId) {
        try {
            const databaseId = process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID;
            if (!databaseId) {
              throw new Error('Database ID is not defined in environment variables');
            }
            
            return await databases.deleteDocument(
                databaseId,
                collectionId,
                documentId
            );
        } catch (error) {
            console.error('Error deleting document:', error);
            throw error;
        }
    },

    // Advanced query helper
    createQuery(method, field, value) {
        try {
            switch(method) {
                case 'equal':
                    return Query.equal(field, value);
                case 'notEqual':
                    return Query.notEqual(field, value);
                case 'greaterThan':
                    return Query.greaterThan(field, value);
                case 'lessThan':
                    return Query.lessThan(field, value);
                case 'search':
                    return Query.search(field, value);
                default:
                    throw new Error(`Invalid query method: ${method}`);
            }
        } catch (error) {
            console.error('Error creating query:', error);
            throw error;
        }
    }
};

// ROBUST Realtime Service with comprehensive error handling
const RealtimeService = {
    activeSubscriptions: new Set(),
    
    // Subscribe to collection changes with robust error handling
    subscribeToCollection(collectionId, callback) {
      try {
        const databaseId = process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID;
        
        if (!databaseId) {
          console.warn('Database ID is not defined, skipping subscription');
          return null;
        }
        
        console.log('Setting up subscription for collection:', collectionId);
        
        const subscription = client.subscribe(
          `databases.${databaseId}.collections.${collectionId}.documents`,
          (response) => {
            try {
              console.log('Raw realtime response:', JSON.stringify(response, null, 2));
              
              // Handle different response formats that might come from Appwrite
              let processedResponse;
              
              if (typeof response === 'string') {
                try {
                  // If response is a string, try to parse it
                  processedResponse = JSON.parse(response);
                } catch (parseError) {
                  console.error('Failed to parse response string:', parseError);
                  console.error('Raw response that failed:', response);
                  return; // Exit early if we can't parse
                }
              } else if (response && typeof response === 'object') {
                // Response is already an object
                processedResponse = response;
              } else {
                console.warn('Unexpected response type:', typeof response, response);
                return;
              }
              
              // Safely extract data with fallbacks
              const safeResponse = {
                events: Array.isArray(processedResponse.events) ? processedResponse.events : 
                       Array.isArray(processedResponse.event) ? [processedResponse.event] : [],
                payload: processedResponse.payload || processedResponse.data || processedResponse,
                timestamp: processedResponse.timestamp || Date.now()
              };
              
              // Validate that we have the necessary data
              if (safeResponse.events.length > 0) {
                console.log('Processed realtime event:', safeResponse);
                callback(safeResponse);
              } else {
                console.log('No valid events found in response');
              }
              
            } catch (callbackError) {
              console.error('Error in realtime callback:', callbackError);
              console.error('Response that caused callback error:', response);
              // Don't throw - just log to prevent crashes
            }
          }
        );

        if (subscription) {
          this.activeSubscriptions.add(subscription);
          console.log('Successfully created subscription for collection:', collectionId);
          
          // Return a cleanup function
          return () => {
            try {
              subscription();
              this.activeSubscriptions.delete(subscription);
              console.log('Unsubscribed from collection:', collectionId);
            } catch (unsubError) {
              console.error('Error unsubscribing:', unsubError);
            }
          };
        } else {
          console.warn('Failed to create subscription - client.subscribe returned null');
          return null;
        }
        
      } catch (error) {
        console.error('Error setting up collection subscription:', error);
        return null;
      }
    },

    // Subscribe to specific document changes
    subscribeToDocument(collectionId, documentId, callback) {
      try {
        const databaseId = process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID;
        
        if (!databaseId) {
          console.warn('Database ID is not defined, skipping document subscription');
          return null;
        }
        
        console.log('Setting up document subscription:', documentId);
        
        const subscription = client.subscribe(
          `databases.${databaseId}.collections.${collectionId}.documents.${documentId}`,
          (response) => {
            try {
              console.log('Document realtime response:', JSON.stringify(response, null, 2));
              
              let processedResponse;
              
              if (typeof response === 'string') {
                try {
                  processedResponse = JSON.parse(response);
                } catch (parseError) {
                  console.error('Failed to parse document response:', parseError);
                  return;
                }
              } else if (response && typeof response === 'object') {
                processedResponse = response;
              } else {
                console.warn('Unexpected document response type:', typeof response);
                return;
              }
              
              const safeResponse = {
                events: Array.isArray(processedResponse.events) ? processedResponse.events : 
                       Array.isArray(processedResponse.event) ? [processedResponse.event] : [],
                payload: processedResponse.payload || processedResponse.data || processedResponse,
                timestamp: processedResponse.timestamp || Date.now()
              };
              
              if (safeResponse.events.length > 0) {
                callback(safeResponse);
              }
              
            } catch (callbackError) {
              console.error('Error in document realtime callback:', callbackError);
            }
          }
        );

        if (subscription) {
          this.activeSubscriptions.add(subscription);
          
          return () => {
            try {
              subscription();
              this.activeSubscriptions.delete(subscription);
              console.log('Unsubscribed from document:', documentId);
            } catch (unsubError) {
              console.error('Error unsubscribing from document:', unsubError);
            }
          };
        }
        
        return null;
      } catch (error) {
        console.error('Error setting up document subscription:', error);
        return null;
      }
    },

    // Safely unsubscribe from all active subscriptions
    unsubscribeAll() {
      console.log('Unsubscribing from all realtime subscriptions...');
      
      this.activeSubscriptions.forEach(subscription => {
        try {
          if (typeof subscription === 'function') {
            subscription();
          }
        } catch (error) {
          console.error('Error during bulk unsubscribe:', error);
        }
      });
      
      this.activeSubscriptions.clear();
      console.log('All subscriptions cleaned up');
    }
};

// Enhanced Authentication Service
const AuthService = {
    // Create a new user account
    async register(email, password, name) {
        try {
            return await account.create(
                ID.unique(), 
                email, 
                password, 
                name
            );
        } catch (error) {
            console.error('Registration error:', error);
            throw error;
        }
    },

    // Login user
    async login(email, password) {
        try {
            return await account.createEmailSession(email, password);
        } catch (error) {
            console.error('Login error:', error);
            throw error;
        }
    },

    // Logout current user
    async logout() {
        try {
            return await account.deleteSession('current');
        } catch (error) {
            console.error('Logout error:', error);
            throw error;
        }
    },

    // Get current user account
    async getCurrentUser() {
        try {
            return await account.get();
        } catch (error) {
            console.error('Get current user error:', error);
            return null;
        }
    }
};

export { 
    client, 
    account, 
    databases, 
    ID, 
    Query,
    DatabaseService,
    AuthService,
    RealtimeService
};

// Example usage in a component:
// import { DatabaseService, AuthService } from '../configs/AppwriteConfig';
// 
// // Create a new doctor
// await DatabaseService.createDocument('doctors', {
//   name: 'Dr. John Doe',
//   specialty: 'Orthopedic Surgery'
// });
// 
// // List doctors
// const doctors = await DatabaseService.listDocuments('doctors');
// 
// // Complex query
// const query = [
//   DatabaseService.createQuery('equal', 'specialty', 'Orthopedic Surgery')
// ];
// const filteredDoctors = await DatabaseService.listDocuments('doctors', query);