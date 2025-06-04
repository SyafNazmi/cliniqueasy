// configs/AppwriteConfig.jsx

// Add polyfill at the top
import 'react-native-url-polyfill/auto';

import { Client, Account, Databases, ID, Query } from 'appwrite';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock localStorage for React Native (alternative approach)
if (typeof global.localStorage === 'undefined') {
  global.localStorage = {
    getItem: async (key) => {
      try {
        return await AsyncStorage.getItem(key);
      } catch (error) {
        console.log('Storage getItem error:', error);
        return null;
      }
    },
    setItem: async (key, value) => {
      try {
        await AsyncStorage.setItem(key, value);
      } catch (error) {
        console.log('Storage setItem error:', error);
      }
    },
    removeItem: async (key) => {
      try {
        await AsyncStorage.removeItem(key);
      } catch (error) {
        console.log('Storage removeItem error:', error);
      }
    },
    clear: async () => {
      try {
        await AsyncStorage.clear();
      } catch (error) {
        console.log('Storage clear error:', error);
      }
    }
  };
}

// Also mock sessionStorage
if (typeof global.sessionStorage === 'undefined') {
  global.sessionStorage = global.localStorage;
}

// Appwrite Client Configuration
const client = new Client()
    .setEndpoint('https://cloud.appwrite.io/v1') // Your Appwrite cloud endpoint
    .setProject('67e0310c000b89e3feee'); // Your Project ID from Appwrite Console

// Create instances
const account = new Account(client);
const databases = new Databases(client);

// Database Helper Functions
const DatabaseService = {
    // Create a new document in a specific collection
    async createDocument(collectionId, documentData, permissions = []) {
        try {
          // Ensure the database ID is correctly accessed
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
          return await databases.listDocuments(
            process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID, // Access the environment variable
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
            return await databases.getDocument(
                process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID,
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
            return await databases.updateDocument(
                process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID,
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
            return await databases.deleteDocument(
                process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID,
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
                throw new Error('Invalid query method');
        }
    }
};

// Authentication Service
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

// Enhanced Realtime Service with JSON error fix
const RealtimeService = {
    // Subscribe to collection changes with proper JSON handling
    subscribeToCollection(collectionId, callback) {
      try {
        const databaseId = process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID;
        
        if (!databaseId) {
          console.warn('Database ID is not defined, skipping subscription');
          return null;
        }
        
        return client.subscribe(
          `databases.${databaseId}.collections.${collectionId}.documents`,
          (response) => {
            try {
              console.log('Raw subscription response:', response);
              
              // Handle different response formats
              let processedResponse = response;
              
              // If response.payload is a string, try to parse it
              if (response.payload && typeof response.payload === 'string') {
                try {
                  processedResponse = {
                    ...response,
                    payload: JSON.parse(response.payload)
                  };
                } catch (parseError) {
                  console.warn('Could not parse payload as JSON, using as-is:', parseError);
                  // Use the response as-is if JSON parsing fails
                }
              }
              
              // Call the callback with processed response
              callback(processedResponse);
              
            } catch (callbackError) {
              console.error('Error in realtime callback:', callbackError);
              console.error('Response that caused error:', response);
            }
          }
        );
      } catch (error) {
        console.error('Error subscribing to collection:', error);
        // Return null instead of throwing to prevent app crashes
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