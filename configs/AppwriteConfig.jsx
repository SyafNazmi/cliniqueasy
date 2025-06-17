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

// FIXED Realtime Service with proper subscription management
const RealtimeService = {
    activeSubscriptions: new Map(), // Changed to Map for better tracking
    subscriptionCount: 0,
    
    // Create a unique subscription ID
    generateSubscriptionId() {
        return `sub_${++this.subscriptionCount}_${Date.now()}`;
    },
    
    // Subscribe to collection changes with proper deduplication
    subscribeToCollection(collectionId, callback, subscriptionId = null) {
        try {
            const databaseId = process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID;
            
            if (!databaseId) {
                console.warn('Database ID is not defined, skipping subscription');
                return null;
            }
            
            // Generate or use provided subscription ID
            const subId = subscriptionId || this.generateSubscriptionId();
            const channelName = `databases.${databaseId}.collections.${collectionId}.documents`;
            
            // Check if we already have an active subscription for this channel
            if (this.activeSubscriptions.has(subId)) {
                console.warn(`Subscription ${subId} already exists, cleaning up first`);
                this.unsubscribe(subId);
            }
            
            console.log(`Setting up subscription ${subId} for collection:`, collectionId);
            
            // Create a debounced callback to prevent rapid firing
            let lastCallTime = 0;
            const DEBOUNCE_DELAY = 100; // 100ms debounce
            
            const debouncedCallback = (response) => {
                const now = Date.now();
                if (now - lastCallTime < DEBOUNCE_DELAY) {
                    console.log('Debouncing realtime callback');
                    return;
                }
                lastCallTime = now;
                
                try {
                    console.log(`[${subId}] Realtime event received:`, {
                        events: response.events,
                        timestamp: now
                    });
                    
                    // Process the response
                    let processedEvent = response;
                    
                    if (typeof response === 'string') {
                        try {
                            processedEvent = JSON.parse(response);
                        } catch (parseError) {
                            console.error('Failed to parse response:', parseError);
                            return;
                        }
                    }
                    
                    // Validate the event structure
                    if (!processedEvent || !processedEvent.events || !Array.isArray(processedEvent.events)) {
                        console.warn('Invalid event structure:', processedEvent);
                        return;
                    }
                    
                    // Filter for relevant events only
                    const relevantEvents = processedEvent.events.filter(event => 
                        event.includes('create') || 
                        event.includes('update') || 
                        event.includes('delete')
                    );
                    
                    if (relevantEvents.length === 0) {
                        console.log('No relevant events found, skipping callback');
                        return;
                    }
                    
                    // Create a clean event object
                    const cleanEvent = {
                        events: relevantEvents,
                        payload: processedEvent.payload,
                        timestamp: now,
                        subscriptionId: subId,
                        type: this.getEventType(relevantEvents[0])
                    };
                    
                    console.log(`[${subId}] Calling callback with processed event:`, cleanEvent);
                    callback(cleanEvent);
                    
                } catch (callbackError) {
                    console.error(`[${subId}] Error in realtime callback:`, callbackError);
                }
            };
            
            // Create the subscription
            const unsubscribeFunction = client.subscribe(channelName, debouncedCallback);
            
            if (unsubscribeFunction && typeof unsubscribeFunction === 'function') {
                // Store subscription info
                this.activeSubscriptions.set(subId, {
                    unsubscribe: unsubscribeFunction,
                    collectionId,
                    channelName,
                    createdAt: Date.now()
                });
                
                console.log(`Successfully created subscription ${subId} for collection:`, collectionId);
                
                // Return cleanup function with subscription ID
                return {
                    subscriptionId: subId,
                    unsubscribe: () => this.unsubscribe(subId)
                };
                
            } else {
                console.error('client.subscribe did not return a valid unsubscribe function');
                return null;
            }
            
        } catch (error) {
            console.error('Error setting up collection subscription:', error);
            return null;
        }
    },
    
    // Subscribe to specific document with deduplication
    subscribeToDocument(collectionId, documentId, callback, subscriptionId = null) {
        try {
            const databaseId = process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID;
            
            if (!databaseId) {
                console.warn('Database ID is not defined, skipping document subscription');
                return null;
            }
            
            const subId = subscriptionId || this.generateSubscriptionId();
            const channelName = `databases.${databaseId}.collections.${collectionId}.documents.${documentId}`;
            
            if (this.activeSubscriptions.has(subId)) {
                console.warn(`Document subscription ${subId} already exists, cleaning up first`);
                this.unsubscribe(subId);
            }
            
            console.log(`Setting up document subscription ${subId}:`, documentId);
            
            // Debounced callback for document updates
            let lastCallTime = 0;
            const DEBOUNCE_DELAY = 100;
            
            const debouncedCallback = (response) => {
                const now = Date.now();
                if (now - lastCallTime < DEBOUNCE_DELAY) {
                    return;
                }
                lastCallTime = now;
                
                try {
                    let processedEvent = response;
                    
                    if (typeof response === 'string') {
                        try {
                            processedEvent = JSON.parse(response);
                        } catch (parseError) {
                            console.error('Failed to parse document response:', parseError);
                            return;
                        }
                    }
                    
                    if (!processedEvent || !processedEvent.events) {
                        console.warn('Invalid document event structure:', processedEvent);
                        return;
                    }
                    
                    const cleanEvent = {
                        events: Array.isArray(processedEvent.events) ? processedEvent.events : [processedEvent.events],
                        payload: processedEvent.payload,
                        timestamp: now,
                        subscriptionId: subId,
                        documentId,
                        type: this.getEventType(processedEvent.events[0] || processedEvent.events)
                    };
                    
                    callback(cleanEvent);
                    
                } catch (callbackError) {
                    console.error(`[${subId}] Error in document realtime callback:`, callbackError);
                }
            };
            
            const unsubscribeFunction = client.subscribe(channelName, debouncedCallback);
            
            if (unsubscribeFunction && typeof unsubscribeFunction === 'function') {
                this.activeSubscriptions.set(subId, {
                    unsubscribe: unsubscribeFunction,
                    collectionId,
                    documentId,
                    channelName,
                    createdAt: Date.now()
                });
                
                return {
                    subscriptionId: subId,
                    unsubscribe: () => this.unsubscribe(subId)
                };
            }
            
            return null;
            
        } catch (error) {
            console.error('Error setting up document subscription:', error);
            return null;
        }
    },
    
    // Helper to determine event type
    getEventType(eventString) {
        if (!eventString) return 'unknown';
        
        if (eventString.includes('create')) return 'create';
        if (eventString.includes('update')) return 'update';
        if (eventString.includes('delete')) return 'delete';
        
        return 'unknown';
    },
    
    // Unsubscribe from a specific subscription
    unsubscribe(subscriptionId) {
        try {
            const subscription = this.activeSubscriptions.get(subscriptionId);
            
            if (subscription) {
                subscription.unsubscribe();
                this.activeSubscriptions.delete(subscriptionId);
                console.log(`Unsubscribed from ${subscriptionId}`);
                return true;
            } else {
                console.warn(`Subscription ${subscriptionId} not found`);
                return false;
            }
        } catch (error) {
            console.error(`Error unsubscribing from ${subscriptionId}:`, error);
            return false;
        }
    },
    
    // Get subscription info
    getSubscriptionInfo(subscriptionId) {
        return this.activeSubscriptions.get(subscriptionId) || null;
    },
    
    // List all active subscriptions
    listActiveSubscriptions() {
        const subscriptions = [];
        this.activeSubscriptions.forEach((value, key) => {
            subscriptions.push({
                id: key,
                ...value,
                age: Date.now() - value.createdAt
            });
        });
        return subscriptions;
    },
    
    // Safely unsubscribe from all active subscriptions
    unsubscribeAll() {
        console.log('Unsubscribing from all realtime subscriptions...');
        
        const subscriptionIds = Array.from(this.activeSubscriptions.keys());
        
        subscriptionIds.forEach(subId => {
            this.unsubscribe(subId);
        });
        
        console.log(`Cleaned up ${subscriptionIds.length} subscriptions`);
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