import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc } from "firebase/firestore";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

//đọc file lessons.json
const lessonsPath = path.join(__dirname, "lessons.json");
const lessons = JSON.parse(fs.readFileSync(lessonsPath, "utf8"));

const firebaseConfig = {
  apiKey: "AIzaSyBC77BDLMwL6igf2pkLynsYjcsetfILIsQ",
  authDomain: "kidlearningweb.firebaseapp.com",
  projectId: "kidlearningweb",
  storageBucket: "kidlearningweb.firebasestorage.app",
  messagingSenderId: "790115043715",
  appId: "1:790115043715:web:dff35e91b6a3d863e30eb6"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function importData() {
  for (const lesson of lessons) {
    await addDoc(collection(db, "lessons"), lesson);
    console.log("✅ Đã thêm:", lesson.title);
  }
  console.log("🎉 IMPORT XONG");
}

importData();