/* ═══════════════════════════════════════════════════
   SHARED.JS — dùng chung cho tất cả trang
   Bao gồm: TTS (FPT.AI), nhạc nền, confetti,
            settings modal, sprinkles init
═══════════════════════════════════════════════════ */

/* ─── SETTINGS MODAL ─── */
const defaultGoogleKey = (typeof window !== 'undefined' && typeof window.__GOOGLE_TTS_API_KEY__ === 'string')
  ? window.__GOOGLE_TTS_API_KEY__.trim()
  : '';
const defaultGoogleVoice = (typeof window !== 'undefined' && typeof window.__GOOGLE_TTS_VOICE__ === 'string')
  ? window.__GOOGLE_TTS_VOICE__.trim()
  : 'vi-VN-Neural2-A';

let googleKey   = defaultGoogleKey || '';
let googleVoice = localStorage.getItem('google_tts_voice') || defaultGoogleVoice || 'vi-VN-Neural2-A';

// Engine ưu tiên: 'auto' | 'google' | 'web'
// 'auto' = Google nếu có key/proxy, ngược lại Web Speech.
function getTtsEngine(){
  try{ return localStorage.getItem('tts_engine') || 'auto'; }catch(e){ return 'auto'; }
}
function setTtsEngine(v){
  try{ localStorage.setItem('tts_engine', v || 'auto'); }catch(e){}
}
function isGoogleReady(){
  return !!googleKey || _hasGoogleProxy();
}

/* ─── THEME (light/dark/auto) ─── */
let themePref = 'auto';
let themeMedia = null;
let skyTimer = null;

function getThemePref(){
  try{ return localStorage.getItem('theme_pref') || 'auto'; }catch(e){ return 'auto'; }
}
function setThemePref(v){
  themePref = v || 'auto';
  try{ localStorage.setItem('theme_pref', themePref); }catch(e){}
  applyThemePref();
  applySkyMode();
  syncThemeUI();
}
function applyThemePref(){
  const root = document.documentElement;
  // manual override: set data-theme on :root
  if(themePref === 'light') root.setAttribute('data-theme','light');
  else if(themePref === 'dark') root.setAttribute('data-theme','dark');
  else root.removeAttribute('data-theme'); // auto → rely on prefers-color-scheme CSS
}

/* ─── SKY MODE (day/night) ─── */
function getAutoSkyMode(){
  const h = new Date().getHours();
  return (h >= 6 && h < 18) ? 'day' : 'night';
}

function applySkyMode(){
  const root = document.documentElement;
  const pref = getThemePref();
  const sky = (pref === 'light') ? 'day' : (pref === 'dark') ? 'night' : getAutoSkyMode();
  root.setAttribute('data-sky', sky);
  buildSprinklesForSky(sky);
}

function buildSprinklesForSky(sky){
  const bg = document.getElementById('sprinkles');
  if(!bg) return;
  bg.innerHTML = '';

  // Day: sun + bees/butterflies/balloons. Night: moon + fireflies/owl/stars.
  const itemsDay   = ['🦋','🐝','🎈','🌈','🌸','🍀','✨','⭐','☁️'];
  const itemsNight = ['🦉','🪲','🌙','⭐','✨','💫','🌌','🫧','☁️'];
  const items = (sky === 'night') ? itemsNight : itemsDay;
  const count = (sky === 'night') ? 24 : 18;

  for(let i=0;i<count;i++){
    const s=document.createElement('span');
    s.textContent = items[i % items.length];
    const sizeBase = (sky === 'night') ? 12 : 14;
    const topBase  = (sky === 'night') ? 6  : 10;
    s.style.cssText =
      `left:${Math.random()*100}%;`+
      `top:${topBase+Math.random()*80}%;`+
      `animation-delay:${Math.random()*4}s;`+
      `animation-duration:${2.6+Math.random()*2.8}s;`+
      `font-size:${sizeBase+Math.random()*18}px;`+
      `opacity:${(sky==='night'?0.5:0.62)+Math.random()*0.25};`;
    bg.appendChild(s);
  }
}
function initTheme(){
  themePref = getThemePref();
  applyThemePref();
  applySkyMode();
  // keep in sync for auto mode (optional but nice)
  try{
    themeMedia = window.matchMedia?.('(prefers-color-scheme: dark)') || null;
    themeMedia?.addEventListener?.('change', ()=>{ if(getThemePref()==='auto') applyThemePref(); });
  }catch(e){}

  // Re-evaluate sky mode periodically for auto mode (hour changes)
  clearInterval(skyTimer);
  skyTimer = setInterval(()=>{ if(getThemePref()==='auto') applySkyMode(); }, 60*1000);
}

/* ─── SETTINGS UI (hide API key) ─── */
function resolveUrl(path){
  try{ return new URL(path, window.location.href).toString(); }
  catch(e){ return path; }
}

