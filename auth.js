// auth.js
import { auth } from "./firebase.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.10.0/firebase-auth.js";

// Đăng ký
window.register = async () => {
  const email = emailInput.value;
  const password = passwordInput.value;

  try {
    await createUserWithEmailAndPassword(auth, email, password);
    alert("✅ Đăng ký thành công");
    window.location.href = "../index.html";
  } catch (e) {
    alert(e.message);
  }
};

// Đăng nhập
window.login = async () => {
  const email = emailInput.value;
  const password = passwordInput.value;

  try {
    await signInWithEmailAndPassword(auth, email, password);
    window.location.href = "../index.html";
  } catch (e) {
    alert("❌ Sai tài khoản hoặc mật khẩu");
  }
};

// Đăng xuất
window.logout = async () => {
  await signOut(auth);
  window.location.href = "auth/login.html";
};

// Quên mật khẩu
window.resetPassword = async () => {
  const email = emailInput.value;
  await sendPasswordResetEmail(auth, email);
  alert("📧 Đã gửi email đặt lại mật khẩu");
};

// Bảo vệ trang
export function protectPage() {
  onAuthStateChanged(auth, user => {
    if (!user) {
      window.location.href = "auth/login.html";
    }
  });
}