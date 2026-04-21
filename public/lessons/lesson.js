// lesson.js - script thường (không dùng ES module / fetch)
// Chạy được kể cả khi mở trực tiếp bằng file:// (nháy đúp file HTML).

(function(){
  var lessons = [];
  var currentIndex = 0;
  var stars = 0;

  function setScreenMessage(title, detail){
    var q = document.getElementById("question");
    var a = document.getElementById("answers");
    var s = document.getElementById("status");
    if(q) q.innerText = title || "";
    if(a) a.innerHTML = "";
    if(s) s.innerText = detail || "";
  }

  /* ─── TTS: FPT.AI với fallback Web Speech ─── */
  var ttsCache = {};
  var currentAudio = null;

  function getFptKey(){
    try{
      if(typeof window.__FPT_TTS_API_KEY__ === "string" && window.__FPT_TTS_API_KEY__.trim()){
        return window.__FPT_TTS_API_KEY__.trim();
      }
    }catch(e){}
    try{ return localStorage.getItem("fpt_key") || ""; }catch(e){ return ""; }
  }
  function getFptVoice(){
    try{ return localStorage.getItem("fpt_voice") || window.__FPT_TTS_VOICE__ || "lannhi"; }
    catch(e){ return "lannhi"; }
  }

  function showTtsPill(state, msg){
    var pill = document.getElementById("ttsStatus");
    if(!pill) return;
    var dot = document.getElementById("ttsDot");
    var txt = document.getElementById("ttsMsg");
    if(dot) dot.className = "tts-dot " + state;
    if(txt) txt.textContent = msg;
    pill.classList.add("show");
    clearTimeout(pill._timer);
    if(state !== "loading"){
      pill._timer = setTimeout(function(){ pill.classList.remove("show"); }, 2200);
    }
  }

  function speakFallback(text){
    try{
      var u = new SpeechSynthesisUtterance(text);
      u.lang = "vi-VN"; u.rate = 0.88; u.pitch = 1.1;
      showTtsPill("ok", "🔊 Web Speech (dự phòng)");
      speechSynthesis.cancel();
      speechSynthesis.speak(u);
    }catch(e){}
  }

  function playAudioUrl(url, text){
    currentAudio = new Audio(url);
    currentAudio.onplay  = function(){ showTtsPill("ok", "🎙️ " + (text.length>20 ? text.slice(0,20)+"…" : text)); };
    currentAudio.onended = function(){ currentAudio = null; };
    currentAudio.onerror = function(){ showTtsPill("error","Lỗi phát audio"); speakFallback(text); };
    currentAudio.play().catch(function(){ speakFallback(text); });
  }

  function speak(rawText){
    var text = String(rawText || "").replace(/[\u{1F000}-\u{1FFFF}]/gu, "").replace(/[⭐✨💫🌟]/g,"").trim();
    if(!text) return;
    if(currentAudio){ try{ currentAudio.pause(); }catch(e){} currentAudio = null; }
    try{ speechSynthesis.cancel(); }catch(e){}

    var key = getFptKey();
    if(!key){ speakFallback(text); return; }
    if(ttsCache[text]){ playAudioUrl(ttsCache[text], text); return; }

    showTtsPill("loading", "Đang tải giọng FPT.AI...");
    var endpoints = [
      "https://api.fpt.ai/hmi/tts/v5",
      "https://corsproxy.io/?" + encodeURIComponent("https://api.fpt.ai/hmi/tts/v5")
    ];
    var voice = getFptVoice();

    function tryNext(i){
      if(i >= endpoints.length){
        showTtsPill("error","Lỗi FPT.AI – dùng giọng dự phòng");
        speakFallback(text);
        return;
      }
      fetch(endpoints[i], {
        method: "POST",
        headers: { "api-key": key, "speed": "-1", "voice": voice, "Content-Type": "text/plain" },
        body: text
      })
      .then(function(res){ if(!res.ok) throw new Error("HTTP " + res.status); return res.json(); })
      .then(function(data){
        if(data.error) throw new Error("FPT: " + data.error);
        if(!data.async) throw new Error("Không có URL audio");
        setTimeout(function(){
          ttsCache[text] = data.async;
          playAudioUrl(data.async, text);
        }, 1400);
      })
      .catch(function(err){
        console.warn("[TTS]", endpoints[i], err && err.message);
        tryNext(i + 1);
      });
    }
    tryNext(0);
  }

  function inferLessonTypeFromPathname(){
    try{
      var parts = window.location.pathname.split('/').filter(Boolean);
      var i = parts.lastIndexOf('lessons');
      if(i >= 0 && parts[i+1]) return parts[i+1];
    }catch(e){}
    return '';
  }

  var params = new URLSearchParams(window.location.search);
  var lessonType = params.get("type") || inferLessonTypeFromPathname() || "nhan_biet";

  function loadLessons(){
    var all = (typeof window.LESSON_DATA === "object" && window.LESSON_DATA) ? window.LESSON_DATA : null;
    if(!all){
      setScreenMessage(
        "Chưa tải được bài học",
        "Thiếu file lessons-data.js. Hãy đảm bảo đã load đầy đủ."
      );
      return;
    }
    var data = all[lessonType];
    if(!Array.isArray(data) || data.length === 0){
      setScreenMessage(
        "Chưa có bài học",
        "Chủ đề: " + lessonType + " chưa có dữ liệu."
      );
      return;
    }
    lessons = data.slice();
    shuffle(lessons);
    currentIndex = 0;
    stars = 0;
    var starsEl = document.getElementById("stars");
    if(starsEl) starsEl.innerText = "0";
    showLesson();
  }

  function ensureHeaderElements(){
    var questionEl = document.getElementById("question");
    if(!questionEl) return;
    if(!document.getElementById("topic")){
      var topicEl = document.createElement("div");
      topicEl.id = "topic";
      topicEl.className = "topic-badge";
      questionEl.parentNode.insertBefore(topicEl, questionEl);
    }
    if(!document.getElementById("progress")){
      var progressEl = document.createElement("div");
      progressEl.id = "progress";
      progressEl.className = "progress-text";
      questionEl.parentNode.insertBefore(progressEl, questionEl);
    }
    if(!document.getElementById("progressBar")){
      var barWrap = document.createElement("div");
      barWrap.className = "progress-bar";
      var barFill = document.createElement("div");
      barFill.id = "progressBar";
      barFill.className = "progress-bar-fill";
      barWrap.appendChild(barFill);
      questionEl.parentNode.insertBefore(barWrap, questionEl);
    }
  }

  function launchConfetti(){
    var host = document.querySelector(".lesson-container");
    if(!host) return;
    var layer = document.createElement("div");
    layer.className = "confetti";
    var emojis = ["🎉","⭐","🎊","🌟","✨","🎈"];
    for(var i=0;i<24;i++){
      var p = document.createElement("span");
      p.textContent = emojis[i % emojis.length];
      p.style.left = (Math.random()*100) + "%";
      p.style.animationDelay = (Math.random()*0.4) + "s";
      p.style.animationDuration = (1.6 + Math.random()*1.4) + "s";
      p.style.fontSize = (18 + Math.random()*18) + "px";
      layer.appendChild(p);
    }
    host.appendChild(layer);
    setTimeout(function(){ if(layer.parentNode) layer.parentNode.removeChild(layer); }, 3500);
  }

  function showLesson(){
    ensureHeaderElements();

    var questionEl = document.getElementById("question");
    var topicEl = document.getElementById("topic");
    var progressEl = document.getElementById("progress");
    var container = document.getElementById("answers");
    var status = document.getElementById("status");

    if(currentIndex >= lessons.length){
      if(questionEl) questionEl.innerText = "🎉 Bé học xong rồi!";
      if(container) container.innerHTML = "";
      if(topicEl) topicEl.style.display = "none";
      if(progressEl) progressEl.innerText = "Hoàn thành " + lessons.length + "/" + lessons.length;
      var barEnd = document.getElementById("progressBar");
      if(barEnd) barEnd.style.width = "100%";
      if(status) status.innerText = "Con giỏi quá! 🏆";
      speak("Bé giỏi lắm, con đã học xong rồi");
      launchConfetti();
      saveProgress();
      return;
    }

    var lesson = lessons[currentIndex];
    if(questionEl) questionEl.innerText = lesson.question;
    speak(lesson.voiceText || lesson.question);

    if(topicEl){
      if(lesson.topic){
        topicEl.innerText = "🏷️ " + lesson.topic;
        topicEl.style.display = "";
      } else {
        topicEl.style.display = "none";
      }
    }
    if(progressEl){
      progressEl.innerText = "Câu " + (currentIndex + 1) + " / " + lessons.length;
    }
    var bar = document.getElementById("progressBar");
    if(bar){
      var pct = Math.round((currentIndex / lessons.length) * 100);
      bar.style.width = pct + "%";
    }

    if(container) container.innerHTML = "";
    if(status) status.innerText = "";

    lesson.answers.forEach(function(ans){
      var div = document.createElement("div");
      div.className = "box";
      div.innerText = ans;
      div.onclick = function(){
        if(ans === lesson.correctAnswer){
          div.classList.add("correct");
          if(status) status.innerText = "✅ Đúng rồi!";
          speak("Đúng rồi, giỏi lắm");
          stars++;
          var starsEl = document.getElementById("stars");
          if(starsEl) starsEl.innerText = stars;
          saveProgress();
          setTimeout(function(){
            currentIndex++;
            showLesson();
          }, 1200);
        } else {
          div.classList.add("wrong");
          if(status) status.innerText = "❌ Con thử lại nhé";
          speak("Sai rồi, con thử lại nhé");
        }
      };
      container.appendChild(div);
    });
  }

  function saveProgress(){
    try{
      var key = "progress_" + lessonType;
      localStorage.setItem(key, JSON.stringify({
        type: lessonType,
        completed: currentIndex,
        stars: stars,
        updatedAt: Date.now()
      }));
    }catch(e){}

    try{
      if(typeof firebase !== "undefined" && firebase.apps && firebase.apps.length > 0){
        var user = firebase.auth && firebase.auth().currentUser;
        if(user && firebase.firestore){
          firebase.firestore()
            .collection("progress")
            .doc(user.uid + "_" + lessonType)
            .set({
              userId: user.uid,
              type: lessonType,
              completed: currentIndex,
              stars: stars,
              updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        }
      }
    }catch(e){}
  }

  function shuffle(arr){
    for(var i = arr.length - 1; i > 0; i--){
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
    }
  }

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", loadLessons);
  } else {
    loadLessons();
  }
})();
