// lesson.js
// Đọc loại bài từ URL: lessons/lesson.html?type=nhan_biet

/* ─── NAVIGATION ─── */
function goHome(){ playPop(); window.location.href='../index.html'; }

/* ─── FIRESTORE LESSON LOADER ─── */
// Nếu có Firebase, load từ Firestore. Nếu không, dùng LESSONS_LOCAL bên dưới.
let LESSONS = {};

async function initLessons(){
  try {
    const db = firebase.firestore();
    const snap = await db.collection('lessons').get();
    snap.forEach(doc => {
      const d = doc.data();
      if(!LESSONS[d.type]) LESSONS[d.type] = [];
      LESSONS[d.type].push(d);
    });
  } catch(e) {
    console.warn('[Lesson] Firestore không khả dụng, dùng dữ liệu cục bộ', e.message);
    LESSONS = LESSONS_LOCAL;
  }
  startLesson();
}

/* ─── LOCAL FALLBACK DATA ─── */
const LESSONS_LOCAL = {
  nhan_biet:[
    {type:'count',item:'star',   count:2,q:'Có bao nhiêu ngôi sao?',   v:'Có bao nhiêu ngôi sao',   ans:['1','2','3'],  cor:'2'},
    {type:'count',item:'apple',  count:3,q:'Có bao nhiêu quả táo?',    v:'Có bao nhiêu quả táo',    ans:['2','3','4'],  cor:'3'},
    {type:'count',item:'fish',   count:4,q:'Có bao nhiêu con cá?',     v:'Có bao nhiêu con cá',     ans:['3','4','5'],  cor:'4'},
    {type:'count',item:'flower', count:5,q:'Có bao nhiêu bông hoa?',   v:'Có bao nhiêu bông hoa',   ans:['4','5','6'],  cor:'5'},
    {type:'count',item:'balloon',count:3,q:'Có bao nhiêu quả bóng?',   v:'Có bao nhiêu quả bóng',   ans:['2','3','4'],  cor:'3'},
    {type:'count',item:'star',   count:1,q:'Có bao nhiêu ngôi sao?',   v:'Có bao nhiêu ngôi sao',   ans:['1','2','3'],  cor:'1'},
    {type:'shape',shape:'circle',   color:'#e74c3c',q:'Đây là hình gì?',v:'Đây là hình gì',ans:['Hình tròn','Hình vuông','Tam giác'],   cor:'Hình tròn'},
    {type:'shape',shape:'square',   color:'#3498db',q:'Đây là hình gì?',v:'Đây là hình gì',ans:['Hình tròn','Hình vuông','Tam giác'],   cor:'Hình vuông'},
    {type:'shape',shape:'triangle', color:'#2ecc71',q:'Đây là hình gì?',v:'Đây là hình gì',ans:['Hình chữ nhật','Hình vuông','Tam giác'],cor:'Tam giác'},
    {type:'shape',shape:'rectangle',color:'#9b59b6',q:'Đây là hình gì?',v:'Đây là hình gì',ans:['Hình tròn','Hình chữ nhật','Tam giác'],cor:'Hình chữ nhật'},
    {type:'shape',shape:'diamond',  color:'#f39c12',q:'Đây là hình gì?',v:'Đây là hình gì',ans:['Hình thoi','Hình vuông','Hình chữ nhật'],cor:'Hình thoi'},
    {type:'color',color:'#e74c3c',name:'đỏ',    q:'Đây là màu gì?',v:'Đây là màu gì',ans:['Màu đỏ','Màu xanh','Màu vàng'],          cor:'Màu đỏ'},
    {type:'color',color:'#3498db',name:'xanh dương',q:'Đây là màu gì?',v:'Đây là màu gì',ans:['Màu đỏ','Màu xanh dương','Màu vàng'],cor:'Màu xanh dương'},
    {type:'color',color:'#f1c40f',name:'vàng',  q:'Đây là màu gì?',v:'Đây là màu gì',ans:['Màu tím','Màu xanh lá','Màu vàng'],      cor:'Màu vàng'},
    {type:'color',color:'#2ecc71',name:'xanh lá',q:'Đây là màu gì?',v:'Đây là màu gì',ans:['Màu xanh lá','Màu hồng','Màu cam'],     cor:'Màu xanh lá'},
    {type:'color',color:'#e91e63',name:'hồng',  q:'Đây là màu gì?',v:'Đây là màu gì',ans:['Màu đỏ','Màu hồng','Màu tím'],           cor:'Màu hồng'},
  ],
  tu_duy:[
    {type:'oddone',q:'Hình nào khác với những hình còn lại?',v:'Hình nào khác với những hình còn lại',shapes:['circle','circle','square','circle'],colors:['#e74c3c','#e74c3c','#e74c3c','#e74c3c'],cor:'2'},
    {type:'oddone',q:'Hình nào khác với những hình còn lại?',v:'Hình nào khác với những hình còn lại',shapes:['triangle','circle','triangle','triangle'],colors:['#3498db','#3498db','#3498db','#3498db'],cor:'1'},
    {type:'oddone',q:'Hình nào khác màu?',v:'Hình nào khác màu',shapes:['circle','circle','circle','circle'],colors:['#3498db','#e74c3c','#3498db','#3498db'],cor:'1'},
    {type:'oddone',q:'Hình nào khác màu?',v:'Hình nào khác màu',shapes:['square','square','square','square'],colors:['#2ecc71','#2ecc71','#f39c12','#2ecc71'],cor:'2'},
    {type:'oddone',q:'Hình nào khác kích thước?',v:'Hình nào khác kích thước',shapes:['circle','circle','circle','circle'],colors:['#9b59b6','#9b59b6','#9b59b6','#9b59b6'],sizes:[55,55,88,55],cor:'2'},
    {type:'sequence',seq:[1,2,null,4,5],q:'Số nào còn thiếu? 1, 2, ?, 4, 5',v:'Số nào còn thiếu',ans:['1','3','6'],cor:'3'},
    {type:'sequence',seq:[2,4,null,8],  q:'Số nào còn thiếu? 2, 4, ?, 8',   v:'Số nào còn thiếu',ans:['5','6','7'],cor:'6'},
    {type:'sequence',seq:[10,8,null,4], q:'Số nào còn thiếu? 10, 8, ?, 4',  v:'Số nào còn thiếu',ans:['5','6','7'],cor:'6'},
    {type:'sequence',seq:[1,null,3,4],  q:'Số nào còn thiếu? 1, ?, 3, 4',   v:'Số nào còn thiếu',ans:['1','2','5'],cor:'2'},
    {type:'sort',q:'Hình tròn nào nhỏ nhất?',v:'Hình tròn nào nhỏ nhất',sizes:[70,38,92],color:'#e91e63',ans:['Hình 1','Hình 2','Hình 3'],cor:'Hình 2'},
    {type:'sort',q:'Hình vuông nào lớn nhất?',v:'Hình vuông nào lớn nhất',sizes:[50,88,32],color:'#4caf50',shape:'square',ans:['Hình 1','Hình 2','Hình 3'],cor:'Hình 2'},
    {type:'classify',q:'Con nào là động vật?',    v:'Con nào là động vật',    ans:['🐱 Mèo','🍎 Táo','🌸 Hoa'],        cor:'🐱 Mèo'},
    {type:'classify',q:'Quả nào là trái cây?',    v:'Quả nào là trái cây',    ans:['🚗 Xe hơi','🍌 Chuối','📚 Sách'],   cor:'🍌 Chuối'},
    {type:'classify',q:'Đâu là phương tiện?',     v:'Đâu là phương tiện',     ans:['🐶 Chó','🌈 Cầu vồng','✈️ Máy bay'],cor:'✈️ Máy bay'},
    {type:'classify',q:'Con nào sống dưới nước?', v:'Con nào sống dưới nước', ans:['🐦 Chim','🐟 Cá','🐘 Voi'],         cor:'🐟 Cá'},
    {type:'classify',q:'Thứ nào là đồ ăn?',       v:'Thứ nào là đồ ăn',       ans:['🍕 Pizza','💻 Laptop','🏠 Nhà'],    cor:'🍕 Pizza'},
    {type:'compare',q:'Nhóm nào có nhiều hơn?',v:'Nhóm nào có nhiều hơn',left:{count:2,item:'star'}, right:{count:5,item:'star'}, ans:['Nhóm trái','Nhóm phải'],cor:'Nhóm phải'},
    {type:'compare',q:'Nhóm nào có ít hơn?',   v:'Nhóm nào có ít hơn',   left:{count:4,item:'apple'},right:{count:2,item:'apple'},ans:['Nhóm trái','Nhóm phải'],cor:'Nhóm phải'},
  ]
};

