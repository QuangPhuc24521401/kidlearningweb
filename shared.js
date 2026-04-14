/* ═══════════════════════════════════════════════════
   SHARED.JS — dùng chung cho tất cả trang
   Bao gồm: TTS (FPT.AI), nhạc nền, confetti,
            settings modal, sprinkles init
═══════════════════════════════════════════════════ */

/* ─── SETTINGS MODAL ─── */
let fptKey   = localStorage.getItem('fpt_key')   || '';
let fptVoice = localStorage.getItem('fpt_voice') || 'lannhi';

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
      <p>Âm thanh • Giao diện • Tài khoản</p>

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
function saveKey(){
  const val = document.getElementById('fptKeyInput').value.trim();
  if(!val){ alert('Vui lòng nhập API key!'); return; }
  fptKey = val;
  localStorage.setItem('fpt_key', fptKey);
  ttsCache = {};
  document.getElementById('keySavedMsg').classList.remove('hidden');
  setTimeout(closeSettings, 900);
}
function setVoice(v, el){
  fptVoice = v;
  localStorage.setItem('fpt_voice', v);
  document.querySelectorAll('#voiceChips .chip').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
  ttsCache = {};
}

/* ─── FPT.AI TTS ENGINE ─── */
let ttsCache     = {};
let currentAudio = null;
let ttsStatusTimer = null;

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
  if(currentAudio){ currentAudio.pause(); currentAudio = null; }
  speechSynthesis.cancel();

  if(!fptKey){ _speakFallback(text); return; }
  if(ttsCache[text]){ _playAudioUrl(ttsCache[text], text); return; }

  showTTSStatus('loading', 'Đang tải giọng FPT.AI...');

  const ENDPOINTS = [
    'https://api.fpt.ai/hmi/tts/v5',
    'https://corsproxy.io/?' + encodeURIComponent('https://api.fpt.ai/hmi/tts/v5')
  ];
  let lastErr = null;
  for(const endpoint of ENDPOINTS){
    try{
      const res = await fetch(endpoint,{
        method:'POST',
        headers:{'api-key':fptKey,'speed':'-1','voice':fptVoice,'Content-Type':'text/plain'},
        body:text
      });
      if(!res.ok) throw new Error('HTTP '+res.status);
      const data = await res.json();
      if(data.error) throw new Error('FPT: '+data.error);
      const audioUrl = data.async;
      if(!audioUrl) throw new Error('Không có URL audio');
      await new Promise(r=>setTimeout(r,1400));
      ttsCache[text] = audioUrl;
      _playAudioUrl(audioUrl, text);
      return;
    }catch(err){ lastErr=err; console.warn('[TTS]',endpoint,err.message); }
  }
  showTTSStatus('error','Lỗi FPT.AI – dùng giọng dự phòng');
  _speakFallback(text);
}

function _playAudioUrl(url, text){
  currentAudio = new Audio(url);
  currentAudio.onplay  = ()=>showTTSStatus('ok','🎙️ '+(text.length>20?text.slice(0,20)+'…':text));
  currentAudio.onended = ()=>{ currentAudio=null; };
  currentAudio.onerror = ()=>{ showTTSStatus('error','Lỗi phát audio'); _speakFallback(text); };
  currentAudio.play().catch(()=>_speakFallback(text));
}
function _speakFallback(text){
  try{
    const u=new SpeechSynthesisUtterance(text);
    u.lang='vi-VN'; u.rate=0.88; u.pitch=1.1;
    showTTSStatus('ok','🔊 Web Speech (dự phòng)');
    speechSynthesis.speak(u);
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

/* ─── INIT on DOMContentLoaded ─── */
document.addEventListener('DOMContentLoaded',()=>{
  initTheme();
  // Music button
  const mb = document.getElementById('musicBtn');
  if(mb) mb.onclick = toggleMusic;
  armAutoMusic();
  // Settings button
  const sb = document.getElementById('settingsBtn');
  if(sb) sb.onclick = openSettings;
  // Close settings on backdrop click
  const sm = document.getElementById('settingsModal');
  if(sm) sm.addEventListener('click', e=>{ if(e.target===sm) closeSettings(); });

  // Sprinkles are generated by day/night sky mode
  applySkyMode();
});
