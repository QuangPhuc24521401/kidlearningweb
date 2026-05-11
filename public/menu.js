// menu.js
function goLesson(type){
  playPop();
  // Vào trang chủ đề (danh sách bài học) thay vì đi thẳng vào câu hỏi.
  window.location.href = 'lessons/' + type + '/index.html';
}
function handleLogout(){
  playPop();
  try{ localStorage.removeItem('userRole'); }catch(e){}
  try{ localStorage.removeItem('classRoom'); }catch(e){}
  try{ localStorage.removeItem('userDisplayName'); }catch(e){}
  try{
    firebase.auth().signOut().then(()=>{ window.location.href='auth/login.html'; });
  }
  catch(e){ window.location.href='auth/login.html'; }
}

(function(){
  var revealed = false;
  function reveal(){ if(!revealed){ revealed = true; document.documentElement.style.visibility=''; } }

  try{
    if(firebase.apps.length>0 && firebase.app().options.apiKey && !firebase.app().options.apiKey.includes('YOUR_')){
      firebase.auth().onAuthStateChanged(function(user){
        if(!user) window.location.href='auth/login.html';
        else { reveal(); renderProgressBadges(); mountUserBar(); fetchProgressFromCloud(user.uid); }
      });
    } else {
      reveal();
      renderProgressBadges();
      mountUserBar();
    }
  }catch(e){ reveal(); renderProgressBadges(); mountUserBar(); }

  setTimeout(reveal, 4000);
})();

/* ───────────── Progress badges ───────────── */

function _readProgress(){
  try{ return JSON.parse(localStorage.getItem('learning_progress') || '{}') || {}; }
  catch(e){ return {}; }
}

/** Tổng hợp dữ liệu cấp môn từ cấp topic. */
function _aggregateSubject(entry){
  if(!entry) return null;
  // Cấu trúc mới có topics
  if(entry.topics && typeof entry.topics === 'object'){
    var topics = Object.values(entry.topics);
    if(!topics.length) return null;
    var totalQ      = topics.reduce(function(s,t){ return s + (t.total || 0);          }, 0);
    var sumBest     = topics.reduce(function(s,t){ return s + (t.bestRun || 0);        }, 0);
    var totalStars  = topics.reduce(function(s,t){ return s + (t.totalStars || 0);     }, 0);
    var lastSes     = topics.reduce(function(m,t){ return Math.max(m, t.lastSessionAt || 0); }, 0);
    var topicsDone  = topics.filter(function(t){ return (t.completedRuns || 0) >= 1; }).length;
    return {
      total:          totalQ,
      bestRun:        sumBest,
      completedRuns:  (topicsDone === topics.length && topics.length > 0) ? 1 : 0,
      totalStars:     totalStars,
      lastSessionAt:  lastSes,
      topicsTotal:    topics.length,
      topicsDone:     topicsDone
    };
  }
  // Cấu trúc cũ (backward compat)
  return entry;
}

function _statusOf(agg){
  if(!agg || ((agg.bestRun || 0) === 0 && (agg.topicsDone || 0) === 0)) return 'none';
  if((agg.completedRuns || 0) >= 1 || (agg.topicsDone && agg.topicsTotal && agg.topicsDone >= agg.topicsTotal)) return 'done';
  return 'inprogress';
}

function renderProgressBadges(){
  var data = _readProgress();
  var subjects = ['nhan_biet','tu_duy','am_nhac','ghep_hinh','my_thuat','ngon_ngu'];
  var totalStars = 0, doneCount = 0;

  subjects.forEach(function(sub){
    var entry  = data[sub];
    var agg    = _aggregateSubject(entry);
    var status = _statusOf(agg);
    var item   = document.querySelector('.menu-item[data-subject="' + sub + '"]');
    if(!item) return;

    item.classList.remove('is-done', 'is-inprogress', 'is-none');
    item.classList.add('is-' + status);

    var slot = item.querySelector('.mi-progress');
    if(!slot) return;

    if(status === 'none'){
      slot.innerHTML = '<span class="mi-status mi-status-none">⚪ Chưa học</span>';
    } else if(status === 'inprogress'){
      var done   = agg.topicsDone || 0;
      var totalT = agg.topicsTotal || 0;
      var pct    = totalT ? Math.round(done / totalT * 100) : 0;
      slot.innerHTML =
        '<div class="mi-status-row">' +
          '<span class="mi-status mi-status-prog">🟢 Đang học</span>' +
          '<span class="mi-frac">' + done + '/' + totalT + ' bài</span>' +
        '</div>' +
        '<div class="mi-bar"><div class="mi-bar-fill" style="width:' + pct + '%"></div></div>';
    } else {
      var stars = agg.totalStars || 0;
      slot.innerHTML =
        '<div class="mi-status-row">' +
          '<span class="mi-status mi-status-done">✅ Hoàn thành</span>' +
          '<span class="mi-frac">⭐ ' + stars + '</span>' +
        '</div>' +
        '<div class="mi-bar"><div class="mi-bar-fill" style="width:100%"></div></div>';
    }

    if(agg){
      totalStars += agg.totalStars || 0;
      if(status === 'done') doneCount += 1;
    }
  });

  // Tổng kết tiến độ
  var op = document.getElementById('overallProgress');
  if(op){
    op.hidden = false;
    var s = document.getElementById('opStars'); if(s) s.textContent = totalStars;
    var d = document.getElementById('opDone');  if(d) d.textContent = doneCount;
  }
  // Cập nhật user-bar (nếu đang có) cho khớp tổng sao mới
  mountUserBar();
}