/* ─── SVG GENERATORS ─── */
function svgItem(type,size=48){
  const s=size;
  switch(type){
    case 'star':    return `<svg width="${s}" height="${s}" viewBox="0 0 50 50"><polygon points="25,4 30,18 45,18 33,27 38,43 25,33 12,43 17,27 5,18 20,18" fill="#FFD700" stroke="#f0b000" stroke-width="1.5"/></svg>`;
    case 'apple':   return `<svg width="${s}" height="${s}" viewBox="0 0 50 50"><rect x="23" y="4" width="4" height="8" rx="2" fill="#5d4037"/><path d="M25,11 C13,11 7,21 7,31 C7,42 15,48 25,48 C35,48 43,42 43,31 C43,21 37,11 25,11Z" fill="#f44336"/><ellipse cx="17" cy="20" rx="5" ry="7" fill="rgba(255,255,255,0.38)" transform="rotate(-25 17 20)"/></svg>`;
    case 'fish':    return `<svg width="${Math.round(s*1.2)}" height="${s}" viewBox="0 0 60 50"><polygon points="44,6 60,0 60,50 44,44" fill="#42a5f5" opacity="0.75"/><ellipse cx="26" cy="25" rx="26" ry="17" fill="#42a5f5"/><circle cx="11" cy="20" r="6" fill="white"/><circle cx="12" cy="20" r="4" fill="#0d47a1"/><circle cx="14" cy="18" r="1.5" fill="white"/></svg>`;
    case 'flower':  return `<svg width="${s}" height="${s}" viewBox="0 0 50 50"><ellipse cx="25" cy="10" rx="7" ry="10" fill="#ec407a" opacity="0.88"/><ellipse cx="40" cy="25" rx="10" ry="7" fill="#ec407a" opacity="0.88"/><ellipse cx="25" cy="40" rx="7" ry="10" fill="#ec407a" opacity="0.88"/><ellipse cx="10" cy="25" rx="10" ry="7" fill="#ec407a" opacity="0.88"/><circle cx="25" cy="25" r="10" fill="#fff176"/><circle cx="25" cy="25" r="7" fill="#fdd835"/></svg>`;
    case 'balloon': return `<svg width="${Math.round(s*.9)}" height="${Math.round(s*1.35)}" viewBox="0 0 45 60"><ellipse cx="22" cy="22" rx="19" ry="21" fill="#ef5350"/><ellipse cx="16" cy="13" rx="7" ry="9" fill="rgba(255,255,255,.32)"/><path d="M22,45 Q26,52 22,58" stroke="#999" stroke-width="1.5" fill="none"/></svg>`;
    default: return '';
  }
}
function svgShape(shape,color,size=88){
  const s=size;
  switch(shape){
    case 'circle':    return `<svg width="${s}" height="${s}" viewBox="0 0 90 90"><circle cx="45" cy="45" r="40" fill="${color}"/><circle cx="30" cy="27" r="9" fill="rgba(255,255,255,.4)"/></svg>`;
    case 'square':    return `<svg width="${s}" height="${s}" viewBox="0 0 90 90"><rect x="8" y="8" width="74" height="74" rx="10" fill="${color}"/><rect x="14" y="13" width="28" height="14" rx="6" fill="rgba(255,255,255,.42)"/></svg>`;
    case 'triangle':  return `<svg width="${s}" height="${s}" viewBox="0 0 90 90"><polygon points="45,8 84,80 6,80" fill="${color}"/><ellipse cx="36" cy="32" rx="10" ry="6" fill="rgba(255,255,255,.38)" transform="rotate(-20 36 32)"/></svg>`;
    case 'rectangle': return `<svg width="${s}" height="${Math.round(s*.65)}" viewBox="0 0 90 58"><rect x="5" y="5" width="80" height="48" rx="9" fill="${color}"/><rect x="12" y="9" width="28" height="13" rx="5" fill="rgba(255,255,255,.42)"/></svg>`;
    case 'diamond':   return `<svg width="${s}" height="${s}" viewBox="0 0 90 90"><polygon points="45,6 84,45 45,84 6,45" fill="${color}"/><ellipse cx="35" cy="30" rx="9" ry="5" fill="rgba(255,255,255,.42)" transform="rotate(-35 35 30)"/></svg>`;
    default: return '';
  }
}

