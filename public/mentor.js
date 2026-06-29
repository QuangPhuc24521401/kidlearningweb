/* ═══════════════════════════════════════════════════
   MENTOR.JS — Cô giáo AI (giọng nói + Gemini + giới hạn gói)
═══════════════════════════════════════════════════ */
(function () {
  'use strict';

  var recognition = null;
  var isListening = false;
  var isAsking = false;
  var teacherAudio = null;
  var mentorVoicesReady = false;
  var mentorCooldownUntil = 0;
  var mentorCooldownTimer = null;
  var statusTimer = null;
  var micAskSent = false;

  function $(id) { return document.getElementById(id); }

  var MENTOR_API_REMOTE = 'https://kidlearningweb.vercel.app/api/mentor-chat';
  var MENTOR_FETCH_TIMEOUT_MS = 60000;

  function getMentorChatUrl() {
    var custom = typeof window.__MENTOR_CHAT_URL__ === 'string' ? window.__MENTOR_CHAT_URL__.trim() : '';
    if (custom) return custom;
    var host = (location.hostname || '').toLowerCase();
    if (host.endsWith('.vercel.app') || host === 'vercel.app') return '/api/mentor-chat';
    return MENTOR_API_REMOTE;
  }

  function fetchWithTimeout(url, options, timeoutMs) {
    options = options || {};
    timeoutMs = timeoutMs || MENTOR_FETCH_TIMEOUT_MS;
    if (typeof AbortController === 'undefined') {
      return fetch(url, options);
    }
    var controller = new AbortController();
    var timer = setTimeout(function () { controller.abort(); }, timeoutMs);
    options.signal = controller.signal;
    return fetch(url, options).finally(function () { clearTimeout(timer); });
  }

  function updateGeminiStatus(kind, message) {
    var el = $('mentorGeminiStatus');
    if (!el) return;
    el.className = 'mentor-gemini-status mentor-gemini-status--' + (kind || 'check');
    el.textContent = message || '';
  }

  function checkMentorApiConnection() {
    updateGeminiStatus('check', '🔄 Đang kết nối Google Gemini…');
    fetchWithTimeout(getMentorChatUrl(), { method: 'GET' }, 20000)
      .then(function (res) {
        return res.json().catch(function () { return {}; }).then(function (data) {
          return { res: res, data: data };
        });
      })
      .then(function (_ref) {
        if (_ref.res.ok && _ref.data.configured) {
          updateGeminiStatus('ok', '✨ Đã kết nối Gemini · ' + (_ref.data.model || 'Google AI'));
        } else if (_ref.res.ok) {
          updateGeminiStatus('warn', '⚠️ Chưa cấu hình GEMINI_API_KEY trên server');
        } else {
          updateGeminiStatus('warn', '⚠️ API chưa sẵn sàng — Cô dùng câu trả lời mẫu');
        }
      })
      .catch(function () {
        updateGeminiStatus('warn', '⚠️ Không gọi được API — Cô dùng câu trả lời mẫu');
      });
  }

  async function postMentorChat(message) {
    var url = getMentorChatUrl();
    var body = JSON.stringify({ message: message });
    var lastErr = null;
    for (var attempt = 0; attempt < 2; attempt++) {
      try {
        var res = await fetchWithTimeout(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: body
        }, MENTOR_FETCH_TIMEOUT_MS);
        var data = await res.json().catch(function () { return {}; });
        if (res.ok && data.reply) return data;
        lastErr = new Error(data.error || ('HTTP ' + res.status));
      } catch (err) {
        lastErr = err;
        console.warn('[mentor] POST attempt ' + (attempt + 1) + ' failed:', err);
      }
    }
    throw lastErr || new Error('Không nhận được phản hồi API');
  }

  function deliverAnswer(question, reply, apiData) {
    var fromGemini = apiData && apiData.provider === 'gemini' && !apiData.geminiUnavailable;
    showBubble(reply);
    setTeacherState('talking');
    if (fromGemini) {
      updateGeminiStatus('ok', '✨ Đã kết nối Gemini · ' + (apiData.model || 'Google AI'));
      showStatus('ok', '✨ Cô Mai trả lời bằng Gemini AI');
      try { sessionStorage.removeItem('mentorCooldownUntil'); mentorCooldownUntil = 0; } catch (e) {}
    } else {
      showStatus('ok', '💬 Cô Mai đã trả lời con');
    }
    speakTeacher(reply);
    saveHistory(question, reply);
  }

  function loadMentorCooldown() {
    try {
      var n = parseInt(sessionStorage.getItem('mentorCooldownUntil') || '0', 10);
      if (n > Date.now()) mentorCooldownUntil = n;
    } catch (e) {}
  }

  function saveMentorCooldown(untilMs) {
    mentorCooldownUntil = untilMs;
    try { sessionStorage.setItem('mentorCooldownUntil', String(untilMs)); } catch (e) {}
  }

  function getMentorCooldownSec() {
    return Math.max(0, Math.ceil((mentorCooldownUntil - Date.now()) / 1000));
  }

  function startMentorCooldown(sec) {
    saveMentorCooldown(Date.now() + sec * 1000);
    clearInterval(mentorCooldownTimer);
    mentorCooldownTimer = setInterval(function () {
      if (getMentorCooldownSec() <= 0) clearInterval(mentorCooldownTimer);
    }, 1000);
  }

  loadMentorCooldown();

  function syncFormWithLimits() {
    var input = $('askInput');
    var btn = $('askSendBtn');
    var mic = $('micBtn');
    var limits = window.KidMentorLimits;
    var loading = limits && !limits.isReady();
    var atLimit = limits && limits.isLimited && limits.isLimited() && limits.isReady() && limits.remaining() <= 0;
    var off = isAsking || loading || atLimit;

    if (input) input.disabled = off;
    if (btn) btn.disabled = off;
    if (mic) mic.disabled = off;
    document.querySelectorAll('.mentor-quick-btn').forEach(function (b) { b.disabled = off; });
  }

  window.toggleListen = function () {
    if (isListening) stopListen();
    else startListen();
  };

  function startListen() {
    micAskSent = false;
    if (window.KidMentorLimits) {
      if (!window.KidMentorLimits.isReady()) return;
      if (!window.KidMentorLimits.canAsk()) {
        window.KidMentorLimits.showLimitModal();
        return;
      }
    }
    var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { showStatus('error', '⚠️ Dùng Chrome để dùng mic!'); return; }

    recognition = new SR();
    recognition.lang = 'vi-VN';
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 3;

    recognition.onstart = function () {
      isListening = true;
      $('micBtn').classList.add('listening');
      $('micBtn').textContent = '🔴';
      $('userWave').classList.add('active');
      $('micLabel').textContent = '🎙️ Đang nghe... Con nói đi!';
      $('micHeard').textContent = '';
    };

    recognition.onresult = function (e) {
      var text = '';
      for (var i = 0; i < e.results.length; i++) text = e.results[i][0].transcript;
      $('micHeard').textContent = '👂 "' + text + '"';
      if (e.results[0].isFinal && !micAskSent) {
        micAskSent = true;
        stopListen();
        window.askQuestion(text);
      }
    };

    recognition.onerror = function () { stopListen(); };
    recognition.onend = function () { stopListen(); };
    recognition.start();
  }

  function stopListen() {
    isListening = false;
    try { if (recognition) recognition.stop(); } catch (e) {}
    $('micBtn').classList.remove('listening');
    $('micBtn').textContent = '🎤';
    $('userWave').classList.remove('active');
    $('micLabel').textContent = 'Bấm 🎤 và nói với Cô Mai!';
  }

  window.submitAskInput = function () {
    var input = $('askInput');
    if (!input) return;
    var text = input.value.trim();
    if (!text) return;
    input.value = '';
    window.askQuestion(text);
  };

  window.askQuestion = async function (text) {
    if (!text.trim() || isAsking) return;

    if (window.KidMentorLimits) {
      if (!window.KidMentorLimits.isReady()) return;
      if (!window.KidMentorLimits.tryAsk()) {
        window.KidMentorLimits.showLimitModal();
        syncFormWithLimits();
        return;
      }
    }

    isAsking = true;
    syncFormWithLimits();

    var reply = null;
    var apiData = null;
    try {
      var heard = $('micHeard');
      if (heard) heard.textContent = '💬 "' + text + '"';
      setTeacherState('thinking');
      showBubble('<span class="typing-dots"><span></span><span></span><span></span></span>');

      apiData = await postMentorChat(text.trim());
      reply = apiData.reply;
      if (!isVietnameseText(reply)) reply = getFallbackReply(text);
      deliverAnswer(text, reply, apiData);
    } catch (err) {
      console.warn('[mentor] askQuestion fallback:', err);
      reply = getFallbackReply(text);
      deliverAnswer(text, reply, null);
    } finally {
      isAsking = false;
      syncFormWithLimits();
    }
  };

  function isVietnameseText(text) {
    var t = String(text || '').trim();
    if (!t) return false;
    if (/[\u3040-\u309F\u30A0-\u30FF\u31F0-\u31FF]/.test(t)) return false;
    if (/[\uAC00-\uD7AF]/.test(t)) return false;
    var letters = t.match(/\p{L}/gu) || [];
    if (!letters.length) return true;
    var vi = letters.filter(function (ch) { return /[A-Za-zÀ-ỹà-ỹĂăÂâĐđÊêÔôƠơƯư]/.test(ch); }).length;
    return vi / letters.length >= 0.55;
  }

  function getFallbackReply(text) {
    var t = text.toLowerCase();
    if (t.includes('hình tròn') || t.includes('tron')) return 'Hình tròn giống như bánh pizza hay mặt trời đó con! Không có góc nào cả, tròn xoe 🔵 Con thấy đồng xu ở nhà không? Đó cũng là hình tròn!';
    if (t.includes('hình vuông') || t.includes('vuong')) return 'Hình vuông có 4 cạnh bằng nhau và 4 góc vuông nha con ⬜ Giống như gạch lát nhà mình đó! Con đếm thử 4 góc xem nào?';
    if (t.includes('tam giác') || t.includes('tam giac') || (t.includes('tam') && t.includes('cạnh')) || (t.includes('canh') && t.includes('giac')))
      return 'Tam giác có 3 cạnh nha con! 🔺 Ba cạnh nối lại giống mái nhà hay bánh pizza cắt một miếng. Con thử vẽ tam giác trên giấy xem!';
    if (t.includes('màu') || t.includes('mau')) return 'Màu sắc đẹp lắm con ơi! 🌈 Cầu vồng có 7 màu: đỏ, cam, vàng, lục, lam, chàm, tím. Con thích màu nào nhất?';
    if (t.includes('đếm') || t.includes('dem') || t.includes('số')) return 'Con giỏi quá! Cùng cô đếm nào: 1, 2, 3, 4, 5, 6, 7, 8, 9, 10 🔢 Con thử đếm theo cô nhé!';
    if (t.includes('kể chuyện') || t.includes('ke chuyen')) return 'Ngày xưa có chú Gấu con rất thích học bài. Mỗi ngày chú đếm hoa trong rừng: 1, 2, 3... Nhờ vậy chú Gấu trở thành học sinh giỏi nhất lớp! 🐻⭐ Con cũng sẽ giỏi như chú Gấu nhé!';
    if (t.includes('giỏi') || t.includes('xong')) return 'Ồ con giỏi lắm! Cô rất vui khi thấy con chăm học 🌟 Tiếp tục cố gắng nhé, con là ngôi sao nhỏ của cô! ⭐';
    return 'Cô hiểu rồi! Con thật thông minh khi hỏi điều đó 😊 Cô sẽ giải thích nhé: học tập giúp con biết nhiều điều hay lắm! Hôm nay con học được gì rồi?';
  }

  function setTeacherState(state) {
    var svg = $('teacherSvg');
    var wave = $('aiWave');
    var mouth = $('teacherMouth');
    if (!svg) return;
    if (state === 'thinking') {
      svg.className = 'teacher-svg';
      if (wave) wave.classList.remove('active');
      showStatus('thinking', '🤔 Cô đang suy nghĩ...');
      if (mouth) mouth.setAttribute('d', 'M58,67 Q65,67 72,67');
    } else if (state === 'talking') {
      svg.className = 'teacher-svg talking';
      if (wave) wave.classList.add('active');
      showStatus('ok', '🎙️ Cô Mai đang nói...');
      if (mouth) mouth.setAttribute('d', 'M56,67 Q65,75 74,67');
    } else {
      svg.className = 'teacher-svg';
      if (wave) wave.classList.remove('active');
      hideStatus();
      if (mouth) mouth.setAttribute('d', 'M56,67 Q65,75 74,67');
    }
  }

  function showBubble(html) {
    var el = $('bubbleText');
    if (el) el.innerHTML = html;
  }

  function pickVietnameseVoice() {
    var voices = speechSynthesis.getVoices() || [];
    var vi = voices.filter(function (v) { return /^vi(-|_)/i.test(v.lang || ''); });
    if (!vi.length) return null;
    var prefer = [/HoaiMy/i, /NamMinh/i, /Vietnamese/i, /vi-VN/i];
    for (var i = 0; i < prefer.length; i++) {
      var hit = vi.find(function (v) { return prefer[i].test(v.name) || prefer[i].test(v.lang); });
      if (hit) return hit;
    }
    return vi[0];
  }

  function ensureMentorVoices(cb) {
    var voices = speechSynthesis.getVoices();
    if (voices && voices.length) { mentorVoicesReady = true; cb(); return; }
    speechSynthesis.onvoiceschanged = function () { mentorVoicesReady = true; cb(); };
    setTimeout(cb, 400);
  }

  if (typeof speechSynthesis !== 'undefined') ensureMentorVoices(function () {});

  async function speakTeacher(text) {
    var clean = text.replace(/[\u{1F000}-\u{1FFFF}]/gu, '').replace(/[⭐✨💫🌟🎀🌸]/g, '').trim();
    if (!clean || !isVietnameseText(clean)) { setTeacherState('idle'); return; }
    if (teacherAudio) { teacherAudio.pause(); teacherAudio = null; }
    speechSynthesis.cancel();

    var useProxy = !!window.__GOOGLE_TTS_USE_PROXY__;
    var gKey = (typeof window.__GOOGLE_TTS_API_KEY__ === 'string' ? window.__GOOGLE_TTS_API_KEY__.trim() : '');
    var voice = (typeof window.__GOOGLE_TTS_VOICE__ === 'string' && window.__GOOGLE_TTS_VOICE__) || 'vi-VN-Neural2-A';

    if (useProxy || gKey) {
      try {
        var url, opts;
        if (useProxy) {
          url = '/api/tts-google';
          opts = { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: clean, voice: voice, speakingRate: 1.05 }) };
        } else {
          url = 'https://texttospeech.googleapis.com/v1/text:synthesize?key=' + encodeURIComponent(gKey);
          opts = {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              input: { text: clean },
              voice: { languageCode: 'vi-VN', name: voice },
              audioConfig: { audioEncoding: 'MP3', speakingRate: 1.05, pitch: 0 }
            })
          };
        }
        var res = await fetch(url, opts);
        var data = await res.json();
        if (res.ok && data.audioContent) {
          teacherAudio = new Audio('data:audio/mp3;base64,' + data.audioContent);
          teacherAudio.onended = function () { setTeacherState('idle'); teacherAudio = null; };
          teacherAudio.play();
          return;
        }
      } catch (e) { /* fall through */ }
    }

    var runWebSpeech = function () {
      var pick = pickVietnameseVoice();
      if (!pick) { setTeacherState('idle'); return; }
      var u = new SpeechSynthesisUtterance(clean);
      u.lang = pick.lang || 'vi-VN';
      u.voice = pick;
      u.rate = 1.0;
      u.pitch = 1.05;
      u.onend = function () { setTeacherState('idle'); };
      u.onerror = function () { setTeacherState('idle'); };
      speechSynthesis.speak(u);
    };

    if (mentorVoicesReady) runWebSpeech();
    else ensureMentorVoices(runWebSpeech);
  }

  function showStatus(type, msg) {
    var pill = $('aiStatus');
    var dot = $('statusDot');
    var txt = $('statusMsg');
    dot.className = 'status-dot' + (type === 'thinking' ? ' thinking' : '');
    txt.textContent = msg;
    pill.classList.add('show');
    clearTimeout(statusTimer);
    if (type !== 'thinking') statusTimer = setTimeout(function () { pill.classList.remove('show'); }, 2500);
  }

  function hideStatus() { $('aiStatus').classList.remove('show'); }

  function saveHistory(q, a) {
    var student = '';
    try { student = localStorage.getItem('userDisplayName') || ''; } catch (e) {}
    if (!student) {
      try {
        var u = firebase.auth && firebase.auth().currentUser;
        if (u && u.displayName) student = u.displayName;
      } catch (e) {}
    }
    var classRoom = '';
    try { classRoom = localStorage.getItem('classRoom') || ''; } catch (e) {}
    var entry = { time: new Date().toISOString(), q: q, a: a, student: student, classRoom: classRoom };
    try {
      var h = JSON.parse(localStorage.getItem('mentor_history') || '[]');
      h.push({ time: entry.time, q: q, a: a, student: student });
      if (h.length > 50) h.shift();
      localStorage.setItem('mentor_history', JSON.stringify(h));
    } catch (e) {}
    try {
      var uid = firebase.auth && firebase.auth().currentUser && firebase.auth().currentUser.uid;
      if (uid && window.KidProgressSync && typeof KidProgressSync.appendMentorHistory === 'function') {
        KidProgressSync.appendMentorHistory(uid, entry);
      }
    } catch (e) {}
  }

  var limitsBooted = false;

  function initMentorPage() {
    var input = $('askInput');
    if (input) {
      input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { e.preventDefault(); window.submitAskInput(); }
      });
    }

    function bootLimits() {
      checkMentorApiConnection();
      if (window.KidMentorLimits) {
        if (!limitsBooted) {
          limitsBooted = true;
          window.KidMentorLimits.pullFromCloud().then(function () {
            syncFormWithLimits();
          });
        } else {
          syncFormWithLimits();
        }
      }
      if (typeof mountUserBar === 'function') mountUserBar();
    }

    if (typeof firebase !== 'undefined' && firebase.auth) {
      firebase.auth().onAuthStateChanged(function (user) {
        if (!user) { location.href = 'auth/login.html'; return; }
        document.documentElement.style.visibility = '';
        bootLimits();
      });
    } else {
      document.documentElement.style.visibility = '';
      bootLimits();
    }

    setTimeout(function () {
      showBubble('Xin chào! Cô là <strong>Cô Mai</strong>. Con gõ hoặc bấm 🎤 để hỏi cô nhé!');
      setTeacherState('idle');
    }, 500);
  }

  setTimeout(function () { document.documentElement.style.visibility = ''; }, 4000);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMentorPage);
  } else {
    initMentorPage();
  }
})();
