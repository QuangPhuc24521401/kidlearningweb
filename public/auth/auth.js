import { auth } from "../firebase.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.10.0/firebase-auth.js";

export const register = async (email, password) => {
  await createUserWithEmailAndPassword(auth, email, password);
  window.location.href = "/index.html";
};

export const login = async (email, password) => {
  await signInWithEmailAndPassword(auth, email, password);
  window.location.href = "/index.html";
};

export const logout = async () => {
  await signOut(auth);
  window.location.href = "/auth/login.html";
};

export const resetPassword = async (email) => {
  await sendPasswordResetEmail(auth, email);
  alert("📧 Đã gửi email");
};

export function protectPage() {
  onAuthStateChanged(auth, user => {
    if (!user) {
      window.location.href = "/auth/login.html";
    }
  });
}