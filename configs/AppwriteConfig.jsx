// configs/AppwriteConfig.jsx - FIXED VERSION with proper subscription management

import 'react-native-url-polyfill/auto';
import { Client, Account, Databases, ID, Query } from 'react-native-appwrite';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Enhanced localStorage polyfill
if (typeof global.localStorage === 'undefined') {
  global.localStorage = {
    getItem: async (key) => {
      try {
        return await AsyncStorage.getItem(key);
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

if (typeof global.sessionStorage === 'undefined') {
  global.sessionStorage = global.localStorage;
}

const client = new Client();

try {
  client
    .setEndpoint('https://cloud.appwrite.io/v1')
    .setProject('67e0310c000b89e3feee');
} catch (error) {
  console.error('Failed to configure Appwrite client:', error);
}

const account = new Account(client);
const databases = new Databases(client);

// Database Service (unchanged)
const DatabaseService = {
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

// SIMPLIFIED Realtime Service with better error handling
const RealtimeService = {
    activeSubscriptions: new Map(),
    subscriptionCount: 0,
    
    generateSubscriptionId() {
        return `sub_${++this.subscriptionCount}_${Date.now()}`;
    },
    
    // Simplified subscription with basic retry logic
    subscribeToCollection(collectionId, callback, subscriptionId = null) {
        try {
            const databaseId = process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID;
            
            if (!databaseId) {
                console.warn('Database ID not defined, skipping subscription');
                return null;
            }
            
            const subId = subscriptionId || this.generateSubscriptionId();
            const channelName = `databases.${databaseId}.collections.${collectionId}.documents`;
            
            // Clean up existing subscription
            if (this.activeSubscriptions.has(subId)) {
                this.unsubscribe(subId);
            }
            
            console.log(`Creating subscription ${subId} for: ${collectionId}`);
            
            // Simplified callback with basic error handling
            const handleRealtimeEvent = (response) => {
                try {
                    // Basic validation
                    if (!response || !response.events) {
                        console.log('Invalid realtime response:', response);
                        return;
                    }
                    
                    // Simple event processing
                    const events = Array.isArray(response.events) ? response.events : [response.events];
                    const relevantEvents = events.filter(event => 
                        typeof event === 'string' && (
                            event.includes('create') || 
                            event.includes('update') || 
                            event.includes('delete')
                        )
                    );
                    
                    if (relevantEvents.length === 0) {
                        return;
                    }
                    
                    // Call user callback with simplified event
                    callback({
                        events: relevantEvents,
                        payload: response.payload,
                        timestamp: Date.now(),
                        subscriptionId: subId
                    });
                    
                } catch (error) {
                    console.error(`Realtime callback error [${subId}]:`, error);
                }
            };
            
            // Create subscription with error handling
            let unsubscribeFunction;
            try {
                unsubscribeFunction = client.subscribe(channelName, handleRealtimeEvent);
            } catch (subscribeError) {
                console.error('Failed to create subscription:', subscribeError);
                return null;
            }
            
            if (typeof unsubscribeFunction === 'function') {
                this.activeSubscriptions.set(subId, {
                    unsubscribe: unsubscribeFunction,
                    collectionId,
                    channelName,
                    createdAt: Date.now()
                });
                
                return {
                    subscriptionId: subId,
                    unsubscribe: () => this.unsubscribe(subId)
                };
            }
            
            console.error('Subscription did not return valid unsubscribe function');
            return null;
            
        } catch (error) {
            console.error('Error setting up subscription:', error);
            return null;
        }
    },
    
    // Simplified unsubscribe
    unsubscribe(subscriptionId) {
        try {
            const subscription = this.activeSubscriptions.get(subscriptionId);
            
            if (subscription && typeof subscription.unsubscribe === 'function') {
                subscription.unsubscribe();
                this.activeSubscriptions.delete(subscriptionId);
                console.log(`Unsubscribed: ${subscriptionId}`);
                return true;
            }
            
            return false;
        } catch (error) {
            console.error(`Error unsubscribing ${subscriptionId}:`, error);
            this.activeSubscriptions.delete(subscriptionId);
            return false;
        }
    },
    
    // Clean up all subscriptions
    unsubscribeAll() {
        console.log('Cleaning up all realtime subscriptions...');
        
        for (const [subId] of this.activeSubscriptions) {
            this.unsubscribe(subId);
        }
        
        this.activeSubscriptions.clear();
        console.log('All subscriptions cleaned up');
    },
    
    // Get subscription status
    getSubscriptionCount() {
        return this.activeSubscriptions.size;
    }
};


// Authentication Service (unchanged)
const AuthService = {
    async register(email, password, name) {
        try {
            return await account.create(ID.unique(), email, password, name);
        } catch (error) {
            console.error('Registration error:', error);
            throw error;
        }
    },

    async login(email, password) {
        try {
            return await account.createEmailSession(email, password);
        } catch (error) {
            console.error('Login error:', error);
            throw error;
        }
    },

    async logout() {
        try {
            return await account.deleteSession('current');
        } catch (error) {
            console.error('Logout error:', error);
            throw error;
        }
    },

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