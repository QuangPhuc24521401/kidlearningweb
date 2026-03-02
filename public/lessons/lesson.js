import { db, auth } from "../../firebase.js";
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";

let lessons = [];
let currentIndex = 0;
let stars = 0;

// Voice
function speak(text) {
  const msg = new SpeechSynthesisUtterance(text);
  msg.lang = "vi-VN";
  speechSynthesis.cancel();
  speechSynthesis.speak(msg);
}

const params = new URLSearchParams(window.location.search);
const lessonType = params.get("type") || "nhan_biet";

async function loadLessons() {
  const q = query(
    collection(db, "lessons"),
    where("type", "==", lessonType)
  );

  const snapshot = await getDocs(q);
  lessons = snapshot.docs.map(d => d.data());

  if (lessons.length === 0) {
    document.getElementById("question").innerText = "Chưa có bài học";
    return;
  }

  shuffle(lessons);
  showLesson();
}

function showLesson() {
  if (currentIndex >= lessons.length) {
    document.getElementById("question").innerText = "🎉 Bé học xong rồi!";
    document.getElementById("answers").innerHTML = "";
    speak("Bé giỏi lắm, con đã học xong rồi");
    saveProgress();
    return;
  }

  const lesson = lessons[currentIndex];
  document.getElementById("question").innerText = lesson.question;
  speak(lesson.voiceText || lesson.question);

  const container = document.getElementById("answers");
  const status = document.getElementById("status");
  container.innerHTML = "";
  status.innerText = "";

  lesson.answers.forEach(ans => {
    const div = document.createElement("div");
    div.className = "box";
    div.innerText = ans;

    div.onclick = async () => {
      if (ans === lesson.correctAnswer) {
        div.classList.add("correct");
        status.innerText = "✅ Đúng rồi!";
        speak("Đúng rồi, giỏi lắm");

        stars++;
        document.getElementById("stars").innerText = stars;

        await saveProgress();

        setTimeout(() => {
          currentIndex++;
          showLesson();
        }, 1200);
      } else {
        div.classList.add("wrong");
        status.innerText = "❌ Con thử lại nhé";
        speak("Sai rồi, con thử lại nhé");
      }
    };

    container.appendChild(div);
  });
}

async function saveProgress() {
  const user = auth.currentUser;
  if (!user) return;

  await setDoc(
    doc(db, "progress", `${user.uid}_${lessonType}`),
    {
      userId: user.uid,
      type: lessonType,
      completed: currentIndex,
      stars: stars,
      updatedAt: serverTimestamp()
    }
  );
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

loadLessons();