function isFirebaseReady(){
  try{ return firebase?.apps?.length>0 && firebase.app().options.apiKey && !firebase.app().options.apiKey.includes('YOUR_'); }
  catch(e){ return false; }
}

function logoutNow(){
  playPop();
  try{ localStorage.removeItem('userRole'); }catch(e){}
  try{ localStorage.removeItem('classRoom'); }catch(e){}
  if(isFirebaseReady()){
    try{
      firebase.auth().signOut().finally(()=>window.location.href = resolveUrl('auth/login.html'));
      return;
    }catch(e){}
  }
  window.location.href = resolveUrl('auth/login.html');
}

function setMusicVolume(v){
  const vol = Math.max(0, Math.min(1, Number(v)));
  try{ localStorage.setItem('music_volume', String(vol)); }catch(e){}
  try{
    const m = getMaster();
    m.musicGain.gain.setTargetAtTime(vol, m.ac.currentTime, 0.02);
  }catch(e){
    try{ bgAudio.volume = vol; }catch(e2){}
  }
}
function getMusicVolume(){
  try{
    const v = Number(localStorage.getItem('music_volume'));
    return Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : 0.35;
  }catch(e){ return 0.35; }
}

function ensureSlimSettings(){
  const modal = document.getElementById('settingsModal');
  const card  = document.querySelector('#settingsModal .settings-card');
  if(!modal || !card) return;

  // Render once; then only sync values
  if(!card.getAttribute('data-slim')){
    card.setAttribute('data-slim','1');
    card.innerHTML = `
      <button class="settings-close" onclick="closeSettings()">×</button>
      <h2>⚙️ Cài đặt</h2>
      <p>Âm thanh • Giọng đọc • Giao diện • Tài khoản</p>

      <div class="settings-section">
        <div class="settings-title">🔊 Âm thanh</div>
        <div class="settings-row">
          <button type="button" class="settings-action" id="musicToggleBtn">🎵 Bật/Tắt nhạc nền</button>
          <div class="settings-hint" id="musicHint">Nhạc sẽ chạy sau lần chạm/click đầu tiên.</div>
        </div>
        <div class="settings-row">
          <div class="settings-label">Âm lượng</div>
          <input id="musicVol" class="settings-range" type="range" min="0" max="100" step="1">
          <div class="settings-val" id="musicVolVal">35%</div>
        </div>
      </div>

      <div class="settings-section" id="ttsSection">
        <div class="settings-title">🎙️ Giọng đọc Tiếng Việt</div>
        <div class="tts-engines">
          <button type="button" class="tts-engine-btn" data-engine="auto">⚡ Tự động</button>
          <button type="button" class="tts-engine-btn" data-engine="google">🌐 Google Cloud</button>
          <button type="button" class="tts-engine-btn" data-engine="web">🔈 Trình duyệt</button>
        </div>

        <div class="tts-panel" id="ttsPanelGoogle">
          <div class="tts-panel-label">Giọng Google Neural2 / Wavenet (vi-VN)</div>
          <div class="voice-chips" id="googleVoiceChips">
            <button type="button" class="chip" data-voice="vi-VN-Neural2-A">🌸 Neural2-A (nữ)</button>
            <button type="button" class="chip" data-voice="vi-VN-Neural2-D">🎯 Neural2-D (nam)</button>
            <button type="button" class="chip" data-voice="vi-VN-Wavenet-A">💐 Wavenet-A (nữ)</button>
            <button type="button" class="chip" data-voice="vi-VN-Wavenet-D">🚀 Wavenet-D (nam)</button>
          </div>
          <div class="settings-hint" id="googleStatus">…</div>
        </div>

        <div class="tts-panel" id="ttsPanelWeb">
          <div class="tts-panel-label">Giọng có sẵn trong trình duyệt</div>
          <div class="settings-hint" id="webStatus">…</div>
          <div class="settings-hint" style="margin-top:4px">
            💡 Trên <strong>Microsoft Edge</strong> hoặc <strong>Windows 11</strong>, có giọng « HoaiMy / NamMinh Online (Natural) » miễn phí, chất lượng rất tốt.
          </div>
        </div>

        <div class="settings-row" style="margin-top:10px">
          <button type="button" class="settings-action" id="ttsTestBtn">🔊 Thử giọng</button>
        </div>
      </div>

      <div class="settings-section" id="themeSection">
        <div class="settings-title">🌗 Giao diện</div>
        <div class="theme-choices">
          <button type="button" class="theme-btn" data-theme="auto">Tự động</button>
          <button type="button" class="theme-btn" data-theme="light">Sáng</button>
          <button type="button" class="theme-btn" data-theme="dark">Tối</button>
        </div>
      </div>

      <div class="settings-section">
        <div class="settings-title">🔐 Tài khoản</div>
        <div class="settings-row settings-row-actions">
          <button type="button" class="settings-action" id="loginBtn">🔑 Đăng nhập</button>
          <button type="button" class="settings-action danger" id="logoutBtn">🚪 Đăng xuất</button>
        </div>
      </div>
    `;

    // Wire theme buttons
    card.querySelectorAll('.theme-btn').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        playPop();
        setThemePref(btn.getAttribute('data-theme'));
      });
    });

    // Wire music toggle
    const mt = card.querySelector('#musicToggleBtn');
    if(mt) mt.addEventListener('click', ()=>toggleMusic());

    // Wire volume
    const range = card.querySelector('#musicVol');
    const valEl = card.querySelector('#musicVolVal');
    if(range){
      range.addEventListener('input', ()=>{
        const vol = Number(range.value)/100;
        if(valEl) valEl.textContent = Math.round(vol*100)+'%';
        setMusicVolume(vol);
      });
    }

    // Wire TTS engine choice
    card.querySelectorAll('.tts-engine-btn').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        const e = btn.getAttribute('data-engine');
        setTtsEngine(e);
        syncTtsEngineUI();
        playPop();
      });
    });

    // Wire Google voice chips
    card.querySelectorAll('#googleVoiceChips .chip').forEach(chip=>{
      chip.addEventListener('click', ()=>{
        googleVoice = chip.getAttribute('data-voice') || 'vi-VN-Neural2-A';
        try{ localStorage.setItem('google_tts_voice', googleVoice); }catch(e){}
        ttsCache = {};
        syncTtsVoiceUI();
      });
    });

    // Test speak button
    const testBtn = card.querySelector('#ttsTestBtn');
    if(testBtn) testBtn.addEventListener('click', ()=>speak('Xin chào bé! Hôm nay bé học rất giỏi.'));

    // Wire auth actions
    const loginBtn = card.querySelector('#loginBtn');
    const logoutBtn = card.querySelector('#logoutBtn');
    if(loginBtn) loginBtn.addEventListener('click', ()=>{ playPop(); window.location.href = resolveUrl('auth/login.html'); });
    if(logoutBtn) logoutBtn.addEventListener('click', logoutNow);
  }

  // Sync UI values each open
  const vol = getMusicVolume();
  const range = card.querySelector('#musicVol');
  const valEl = card.querySelector('#musicVolVal');
  if(range) range.value = String(Math.round(vol*100));
  if(valEl) valEl.textContent = Math.round(vol*100)+'%';
  setMusicVolume(vol);
  syncThemeUI();
  syncTtsEngineUI();
  syncTtsVoiceUI();
}