/* ─── VISUAL RENDERERS ─── */
function renderVisual(lesson){
  const va=document.getElementById('visualArea');
  switch(lesson.type){
    case 'count':{
      let html='<div class="visual-count">';
      for(let i=0;i<lesson.count;i++) html+=`<div class="count-item" style="--i:${i}">${svgItem(lesson.item,52)}</div>`;
      va.innerHTML=html+'</div>'; break;
    }
    case 'shape': va.innerHTML=`<div class="shape-anim">${svgShape(lesson.shape,lesson.color,100)}</div>`; break;
    case 'color': va.innerHTML=`<div class="shape-anim">${svgShape('circle',lesson.color,100)}</div>`; break;
    case 'sequence':{
      let html='<div class="sequence-row">';
      lesson.seq.forEach((n,i)=>{ html+=n===null?`<div class="seq-gap" style="--i:${i}">?</div>`:`<div class="seq-num" style="--i:${i}">${n}</div>`; });
      va.innerHTML=html+'</div>'; break;
    }
    case 'sort':{
      let html='<div class="sort-row">';
      lesson.sizes.forEach((sz,i)=>{ html+=`<div class="sort-item" style="--i:${i};animation:itemPop .4s cubic-bezier(.34,1.56,.64,1) both;animation-delay:${i*.1}s"><div>${svgShape(lesson.shape||'circle',lesson.color,sz)}</div><span>Hình ${i+1}</span></div>`; });
      va.innerHTML=html+'</div>'; break;
    }
    case 'compare':{
      const g=gr=>{let items='';for(let i=0;i<gr.count;i++)items+=`<div style="animation:itemPop .3s cubic-bezier(.34,1.56,.64,1) both;animation-delay:${i*.1}s">${svgItem(gr.item,36)}</div>`;return items;};
      va.innerHTML=`<div class="compare-wrap"><div class="compare-group">${g(lesson.left)}</div><div class="compare-vs">VS</div><div class="compare-group">${g(lesson.right)}</div></div>`; break;
    }
    case 'classify': va.innerHTML=`<div class="shape-anim" style="font-size:72px;line-height:1">${lesson.ans[0].split(' ')[0]}</div>`; break;
    case 'oddone': va.innerHTML=''; break;
    default: va.innerHTML='';
  }
}

