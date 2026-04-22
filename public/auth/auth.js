import { auth } from "../firebase.module.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  sendEmailVerification,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence
} from "https://www.gstatic.com/firebasejs/12.10.0/firebase-auth.js";

const HOME_URL   = "../index.html";
const LOGIN_URL  = "./login.html";

/* ───────────────────────── Helpers ───────────────────────── */

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

/**
 * Show an inline notice inside the form. Types: "success" | "error" | "warn" | "info".
 * If an `extraHtml` is provided, it's appended (used for "Resend email" link).
 */
function showNotice(type, message, extraHtml) {
  const box = document.getElementById("authNotice");
  if (!box) { alert(message); return; }
  box.className = "auth-notice " + type;
  box.innerHTML = `<span>${message}</span>` + (extraHtml || "");
  box.style.display = "block";
}
function clearNotice() {
  const box = document.getElementById("authNotice");
  if (box) { box.style.display = "none"; box.innerHTML = ""; }
}

/** Toggle loading state on the submit button. */
function setLoading(btnId, loading, labelWhenLoading) {
  const btn = document.getElementById(btnId);
  if (!btn) return;
  if (loading) {
    btn.dataset.origText = btn.dataset.origText || btn.textContent;
    btn.disabled = true;
    btn.classList.add("is-loading");
    btn.textContent = labelWhenLoading || "Đang xử lý...";
  } else {
    btn.disabled = false;
    btn.classList.remove("is-loading");
    if (btn.dataset.origText) btn.textContent = btn.dataset.origText;
  }
}

/** Friendly Firebase error mapping. */
function friendlyAuthError(code) {
  switch (code) {
    case "auth/email-already-in-use":  return "Email này đã được đăng ký rồi.";
    case "auth/invalid-email":         return "Email không hợp lệ.";
    case "auth/weak-password":         return "Mật khẩu phải từ 6 ký tự trở lên.";
    case "auth/missing-password":      return "Vui lòng nhập mật khẩu.";
    case "auth/invalid-credential":
    case "auth/wrong-password":        return "Sai email hoặc mật khẩu.";
    case "auth/user-not-found":        return "Tài khoản không tồn tại.";
    case "auth/user-disabled":         return "Tài khoản đã bị khóa.";
    case "auth/too-many-requests":     return "Bạn thử quá nhiều lần. Vui lòng đợi vài phút.";
    case "auth/network-request-failed":return "Không có kết nối mạng, thử lại nhé.";
    default:                           return null;
  }
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/* ───────────────────────── Register ───────────────────────── */

async function handleRegister(e) {
  e?.preventDefault?.();
  clearNotice();

  const email      = document.getElementById("emailInput")?.value?.trim();
  const password   = document.getElementById("passwordInput")?.value;
  const confirm    = document.getElementById("confirmPasswordInput")?.value;

  if (!email || !password) return showNotice("error", "Vui lòng nhập đầy đủ email và mật khẩu.");
  if (!isValidEmail(email)) return showNotice("error", "Email không hợp lệ.");
  if (password.length < 6)  return showNotice("error", "Mật khẩu phải có ít nhất 6 ký tự.");
  if (password !== confirm) return showNotice("error", "Xác nhận mật khẩu không khớp.");

  setLoading("registerBtn", true, "Đang tạo tài khoản...");
  await applyPersistence();
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await storeBrowserCredential(email, password);

    try {
      await sendEmailVerification(cred.user, {
        url: window.location.origin + "/auth/login.html",
        handleCodeInApp: false
      });
    } catch (ve) {
      console.warn("sendEmailVerification failed:", ve);
    }

    await signOut(auth);

    sessionStorage.setItem("auth:flash", JSON.stringify({
      type: "success",
      message: `Tài khoản đã được tạo! Chúng tôi đã gửi email xác thực tới <b>${email}</b>. Vui lòng mở email và bấm vào đường link để kích hoạt trước khi đăng nhập.`
    }));
    window.location.href = LOGIN_URL;
  } catch (error) {
    const msg = friendlyAuthError(error.code) || ("Lỗi: " + error.message);
    showNotice("error", msg);
  } finally {
    setLoading("registerBtn", false);
  }
}

/* ───────────────────────── Login ───────────────────────── */

