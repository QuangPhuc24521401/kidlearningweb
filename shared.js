/* ═══════════════════════════════════════════════════
   SHARED.JS — dùng chung cho tất cả trang
   Bao gồm: TTS (FPT.AI), nhạc nền, confetti,
            settings modal, sprinkles init
═══════════════════════════════════════════════════ */

/* ─── SETTINGS MODAL ─── */
let fptKey   = localStorage.getItem('fpt_key')   || '';
let fptVoice = localStorage.getItem('fpt_voice') || 'lannhi';

function openSettings(){
  document.getElementById('settingsModal').classList.add('open');
  if(fptKey) document.getElementById('fptKeyInput').value = fptKey;
  document.getElementById('keySavedMsg').classList.toggle('hidden', !fptKey);
  // Restore active chip
  document.querySelectorAll('#voiceChips .chip').forEach(c =>{
    const match = c.getAttribute('onclick')?.includes("'"+fptVoice+"'");
    c.classList.toggle('active', !!match);
  });
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
function playCorrect(){
  try{const c=getAC();[[523,.05],[659,.18],[784,.3],[1047,.46]].forEach(([f,w])=>{const o=c.createOscillator(),g=c.createGain();o.connect(g);g.connect(c.destination);o.type='sine';o.frequency.value=f;g.gain.setValueAtTime(.28,c.currentTime+w);g.gain.exponentialRampToValueAtTime(.001,c.currentTime+w+.28);o.start(c.currentTime+w);o.stop(c.currentTime+w+.32);});}catch(e){}
}
function playWrong(){
  try{const c=getAC();const o=c.createOscillator(),g=c.createGain();o.connect(g);g.connect(c.destination);o.type='sawtooth';o.frequency.value=200;o.frequency.exponentialRampToValueAtTime(80,c.currentTime+.36);g.gain.setValueAtTime(.18,c.currentTime);g.gain.exponentialRampToValueAtTime(.001,c.currentTime+.38);o.start();o.stop(c.currentTime+.42);}catch(e){}
}
function playPop(){
  try{const c=getAC();const o=c.createOscillator(),g=c.createGain();o.connect(g);g.connect(c.destination);o.type='sine';o.frequency.value=680;o.frequency.exponentialRampToValueAtTime(1020,c.currentTime+.07);g.gain.setValueAtTime(.2,c.currentTime);g.gain.exponentialRampToValueAtTime(.001,c.currentTime+.12);o.start();o.stop(c.currentTime+.15);}catch(e){}
}

/* ─── BACKGROUND MUSIC ─── */
const MELODY=[
  [523,.3],[523,.3],[784,.3],[784,.3],[880,.3],[880,.3],[784,.6],
  [698,.3],[698,.3],[659,.3],[659,.3],[587,.3],[587,.3],[523,.6],
  [784,.3],[784,.3],[698,.3],[698,.3],[659,.3],[659,.3],[587,.6],
  [523,.3],[523,.3],[784,.3],[784,.3],[880,.3],[880,.3],[784,.6],
  [698,.3],[698,.3],[659,.3],[659,.3],[587,.3],[587,.3],[523,.6],
];
let musicOn=false, musicIdx=0, musicTimer=null;

function playMusicNote(freq,dur){
  try{
    const c=getAC(),o=c.createOscillator(),g=c.createGain(),f=c.createBiquadFilter();
    f.type='lowpass';f.frequency.value=1200;
    o.connect(f);f.connect(g);g.connect(c.destination);
    o.type='triangle';o.frequency.value=freq;
    const t=c.currentTime;
    g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.06,t+.04);
    g.gain.exponentialRampToValueAtTime(.001,t+dur*.9);
    o.start(t);o.stop(t+dur);
  }catch(e){}
}
function musicStep(){
  if(!musicOn) return;
  const [freq,dur]=MELODY[musicIdx%MELODY.length];
  if(freq>0) playMusicNote(freq,dur);
  musicIdx++;
  musicTimer=setTimeout(musicStep,dur*1000);
}
function toggleMusic(){
  musicOn=!musicOn;
  document.getElementById('musicBtn').textContent=musicOn?'🔇':'🎵';
  if(musicOn){ try{getAC().resume();}catch(e){} musicStep(); }
  else clearTimeout(musicTimer);
}

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
  // Music button
  document.getElementById('musicBtn').onclick = toggleMusic;
  // Settings button
  document.getElementById('settingsBtn').onclick = openSettings;
  // Close settings on backdrop click
  const sm = document.getElementById('settingsModal');
  if(sm) sm.addEventListener('click', e=>{ if(e.target===sm) closeSettings(); });

  // Sprinkles
  const items=['⭐','✨','💫','🌟','🎈','🌸','🍀','🦋','🌈'];
  const bg=document.getElementById('sprinkles');
  if(bg){ for(let i=0;i<18;i++){ const s=document.createElement('span'); s.textContent=items[i%items.length]; s.style.cssText=`left:${Math.random()*100}%;top:${10+Math.random()*75}%;animation-delay:${Math.random()*4}s;animation-duration:${2.5+Math.random()*2.5}s;font-size:${14+Math.random()*16}px`; bg.appendChild(s); } }
});