/* Xoá toàn bộ tiến độ — có xác nhận */
function resetProgress(){
  if(!confirm('Xoá hết tiến độ học của tất cả các môn? Hành động này không thể hoàn tác.')) return;
  try{ localStorage.removeItem('learning_progress'); }catch(e){}
  // Xoá trên Firestore (best-effort)
  try{
    if(typeof firebase !== 'undefined' && firebase.auth && firebase.firestore){
      var u = firebase.auth().currentUser;
      if(u){
        firebase.firestore().collection('learning_progress').doc(u.uid)
          .set({ progress: {}, updatedAt: firebase.firestore.FieldValue.serverTimestamp() })
          .catch(function(err){ console.warn('[resetProgress] firestore', err); });
      }
    }
  }catch(e){}
  renderProgressBadges();
  if(typeof playPop === 'function') playPop();
}

/* Lấy tiến độ từ Firestore khi user đăng nhập (sync giữa thiết bị) */
function fetchProgressFromCloud(uid){
  try{
    if(typeof firebase === 'undefined' || !firebase.firestore) return;
    firebase.firestore().collection('learning_progress').doc(uid).get()
      .then(function(snap){
        if(!snap || !snap.exists) return;
        var cloud = snap.data() && snap.data().progress;
        if(!cloud || typeof cloud !== 'object') return;
        var local = _readProgress();
        // Merge cấp topic: lấy giá trị MAX của mỗi field
        var merged = {};
        var subjects = new Set(Object.keys(cloud).concat(Object.keys(local)));
        subjects.forEach(function(sub){
          var c = cloud[sub] || {};
          var l = local[sub] || {};
          var cTop = c.topics || {};
          var lTop = l.topics || {};
          var mTop = {};
          var topicNames = new Set(Object.keys(cTop).concat(Object.keys(lTop)));
          topicNames.forEach(function(tn){
            var ct = cTop[tn] || {};
            var lt = lTop[tn] || {};
            mTop[tn] = {
              total:         Math.max(ct.total         || 0, lt.total         || 0),
              bestRun:       Math.max(ct.bestRun       || 0, lt.bestRun       || 0),
              completedRuns: Math.max(ct.completedRuns || 0, lt.completedRuns || 0),
              totalStars:    Math.max(ct.totalStars    || 0, lt.totalStars    || 0),
              lastSessionAt: Math.max(ct.lastSessionAt || 0, lt.lastSessionAt || 0)
            };
          });
          merged[sub] = { topics: mTop };
        });
        try{ localStorage.setItem('learning_progress', JSON.stringify(merged)); }catch(e){}
        renderProgressBadges();
      })
      .catch(function(err){ console.warn('[fetchProgressFromCloud]', err); });
  }catch(e){}
}

/* ───────────── User bar (góc phải trên) ───────────── */

function _computeTotalStars(){
  var data = _readProgress();
  var total = 0;
  Object.values(data).forEach(function(s){
    var agg = _aggregateSubject(s);
    if(agg && agg.totalStars) total += agg.totalStars;
  });
  return total;
}

function mountUserBar(){
  var name = (localStorage.getItem('userDisplayName') || '').trim() || 'Bé học sinh';
  var stars = _computeTotalStars();
  var bar = document.getElementById('userBar');
  if(!bar){
    bar = document.createElement('div');
    bar.id = 'userBar';
    bar.className = 'user-bar';
    document.body.appendChild(bar);
  }
  bar.innerHTML =
    '<span class="ub-avatar">👤</span>' +
    '<span class="ub-name" title="' + (name.replace(/"/g,'&quot;')) + '">' + (name.length > 16 ? name.slice(0,15) + '…' : name) + '</span>' +
    '<span class="ub-divider"></span>' +
    '<span class="ub-stars" title="Tổng sao đã đạt">🌟 ' + stars + '</span>';
}