function syncTtsEngineUI(){
  const engine = getTtsEngine();
  document.querySelectorAll('.tts-engine-btn').forEach(b=>{
    b.classList.toggle('active', b.getAttribute('data-engine') === engine);
  });
  const showGoogle = (engine === 'auto' || engine === 'google');
  const showWeb    = (engine === 'auto' || engine === 'web');
  const pg = document.getElementById('ttsPanelGoogle');
  const pw = document.getElementById('ttsPanelWeb');
  if(pg) pg.style.display = showGoogle ? '' : 'none';
  if(pw) pw.style.display = showWeb ? '' : 'none';

  const gs = document.getElementById('googleStatus');
  if(gs){
    if(_hasGoogleProxy()){
      gs.innerHTML = '✅ <strong>Server proxy</strong> sẵn sàng (Vercel ENV) — không cần dán key.';
    } else if(googleKey){
      gs.innerHTML = '✅ Có key trong cấu hình — đang gọi trực tiếp Google API.';
    } else {
      gs.innerHTML = '⚠️ <strong>Chưa cấu hình</strong> Google TTS. Đặt key trong <code>public/secrets/tts.config.js</code> hoặc ENV <code>GOOGLE_TTS_API_KEY</code> trên Vercel.';
    }
  }
  const ws = document.getElementById('webStatus');
  if(ws){
    const v = _pickVietnameseVoice();
    if(v){
      ws.innerHTML = '✅ Đang dùng: <strong>' + v.name + '</strong> (' + v.lang + ')';
    } else {
      ws.innerHTML = '⚠️ Trình duyệt chưa có giọng vi-VN — sẽ đọc giọng mặc định.';
    }
  }
}
function syncTtsVoiceUI(){
  document.querySelectorAll('#googleVoiceChips .chip').forEach(c=>{
    c.classList.toggle('active', c.getAttribute('data-voice') === googleVoice);
  });
}

function ensureThemeControls(){
  const card = document.querySelector('#settingsModal .settings-card');
  if(!card) return;
  if(card.querySelector('.theme-row')) return;

  const row = document.createElement('div');
  row.className = 'theme-row';
  row.innerHTML = `
    <div class="theme-label">🌗 Giao diện</div>
    <div class="theme-choices">
      <button type="button" class="theme-btn" data-theme="auto">Tự động</button>
      <button type="button" class="theme-btn" data-theme="light">Sáng</button>
      <button type="button" class="theme-btn" data-theme="dark">Tối</button>
    </div>
  `;
  card.appendChild(row);

  row.querySelectorAll('.theme-btn').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      playPop();
      setThemePref(btn.getAttribute('data-theme'));
    });
  });
  syncThemeUI();
}

