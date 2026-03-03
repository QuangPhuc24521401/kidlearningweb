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

  if (!email || !password) return alert("⚠️ Vui lòng nhập đầy đủ thông tin");

  try {
    await createUserWithEmailAndPassword(auth, email, password);

    alert("🎉 Đăng ký thành công! Vui lòng đăng nhập.");
    window.location.href = "/auth/login.html";

  } catch (error) {

    if (error.code === "auth/email-already-in-use") {
      alert("❌ Email này đã được đăng ký.");
    } else if (error.code === "auth/weak-password") {
      alert("⚠️ Mật khẩu phải từ 6 ký tự trở lên.");
    } else {
      alert("❌ Lỗi: " + error.message);
    }
  }
}


// ===== LOGIN =====
async function handleLogin() {
  const email = document.getElementById("emailInput")?.value;
  const password = document.getElementById("passwordInput")?.value;

  if (!email || !password) return alert("⚠️ Vui lòng nhập đầy đủ thông tin");

  try {
    await signInWithEmailAndPassword(auth, email, password);

    alert("✅ Đăng nhập thành công!");
    window.location.href = "/index.html";

  } catch (error) {

    if (error.code === "auth/invalid-credential") {
      alert("❌ Sai email hoặc mật khẩu.");
    } else if (error.code === "auth/user-not-found") {
      alert("❌ Tài khoản không tồn tại.");
    } else if (error.code === "auth/wrong-password") {
      alert("❌ Mật khẩu không đúng.");
    } else {
      alert("❌ Lỗi: " + error.message);
    }
  }
}


// ===== RESET PASSWORD =====
async function handleResetPassword() {
  const email = document.getElementById("emailInput")?.value;

  if (!email) return alert("⚠️ Vui lòng nhập email");

  try {
    await sendPasswordResetEmail(auth, email);
    alert("📧 Đã gửi email đặt lại mật khẩu!");
  } catch (error) {
    alert("❌ Lỗi: " + error.message);
  }
}


// ===== LOGOUT =====
export async function logout() {
  await signOut(auth);
  window.location.href = "/auth/login.html";
}


// ===== PROTECT PAGE =====
export function protectPage() {
  onAuthStateChanged(auth, user => {
    if (!user) {
      window.location.href = "/auth/login.html";
    }
  });
}


// ===== AUTO BIND BUTTON =====
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("loginBtn")?.addEventListener("click", handleLogin);
  document.getElementById("registerBtn")?.addEventListener("click", handleRegister);
  document.getElementById("resetBtn")?.addEventListener("click", handleResetPassword);
});