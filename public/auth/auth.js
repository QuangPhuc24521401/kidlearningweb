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
  browserSessionPersistence,
  RecaptchaVerifier,
  signInWithPhoneNumber
} from "https://www.gstatic.com/firebasejs/12.10.0/firebase-auth.js";

const HOME_URL   = "../index.html";
const LOGIN_URL  = "./login.html";

/* ───────────────────────── Helpers ───────────────────────── */

function getRememberChoice() {
  const el = document.getElementById("rememberMe") || document.getElementById("rememberMePhone");
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
    case "auth/invalid-phone-number":  return "Số điện thoại không hợp lệ. Vui lòng kiểm tra lại.";
    case "auth/missing-phone-number":  return "Vui lòng nhập số điện thoại.";
    case "auth/quota-exceeded":        return "Hệ thống đã gửi quá nhiều SMS hôm nay. Vui lòng thử lại sau.";
    case "auth/invalid-verification-code": return "Mã OTP không đúng. Vui lòng kiểm tra lại.";
    case "auth/code-expired":          return "Mã OTP đã hết hạn. Hãy bấm “Gửi lại mã”.";
    case "auth/missing-verification-code": return "Vui lòng nhập mã OTP.";
    case "auth/captcha-check-failed":  return "Xác thực reCAPTCHA thất bại. Hãy thử lại.";
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

/* ───────────────────────── Phone registration (SMS OTP) ───────────────────────── */

let recaptchaVerifier = null;
let confirmationResult = null;
let resendTimerId = null;

/** Lazily create a single invisible reCAPTCHA verifier bound to #sendOtpBtn. */
function ensureRecaptcha() {
  if (recaptchaVerifier) return recaptchaVerifier;
  recaptchaVerifier = new RecaptchaVerifier(auth, "recaptchaContainer", {
    size: "invisible",
    callback: () => { /* solved, continue */ },
    "expired-callback": () => {
      showNotice("warn", "Phiên xác thực đã hết hạn. Vui lòng thử gửi lại mã.");
    }
  });
  return recaptchaVerifier;
}

/** Reset verifier so the user can try again. */
async function resetRecaptcha() {
  try {
    if (recaptchaVerifier) {
      recaptchaVerifier.clear();
    }
  } catch (e) { /* ignore */ }
  recaptchaVerifier = null;
}

/** Normalize VN-style input (e.g. "0912345678") to E.164 with the chosen country code. */
function normalizePhone(countryCode, raw) {
  if (!raw) return "";
  let digits = raw.replace(/[^\d]/g, "");
  if (countryCode === "+84" && digits.startsWith("0")) {
    digits = digits.replace(/^0+/, "");
  }
  return countryCode + digits;
}

function isValidE164(num) {
  return /^\+[1-9]\d{6,14}$/.test(num);
}

function startResendTimer(seconds = 60) {
  const span = document.getElementById("resendTimer");
  const link = document.getElementById("resendOtpLink");
  if (!span || !link) return;
  link.classList.add("is-disabled");
  let remaining = seconds;
  span.innerHTML = `Gửi lại sau <b>${remaining}</b>s`;
  span.style.display = "";
  clearInterval(resendTimerId);
  resendTimerId = setInterval(() => {
    remaining -= 1;
    if (remaining <= 0) {
      clearInterval(resendTimerId);
      span.style.display = "none";
      link.classList.remove("is-disabled");
    } else {
      span.innerHTML = `Gửi lại sau <b>${remaining}</b>s`;
    }
  }, 1000);
}

async function handleSendOtp(e) {
  e?.preventDefault?.();
  clearNotice();

  const code  = document.getElementById("phoneCountryCode")?.value || "+84";
  const raw   = document.getElementById("phoneInput")?.value?.trim();
  const phone = normalizePhone(code, raw);

  if (!raw)                 return showNotice("error", "Vui lòng nhập số điện thoại.");
  if (!isValidE164(phone))  return showNotice("error", "Số điện thoại không hợp lệ. Hãy kiểm tra mã quốc gia và số.");

  setLoading("sendOtpBtn", true, "Đang gửi OTP...");
  await applyPersistence();

  try {
    const verifier = ensureRecaptcha();
    confirmationResult = await signInWithPhoneNumber(auth, phone, verifier);

    document.getElementById("sentPhoneLabel").textContent = phone;
    document.getElementById("phoneStep1").hidden = true;
    document.getElementById("phoneStep2").hidden = false;
    document.getElementById("otpInput")?.focus();
    startResendTimer(60);
    showNotice("success", `Đã gửi mã OTP tới <b>${phone}</b>. Hãy nhập mã bạn nhận được qua SMS.`);
  } catch (error) {
    console.warn("signInWithPhoneNumber failed:", error);
    await resetRecaptcha();
    const msg = friendlyAuthError(error.code) || ("Không gửi được OTP: " + error.message);
    showNotice("error", msg);
  } finally {
    setLoading("sendOtpBtn", false);
  }
}

async function handleVerifyOtp(e) {
  e?.preventDefault?.();
  clearNotice();

  const otp = document.getElementById("otpInput")?.value?.trim();
  if (!otp || !/^\d{6}$/.test(otp)) return showNotice("error", "Mã OTP phải gồm đúng 6 chữ số.");
  if (!confirmationResult)          return showNotice("error", "Phiên OTP đã hết hạn. Vui lòng gửi lại mã.");

  setLoading("verifyOtpBtn", true, "Đang xác thực...");
  try {
    const cred = await confirmationResult.confirm(otp);

    sessionStorage.setItem("auth:flash", JSON.stringify({
      type: "success",
      message: `Xác thực thành công! Chào mừng bạn tới Kid Learning.`
    }));
    window.location.href = HOME_URL;
    void cred;
  } catch (error) {
    const msg = friendlyAuthError(error.code) || ("Xác thực thất bại: " + error.message);
    showNotice("error", msg);
  } finally {
    setLoading("verifyOtpBtn", false);
  }
}

async function handleResendOtp(e) {
  e?.preventDefault?.();
  const link = document.getElementById("resendOtpLink");
  if (link?.classList.contains("is-disabled")) return;
  await resetRecaptcha();
  confirmationResult = null;
  document.getElementById("phoneStep2").hidden = true;
  document.getElementById("phoneStep1").hidden = false;
  handleSendOtp(new Event("submit"));
}

function handleChangePhone(e) {
  e?.preventDefault?.();
  clearInterval(resendTimerId);
  confirmationResult = null;
  document.getElementById("otpInput").value = "";
  document.getElementById("phoneStep2").hidden = true;
  document.getElementById("phoneStep1").hidden = false;
  clearNotice();
}

/* ───────────────────────── Tab switcher (Email / Phone) ───────────────────────── */

function setActiveTab(which) {
  const tabEmail  = document.getElementById("tabEmail");
  const tabPhone  = document.getElementById("tabPhone");
  const paneEmail = document.getElementById("registerForm") || document.getElementById("loginForm");
  const panePhone = document.getElementById("phoneRegisterForm") || document.getElementById("phoneLoginForm");
  if (!tabEmail || !tabPhone || !paneEmail || !panePhone) return;

  const isPhone = which === "phone";
  tabEmail.classList.toggle("is-active", !isPhone);
  tabPhone.classList.toggle("is-active",  isPhone);
  tabEmail.setAttribute("aria-selected", String(!isPhone));
  tabPhone.setAttribute("aria-selected", String(isPhone));

  paneEmail.classList.toggle("is-active", !isPhone);
  panePhone.classList.toggle("is-active",  isPhone);
  paneEmail.hidden =  isPhone;
  panePhone.hidden = !isPhone;

  clearNotice();
}

/* ───────────────────────── Logout (exported) ───────────────────────── */

export async function logout() {
  await signOut(auth);
  window.location.href = LOGIN_URL;
}

/* ───────────────────────── Init ───────────────────────── */

function initAuthUi() {
  document.getElementById("loginForm")        ?.addEventListener("submit", handleLogin);
  document.getElementById("registerForm")     ?.addEventListener("submit", handleRegister);
  document.getElementById("forgotForm")       ?.addEventListener("submit", handleResetPassword);
  const phoneForm = document.getElementById("phoneRegisterForm")
                 || document.getElementById("phoneLoginForm");
  phoneForm?.addEventListener("submit", (e) => {
    const step2 = document.getElementById("phoneStep2");
    if (step2 && !step2.hidden) {
      handleVerifyOtp(e);
    } else {
      handleSendOtp(e);
    }
  });

  document.getElementById("loginBtn")    ?.addEventListener("click", handleLogin);
  document.getElementById("registerBtn") ?.addEventListener("click", handleRegister);
  document.getElementById("resetBtn")    ?.addEventListener("click", handleResetPassword);
  document.getElementById("changePhoneLink")?.addEventListener("click", handleChangePhone);
  document.getElementById("resendOtpLink")  ?.addEventListener("click", handleResendOtp);

  document.getElementById("tabEmail")?.addEventListener("click", () => setActiveTab("email"));
  document.getElementById("tabPhone")?.addEventListener("click", () => setActiveTab("phone"));

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
      // Email users must verify their email before reaching home.
      // Phone users are considered verified as soon as OTP is confirmed.
      if (!user) return;
      const providers = (user.providerData || []).map(p => p.providerId);
      const hasPhone  = providers.includes("phone");
      if (user.emailVerified || hasPhone) window.location.href = HOME_URL;
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
