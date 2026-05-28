/* ═══════════════════════════════════════════════════
   FIREBASE.MODULE.JS — Firebase cho trang auth (ES modules)

   Chỉ import từ auth/auth.js (login, register, forgot, student-setup).
   Các trang khác dùng firebase.js (compat SDK global).

   Export:
   • auth — Firebase Authentication
   • db   — Firestore (users/{uid}, …)
═══════════════════════════════════════════════════ */

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey:            "AIzaSyBC77BDLMwL6igf2pkLynsYjcsetfILIsQ",
  authDomain:        "kidlearningweb.firebaseapp.com",
  projectId:         "kidlearningweb",
  storageBucket:     "kidlearningweb.firebasestorage.app",
  messagingSenderId: "790115043715",
  appId:             "1:790115043715:web:dff35e91b6a3d863e30eb6"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