function syncThemeUI(){
  const pref = getThemePref();
  document.querySelectorAll('.theme-btn').forEach(b=>{
    b.classList.toggle('active', b.getAttribute('data-theme') === pref);
  });
}

function openSettings(){
  document.getElementById('settingsModal').classList.add('open');
  ensureSlimSettings();
}
function closeSettings(){
  document.getElementById('settingsModal').classList.remove('open');
}
/* Stub (legacy): các HTML cũ vẫn có <input id="fptKeyInput"> và chip onclick="setVoice(...)".
 * Sau khi đã chuyển sang Google TTS, các nút này gần như không còn hiển thị
 * (settings modal được render lại bởi ensureSlimSettings).
 * Giữ stub trống để tránh ReferenceError nếu HTML cũ chưa cập nhật. */
function saveKey(){ console.info('[TTS] saveKey() đã bỏ — dùng Google Cloud / Web Speech qua ⚙️ Cài đặt.'); }
function setVoice(){ console.info('[TTS] setVoice() đã bỏ.'); }

/* ─── FPT.AI TTS ENGINE ─── */
let ttsCache     = {};   // text → blob URL (mp3) đã cache
let currentAudio = null; // <audio> element dùng chung
let ttsStatusTimer = null;

/* Mobile detection + audio unlock helpers
   ----------------------------------------------------------------
   Mobile (đặc biệt iOS Safari, Chrome Android) chặn audio cho đến khi
   có user gesture. Ta:
     1) Tạo SẴN 1 thẻ <audio playsinline> dùng chung, không create mới
        mỗi lần speak (rẻ hơn, không bị giật).
     2) Lần gesture đầu tiên: phát 1 audio "silence" để unlock playback
        và resume() Web Audio context.
     3) Dùng Blob URL (audio/mpeg) thay vì data:URL khổng lồ — mobile
        parse nhanh hơn rất nhiều, không bị nghẽn UI thread. */
const _isMobileUA = (typeof navigator !== 'undefined') &&
  /Mobi|Android|iPhone|iPad|iPod|IEMobile|BlackBerry|Opera Mini/i.test(navigator.userAgent || '');
const _isIOS = (typeof navigator !== 'undefined') &&
  (/iPhone|iPad|iPod/.test(navigator.userAgent || '') ||
   (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));

let _ttsAudioEl = null;
let _audioUnlocked = false;

function _getTtsAudio(){
  if(_ttsAudioEl) return _ttsAudioEl;
  const a = document.createElement('audio');
  a.setAttribute('playsinline','');        // iOS: không full-screen
  a.setAttribute('webkit-playsinline','');
  a.preload = 'auto';
  a.crossOrigin = 'anonymous';
  a.style.display = 'none';
  try{ document.body.appendChild(a); }catch(e){}
  _ttsAudioEl = a;
  return a;
}

/* Silent WAV (~80 bytes) — chạy mọi browser, dùng để unlock audio trên mobile.
   Phải gọi a.play() synchronously bên trong gesture handler. */
const _SILENCE_WAV = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=';

function _unlockTtsAudio(){
  if(_audioUnlocked) return;
  _audioUnlocked = true;
  try{
    const a = _getTtsAudio();
    a.muted = true;
    a.src = _SILENCE_WAV;
    const p = a.play();
    if(p && p.catch) p.catch(()=>{});
    setTimeout(()=>{ try{ a.pause(); a.muted = false; }catch(e){} }, 80);
  }catch(e){}
  // Resume Web Audio context nếu đang suspended (mobile khởi tạo state='suspended')
  try{
    const ac = window._ac;
    if(ac && ac.state === 'suspended'){ ac.resume(); }
  }catch(e){}
  // Trên mobile, gọi 1 lần SpeechSynthesisUtterance rỗng để "đánh thức" engine
  try{
    if(typeof speechSynthesis !== 'undefined'){
      const u = new SpeechSynthesisUtterance('');
      u.volume = 0;
      speechSynthesis.speak(u);
    }
  }catch(e){}
}

/* Convert base64 → Blob URL (audio/mpeg). Nhanh hơn data: URL trên mobile
   và tránh nghẽn DOM khi chuỗi base64 dài (vài chục KB). */
function _b64ToBlobUrl(b64){
  try{
    const bin = atob(b64);
    const len = bin.length;
    const bytes = new Uint8Array(len);
    for(let i=0;i<len;i++) bytes[i] = bin.charCodeAt(i);
    const blob = new Blob([bytes], { type: 'audio/mpeg' });
    return URL.createObjectURL(blob);
  }catch(e){
    // Fallback (hiếm khi xảy ra) — vẫn dùng data:URL
    return 'data:audio/mpeg;base64,' + b64;
  }
}