async function handleLogin(e) {
  e?.preventDefault?.();
  clearNotice();

  const email    = document.getElementById("emailInput")?.value?.trim();
  const password = document.getElementById("passwordInput")?.value;

  if (!email || !password) return showNotice("error", "Vui lòng nhập đầy đủ email và mật khẩu.");
  if (!isValidEmail(email)) return showNotice("error", "Email không hợp lệ.");

  setLoading("loginBtn", true, "Đang đăng nhập...");
  await applyPersistence();
  try {
    const cred = await signInWithEmailAndPassword(auth, email, password);

    if (!cred.user.emailVerified) {
      await signOut(auth);
      showNotice(
        "warn",
        `Email <b>${email}</b> chưa được xác thực. Vui lòng mở hộp thư và bấm vào link xác thực.`,
        ` <a href="#" id="resendVerifyLink">Gửi lại email xác thực</a>`
      );
      document.getElementById("resendVerifyLink")?.addEventListener("click", async (ev) => {
        ev.preventDefault();
        await resendVerification(email, password);
      });
      return;
    }

    await storeBrowserCredential(email, password);
    window.location.href = HOME_URL;
  } catch (error) {
    const msg = friendlyAuthError(error.code) || ("Lỗi: " + error.message);
    showNotice("error", msg);
  } finally {
    setLoading("loginBtn", false);
  }
}

async function resendVerification(email, password) {
  try {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    await sendEmailVerification(cred.user, {
      url: window.location.origin + "/auth/login.html",
      handleCodeInApp: false
    });
    await signOut(auth);
    showNotice("success", `Đã gửi lại email xác thực tới <b>${email}</b>. Kiểm tra cả mục Spam nhé.`);
  } catch (error) {
    const msg = friendlyAuthError(error.code) || ("Không gửi lại được: " + error.message);
    showNotice("error", msg);
  }
}

/* ───────────────────────── Forgot password ───────────────────────── */

async function handleResetPassword(e) {
  e?.preventDefault?.();
  clearNotice();

  const email = document.getElementById("emailInput")?.value?.trim();
  if (!email)               return showNotice("error", "Vui lòng nhập email.");
  if (!isValidEmail(email)) return showNotice("error", "Email không hợp lệ.");

  setLoading("resetBtn", true, "Đang gửi email...");
  try {
    await sendPasswordResetEmail(auth, email, {
      url: window.location.origin + "/auth/login.html",
      handleCodeInApp: false
    });
    showNotice(
      "success",
      `Đã gửi email đặt lại mật khẩu tới <b>${email}</b>. Hãy kiểm tra hộp thư (kể cả Spam) và làm theo hướng dẫn.`
    );
    document.getElementById("forgotForm")?.reset();
  } catch (error) {
    const msg = friendlyAuthError(error.code) || ("Lỗi: " + error.message);
    showNotice("error", msg);
  } finally {
    setLoading("resetBtn", false);
  }
}

/* ───────────────────────── Logout (exported) ───────────────────────── */

export async function logout() {
  await signOut(auth);
  window.location.href = LOGIN_URL;
}

/* ───────────────────────── Init ───────────────────────── */

function initAuthUi() {
  document.getElementById("loginForm")   ?.addEventListener("submit", handleLogin);
  document.getElementById("registerForm")?.addEventListener("submit", handleRegister);
  document.getElementById("forgotForm")  ?.addEventListener("submit", handleResetPassword);

  document.getElementById("loginBtn")   ?.addEventListener("click", handleLogin);
  document.getElementById("registerBtn")?.addEventListener("click", handleRegister);
  document.getElementById("resetBtn")   ?.addEventListener("click", handleResetPassword);

  try {
    const flash = sessionStorage.getItem("auth:flash");
    if (flash) {
      sessionStorage.removeItem("auth:flash");
      const { type, message } = JSON.parse(flash);
      showNotice(type || "info", message);
    }
  } catch (e) { /* ignore */ }

  const path = location.pathname.toLowerCase();
  const isLoginOrRegister = path.endsWith("/login.html") || path.endsWith("/register.html");
  if (isLoginOrRegister) {
    onAuthStateChanged(auth, user => {
      if (user && user.emailVerified) window.location.href = HOME_URL;
    });
  }
}

// Module scripts are deferred: DOMContentLoaded may already have fired by the
// time this file finishes loading. Handle both cases so listeners always bind.
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initAuthUi);
} else {
  initAuthUi();
}
