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
  serverTimestamp,
  deleteField
} from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";

const HOME_PARENT_URL  = "../index.html";
const HOME_TEACHER_URL = "../mentor-teacher.html";
const LOGIN_URL        = "./login.html";

/** Emoji có sẵn cho học sinh (bước sau đăng ký phụ huynh). */
const STUDENT_EMOJIS = ["🧒", "👧", "🐻", "🐼", "🦊", "🐰", "🦄", "🦁", "🐸", "🐨", "🐥", "🚀", "⭐", "🌈", "🎨", "⚽"];
const RING_HEX = ["#FF9800", "#E91E63", "#2196F3", "#4CAF50", "#9C27B0", "#00BCD4"];

/** User vừa tạo, đang chờ bước avatar + nickname (chưa gửi email verify / signOut). */
let pendingParentSetup = null;

function normalizeStudentNickname(raw) {
  const s = String(raw || "").trim().replace(/\s+/g, " ");
  if (s.length < 2 || s.length > 24) return null;
  if (/[<>"'`]/.test(s)) return null;
  return s;
}

function isSafeRingHex(hex) {
  return typeof hex === "string" && /^#[0-9A-Fa-f]{6}$/.test(hex.trim());
}

/** Nén JPEG data URL để không vượt quá Firestore (~giới hạn thực tế cho 1 field). */
async function compressImageToJpegDataUrl(file, maxEdge = 200, maxChars = 120000) {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, maxEdge / Math.max(bmp.width, bmp.height));
  const w = Math.max(1, Math.round(bmp.width * scale));
  const h = Math.max(1, Math.round(bmp.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(bmp, 0, 0, w, h);
  let quality = 0.88;
  let dataUrl = canvas.toDataURL("image/jpeg", quality);
  while (dataUrl.length > maxChars && quality > 0.42) {
    quality -= 0.06;
    dataUrl = canvas.toDataURL("image/jpeg", quality);
  }
  if (dataUrl.length > maxChars) {
    throw new Error("Ảnh vẫn quá lớn. Hãy chọn ảnh có kích thước nhỏ hơn.");
  }
  return dataUrl;
}

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

/** Đưa avatar học sinh từ Firestore meta vào localStorage (default nếu tài khoản cũ). */
function syncStudentAvatarCacheFromFirestore(meta) {
  if (!meta || meta.role === "teacher") return;
  try {
    const mode = meta.studentAvatarMode === "photo" ? "photo" : "emoji";
    localStorage.setItem("studentAvatarMode", mode);
    const em = typeof meta.studentAvatarEmoji === "string" && meta.studentAvatarEmoji.trim()
      ? meta.studentAvatarEmoji.trim()
      : "🧒";
    localStorage.setItem("studentAvatarEmoji", em);
    const ring = isSafeRingHex(meta.studentAvatarRing) ? meta.studentAvatarRing.trim() : "#FF9800";
    localStorage.setItem("studentAvatarRing", ring);
    if (
      mode === "photo"
      && typeof meta.studentAvatarPhoto === "string"
      && meta.studentAvatarPhoto.startsWith("data:image/jpeg;base64,")
      && meta.studentAvatarPhoto.length < 200000
    ) {
      localStorage.setItem("studentAvatarPhoto", meta.studentAvatarPhoto);
    } else {
      localStorage.removeItem("studentAvatarPhoto");
    }
  } catch (e) {}
}

/** Cache role + classroom vào localStorage cho các page khác đọc nhanh. */
function cacheUserMeta(meta) {
  try {
    if (meta?.role)      localStorage.setItem("userRole", meta.role);
    if (meta?.classRoom) localStorage.setItem("classRoom", meta.classRoom);
    if (meta?.displayName) localStorage.setItem("userDisplayName", meta.displayName);
    if (meta?.role === "teacher") {
      localStorage.removeItem("studentAvatarMode");
      localStorage.removeItem("studentAvatarEmoji");
      localStorage.removeItem("studentAvatarRing");
      localStorage.removeItem("studentAvatarPhoto");
    } else if (meta) {
      syncStudentAvatarCacheFromFirestore(meta);
    }
  } catch (e) {}
}
function clearUserMeta() {
  try {
    localStorage.removeItem("userRole");
    localStorage.removeItem("classRoom");
    localStorage.removeItem("userDisplayName");
    localStorage.removeItem("studentAvatarMode");
    localStorage.removeItem("studentAvatarEmoji");
    localStorage.removeItem("studentAvatarRing");
    localStorage.removeItem("studentAvatarPhoto");
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

/* ───────────────────────── Register: PARENT — Bước 2 học sinh ───────────────────────── */

function syncStudentPreviewFromPicker() {
  const ringBt = document.querySelector("#studentRingPicker button.is-selected");
  const emojiBt = document.querySelector("#studentEmojiPicker button.is-selected");
  const ring = ringBt?.dataset?.ring || "#FF9800";
  const emoji = emojiBt?.dataset?.emoji || "🧒";
  const previewRing = document.getElementById("studentPreviewRing");
  const previewEmoji = document.getElementById("studentPreviewEmoji");
  const previewImg = document.getElementById("studentPreviewImg");
  if (!previewRing) return;
  previewRing.style.setProperty("--ring", isSafeRingHex(ring) ? ring : "#FF9800");
  if (previewEmoji && previewEmoji.textContent !== emoji) previewEmoji.textContent = emoji;
  if (previewRing.dataset.mode !== "photo" && previewImg?.hasAttribute("hidden")) {
    /* emoji mode */
    previewEmoji?.removeAttribute("hidden");
    previewImg?.setAttribute("hidden", "");
  }
}

function showParentStudentSetupStep(user, email, password) {
  pendingParentSetup = { user, email, password };
  const container = document.querySelector(".auth-container");
  container?.classList.add("student-setup-active");
  document.querySelector(".role-tabs")?.setAttribute("hidden", "");
  document.getElementById("parentForm")?.setAttribute("hidden", "");
  document.getElementById("teacherForm")?.setAttribute("hidden", "");
  document.querySelector(".divider")?.setAttribute("hidden", "");
  document.querySelector(".links")?.setAttribute("hidden", "");

  const h1 = document.getElementById("authTitle");
  const sub = document.getElementById("authSubtitle");
  if (h1) h1.textContent = "Gần xong rồi!";
  if (sub) sub.textContent = "Chọn ảnh đại diện và nickname cho bé — chỉ một bước nữa thôi.";

  document.getElementById("parentStudentSetup")?.removeAttribute("hidden");

  const nickname = document.getElementById("studentNickname");
  const suggest = document.getElementById("parentChildName")?.value?.trim() || "";
  if (nickname) nickname.value = suggest;

  const grid = document.getElementById("studentEmojiPicker");
  if (grid && !grid.dataset.built) {
    grid.dataset.built = "1";
    grid.innerHTML = STUDENT_EMOJIS.map(
      em => `<button type="button" class="emoji-pick" data-emoji="${em}" aria-label="Chọn">${em}</button>`
    ).join("");
    grid.querySelectorAll("button").forEach((b, i) => b.classList.toggle("is-selected", i === 0));
  }

  const rings = document.getElementById("studentRingPicker");
  if (rings && !rings.dataset.built) {
    rings.dataset.built = "1";
    rings.innerHTML = RING_HEX.map(
      (hex, i) =>
        `<button type="button" class="ring-pick${i === 0 ? " is-selected" : ""}" data-ring="${hex}" style="background:${hex}" aria-label="Màu viền ${i + 1}"></button>`
    ).join("");
  }

  const previewRing = document.getElementById("studentPreviewRing");
  const previewImg = document.getElementById("studentPreviewImg");
  const previewEmoji = document.getElementById("studentPreviewEmoji");
  if (previewRing) {
    previewRing.dataset.mode = "emoji";
    previewImg?.setAttribute("hidden", "");
    previewImg?.removeAttribute("src");
    previewEmoji?.removeAttribute("hidden");
  }
  document.getElementById("studentPhotoClearBtn")?.setAttribute("hidden", "");
  syncStudentPreviewFromPicker();
}

async function finalizeParentStudentProfile() {
  if (!pendingParentSetup?.user) {
    showNotice("error", "Phiên không hợp lệ. Vui lòng đăng ký lại.");
    return;
  }

  const nickname = normalizeStudentNickname(document.getElementById("studentNickname")?.value);
  if (!nickname) {
    return showNotice(
      "error",
      "Nickname cần từ 2–24 ký tự, không chứa ký tự đặc biệt nguy hiểm."
    );
  }

  const ringBt = document.querySelector("#studentRingPicker button.is-selected");
  let ring = ringBt?.dataset?.ring || "#FF9800";
  if (!isSafeRingHex(ring)) ring = "#FF9800";

  const emojiBt = document.querySelector("#studentEmojiPicker button.is-selected");
  const emoji = emojiBt?.dataset?.emoji || "🧒";

  const previewRing = document.getElementById("studentPreviewRing");
  const previewImg = document.getElementById("studentPreviewImg");
  const isPhoto =
    previewRing?.dataset.mode === "photo"
    && previewImg?.src
    && previewImg.src.startsWith("data:image/jpeg;base64,");

  let photoDataUrl = "";
  let mode = "emoji";
  if (isPhoto) {
    photoDataUrl = previewImg.src;
    if (photoDataUrl.length > 200000) {
      return showNotice("error", "Ảnh đại diện vẫn quá lớn. Chọn ảnh nhỏ hơn hoặc dùng emoji.");
    }
    mode = "photo";
  }

  setLoading("studentSetupDoneBtn", true, "Đang lưu...");

  const { user, email, password } = pendingParentSetup;
  try {
    try {
      await updateProfile(user, { displayName: nickname });
    } catch (e) { console.warn("[auth] updateProfile", e); }

    await writeUserMeta(user.uid, {
      role: "parent",
      email,
      childName: nickname,
      nickname,
      displayName: nickname,
      studentAvatarMode: mode,
      studentAvatarEmoji: emoji,
      studentAvatarRing: ring,
      studentAvatarPhoto: mode === "photo" ? photoDataUrl : deleteField()
    });

    await storeBrowserCredential(email, password);

    try {
      await sendEmailVerification(user, {
        url: window.location.origin + "/auth/login.html",
        handleCodeInApp: false
      });
    } catch (ve) { console.warn("sendEmailVerification failed:", ve); }

    pendingParentSetup = null;

    sessionStorage.setItem("auth:flash", JSON.stringify({
      type: "success",
      message: `Đã tạo tài khoản cho <b>${email}</b> với nickname <b>${nickname}</b>. Mở email và bấm vào link xác thực để kích hoạt nhé.<br><br>⚠️ Nếu không thấy, kiểm tra <b>Spam / Quảng cáo</b>.`
    }));

    await signOut(auth);

    window.location.href = LOGIN_URL;
  } catch (error) {
    const msg = friendlyAuthError(error.code) || ("Lỗi: " + error.message);
    showNotice("error", msg);
  } finally {
    setLoading("studentSetupDoneBtn", false);
  }
}

function wireRegisterStudentSetupUi() {
  document.getElementById("studentEmojiPicker")?.addEventListener("click", ev => {
    const bt = ev.target.closest("button[data-emoji]");
    if (!bt) return;
    document.querySelectorAll("#studentEmojiPicker button").forEach(b => b.classList.remove("is-selected"));
    bt.classList.add("is-selected");
    syncStudentPreviewFromPicker();
  });
  document.getElementById("studentRingPicker")?.addEventListener("click", ev => {
    const bt = ev.target.closest("button[data-ring]");
    if (!bt) return;
    document.querySelectorAll("#studentRingPicker button").forEach(b => b.classList.remove("is-selected"));
    bt.classList.add("is-selected");
    syncStudentPreviewFromPicker();
  });

  document.getElementById("studentPhotoInput")?.addEventListener("change", async ev => {
    const file = ev.target.files?.[0];
    if (!file || !/^image\/(jpeg|png|webp)/i.test(file.type)) return;
    try {
      const dataUrl = await compressImageToJpegDataUrl(file);
      const previewRing = document.getElementById("studentPreviewRing");
      const previewImg = document.getElementById("studentPreviewImg");
      const previewEmoji = document.getElementById("studentPreviewEmoji");
      if (previewRing) previewRing.dataset.mode = "photo";
      if (previewImg) {
        previewImg.src = dataUrl;
        previewImg.removeAttribute("hidden");
      }
      previewEmoji?.setAttribute("hidden", "");
      document.getElementById("studentPhotoClearBtn")?.removeAttribute("hidden");
    } catch (err) {
      showNotice("error", err?.message || "Không đọc được ảnh.");
    }
    ev.target.value = "";
  });

  document.querySelector(".upload-zone")?.addEventListener("click", () => {
    document.getElementById("studentPhotoInput")?.click();
  });

  document.getElementById("studentPhotoClearBtn")?.addEventListener("click", () => {
    const previewRing = document.getElementById("studentPreviewRing");
    const previewImg = document.getElementById("studentPreviewImg");
    const previewEmoji = document.getElementById("studentPreviewEmoji");
    if (previewRing) previewRing.dataset.mode = "emoji";
    if (previewImg) {
      previewImg.removeAttribute("src");
      previewImg.setAttribute("hidden", "");
    }
    previewEmoji?.removeAttribute("hidden");
    document.getElementById("studentPhotoClearBtn")?.setAttribute("hidden", "");
    syncStudentPreviewFromPicker();
  });

  document.getElementById("studentSetupDoneBtn")?.addEventListener("click", finalizeParentStudentProfile);
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
    /** Bước 1 xong → doc tối thiểu; avatar + nickname cập nhật ở bước 2 */
    await writeUserMeta(cred.user.uid, {
      role: "parent",
      email,
      childName: childName || "",
      displayName: childName || ""
    });

    await storeBrowserCredential(email, password);
    clearNotice();

    showParentStudentSetupStep(cred.user, email, password);
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
      ...(meta || {}),
      role:        realRole,
      classRoom:   meta?.classRoom ?? "",
      displayName: meta?.displayName ?? ""
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

  wireRegisterStudentSetupUi();

  // Nếu user đã login + verified, đẩy về đúng "home" theo role.
  const path = location.pathname.toLowerCase();
  const isLoginOrRegister = path.endsWith("/login.html") || path.endsWith("/register.html");
  if (isLoginOrRegister) {
    onAuthStateChanged(auth, async user => {
      if (!user || !user.emailVerified) return;
      const meta = await fetchUserMeta(user.uid);
      const role = meta?.role || "parent";
      cacheUserMeta({
        ...(meta || {}),
        role,
        classRoom:   meta?.classRoom ?? "",
        displayName: meta?.displayName ?? ""
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