/* iOS Safari hay tự dừng speechSynthesis sau ~15s — gọi pause/resume mỗi
   10s để giữ cho engine không "ngủ" giữa câu. */
let _iosKeepAliveTimer = null;
function _startIOSKeepAlive(){
  if(!_isIOS) return;
  clearInterval(_iosKeepAliveTimer);
  _iosKeepAliveTimer = setInterval(()=>{
    try{
      if(speechSynthesis.speaking && !speechSynthesis.paused){
        speechSynthesis.pause();
        speechSynthesis.resume();
      } else if(!speechSynthesis.speaking){
        clearInterval(_iosKeepAliveTimer);
        _iosKeepAliveTimer = null;
      }
    }catch(e){}
  }, 10000);
}

function showTTSStatus(state, msg){
  const pill = document.getElementById('ttsStatus');
  const dot  = document.getElementById('ttsDot');
  const txt  = document.getElementById('ttsMsg');
  dot.className = 'tts-dot ' + state;
  txt.textContent = msg;
  pill.classList.add('show');
  clearTimeout(ttsStatusTimer);
  if(state !== 'loading') ttsStatusTimer = setTimeout(()=>pill.classList.remove('show'), 2200);
}

async function speak(rawText){
  const text = rawText.replace(/[\u{1F000}-\u{1FFFF}]/gu,'').replace(/[⭐✨💫🌟]/g,'').trim();
  if(!text) return;
  _unlockTtsAudio();
  if(currentAudio){ try{ currentAudio.pause(); }catch(e){} }
  try{ speechSynthesis.cancel(); }catch(e){}

  if(ttsCache[text]){ _playAudioUrl(ttsCache[text], text); return; }

  const engine = getTtsEngine();
  // Trên mobile, chế độ 'auto' ép dùng Google nếu có (Web Speech vi-VN gần như
  // không có trên Android, iOS Safari có nhưng giọng máy mộc).
  const wantGoogle = (engine === 'google' || engine === 'auto') && isGoogleReady();

  if(engine === 'web' || !wantGoogle){
    _speakFallback(text);
    return;
  }

  try{
    showTTSStatus('loading','Đang tải giọng Google Cloud...');
    const url = await _synthesizeGoogle(text);
    ttsCache[text] = url;
    _playAudioUrl(url, text);
  }catch(err){
    console.warn('[TTS] google', err && err.message || err);
    showTTSStatus('error','Google TTS lỗi — dùng giọng trình duyệt');
    _speakFallback(text);
  }
}

function _hasGoogleProxy(){
  // Có proxy serverless khi deploy (vd /api/tts-google), client không cần key
  return typeof window.__GOOGLE_TTS_USE_PROXY__ === 'boolean' && window.__GOOGLE_TTS_USE_PROXY__;
}

async function _synthesizeGoogle(text){
  // Ưu tiên proxy server-side để không lộ key
  const useProxy = _hasGoogleProxy();
  let url, opts;
  if(useProxy){
    url = '/api/tts-google';
    opts = {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ text, voice: googleVoice })
    };
  } else {
    if(!googleKey) throw new Error('Chưa có Google API key');
    url = 'https://texttospeech.googleapis.com/v1/text:synthesize?key=' + encodeURIComponent(googleKey);
    opts = {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({
        input:{ text },
        voice:{
          languageCode: 'vi-VN',
          name: googleVoice
        },
        audioConfig:{
          audioEncoding: 'MP3',
          speakingRate: 0.95,
          pitch: 1.0
        }
      })
    };
  }
  const res = await fetch(url, opts);
  if(!res.ok){
    let detail = '';
    try{ detail = (await res.text()).slice(0,200); }catch(e){}
    throw new Error('Google TTS HTTP ' + res.status + (detail ? ' — ' + detail : ''));
  }
  const data = await res.json();
  const b64 = data.audioContent;
  if(!b64) throw new Error('Google không trả audioContent');
  return _b64ToBlobUrl(b64);
}

function _playAudioUrl(url, text){
  const a = _getTtsAudio();
  try{ a.pause(); a.currentTime = 0; }catch(e){}
  a.src = url;
  a.onplay  = ()=>showTTSStatus('ok','🎙️ '+(text.length>20?text.slice(0,20)+'…':text));
  a.onended = ()=>{ /* giữ blob URL trong cache để dùng lại */ };
  a.onerror = ()=>{ showTTSStatus('error','Lỗi phát audio'); _speakFallback(text); };
  currentAudio = a;
  const p = a.play();
  if(p && p.catch) p.catch((err)=>{
    console.warn('[TTS] play() rejected', err && err.message || err);
    _speakFallback(text);
  });
}
/* Chọn giọng vi-VN tốt nhất có sẵn trong trình duyệt.
 * Ưu tiên: Microsoft Natural / Online (Azure Neural, miễn phí, có trong Edge / Win11),
 *          Google vi-VN, rồi tới mọi giọng có lang bắt đầu 'vi'. */
