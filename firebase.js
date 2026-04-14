// firebase.js
// Thay thế bằng config Firebase thực của bạn
// Lấy từ: Firebase Console → Project Settings → Your apps → SDK setup

const firebaseConfig = {
  apiKey:            "AIzaSyBC77BDLMwL6igf2pkLynsYjcsetfILIsQ",
  authDomain:        "kidlearningweb.firebaseapp.com",
  projectId:         "kidlearningweb",
  storageBucket:     "kidlearningweb.firebasestorage.app",
  messagingSenderId: "790115043715",
  appId:             "1:790115043715:web:dff35e91b6a3d863e30eb6"
};

firebase.initializeApp(firebaseConfig);
