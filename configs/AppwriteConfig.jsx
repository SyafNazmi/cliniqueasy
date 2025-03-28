// configs/AppwriteConfig.jsx
import { Client, Account, Databases, ID, Query } from 'appwrite';

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
            return await databases.createDocument(
                process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID, // Your database ID
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
    async listDocuments(collectionId, queries = [], limit = 100) {
        try {
            return await databases.listDocuments(
                process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID,
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

export { 
    client, 
    account, 
    databases, 
    ID, 
    Query,
    DatabaseService,
    AuthService
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