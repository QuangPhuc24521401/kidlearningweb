import { auth, db } from "../firebase.module.js";
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
  updateProfile
} from "https://www.gstatic.com/firebasejs/12.10.0/firebase-auth.js";
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";

const HOME_PARENT_URL  = "../index.html";
const HOME_TEACHER_URL = "../mentor-teacher.html";
const LOGIN_URL        = "./login.html";

/* ───────────────────────── Helpers ───────────────────────── */

function getRememberChoice() {
  const el = document.getElementById("rememberMe")
          || document.getElementById("rememberMeParent")
          || document.getElementById("rememberMeTeacher");
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

function normalizeClassroom(raw) {
  return String(raw || "").trim().toUpperCase().replace(/\s+/g, "");
}

/* ───────────────────────── Role helpers ───────────────────────── */

/** Cache role + classroom vào localStorage cho các page khác đọc nhanh. */
function cacheUserMeta(meta) {
  try {
    if (meta?.role)      localStorage.setItem("userRole", meta.role);
    if (meta?.classRoom) localStorage.setItem("classRoom", meta.classRoom);
    if (meta?.displayName) localStorage.setItem("userDisplayName", meta.displayName);
  } catch (e) {}
}
function clearUserMeta() {
  try {
    localStorage.removeItem("userRole");
    localStorage.removeItem("classRoom");
    localStorage.removeItem("userDisplayName");
  } catch (e) {}
}

/** Đọc Firestore users/{uid}. Trả về { role, classRoom, displayName, ... } hoặc null. */
async function fetchUserMeta(uid) {
  try {
    const snap = await getDoc(doc(db, "users", uid));
    if (snap.exists()) return snap.data();
  } catch (e) {
    console.warn("[auth] fetchUserMeta failed:", e);
  }
  return null;
}

/** Tạo doc users/{uid} với role + thông tin phụ. */
async function writeUserMeta(uid, data) {
  try {
    await setDoc(doc(db, "users", uid), {
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }, { merge: true });
  } catch (e) {
    console.warn("[auth] writeUserMeta failed (Firestore rules?):", e);
  }
}

function redirectByRole(role) {
  if (role === "teacher") window.location.href = HOME_TEACHER_URL;
  else                    window.location.href = HOME_PARENT_URL;
}

/* ───────────────────────── Register: PARENT ───────────────────────── */

async function handleParentRegister(e) {
  e?.preventDefault?.();
  clearNotice();

  const childName = document.getElementById("parentChildName")?.value?.trim();
  const email     = document.getElementById("parentEmail")?.value?.trim();
  const password  = document.getElementById("parentPassword")?.value;
  const confirm   = document.getElementById("parentConfirm")?.value;

  if (!email || !password) return showNotice("error", "Vui lòng nhập email và mật khẩu.");
  if (!isValidEmail(email)) return showNotice("error", "Email không hợp lệ.");
  if (password.length < 6)  return showNotice("error", "Mật khẩu phải có ít nhất 6 ký tự.");
  if (password !== confirm) return showNotice("error", "Xác nhận mật khẩu không khớp.");

  setLoading("parentRegisterBtn", true, "Đang tạo tài khoản...");
  await applyPersistence();
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    if (childName) {
      try { await updateProfile(cred.user, { displayName: childName }); } catch (e) {}
    }
    await writeUserMeta(cred.user.uid, {
      role: "parent",
      email,
      childName: childName || "",
      displayName: childName || ""
    });
    await storeBrowserCredential(email, password);

    try {
      await sendEmailVerification(cred.user, {
        url: window.location.origin + "/auth/login.html",
        handleCodeInApp: false
      });
    } catch (ve) { console.warn("sendEmailVerification failed:", ve); }

    await signOut(auth);

    sessionStorage.setItem("auth:flash", JSON.stringify({
      type: "success",
      message: `Đã tạo tài khoản phụ huynh cho <b>${email}</b>. Mở email và bấm vào link xác thực để kích hoạt nhé.<br><br>⚠️ Nếu không thấy, kiểm tra <b>Spam / Quảng cáo</b>.`
    }));
    window.location.href = LOGIN_URL;
  } catch (error) {
    const msg = friendlyAuthError(error.code) || ("Lỗi: " + error.message);
    showNotice("error", msg);
  } finally {
    setLoading("parentRegisterBtn", false);
  }
}

/* ───────────────────────── Register: TEACHER ───────────────────────── */

