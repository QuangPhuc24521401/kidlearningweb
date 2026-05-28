/* ═══════════════════════════════════════════════════
   FIREBASE.JS — Khởi tạo Firebase (compat SDK, global)

   Dùng trên hầu hết trang ngoài thư mục auth (load qua script thường).
   Trang đăng nhập dùng firebase.module.js (ES modules) thay thế.

   Sau khi load, toàn cục `firebase` sẵn sàng cho:
   • firebase.auth()      — đăng nhập, onAuthStateChanged
   • firebase.firestore() — tiến độ, PvP, arena, users

   Config lấy từ: Firebase Console → Project Settings → Your apps
═══════════════════════════════════════════════════ */

const firebaseConfig = {
  apiKey:            "AIzaSyBC77BDLMwL6igf2pkLynsYjcsetfILIsQ",
  authDomain:        "kidlearningweb.firebaseapp.com",
  projectId:         "kidlearningweb",
  storageBucket:     "kidlearningweb.firebasestorage.app",
  messagingSenderId: "790115043715",
  appId:             "1:790115043715:web:dff35e91b6a3d863e30eb6"
};

firebase.initializeApp(firebaseConfig);
