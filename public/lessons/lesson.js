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

  /* ─── Phrase pools: đa dạng hoá phản hồi cho bé ─── */
  var PRAISE_PHRASES = [
    "Đúng rồi, giỏi lắm!",
    "Tuyệt vời! Con trả lời đúng rồi.",
    "Chính xác luôn, con siêu quá!",
    "Hay lắm, con làm đúng rồi nè.",
    "Chuẩn bài luôn, khen con nào!",
    "Wow, con thông minh ghê!",
    "Đúng rồi đấy, vỗ tay cho con!",
    "Con trả lời rất tốt!",
    "Giỏi quá đi mất, đúng rồi!",
    "Ừ đúng rồi, con xuất sắc quá!"
  ];
  var GENTLE_WRONG_PHRASES = [
    "Chưa đúng rồi, con thử lại nhé.",
    "Gần đúng rồi, thử lại xem nào.",
    "Ồ, chưa đúng đâu. Con xem lại nha.",
    "Hmm, chưa chính xác. Cố lên nào con.",
    "Chưa đúng, con nghĩ thêm chút xíu nhé.",
    "Thử lại lần nữa nha, con làm được mà.",
    "Ôi, chưa đúng rồi. Thử lại thôi.",
    "Chưa đúng đâu con, mình thử lại nhé."
  ];
  var COMPLETE_PHRASES = [
    "Bé giỏi lắm, con đã học xong rồi!",
    "Hoan hô! Con học xong hết rồi đó.",
    "Tuyệt vời! Con đã hoàn thành bài học.",
    "Con giỏi quá, học hết rồi nè!"
  ];
  function pickRandom(arr){
    return arr[Math.floor(Math.random() * arr.length)];
  }

  /* ─── Sound effects: feedback tức thì qua Web Audio (không cần file) ─── */
  var sfxCtx = null;
  function getSfxCtx(){
    if(sfxCtx) return sfxCtx;
    try{
      var C = window.AudioContext || window.webkitAudioContext;
      if(C) sfxCtx = new C();
    }catch(e){ sfxCtx = null; }
    return sfxCtx;
  }
  function playTone(ctx, freq, startAt, dur, type, peak){
    var osc = ctx.createOscillator();
    var gain = ctx.createGain();
    osc.type = type || "sine";
    osc.frequency.value = freq;
    var p = (peak == null ? 0.18 : peak);
    gain.gain.setValueAtTime(0.0001, startAt);
    gain.gain.exponentialRampToValueAtTime(p, startAt + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, startAt + dur);
    osc.connect(gain).connect(ctx.destination);
    osc.start(startAt);
    osc.stop(startAt + dur + 0.02);
  }
  function playSfx(kind){
    var ctx = getSfxCtx(); if(!ctx) return;
    if(ctx.state === "suspended"){ try{ ctx.resume(); }catch(e){} }
    var t = ctx.currentTime;
    if(kind === "correct"){
      // Chime vui, 2 nốt đi lên (C6 → E6) rồi nốt cao bật lên (G6)
      playTone(ctx, 1046.5, t,        0.14, "triangle", 0.20);
      playTone(ctx, 1318.5, t + 0.11, 0.16, "triangle", 0.20);
      playTone(ctx, 1568.0, t + 0.24, 0.22, "triangle", 0.18);
    } else if(kind === "wrong"){
      // "Ú ù" nhẹ, 2 nốt đi xuống, dùng sine êm tai
      playTone(ctx, 523.25, t,        0.16, "sine",     0.16);
      playTone(ctx, 392.00, t + 0.14, 0.22, "sine",     0.16);
    } else if(kind === "done"){
      // Fanfare nhỏ khi hoàn thành bài
      playTone(ctx, 659.25, t,        0.15, "triangle", 0.20);
      playTone(ctx, 783.99, t + 0.12, 0.15, "triangle", 0.20);
      playTone(ctx, 1046.5, t + 0.24, 0.28, "triangle", 0.22);
    }
  }

  /* ─── TTS: Google Cloud Neural2 → Web Speech fallback ─── */
  var ttsCache = {};      // cacheKey → blob URL
  var ttsAudioEl = null;  // <audio playsinline> dùng chung
  var currentAudio = null;
  var audioUnlocked = false;

  var isMobileUA = /Mobi|Android|iPhone|iPad|iPod|IEMobile|BlackBerry|Opera Mini/i.test(navigator.userAgent || "");
  var isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent || "") ||
              (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

  /* Tạo / lấy thẻ <audio> dùng chung. Trên mobile, dùng 1 element duy nhất
     (đã unlock bằng gesture đầu) cho mọi câu nói → tránh "play() rejected". */
  function getTtsAudio(){
    if(ttsAudioEl) return ttsAudioEl;
    var a = document.createElement("audio");
    a.setAttribute("playsinline","");
    a.setAttribute("webkit-playsinline","");
    a.preload = "auto";
    a.crossOrigin = "anonymous";
    a.style.display = "none";
    try{ document.body.appendChild(a); }catch(e){}
    ttsAudioEl = a;
    return a;
  }

  /* Silent WAV (~80 bytes) — phát ngay trong gesture đầu tiên để unlock audio
     trên mobile (iOS Safari & Chrome Android chặn audio cho đến khi có gesture). */
  var SILENCE_WAV = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=";

  function unlockTtsAudio(){
    if(audioUnlocked) return;
    audioUnlocked = true;
    try{
      var a = getTtsAudio();
      a.muted = true;
      a.src = SILENCE_WAV;
      var p = a.play();
      if(p && p.catch) p.catch(function(){});
      setTimeout(function(){ try{ a.pause(); a.muted = false; }catch(e){} }, 80);
    }catch(e){}
    try{
      var ctx = getSfxCtx();
      if(ctx && ctx.state === "suspended") ctx.resume();
    }catch(e){}
    try{
      if(typeof speechSynthesis !== "undefined"){
        var u = new SpeechSynthesisUtterance("");
        u.volume = 0;
        speechSynthesis.speak(u);
      }
    }catch(e){}
  }

  /* Base64 → Blob URL (audio/mpeg) — nhanh hơn data: URL trên mobile */
  function b64ToBlobUrl(b64){
    try{
      var bin = atob(b64);
      var len = bin.length;
      var bytes = new Uint8Array(len);
      for(var i=0;i<len;i++) bytes[i] = bin.charCodeAt(i);
      var blob = new Blob([bytes], { type: "audio/mpeg" });
      return URL.createObjectURL(blob);
    }catch(e){
      return "data:audio/mpeg;base64," + b64;
    }
  }

  /* iOS hay tự dừng speechSynthesis sau ~15s — keep-alive bằng pause/resume */
  var iosKeepAliveTimer = null;
  function startIOSKeepAlive(){
    if(!isIOS) return;
    clearInterval(iosKeepAliveTimer);
    iosKeepAliveTimer = setInterval(function(){
      try{
        if(speechSynthesis.speaking && !speechSynthesis.paused){
          speechSynthesis.pause();
          speechSynthesis.resume();
        } else if(!speechSynthesis.speaking){
          clearInterval(iosKeepAliveTimer);
          iosKeepAliveTimer = null;
        }
      }catch(e){}
    }, 10000);
  }

  /* Bắt gesture đầu tiên để unlock audio (mobile) */
  (function armUnlock(){
    var kick = function(){
      unlockTtsAudio();
      window.removeEventListener("pointerdown", kick, true);
      window.removeEventListener("touchstart",  kick, true);
      window.removeEventListener("keydown",     kick, true);
      window.removeEventListener("click",       kick, true);
    };
    window.addEventListener("pointerdown", kick, true);
    window.addEventListener("touchstart",  kick, true);
    window.addEventListener("keydown",     kick, true);
    window.addEventListener("click",       kick, true);
  })();

  function hasGoogleProxy(){
    return typeof window.__GOOGLE_TTS_USE_PROXY__ === "boolean" && window.__GOOGLE_TTS_USE_PROXY__;
  }
  function getGoogleKey(){
    try{
      if(typeof window.__GOOGLE_TTS_API_KEY__ === "string" && window.__GOOGLE_TTS_API_KEY__.trim()){
        return window.__GOOGLE_TTS_API_KEY__.trim();
      }
    }catch(e){}
    return "";
  }
  function getGoogleVoice(){
    try{ return localStorage.getItem("google_tts_voice") || window.__GOOGLE_TTS_VOICE__ || "vi-VN-Neural2-A"; }
    catch(e){ return "vi-VN-Neural2-A"; }
  }

  /* Chọn giọng Việt "chuẩn" nhất từ Web Speech (fallback): ưu tiên các neural voice. */
  var _cachedViVoice = null;
  function pickBestViVoice(){
    if(_cachedViVoice) return _cachedViVoice;
    try{
      var voices = window.speechSynthesis.getVoices() || [];
      var vi = voices.filter(function(v){ return /^vi(\b|-)/i.test(v.lang || ""); });
      if(!vi.length) return null;
      // Ưu tiên các tên voice neural hoặc nữ: Microsoft HoaiMy, Google Tiếng Việt, An, Linh, Thu, HoaiMy.
      var prefer = [/HoaiMy/i, /NamMinh/i, /Google.*Vietnamese/i, /Vietnamese.*Neural/i, /Linh/i, /Thu/i, /An/i];
      for(var i=0;i<prefer.length;i++){
        var hit = vi.find(function(v){ return prefer[i].test(v.name); });
        if(hit){ _cachedViVoice = hit; return hit; }
      }
      _cachedViVoice = vi[0];
      return _cachedViVoice;
    }catch(e){ return null; }
  }
  try{
    // Một số trình duyệt load voices bất đồng bộ.
    window.speechSynthesis.onvoiceschanged = function(){ _cachedViVoice = null; pickBestViVoice(); };
  }catch(e){}

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

  function speakFallback(text, opts){
    try{
      var u = new SpeechSynthesisUtterance(text);
      u.lang = "vi-VN";
      u.rate  = (opts && typeof opts.rate  === "number") ? opts.rate  : 0.92;
      u.pitch = (opts && typeof opts.pitch === "number") ? opts.pitch : 1.08;
      var v = pickBestViVoice();
      if(v) u.voice = v;
      showTtsPill("ok", "🔊 Web Speech (dự phòng)");
      try{ speechSynthesis.cancel(); }catch(e){}
      speechSynthesis.speak(u);
      startIOSKeepAlive();
    }catch(e){}
  }

  function playAudioUrl(url, text, opts){
    var a = getTtsAudio();
    try{ a.pause(); a.currentTime = 0; }catch(e){}
    a.src = url;
    if(opts && typeof opts.playbackRate === "number"){
      try{ a.playbackRate = opts.playbackRate; }catch(e){}
    } else {
      try{ a.playbackRate = 1; }catch(e){}
    }
    a.onplay  = function(){ showTtsPill("ok", "🎙️ " + (text.length>20 ? text.slice(0,20)+"…" : text)); };
    a.onended = function(){ /* giữ blob URL trong cache để tái sử dụng */ };
    a.onerror = function(){ showTtsPill("error","Lỗi phát audio"); speakFallback(text, opts); };
    currentAudio = a;
    var p = a.play();
    if(p && p.catch) p.catch(function(err){
      console.warn("[TTS] play() rejected", err && err.message || err);
      speakFallback(text, opts);
    });
  }

  /**
   * speak(text, opts)
   *   opts.playbackRate : số >0  (chỉ áp cho fallback/tái phát nhanh), 1 = bình thường.
   *   opts.rate/pitch   : cho Web Speech fallback.
   *   opts.speakingRate : 0.25..4 (Google), 1 = bình thường. Mặc định 0.95.
   *   opts.pitch        : -20..20 (Google). Mặc định 0.
   */
  function speak(rawText, opts){
    var text = String(rawText || "").replace(/[\u{1F000}-\u{1FFFF}]/gu, "").replace(/[⭐✨💫🌟]/g,"").trim();
    if(!text) return;
    opts = opts || {};
    unlockTtsAudio();
    if(currentAudio){ try{ currentAudio.pause(); }catch(e){} }
    try{ speechSynthesis.cancel(); }catch(e){}

    var useProxy = hasGoogleProxy();
    var key = getGoogleKey();
    if(!useProxy && !key){ speakFallback(text, opts); return; }

    var voice = opts.voice || getGoogleVoice();
    var speakingRate = (typeof opts.speakingRate === "number") ? opts.speakingRate : 0.95;
    // Backward-compat: caller cũ truyền opts.speed (-3..3) cho FPT — map sang Google speakingRate
    if(typeof opts.speed === "number" && typeof opts.speakingRate !== "number"){
      speakingRate = Math.max(0.5, Math.min(1.5, 1 + opts.speed * 0.08));
    }
    var pitch = (typeof opts.pitch === "number" && opts.pitch >= -20 && opts.pitch <= 20) ? opts.pitch : 0;
    var cacheKey = voice + "|" + speakingRate + "|" + pitch + "|" + text;
    if(ttsCache[cacheKey]){ playAudioUrl(ttsCache[cacheKey], text, opts); return; }

    showTtsPill("loading", "Đang tải giọng Google Cloud...");
    var url, fetchOpts;
    if(useProxy){
      url = "/api/tts-google";
      fetchOpts = { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ text: text, voice: voice }) };
    } else {
      url = "https://texttospeech.googleapis.com/v1/text:synthesize?key=" + encodeURIComponent(key);
      fetchOpts = {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input: { text: text },
          voice: { languageCode: "vi-VN", name: voice },
          audioConfig: { audioEncoding: "MP3", speakingRate: speakingRate, pitch: pitch }
        })
      };
    }

    fetch(url, fetchOpts)
      .then(function(res){
        if(!res.ok) return res.text().then(function(t){ throw new Error("HTTP " + res.status + " — " + (t||"").slice(0,160)); });
        return res.json();
      })
      .then(function(data){
        if(!data.audioContent) throw new Error("Google không trả audioContent");
        var blobUrl = b64ToBlobUrl(data.audioContent);
        ttsCache[cacheKey] = blobUrl;
        playAudioUrl(blobUrl, text, opts);
      })
      .catch(function(err){
        console.warn("[TTS] google", err && err.message);
        showTtsPill("error","Google TTS lỗi – dùng giọng trình duyệt");
        speakFallback(text, opts);
      });
  }

  /* Các hàm tiện ích cho lời khen / lời động viên — có SFX + giọng nói đa dạng */
  function reactCorrect(){
    playSfx("correct");
    // Khen: tốc độ bình thường (0), nghe vui và nhanh hơn câu hỏi.
    speak(pickRandom(PRAISE_PHRASES), { speed: 0 });
  }
  function reactWrong(){
    playSfx("wrong");
    // Động viên: tốc độ bình thường (0), giọng nhẹ nhàng.
    speak(pickRandom(GENTLE_WRONG_PHRASES), { speed: 0 });
  }
  function reactDone(){
    playSfx("done");
    // Câu kết thúc: chậm (-1) để trọn ý, thêm cảm xúc.
    speak(pickRandom(COMPLETE_PHRASES), { speed: -1 });
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
  var lessonType   = params.get("type")  || inferLessonTypeFromPathname() || "nhan_biet";
  var currentTopic = params.get("topic") ? decodeURIComponent(params.get("topic")) : null;

  var SUBJECT_TITLES = {
    nhan_biet: "Nhận biết",
    tu_duy:    "Tư duy",
    am_nhac:   "Âm nhạc",
    ghep_hinh: "Ghép hình",
    my_thuat:  "Mỹ thuật",
    ngon_ngu:  "Ngôn ngữ"
  };
  var SUBJECT_ICONS = {
    nhan_biet:"👀", tu_duy:"🧠", am_nhac:"🎵",
    ghep_hinh:"🧩", my_thuat:"🎨", ngon_ngu:"📚"
  };

  function getTopicsForSubject(subject){
    var data = (window.LESSON_DATA && window.LESSON_DATA[subject]) || [];
    var seen = [], counts = {};
    data.forEach(function(q){
      var t = q.topic || "Khác";
      if(counts[t] == null){ seen.push(t); counts[t] = 0; }
      counts[t]++;
    });
    return seen.map(function(t){ return { name: t, count: counts[t] }; });
  }

  function readSubjectProgress(subject){
    try{
      var all = JSON.parse(localStorage.getItem("learning_progress") || "{}") || {};
      return all[subject] || { topics: {} };
    }catch(e){ return { topics: {} }; }
  }

  function escapeHtml(s){
    return String(s||"").replace(/[<>&"']/g, function(c){
      return ({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&#39;'})[c];
    });
  }

  function loadLessons(){
    var all = (typeof window.LESSON_DATA === "object" && window.LESSON_DATA) ? window.LESSON_DATA : null;
    if(!all){
      setScreenMessage(
        "Chưa tải được bài học",
        "Thiếu file lessons-data.js. Hãy đảm bảo đã load đầy đủ."
      );
      return;
    }
    var subjectData = all[lessonType];
    if(!Array.isArray(subjectData) || subjectData.length === 0){
      setScreenMessage(
        "Chưa có bài học",
        "Chủ đề: " + lessonType + " chưa có dữ liệu."
      );
      return;
    }

    if(currentTopic){
      // QUESTION MODE — chỉ lấy câu hỏi của topic này
      var data = subjectData.filter(function(q){ return (q.topic || "Khác") === currentTopic; });
      if(!data.length){
        setScreenMessage("Không tìm thấy bài học", "Bài \"" + currentTopic + "\" không có câu hỏi.");
        return;
      }
      lessons = data.slice();
      shuffle(lessons);
      currentIndex = 0;
      stars = 0;
      var starsEl = document.getElementById("stars");
      if(starsEl) starsEl.innerText = "0";
      showLesson();
    } else {
      // TOPIC-LIST MODE — render danh sách bài học của chủ đề với lock/unlock
      renderTopicList(subjectData);
    }
  }

  function renderTopicList(subjectData){
    var container = document.querySelector(".lesson-container");
    if(!container) return;

    var topics  = getTopicsForSubject(lessonType);
    var prog    = readSubjectProgress(lessonType);
    var pTopics = prog.topics || {};

    var subjectTitle = SUBJECT_TITLES[lessonType] || lessonType;
    var subjectIcon  = SUBJECT_ICONS[lessonType]  || "📘";

    var html = '<div class="topic-list-head">' +
      '<div class="topic-list-icon">' + subjectIcon + '</div>' +
      '<h1 class="topic-list-title">' + escapeHtml(subjectTitle) + '</h1>' +
      '<p class="topic-list-sub">Hoàn thành mỗi bài để mở khoá bài tiếp theo</p>' +
      '</div>';

    html += '<div class="topic-list">';
    var prevDone = true; // bài đầu luôn mở
    topics.forEach(function(t, i){
      var p        = pTopics[t.name] || {};
      var unlocked = prevDone;
      var done     = (p.completedRuns || 0) >= 1;
      var bestRun  = p.bestRun || 0;
      var pct      = t.count ? Math.round(bestRun / t.count * 100) : 0;
      var stars_   = p.totalStars || 0;
      var status   = !unlocked ? "locked" : (done ? "done" : (bestRun > 0 ? "progress" : "available"));

      var click = unlocked
        ? ('onclick="window.__goTopic(' + i + ', \'' + encodeURIComponent(t.name) + '\')"')
        : ('disabled aria-disabled="true"');

      var lockBadge = !unlocked
        ? '<div class="topic-locked">🔒 Hoàn thành Bài ' + i + ' để mở khoá</div>'
        : '<div class="topic-bar"><div class="topic-bar-fill" style="width:' + pct + '%"></div></div>' +
          '<div class="topic-status">' +
            (done    ? '✅ Đã hoàn thành • ⭐ ' + stars_
                     : (bestRun > 0 ? '🟢 Đang học · ' + bestRun + '/' + t.count
                                    : '▶ Sẵn sàng học'))
          + '</div>';

      html += '<button class="topic-card topic-' + status + '" type="button" ' + click + '>' +
        '<div class="topic-num">Bài ' + (i+1) + (unlocked ? '' : ' 🔒') + '</div>' +
        '<div class="topic-title">' + escapeHtml(t.name) + '</div>' +
        '<div class="topic-meta">' + t.count + ' câu hỏi</div>' +
        lockBadge +
      '</button>';

      prevDone = done; // bài kế chỉ mở nếu bài hiện tại done
    });
    html += '</div>';

    html += '<div class="topic-list-actions">' +
      '<button class="topic-back-btn" type="button" onclick="window.location.href=\'../../index.html\'">← Về trang chủ</button>' +
      '</div>';

    container.innerHTML = html;
  }

  // Điều hướng vào 1 bài học cụ thể (gọi từ HTML inline onclick)
  window.__goTopic = function(idx, topicEnc){
    var url = window.location.pathname + "?topic=" + topicEnc;
    window.location.href = url;
  };

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
      reactDone();
      launchConfetti();
      saveProgress({ finished: true, sessionStars: stars });

      // Sau 2.5s tự đẩy về danh sách bài để bé thấy bài tiếp theo đã mở khoá.
      // Đồng thời hiện nút "Tiếp theo" cho user bấm sớm.
      if(currentTopic && container){
        var backUrl = window.location.pathname;
        container.innerHTML =
          '<div class="finish-actions">' +
            '<button class="btn-finish primary" onclick="window.location.href=\'' + backUrl + '\'">📚 Bài tiếp theo</button>' +
            '<button class="btn-finish ghost"  onclick="window.location.href=\'../../index.html\'">🏠 Về trang chủ</button>' +
          '</div>';
        setTimeout(function(){ window.location.href = backUrl; }, 2500);
      }
      return;
    }

    var lesson = lessons[currentIndex];
    if(questionEl){ questionEl.innerText = lesson.question; prettifyEmoji(questionEl); }
    // Câu hỏi đọc hơi chậm (-1) để bé nghe rõ.
    speak(lesson.voiceText || lesson.question, { speed: -1 });

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
          reactCorrect();
          stars++;
          var starsEl = document.getElementById("stars");
          if(starsEl) starsEl.innerText = stars;
          saveProgress();
          setTimeout(function(){
            currentIndex++;
            showLesson();
          }, 1500);
        } else {
          div.classList.add("wrong");
          if(status){ status.innerText = "❌ Con thử lại nhé"; prettifyEmoji(status); }
          reactWrong();
        }
      };
      container.appendChild(div);
    });
    prettifyEmoji(container);
  }

  /**
   * Lưu tiến độ TÍCH LUỸ vào localStorage (key learning_progress) + Firestore.
   *
   * Cấu trúc localStorage learning_progress:
   *   {
   *     nhan_biet: {
   *       total: 20,            // tổng câu hỏi của môn
   *       bestRun: 18,          // số câu xa nhất từng làm trong 1 phiên
   *       completedRuns: 2,     // số lần hoàn thành toàn bộ
   *       totalStars: 36,       // tổng sao tích luỹ
   *       lastSessionAt: 17xx   // ms từ epoch
   *     },
   *     ...
   *   }
   *
   * @param {{finished?: boolean, sessionStars?: number}} opts
   *   finished: true khi user vừa hoàn thành toàn bộ bài (currentIndex >= total)
   *   sessionStars: số sao kiếm được trong PHIÊN này (chỉ dùng khi finished=true)
   */
  /**
   * Lưu tiến độ TÍCH LUỸ theo TOPIC vào localStorage + Firestore.
   *
   * Cấu trúc localStorage learning_progress:
   *   {
   *     nhan_biet: {
   *       topics: {
   *         "Màu sắc":    { total: 6, bestRun: 6, completedRuns: 2, totalStars: 12, lastSessionAt: ... },
   *         "Hình dạng":  { ... },
   *         ...
   *       }
   *     },
   *     tu_duy:  { topics: { ... } },
   *     ...
   *   }
   */
  function saveProgress(opts){
    if(!currentTopic) return; // không lưu nếu đang ở topic-list mode
    opts = opts || {};
    var total      = lessons.length || 0;
    var done       = Math.max(0, Math.min(currentIndex, total));
    var finished   = !!opts.finished;
    var sessionStr = (typeof opts.sessionStars === "number") ? opts.sessionStars : stars;

    var all = {};
    try{ all = JSON.parse(localStorage.getItem("learning_progress") || "{}") || {}; }catch(e){ all = {}; }
    var subj = all[lessonType] || { topics: {} };
    if(!subj.topics) subj.topics = {};
    var entry = subj.topics[currentTopic] || { total: 0, bestRun: 0, completedRuns: 0, totalStars: 0, lastSessionAt: 0 };

    entry.total         = Math.max(entry.total || 0, total);
    entry.bestRun       = Math.max(entry.bestRun || 0, done);
    entry.lastSessionAt = Date.now();
    if(finished){
      entry.completedRuns = (entry.completedRuns || 0) + 1;
      entry.totalStars    = (entry.totalStars    || 0) + sessionStr;
      entry.bestRun       = entry.total;
    }

    subj.topics[currentTopic] = entry;
    all[lessonType] = subj;
    try{ localStorage.setItem("learning_progress", JSON.stringify(all)); }catch(e){}

    // Đồng bộ lên Firestore (best-effort) — dùng dot path để chỉ ghi field thay đổi
    try{
      if(typeof firebase !== "undefined" && firebase.apps && firebase.apps.length > 0){
        var user = firebase.auth && firebase.auth().currentUser;
        if(user && firebase.firestore){
          var base = "progress." + lessonType + ".topics." + currentTopic + ".";
          var update = {};
          update[base + "total"]         = entry.total;
          update[base + "bestRun"]       = entry.bestRun;
          update[base + "completedRuns"] = entry.completedRuns;
          update[base + "totalStars"]    = entry.totalStars;
          update[base + "lastSessionAt"] = entry.lastSessionAt;
          update["updatedAt"] = firebase.firestore.FieldValue.serverTimestamp();
          firebase.firestore()
            .collection("learning_progress")
            .doc(user.uid)
            .set(update, { merge: true })
            .catch(function(err){ console.warn("[saveProgress] firestore", err); });
        }
      }
    }catch(e){}

    if(typeof window.syncAchievementsAfterLessonSave === "function"){
      try{ window.syncAchievementsAfterLessonSave(); }catch(err){}
    }
  }

  function shuffle(arr){
    for(var i = arr.length - 1; i > 0; i--){
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
    }
  }

  /* ── User bar góc phải trên (tên + tổng sao) ── */
  function mountUserBarLesson(){
    var name = (localStorage.getItem("userDisplayName") || "").trim() || "Bé học sinh";
    var data = {};
    try{ data = JSON.parse(localStorage.getItem("learning_progress") || "{}") || {}; }catch(e){}
    var totalStars = 0;
    Object.values(data).forEach(function(s){
      if(s && s.topics){
        Object.values(s.topics).forEach(function(t){ totalStars += (t.totalStars || 0); });
      } else if(s && s.totalStars){
        totalStars += s.totalStars;
      }
    });
    var bar = document.getElementById("userBar");
    if(!bar){
      bar = document.createElement("div");
      bar.id = "userBar";
      bar.className = "user-bar";
      document.body.appendChild(bar);
    }
    var safeName = name.replace(/[<>&"']/g, function(c){
      return ({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&#39;'})[c];
    });
    bar.innerHTML =
      '<span class="ub-avatar">👤</span>' +
      '<span class="ub-name" title="' + safeName + '">' + (safeName.length > 16 ? safeName.slice(0,15) + "…" : safeName) + '</span>' +
      '<span class="ub-divider"></span>' +
      '<span class="ub-stars" title="Tổng sao đã đạt">🌟 ' + totalStars + '</span>';
  }

  function bootLesson(){
    loadLessons();
    mountUserBarLesson();
  }

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", bootLesson);
  } else {
    bootLesson();
  }
})();
