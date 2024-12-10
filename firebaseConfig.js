import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: "AIzaSyDKInWXVM4-aLI76M7yT64snvJtgfh2plA",
    authDomain: "easyplanning-991c7.firebaseapp.com",
    projectId: "easyplanning-991c7",
    storageBucket: "easyplanning-991c7.firebasestorage.app",
    messagingSenderId: "919076045420",
    appId: "1:919076045420:web:113cd5f1b32944c0f68e49"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db };
