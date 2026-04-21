// lesson.js - script thường (không dùng ES module / fetch)
// Chạy được kể cả khi mở trực tiếp bằng file:// (nháy đúp file HTML).

(function(){
  var lessons = [];
  var currentIndex = 0;
  var stars = 0;

  /* ─── Emoji → nhãn tiếng Việt (dùng khi hover đọc đáp án) ─── */
  var EMOJI_LABELS = {
    "🔴":"màu đỏ","🔵":"màu xanh dương","🟡":"màu vàng","🟢":"màu xanh lá",
    "🟣":"màu tím","🟠":"màu cam","⚫":"màu đen","⚪":"màu trắng","🟤":"màu nâu",
    "⬜":"hình vuông","🔺":"hình tam giác","🟦":"hình vuông xanh",
    "💠":"hình thoi","⭐":"ngôi sao","❤️":"trái tim","▬":"hình chữ nhật","🧊":"hình khối",
    "🐶":"con chó","🐕":"con chó","🐱":"con mèo","🐈":"con mèo",
    "🐷":"con heo","🐮":"con bò","🐰":"con thỏ","🐇":"con thỏ",
    "🦊":"con cáo","🐻":"con gấu","🦁":"sư tử","🐘":"con voi","🐯":"con hổ",
    "🦒":"con hươu cao cổ","🐟":"con cá","🐠":"con cá",
    "🐔":"con gà","🐸":"con ếch","🐢":"con rùa","🐭":"con chuột",
    "🐿️":"con sóc","🦔":"con nhím","🐴":"con ngựa","🐑":"con cừu",
    "🐒":"con khỉ","🐞":"con bọ rùa","🐜":"con kiến","🐌":"con ốc sên","🐦":"con chim",
    "🍎":"quả táo","🍌":"quả chuối","🍇":"quả nho","🍊":"quả cam",
    "🍓":"quả dâu","🍉":"quả dưa hấu","🍍":"quả dứa","🥭":"quả xoài",
    "🍑":"quả đào","🍒":"quả anh đào","🍐":"quả lê","🥕":"củ cà rốt",
    "🌙":"mặt trăng","☀️":"mặt trời","☁️":"đám mây","🌳":"cây xanh",
    "🌊":"sóng biển","🌸":"bông hoa","🍄":"cây nấm","🍀":"cỏ bốn lá",
    "🌵":"cây xương rồng","🌈":"cầu vồng",
    "👩":"người phụ nữ","👨":"người đàn ông","👶":"em bé",
    "👷":"chú công nhân","🧑‍🚀":"phi hành gia","👨‍⚕️":"bác sĩ","🚶":"người đi bộ",
    "🚗":"xe ô tô","✈️":"máy bay","🚲":"xe đạp","🏠":"ngôi nhà",
    "🥁":"cái trống","🎹":"đàn piano","🎸":"đàn ghi-ta","🎺":"cây kèn",
    "🎻":"đàn vĩ cầm","🎷":"kèn saxophone","🪕":"đàn banjo","🪈":"cây sáo",
    "🎧":"tai nghe","🎤":"micro","🔊":"cái loa","🔇":"tắt tiếng",
    "🎵":"nốt nhạc","🎶":"bài hát","🔔":"cái chuông",
    "🧩":"mảnh ghép","🖍️":"bút màu","🖌️":"cọ vẽ","✏️":"bút chì",
    "🖼️":"bức tranh","🔑":"chìa khóa","🚪":"cánh cửa",
    "📱":"điện thoại","📺":"ti vi","📷":"máy ảnh","🕯️":"cây nến",
    "✂️":"cái kéo","📏":"cây thước","📌":"cái ghim","🧽":"bọt biển","🔧":"cờ lê",
    "🍴":"muỗng nĩa","🍽️":"bộ đồ ăn","📄":"tờ giấy","⚽":"quả bóng",
    "🎈":"quả bóng bay","📚":"quyển sách","🧢":"cái mũ","🧤":"đôi găng tay","👟":"đôi giày",
    "😀":"khuôn mặt vui","😃":"khuôn mặt vui","😢":"khuôn mặt buồn",
    "😡":"khuôn mặt giận","😴":"khuôn mặt ngủ","😂":"khuôn mặt cười lớn",
    "😎":"khuôn mặt ngầu","🥰":"khuôn mặt yêu thương","😮":"khuôn mặt ngạc nhiên"
  };

  /* Chuyển đáp án thành câu đọc được:
     - Nếu là emoji có trong dict → nhãn tiếng Việt
     - Nếu là text → giữ nguyên (TTS tự đọc) */
  function answerLabel(ans){
    if(ans == null) return "";
    var raw = String(ans).trim();
    if(EMOJI_LABELS[raw]) return EMOJI_LABELS[raw];
    return raw;
  }

  /* ─── Twemoji: biến emoji thành SVG cho icon đẹp hơn ─── */
  var __twemojiQueue = null;
  function ensureTwemoji(cb){
    if(window.twemoji){ cb && cb(); return; }
    if(__twemojiQueue){ __twemojiQueue.push(cb); return; }
    __twemojiQueue = [cb];
    var s = document.createElement("script");
    s.src = "https://cdn.jsdelivr.net/npm/@twemoji/api@latest/dist/twemoji.min.js";
    s.crossOrigin = "anonymous";
    s.onload = function(){
      var q = __twemojiQueue; __twemojiQueue = null;
      q.forEach(function(f){ try{ f && f(); }catch(e){} });
    };
    s.onerror = function(){ __twemojiQueue = null; };
    document.head.appendChild(s);
  }
  function prettifyEmoji(el){
    if(!el) return;
    ensureTwemoji(function(){
      if(!window.twemoji) return;
      try{
        window.twemoji.parse(el, {
          folder: "svg",
          ext: ".svg",
          className: "tw-emoji"
        });
      }catch(e){}
    });
  }

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
      if(questionEl){ questionEl.innerText = "🎉 Bé học xong rồi!"; prettifyEmoji(questionEl); }
      if(container) container.innerHTML = "";
      if(topicEl) topicEl.style.display = "none";
      if(progressEl) progressEl.innerText = "Hoàn thành " + lessons.length + "/" + lessons.length;
      var barEnd = document.getElementById("progressBar");
      if(barEnd) barEnd.style.width = "100%";
      if(status){ status.innerText = "Con giỏi quá! 🏆"; prettifyEmoji(status); }
      speak("Bé giỏi lắm, con đã học xong rồi");
      launchConfetti();
      saveProgress();
      return;
    }

    var lesson = lessons[currentIndex];
    if(questionEl){ questionEl.innerText = lesson.question; prettifyEmoji(questionEl); }
    speak(lesson.voiceText || lesson.question);

    if(topicEl){
      if(lesson.topic){
        topicEl.innerText = "🏷️ " + lesson.topic;
        topicEl.style.display = "";
        prettifyEmoji(topicEl);
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
      var label = answerLabel(ans);
      if(label) div.title = label;

      var hoverTimer = null;
      div.addEventListener("mouseenter", function(){
        if(div.classList.contains("correct") || div.classList.contains("wrong")) return;
        clearTimeout(hoverTimer);
        hoverTimer = setTimeout(function(){ speak(label); }, 160);
      });
      div.addEventListener("mouseleave", function(){
        clearTimeout(hoverTimer);
      });

      div.onclick = function(){
        clearTimeout(hoverTimer);
        if(ans === lesson.correctAnswer){
          div.classList.add("correct");
          if(status){ status.innerText = "✅ Đúng rồi!"; prettifyEmoji(status); }
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
          if(status){ status.innerText = "❌ Con thử lại nhé"; prettifyEmoji(status); }
          speak("Sai rồi, con thử lại nhé");
        }
      };
      container.appendChild(div);
    });
    prettifyEmoji(container);
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
