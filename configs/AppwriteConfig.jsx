// configs/AppwriteConfig.jsx
import { Client, Account, ID } from 'appwrite';

// Ensure you replace these with your actual Appwrite project details
const client = new Client()
    .setEndpoint('https://cloud.appwrite.io/v1') // Your Appwrite cloud endpoint
    .setProject('67e0310c000b89e3feee'); // Your Project ID from Appwrite Console

// Create Account instance AFTER setting up the client
const account = new Account(client);

export { 
    client, 
    account, 
    ID 
};