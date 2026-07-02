// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth"; // ✨ Tillagd: GoogleAuthProvider
import { getFirestore } from "firebase/firestore"; 
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCWu0An6WcoXrXltK_Y0SY3nXMFlaITmJE",
  authDomain: "yoo-chat-2879a.firebaseapp.com",
  projectId: "yoo-chat-2879a",
  storageBucket: "yoo-chat-2879a.firebasestorage.app",
  messagingSenderId: "727163702399",
  appId: "1:727163702399:web:5baba66456c0adbcf4034a",
  measurementId: "G-FCWPVF2C7B"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize and EXPORT the services your app needs
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider(); // ✨ Tillagd: Skapa providern
export const db = getFirestore(app);
export const storage = getStorage(app);