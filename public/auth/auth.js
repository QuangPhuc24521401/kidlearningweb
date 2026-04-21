import { auth } from "../firebase.module.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence
} from "https://www.gstatic.com/firebasejs/12.10.0/firebase-auth.js";

const HOME_URL   = "../index.html";
const LOGIN_URL  = "./login.html";

function getRememberChoice() {
  const el = document.getElementById("rememberMe");
  return el ? !!el.checked : true;
}

async function applyPersistence() {
  try {
    const remember = getRememberChoice();
    await setPersistence(auth, remember ? browserLocalPersistence : browserSessionPersistence);
  } catch (e) { /* persistence is best-effort */ }
}

async function storeBrowserCredential(email, password) {
  try {
    if (window.PasswordCredential) {
      const cred = new window.PasswordCredential({ id: email, password, name: email });
      await navigator.credentials.store(cred);
    }
  } catch (e) { /* ignored */ }
}

async function handleRegister(e) {
  e?.preventDefault?.();
  const email = document.getElementById("emailInput")?.value?.trim();
  const password = document.getElementById("passwordInput")?.value;
  if (!email || !password) return alert("⚠️ Vui lòng nhập đầy đủ thông tin");

  await applyPersistence();
  try {
    await createUserWithEmailAndPassword(auth, email, password);
    await storeBrowserCredential(email, password);
    window.location.href = HOME_URL;
  } catch (error) {
    if (error.code === "auth/email-already-in-use") alert("❌ Email này đã được đăng ký.");
    else if (error.code === "auth/weak-password")   alert("⚠️ Mật khẩu phải từ 6 ký tự trở lên.");
    else if (error.code === "auth/invalid-email")   alert("❌ Email không hợp lệ.");
    else alert("❌ Lỗi: " + error.message);
  }
}

async function handleLogin(e) {
  e?.preventDefault?.();
  const email = document.getElementById("emailInput")?.value?.trim();
  const password = document.getElementById("passwordInput")?.value;
  if (!email || !password) return alert("⚠️ Vui lòng nhập đầy đủ thông tin");

  await applyPersistence();
  try {
    await signInWithEmailAndPassword(auth, email, password);
    await storeBrowserCredential(email, password);
    window.location.href = HOME_URL;
  } catch (error) {
    if (error.code === "auth/invalid-credential")     alert("❌ Sai email hoặc mật khẩu.");
    else if (error.code === "auth/user-not-found")    alert("❌ Tài khoản không tồn tại.");
    else if (error.code === "auth/wrong-password")    alert("❌ Mật khẩu không đúng.");
    else if (error.code === "auth/too-many-requests") alert("⚠️ Đăng nhập sai quá nhiều lần. Thử lại sau.");
    else alert("❌ Lỗi: " + error.message);
  }
}

async function handleResetPassword(e) {
  e?.preventDefault?.();
  const email = document.getElementById("emailInput")?.value?.trim();
  if (!email) return alert("⚠️ Vui lòng nhập email");
  try {
    await sendPasswordResetEmail(auth, email);
    alert("📧 Đã gửi email đặt lại mật khẩu!");
  } catch (error) {
    alert("❌ Lỗi: " + error.message);
  }
}

export async function logout() {
  await signOut(auth);
  window.location.href = LOGIN_URL;
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("loginForm")   ?.addEventListener("submit", handleLogin);
  document.getElementById("registerForm")?.addEventListener("submit", handleRegister);
  document.getElementById("forgotForm")  ?.addEventListener("submit", handleResetPassword);

  document.getElementById("loginBtn")   ?.addEventListener("click", handleLogin);
  document.getElementById("registerBtn")?.addEventListener("click", handleRegister);
  document.getElementById("resetBtn")   ?.addEventListener("click", handleResetPassword);

  const path = location.pathname.toLowerCase();
  const isLoginOrRegister = path.endsWith("/login.html") || path.endsWith("/register.html");
  if (isLoginOrRegister) {
    onAuthStateChanged(auth, user => {
      if (user) window.location.href = HOME_URL;
    });
  }
});