let _vnVoiceCache = null;
let _voicesReadyOnce = false;

function _pickVietnameseVoice(){
  if(_vnVoiceCache) return _vnVoiceCache;
  if(typeof speechSynthesis === 'undefined') return null;
  const list = speechSynthesis.getVoices() || [];
  if(!list.length) return null;

  function score(v){
    const name = (v.name || '').toLowerCase();
    const lang = (v.lang || '').toLowerCase();
    let s = 0;
    if(lang.startsWith('vi')) s += 100;
    if(name.includes('natural'))   s += 40;
    if(name.includes('online'))    s += 30;
    if(name.includes('hoaimy') || name.includes('hoài my')) s += 25;
    if(name.includes('namminh') || name.includes('nam minh')) s += 22;
    if(name.includes('microsoft')) s += 18;
    if(name.includes('google'))    s += 12;
    if(name.includes('linh'))      s += 8;
    if(v.localService === false)   s += 5;  // online voices thường chất lượng cao hơn
    return s;
  }

  const sorted = list.slice().sort((a,b)=>score(b)-score(a));
  const top = sorted[0];
  if(top && score(top) >= 100) { _vnVoiceCache = top; return top; }
  // không có vi-VN — lấy bất cứ giọng nào (sẽ đọc kiểu Anh hóa, nhưng còn hơn không)
  return top || null;
}

function _speakFallback(text){
  try{
    const u = new SpeechSynthesisUtterance(text);
    u.lang  = 'vi-VN';
    u.rate  = 0.92;
    u.pitch = 1.05;
    const v = _pickVietnameseVoice();
    if(v){ u.voice = v; u.lang = v.lang || 'vi-VN'; }
    const label = v ? ('🔊 ' + (v.name.length > 28 ? v.name.slice(0,28) + '…' : v.name)) : '🔊 Giọng trình duyệt';
    showTTSStatus('ok', label);
    speechSynthesis.speak(u);
    _startIOSKeepAlive(); // chống iOS tự dừng giữa câu

    // Nếu lần đầu chưa có voice list (browser load async), nghe lại sau khi sẵn sàng
    if(!_voicesReadyOnce){
      _voicesReadyOnce = true;
      try{
        speechSynthesis.addEventListener('voiceschanged', ()=>{ _vnVoiceCache = null; }, { once:true });
      }catch(e){}
    }
  }catch(e){}
}

/* ─── SOUND FX ─── */
function getAC(){ return window._ac||(window._ac=new(window.AudioContext||window.webkitAudioContext)()); }

// Master audio chain to avoid clipping ("rè") when music + SFX overlap
function getMaster(){
  if(window._master) return window._master;
  const ac = getAC();

  const comp = ac.createDynamicsCompressor();
  comp.threshold.setValueAtTime(-18, ac.currentTime);
  comp.knee.setValueAtTime(18, ac.currentTime);
  comp.ratio.setValueAtTime(6, ac.currentTime);
  comp.attack.setValueAtTime(0.005, ac.currentTime);
  comp.release.setValueAtTime(0.12, ac.currentTime);

  const musicGain = ac.createGain();
  const sfxGain   = ac.createGain();
  musicGain.gain.setValueAtTime(getMusicVolume(), ac.currentTime);
  sfxGain.gain.setValueAtTime(0.9, ac.currentTime);

  musicGain.connect(comp);
  sfxGain.connect(comp);
  comp.connect(ac.destination);

  window._master = { ac, comp, musicGain, sfxGain, musicSrc: null };
  return window._master;
}

function ensureMusicRouted(){
  try{
    if(!bgAudio) return;
    const m = getMaster();
    if(m.musicSrc) return;
    m.musicSrc = m.ac.createMediaElementSource(bgAudio);
    m.musicSrc.connect(m.musicGain);
  }catch(e){}
}
function playCorrect(){
  duckBg();
  try{
    const m=getMaster(); const c=m.ac;
    [[523,.05],[659,.18],[784,.3],[1047,.46]].forEach(([f,w])=>{
      const o=c.createOscillator(),g=c.createGain();
      o.connect(g); g.connect(m.sfxGain);
      o.type='sine'; o.frequency.value=f;
      g.gain.setValueAtTime(.10,c.currentTime+w);
      g.gain.exponentialRampToValueAtTime(.001,c.currentTime+w+.24);
      o.start(c.currentTime+w); o.stop(c.currentTime+w+.28);
    });
  }catch(e){}
}
function playWrong(){
  duckBg();
  try{
    const m=getMaster(); const c=m.ac;
    const o=c.createOscillator(),g=c.createGain();
    o.connect(g); g.connect(m.sfxGain);
    o.type='triangle';
    o.frequency.value=220;
    o.frequency.exponentialRampToValueAtTime(90,c.currentTime+.32);
    g.gain.setValueAtTime(.09,c.currentTime);
    g.gain.exponentialRampToValueAtTime(.001,c.currentTime+.34);
    o.start(); o.stop(c.currentTime+.38);
  }catch(e){}
}
function playPop(){
  duckBg(260, 0.45);
  try{
    const m=getMaster(); const c=m.ac;
    const o=c.createOscillator(),g=c.createGain();
    o.connect(g); g.connect(m.sfxGain);
    o.type='sine';
    o.frequency.value=680;
    o.frequency.exponentialRampToValueAtTime(1020,c.currentTime+.07);
    g.gain.setValueAtTime(.08,c.currentTime);
    g.gain.exponentialRampToValueAtTime(.001,c.currentTime+.11);
    o.start(); o.stop(c.currentTime+.14);
  }catch(e){}
}

