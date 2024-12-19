import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getDatabase } from 'firebase/database';

// Firebase configuratie
const firebaseConfig = {
    apiKey: "AIzaSyDKInWXVM4-aLI76M7yT64snvJtgfh2plA",
    authDomain: "easyplanning-991c7.firebaseapp.com",
    databaseURL: "https://easyplanning-991c7-default-rtdb.europe-west1.firebasedatabase.app/",
    projectId: "easyplanning-991c7",
    storageBucket: "easyplanning-991c7.appspot.com", // Corrected storage bucket URL
    messagingSenderId: "919076045420",
    appId: "1:919076045420:web:113cd5f1b32944c0f68e49"
};

// Controleer of Firebase al is geïnitialiseerd
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Initialiseer services
const auth = getAuth(app);
const db = getFirestore(app);
const realtimeDB = getDatabase(app);

export { auth, db, realtimeDB };