/* ─── STATE ─── */
let pool=[], curIdx=0, stars=0, lessonType='';

function startLesson(){
  lessonType = new URLSearchParams(window.location.search).get('type') || 'nhan_biet';
  curIdx=0; stars=0;
  pool=[...(LESSONS[lessonType]||[])]; shuffle(pool);
  document.getElementById('stars').innerText='0';
  document.getElementById('progressBar').style.width='0%';
  showLesson();
}

function showLesson(){
  if(curIdx>=pool.length){ showComplete(); return; }
  const lesson=pool[curIdx];
  const qEl=document.getElementById('question');
  qEl.style.opacity='0'; qEl.style.transform='translateY(-10px)';
  setTimeout(()=>{ qEl.innerText=lesson.q; qEl.style.transition='opacity .3s,transform .3s'; qEl.style.opacity='1'; qEl.style.transform='translateY(0)'; },120);
  speak(lesson.v||lesson.q);
  renderVisual(lesson);
  const container=document.getElementById('answers');
  const status=document.getElementById('status');
  container.innerHTML=''; status.innerText=''; status.className='';
  if(lesson.type==='oddone'){
    lesson.shapes.forEach((sh,i)=>{
      const div=document.createElement('div');
      div.className='box shape-box';
      div.style.animation=`itemPop .4s cubic-bezier(.34,1.56,.64,1) both`;
      div.style.animationDelay=(i*.1)+'s';
      div.innerHTML=svgShape(sh,lesson.colors[i],lesson.sizes?lesson.sizes[i]:62);
      div.onclick=(e)=>handleAnswer(String(i),lesson,div,e,container,status);
      container.appendChild(div);
    });
  } else {
    [...lesson.ans].sort(()=>Math.random()-.5).forEach((ans,i)=>{
      const div=document.createElement('div');
      div.className='box'; div.innerHTML=ans;
      div.style.animation=`itemPop .4s cubic-bezier(.34,1.56,.64,1) both`;
      div.style.animationDelay=(i*.1)+'s';
      div.onclick=(e)=>handleAnswer(ans,lesson,div,e,container,status);
      container.appendChild(div);
    });
  }
}