/* ─── BACKGROUND MUSIC ─── */
// MP3-only background music (loops + resumes across pages).
const MUSIC_TRACK_CANDIDATES = [
  // root pages
  "assets/The Name Of Life - Spirited Away (Piano).mp3",
  // nested pages (auth/, lessons/)
  "../assets/The Name Of Life - Spirited Away (Piano).mp3",
  // if you place next to html (optional)
  "The Name Of Life - Spirited Away (Piano).mp3",
  "../The Name Of Life - Spirited Away (Piano).mp3"
];
const MUSIC_TIME_KEY = 'music_time';
const MUSIC_SRC_KEY  = 'music_src';

let musicOn = false;
let pendingAutoMusic = false;

let bgAudio = null;
let saveTimeTimer = null;
let duckTimer = null;
let lastBgVolume = null;

function resolveAbsUrl(path){
  try{ return new URL(path, window.location.href).toString(); }
  catch(e){ return path; }
}

function pickTrackSrc(){
  // Keep previously working src if present
  try{
    const prev = localStorage.getItem(MUSIC_SRC_KEY);
    if(prev) return prev;
  }catch(e){}
  return resolveAbsUrl(MUSIC_TRACK_CANDIDATES[0]);
}

function initBgAudio(){
  if(bgAudio) return;
  bgAudio = new Audio();
  bgAudio.preload = 'auto';
  bgAudio.loop = true; // auto replay when finished
  bgAudio.volume = getMusicVolume();
  bgAudio.src = pickTrackSrc();

  // Try next candidate if current fails
  bgAudio.addEventListener('error', ()=>{
    const cur = bgAudio?.src || '';
    const abs = MUSIC_TRACK_CANDIDATES.map(resolveAbsUrl);
    const idx = abs.findIndex(u => u === cur);
    const next = abs[idx+1];
    if(next){
      bgAudio.src = next;
      bgAudio.load();
    }
  });

  // Save working src + restore time once ready
  bgAudio.addEventListener('canplay', ()=>{
    try{ localStorage.setItem(MUSIC_SRC_KEY, bgAudio.src); }catch(e){}
    restoreMusicTime();
  });

  // Periodically save time while playing (so page transitions feel continuous)
  bgAudio.addEventListener('play', ()=>{
    ensureMusicRouted();
    clearInterval(saveTimeTimer);
    saveTimeTimer = setInterval(saveMusicTime, 2500);
  });
  bgAudio.addEventListener('pause', ()=>{
    clearInterval(saveTimeTimer);
    saveTimeTimer = null;
    saveMusicTime();
  });
}

function duckBg(ms=420, factor=0.35){
  try{
    if(!bgAudio) return;
    if(bgAudio.paused) return;
    const base = getMusicVolume();
    const target = Math.max(0, Math.min(1, base * factor));
    try{
      const m=getMaster();
      m.musicGain.gain.setTargetAtTime(target, m.ac.currentTime, 0.01);
    }catch(e){
      if(lastBgVolume == null) lastBgVolume = bgAudio.volume;
      bgAudio.volume = target;
    }
    clearTimeout(duckTimer);
    duckTimer = setTimeout(()=>{
      try{
        const m=getMaster();
        m.musicGain.gain.setTargetAtTime(base, m.ac.currentTime, 0.02);
      }catch(e){
        try{ bgAudio.volume = base; }catch(e2){}
      }
      lastBgVolume = null;
      duckTimer = null;
    }, ms);
  }catch(e){}
}

function saveMusicTime(){
  try{
    if(!bgAudio) return;
    // guard NaN / Infinity
    const t = Number(bgAudio.currentTime);
    if(!Number.isFinite(t) || t < 0) return;
    localStorage.setItem(MUSIC_TIME_KEY, String(t));
  }catch(e){}
}