async function handleTeacherRegister(e) {
  e?.preventDefault?.();
  clearNotice();

  const name      = document.getElementById("teacherName")?.value?.trim();
  const email     = document.getElementById("teacherEmail")?.value?.trim();
  const password  = document.getElementById("teacherPassword")?.value;
  const confirm   = document.getElementById("teacherConfirm")?.value;
  const classRoom = normalizeClassroom(document.getElementById("teacherClassroom")?.value);

  if (!name)                return showNotice("error", "Vui lòng nhập tên giáo viên.");
  if (!email || !password)  return showNotice("error", "Vui lòng nhập email và mật khẩu.");
  if (!isValidEmail(email)) return showNotice("error", "Email không hợp lệ.");
  if (password.length < 6)  return showNotice("error", "Mật khẩu phải có ít nhất 6 ký tự.");
  if (password !== confirm) return showNotice("error", "Xác nhận mật khẩu không khớp.");
  if (!classRoom || classRoom.length < 3) return showNotice("error", "Mã lớp phải dài ít nhất 3 ký tự (vd: LOPA2024).");

  setLoading("teacherRegisterBtn", true, "Đang tạo tài khoản...");
  await applyPersistence();
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    try { await updateProfile(cred.user, { displayName: name }); } catch (e) {}
    await writeUserMeta(cred.user.uid, {
      role: "teacher",
      email,
      displayName: name,
      classRoom
    });
    await storeBrowserCredential(email, password);

    try {
      await sendEmailVerification(cred.user, {
        url: window.location.origin + "/auth/login.html",
        handleCodeInApp: false
      });
    } catch (ve) { console.warn("sendEmailVerification failed:", ve); }

    await signOut(auth);

    sessionStorage.setItem("auth:flash", JSON.stringify({
      type: "success",
      message: `Đã tạo tài khoản giáo viên cho <b>${email}</b> (lớp <b>${classRoom}</b>). Mở email để xác thực rồi đăng nhập.<br><br>⚠️ Nếu không thấy, kiểm tra <b>Spam / Quảng cáo</b>.`
    }));
    window.location.href = LOGIN_URL;
  } catch (error) {
    const msg = friendlyAuthError(error.code) || ("Lỗi: " + error.message);
    showNotice("error", msg);
  } finally {
    setLoading("teacherRegisterBtn", false);
  }
}

/* ───────────────────────── Login (chung 1 form, role detect sau) ───────────────────────── */

async function handleLogin(e) {
  e?.preventDefault?.();
  clearNotice();

  const email     = document.getElementById("emailInput")?.value?.trim();
  const password  = document.getElementById("passwordInput")?.value;
  const roleHint  = document.getElementById("loginRoleHint")?.value || "parent";

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
        `Email <b>${email}</b> chưa được xác thực. Mở hộp thư và bấm vào link xác thực.`,
        ` <a href="#" id="resendVerifyLink">Gửi lại email xác thực</a>`
      );
      document.getElementById("resendVerifyLink")?.addEventListener("click", async (ev) => {
        ev.preventDefault();
        await resendVerification(email, password);
      });
      return;
    }

    // Đọc role thật từ Firestore
    const meta = await fetchUserMeta(cred.user.uid);
    const realRole = meta?.role || "parent";

    // Cảnh báo nếu user chọn nhầm tab role
    if (roleHint && roleHint !== realRole) {
      const roleLabel = realRole === "teacher" ? "Giáo viên" : "Phụ huynh";
      showNotice("info", `Tài khoản này thuộc loại <b>${roleLabel}</b>. Đang chuyển đến đúng trang...`);
    }

    cacheUserMeta({
      role:        realRole,
      classRoom:   meta?.classRoom || "",
      displayName: meta?.displayName || ""
    });
    await storeBrowserCredential(email, password);
    setTimeout(() => redirectByRole(realRole), roleHint !== realRole ? 900 : 0);
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
    showNotice("success", `Đã gửi lại email xác thực tới <b>${email}</b>.<br>⚠️ Nhớ kiểm tra <b>Spam / Quảng cáo</b>.`);
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
      `Đã gửi email đặt lại mật khẩu tới <b>${email}</b>.<br>⚠️ Nhớ kiểm tra <b>Spam / Quảng cáo / Junk</b>.`
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
  clearUserMeta();
  await signOut(auth);
  window.location.href = LOGIN_URL;
}

/* ───────────────────────── Init ───────────────────────── */

function initAuthUi() {
  document.getElementById("loginForm")    ?.addEventListener("submit", handleLogin);
  document.getElementById("parentForm")   ?.addEventListener("submit", handleParentRegister);
  document.getElementById("teacherForm")  ?.addEventListener("submit", handleTeacherRegister);
  document.getElementById("forgotForm")   ?.addEventListener("submit", handleResetPassword);

  document.getElementById("loginBtn")          ?.addEventListener("click", handleLogin);
  document.getElementById("parentRegisterBtn") ?.addEventListener("click", handleParentRegister);
  document.getElementById("teacherRegisterBtn")?.addEventListener("click", handleTeacherRegister);
  document.getElementById("resetBtn")          ?.addEventListener("click", handleResetPassword);

  try {
    const flash = sessionStorage.getItem("auth:flash");
    if (flash) {
      sessionStorage.removeItem("auth:flash");
      const { type, message } = JSON.parse(flash);
      showNotice(type || "info", message);
    }
  } catch (e) { /* ignore */ }

  // Nếu user đã login + verified, đẩy về đúng "home" theo role.
  const path = location.pathname.toLowerCase();
  const isLoginOrRegister = path.endsWith("/login.html") || path.endsWith("/register.html");
  if (isLoginOrRegister) {
    onAuthStateChanged(auth, async user => {
      if (!user || !user.emailVerified) return;
      const meta = await fetchUserMeta(user.uid);
      const role = meta?.role || "parent";
      cacheUserMeta({
        role,
        classRoom:   meta?.classRoom || "",
        displayName: meta?.displayName || ""
      });
      redirectByRole(role);
    });
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initAuthUi);
} else {
  initAuthUi();
}
