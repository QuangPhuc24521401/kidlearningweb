// Import Firebase core
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js";

// Import Firestore 
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-auth.js";

// Your web app's Firebase configuration
  const firebaseConfig = {
    apiKey: "AIzaSyBC77BDLMwL6igf2pkLynsYjcsetfILIsQ",
    authDomain: "kidlearningweb.firebaseapp.com",
    projectId: "kidlearningweb",
    storageBucket: "kidlearningweb.firebasestorage.app",
    messagingSenderId: "790115043715",
    appId: "1:790115043715:web:dff35e91b6a3d863e30eb6"
  };
// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore
export const db = getFirestore(app);

//auth
export const auth = getAuth(app);
