// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCmrKimJhq9qNNLNmhw-xoWXLpIFyeOcl8",
  authDomain: "cliniqueasy-se-fyp.firebaseapp.com",
  projectId: "cliniqueasy-se-fyp",
  storageBucket: "cliniqueasy-se-fyp.firebasestorage.app",
  messagingSenderId: "724675485307",
  appId: "1:724675485307:web:37448fabdcf12a99258cde",
  measurementId: "G-Q2M5LN3SXN"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);