async function handleAnswer(ans,lesson,div,e,container,status){
  container.querySelectorAll('.box').forEach(b=>b.style.pointerEvents='none');
  playPop();
  if(ans===lesson.cor){
    div.classList.add('correct');
    status.innerText='✅ Đúng rồi! Bé giỏi lắm!'; status.className='ok';
    playCorrect(); launchConfetti(e.clientX,e.clientY);
    speak('Đúng rồi, giỏi lắm!');
    stars++;
    document.getElementById('stars').innerText=stars;
    const sb=document.getElementById('starBox');
    sb.classList.remove('pop'); void sb.offsetWidth; sb.classList.add('pop');
    document.getElementById('progressBar').style.width=((curIdx+1)/pool.length*100)+'%';
    if(stars%3===0){ setTimeout(()=>{ curIdx++; openTeach(lesson); },1350); }
    else            { setTimeout(()=>{ curIdx++; showLesson(); },1350); }
  } else {
    div.classList.add('wrong');
    status.innerText='❌ Sai rồi, con thử lại nhé!'; status.className='no';
    playWrong(); speak('Sai rồi, con thử lại nhé!');
    setTimeout(()=>{ container.querySelectorAll('.box').forEach(b=>{ if(!b.classList.contains('wrong')) b.style.pointerEvents='auto'; }); },750);
  }
}

function showComplete(){
  const lc=document.getElementById('lessonCard');
  lc.innerHTML=`<div class="complete-wrap">
    <span class="big-emoji-anim">🎉</span>
    <h2>Bé học xong rồi!</h2>
    <p>Tuyệt vời! Đã đạt <strong>${stars}</strong> ⭐ trên ${pool.length} câu</p>
    <div style="margin-top:10px">
      <button class="replay-btn green" onclick="location.reload();playPop()">🔄 Học lại</button>
      <button class="replay-btn yellow" onclick="goHome()">🏠 Trang chủ</button>
    </div>
  </div>`;
  speak('Bé giỏi lắm, con đã học xong rồi!');
  for(let i=0;i<55;i++) setTimeout(()=>launchConfetti(Math.random()*innerWidth,Math.random()*60),i*50);
}

/* ─── TEACH BEAR ENGINE ─── */
let teachLesson=null, recognition=null, isListening=false;