function restoreMusicTime(){
  try{
    if(!bgAudio) return;
    const t = Number(localStorage.getItem(MUSIC_TIME_KEY) || '0');
    if(Number.isFinite(t) && t > 0){
      // avoid jumping past duration if metadata not ready
      if(Number.isFinite(bgAudio.duration) && bgAudio.duration > 0){
        bgAudio.currentTime = Math.min(t, Math.max(0, bgAudio.duration - 1));
      } else {
        bgAudio.currentTime = t;
      }
    }
  }catch(e){}
}

function stopAllMusic(){
  try{ saveMusicTime(); }catch(e){}
  try{ bgAudio?.pause(); }catch(e){}
}

async function startTrack(){
  initBgAudio();
  if(!bgAudio) return false;
  try{
    ensureMusicRouted();
    try{ bgAudio.volume = getMusicVolume(); }catch(e){}
    restoreMusicTime();
    await bgAudio.play(); // may be blocked until first user gesture
    return true;
  }catch(e){
    return false;
  }
}
function toggleMusic(){
  musicOn=!musicOn;
  try{ localStorage.setItem('music_pref', musicOn?'on':'off'); }catch(e){}
  const btn = document.getElementById('musicBtn');
  if(btn) btn.textContent = musicOn ? '🔇' : '🎵';
  if(musicOn){
    // Autoplay with sound is blocked by browsers → start after first user gesture.
    pendingAutoMusic = true;
    tryStartMusic();
  } else {
    pendingAutoMusic = false;
    stopAllMusic();
  }
}

function tryStartMusic(){
  if(!musicOn) return;
  startTrack().then(ok=>{ pendingAutoMusic = !ok; });
}

function armAutoMusic(){
  // Default: auto-on first visit, but only actually plays after first gesture.
  let pref = 'on';
  try{ pref = localStorage.getItem('music_pref') || 'on'; }catch(e){}
  musicOn = (pref !== 'off');
  const btn = document.getElementById('musicBtn');
  if(btn) btn.textContent = musicOn ? '🔇' : '🎵';
  pendingAutoMusic = musicOn;

  const kick = ()=>{
    if(pendingAutoMusic) tryStartMusic();
    window.removeEventListener('pointerdown', kick, true);
    window.removeEventListener('keydown', kick, true);
    window.removeEventListener('touchstart', kick, true);
  };
  window.addEventListener('pointerdown', kick, true);
  window.addEventListener('touchstart', kick, true);
  window.addEventListener('keydown', kick, true);

  // Try immediately (will succeed on some browsers / after prior allow)
  tryStartMusic();
}

// Save time on navigation/visibility changes
window.addEventListener('beforeunload', saveMusicTime);
document.addEventListener('visibilitychange', ()=>{ if(document.hidden) saveMusicTime(); });

/* ─── CONFETTI ─── */
function launchConfetti(x,y){
  const cols=['#ff6b6b','#ffe66d','#6bcb77','#4d96ff','#ff9a3c','#c77dff','#ff70a6','#38d9a9'];
  for(let i=0;i<20;i++){
    const d=document.createElement('div'); d.className='cft';
    const w=6+Math.random()*10, h=6+Math.random()*10;
    d.style.cssText=`left:${x+(-70+Math.random()*140)}px;top:${y}px;width:${w}px;height:${h}px;background:${cols[i%cols.length]};animation-duration:${.9+Math.random()*.7}s;animation-delay:${Math.random()*.12}s;border-radius:${Math.random()>.5?'50%':'3px'}`;
    document.body.appendChild(d); setTimeout(()=>d.remove(),1700);
  }
}

/* ─── UTILS ─── */
function shuffle(a){ for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]; } }

/* Unlock TTS audio + Web Audio context ngay khi có gesture đầu tiên.
   Cần thiết cho mobile (autoplay block) — gắn trên window để chắc chắn
   bắt được mọi tap dù người dùng chạm bất kỳ phần tử nào. */
function _armTtsUnlock(){
  const kick = ()=>{
    _unlockTtsAudio();
    window.removeEventListener('pointerdown', kick, true);
    window.removeEventListener('touchstart', kick, true);
    window.removeEventListener('keydown', kick, true);
    window.removeEventListener('click', kick, true);
  };
  window.addEventListener('pointerdown', kick, true);
  window.addEventListener('touchstart',  kick, true);
  window.addEventListener('keydown',     kick, true);
  window.addEventListener('click',       kick, true);
}

/* ─── INIT on DOMContentLoaded ─── */
document.addEventListener('DOMContentLoaded',()=>{
  initTheme();
  // Music button
  const mb = document.getElementById('musicBtn');
  if(mb) mb.onclick = toggleMusic;
  armAutoMusic();
  _armTtsUnlock();
  // Settings button
  const sb = document.getElementById('settingsBtn');
  if(sb) sb.onclick = openSettings;
  // Close settings on backdrop click
  const sm = document.getElementById('settingsModal');
  if(sm) sm.addEventListener('click', e=>{ if(e.target===sm) closeSettings(); });

  // Sprinkles are generated by day/night sky mode
  applySkyMode();
});
