import { auth } from "../firebase.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.10.0/firebase-auth.js";

// ===== REGISTER =====
async function handleRegister() {
  const email = document.getElementById("emailInput")?.value;
  const password = document.getElementById("passwordInput")?.value;

  if (!email || !password) return alert("Thiếu thông tin");

  await createUserWithEmailAndPassword(auth, email, password);
  window.location.href = "/index.html";
}

// ===== LOGIN =====
async function handleLogin() {
  const email = document.getElementById("emailInput")?.value;
  const password = document.getElementById("passwordInput")?.value;

  if (!email || !password) return alert("Thiếu thông tin");

  await signInWithEmailAndPassword(auth, email, password);
  window.location.href = "/index.html";
}

// ===== RESET PASSWORD =====
async function handleResetPassword() {
  const email = document.getElementById("emailInput")?.value;
  if (!email) return alert("Nhập email");

  await sendPasswordResetEmail(auth, email);
  alert("📧 Đã gửi email");
}

// ===== LOGOUT =====
export async function logout() {
  await signOut(auth);
  window.location.href = "/auth/login.html";
}

// ===== PROTECT PAGE =====
export function protectPage() {
  onAuthStateChanged(auth, user => {
    if (!user) window.location.href = "/auth/login.html";
  });
}

// ===== AUTO BIND BUTTON =====
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("loginBtn")?.addEventListener("click", handleLogin);
  document.getElementById("registerBtn")?.addEventListener("click", handleRegister);
  document.getElementById("resetBtn")?.addEventListener("click", handleResetPassword);
});