function openTeach(lesson){
  teachLesson=lesson;
  document.getElementById('teachBubble').innerHTML=
    `Ôi không! Gấu quên mất rồi 😢<br>Con dạy Gấu nhé — đáp án là:<br><span class="teach-keyword">${lesson.cor}</span><br><small style="font-family:Nunito;font-size:13px;color:#888">Bé hãy nói to vào mic!</small>`;
  document.getElementById('teachResult').textContent='';
  document.getElementById('teachResult').className='teach-result';
  document.getElementById('micLabel').textContent='Bấm mic và nói to đáp án cho Gấu nghe!';
  document.getElementById('micBtn2').classList.remove('listening');
  document.getElementById('voiceWave').classList.remove('active');
  document.getElementById('teachBearSvg').className='teach-bear';
  document.getElementById('teachModal').classList.add('open');
  speak('Ôi không! Gấu quên mất rồi. Con dạy Gấu nhé!');
}
function closeTeach(){
  document.getElementById('teachModal').classList.remove('open');
  stopListening(); showLesson();
}
function startListening(){
  if(isListening){ stopListening(); return; }
  const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!SR){ document.getElementById('micLabel').textContent='⚠️ Dùng Chrome để hỗ trợ mic!'; return; }
  recognition=new SR();
  recognition.lang='vi-VN'; recognition.continuous=false; recognition.interimResults=true; recognition.maxAlternatives=5;
  recognition.onstart=()=>{ isListening=true; document.getElementById('micBtn2').classList.add('listening'); document.getElementById('micBtn2').textContent='🔴'; document.getElementById('voiceWave').classList.add('active'); document.getElementById('micLabel').textContent='🎙️ Đang nghe...'; document.getElementById('teachResult').textContent=''; };
  recognition.onresult=(e)=>{
    let heard='';
    for(let i=0;i<e.results.length;i++) for(let j=0;j<e.results[i].length;j++) heard+=e.results[i][j].transcript+' ';
    heard=heard.toLowerCase().trim();
    document.getElementById('micLabel').textContent='👂 Gấu nghe thấy: "'+heard+'"';
    if(e.results[0].isFinal) checkTeachAnswer(heard);
  };
  recognition.onerror=(e)=>{ stopListening(); document.getElementById('micLabel').textContent=e.error==='not-allowed'?'🔒 Cho phép mic trong trình duyệt!':'⚠️ Lỗi: '+e.error; };
  recognition.onend=()=>stopListening();
  recognition.start();
}
function stopListening(){
  isListening=false; try{recognition?.stop();}catch(e){}
  document.getElementById('micBtn2').classList.remove('listening');
  document.getElementById('micBtn2').textContent='🎤';
  document.getElementById('voiceWave').classList.remove('active');
}
function checkTeachAnswer(heard){
  if(!teachLesson) return;
  const cor=teachLesson.cor.toLowerCase().replace(/[\u{1F000}-\u{1FFFF}]/gu,'').replace(/[⭐✨💫🌟🔴🔵🟡]/g,'').replace(/hình /g,'').trim();
  const keywords=[cor,...getVariants(cor)];
  const matched=keywords.some(kw=>kw&&heard.includes(kw));
  const resultEl=document.getElementById('teachResult');
  const bear=document.getElementById('teachBearSvg');
  if(matched){
    resultEl.textContent='🎉 Gấu nhớ ra rồi! Con giỏi hơn cả giáo viên!'; resultEl.className='teach-result ok';
    bear.className='teach-bear happy';
    document.getElementById('teachBubble').innerHTML=`Ồ ĐÚNG RỒI! 🥳<br>Gấu nhớ ra rồi!<br><span class="teach-keyword" style="background:#e8f5e9;color:#2e7d32">${teachLesson.cor}</span>`;
    playCorrect(); speak('Ồ đúng rồi! Gấu nhớ ra rồi! Con giỏi hơn cả giáo viên!');
    for(let i=0;i<30;i++) setTimeout(()=>launchConfetti(Math.random()*innerWidth,Math.random()*100),i*40);
    stars++; document.getElementById('stars').innerText=stars;
    const sb=document.getElementById('starBox'); sb.classList.remove('pop'); void sb.offsetWidth; sb.classList.add('pop');
    setTimeout(closeTeach,2800);
  } else {
    resultEl.textContent='🐻 Gấu chưa nghe rõ... Nói to hơn nữa nhé bé!'; resultEl.className='teach-result no';
    speak('Gấu chưa nghe rõ, con nói to hơn nữa nhé!');
    setTimeout(()=>{ resultEl.textContent=''; document.getElementById('micLabel').textContent='Thử lại — bấm mic và nói to!'; },2000);
  }
}
function getVariants(word){
  const map={'hình tròn':['tròn','tron'],'hình vuông':['vuông','vuong'],'tam giác':['tam giac'],'hình chữ nhật':['chữ nhật','chu nhat'],'hình thoi':['thoi'],'màu đỏ':['đỏ','do'],'màu xanh dương':['xanh dương','xanh'],'màu vàng':['vàng','vang'],'màu xanh lá':['xanh lá','xanh la'],'màu hồng':['hồng','hong']};
  for(const[k,v] of Object.entries(map)) if(word.includes(k)) return v;
  return [word.normalize('NFD').replace(/[\u0300-\u036f]/g,'')];
}

/* ─── INIT ─── */
// Kiểm tra Firebase có được cấu hình thật không
function isFirebaseReady(){
  try{ return firebase.apps.length>0 && firebase.app().options.apiKey && !firebase.app().options.apiKey.includes('YOUR_'); }
  catch(e){ return false; }
}

if(isFirebaseReady()){
  // Firebase thật → kiểm tra đăng nhập
  firebase.auth().onAuthStateChanged(user=>{
    if(!user){ window.location.href='../auth/login.html'; return; }
    initLessons();
  });
} else {
  // Firebase chưa cấu hình → chạy thẳng với dữ liệu cục bộ
  console.warn('[Lesson] Firebase chưa cấu hình, dùng dữ liệu cục bộ.');
  LESSONS = LESSONS_LOCAL;
  startLesson();
}
