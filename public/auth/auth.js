import { auth } from "../firebase.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.10.0/firebase-auth.js";

// Đăng ký
window.register = async () => {
  await createUserWithEmailAndPassword(
    auth,
    emailInput.value,
    passwordInput.value
  );
  window.location.href = "/index.html";
};

// Đăng nhập
window.login = async () => {
  await signInWithEmailAndPassword(auth, emailInput.value, passwordInput.value);
  window.location.href = "/index.html";
};

// Đăng xuất
window.logout = async () => {
  await signOut(auth);
  window.location.href = "/auth/login.html";
};

// Quên mật khẩu
window.resetPassword = async () => {
  await sendPasswordResetEmail(auth, emailInput.value);
  alert("📧 Đã gửi email");
};

// auth protect
export function protectPage() {
  onAuthStateChanged(auth, user => {
    if (!user) {
      window.location.href = "/auth/login.html";
    }
  });
}