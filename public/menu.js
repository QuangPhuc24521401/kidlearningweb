// menu.js
function goLesson(type){
  playPop();
  window.location.href = 'lessons/' + type + '/index.html';
}
function handleLogout(){
  playPop();
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
        else { reveal(); renderProgressBadges(); fetchProgressFromCloud(user.uid); }
      });
    } else {
      reveal();
      renderProgressBadges();
    }
  }catch(e){ reveal(); renderProgressBadges(); }

  setTimeout(reveal, 4000);
})();

/* ───────────── Progress badges ───────────── */

function _readProgress(){
  try{ return JSON.parse(localStorage.getItem('learning_progress') || '{}') || {}; }
  catch(e){ return {}; }
}
function _statusOf(entry){
  if(!entry || (!entry.bestRun && !entry.completedRuns)) return 'none';
  if((entry.completedRuns || 0) >= 1) return 'done';
  return 'inprogress';
}

function renderProgressBadges(){
  var data = _readProgress();
  var subjects = ['nhan_biet','tu_duy','am_nhac','ghep_hinh','my_thuat','ngon_ngu'];
  var totalStars = 0, doneCount = 0;

  subjects.forEach(function(sub){
    var entry  = data[sub];
    var status = _statusOf(entry);
    var item   = document.querySelector('.menu-item[data-subject="' + sub + '"]');
    if(!item) return;

    item.classList.remove('is-done', 'is-inprogress', 'is-none');
    item.classList.add('is-' + status);

    var slot = item.querySelector('.mi-progress');
    if(!slot) return;

    if(status === 'none'){
      slot.innerHTML = '<span class="mi-status mi-status-none">⚪ Chưa học</span>';
    } else if(status === 'inprogress'){
      var done  = entry.bestRun  || 0;
      var total = entry.total    || done;
      var pct   = total ? Math.min(100, Math.round(done / total * 100)) : 0;
      slot.innerHTML =
        '<div class="mi-status-row">' +
          '<span class="mi-status mi-status-prog">🟢 Đang học</span>' +
          '<span class="mi-frac">' + done + '/' + total + '</span>' +
        '</div>' +
        '<div class="mi-bar"><div class="mi-bar-fill" style="width:' + pct + '%"></div></div>';
    } else {
      var runs  = entry.completedRuns || 0;
      var stars = entry.totalStars   || 0;
      slot.innerHTML =
        '<div class="mi-status-row">' +
          '<span class="mi-status mi-status-done">✅ Hoàn thành</span>' +
          '<span class="mi-frac">⭐ ' + stars + (runs > 1 ? ' • ×' + runs : '') + '</span>' +
        '</div>' +
        '<div class="mi-bar"><div class="mi-bar-fill" style="width:100%"></div></div>';
    }

    if(entry){
      totalStars += entry.totalStars || 0;
      if((entry.completedRuns || 0) >= 1) doneCount += 1;
    }
  });

  // Tổng kết tiến độ
  var op = document.getElementById('overallProgress');
  if(op){
    op.hidden = false;
    var s = document.getElementById('opStars'); if(s) s.textContent = totalStars;
    var d = document.getElementById('opDone');  if(d) d.textContent = doneCount;
  }
}

/* Xoá toàn bộ tiến độ — có xác nhận */
function resetProgress(){
  if(!confirm('Xoá hết tiến độ học của tất cả các môn? Hành động này không thể hoàn tác.')) return;
  try{ localStorage.removeItem('learning_progress'); }catch(e){}
  // Xoá trên Firestore (best-effort) — set rỗng object để override
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
        // Merge: lấy giá trị MAX của mỗi field giữa cloud vs local (local có thể mới hơn nếu user vừa học)
        var merged = {};
        var subjects = new Set(Object.keys(cloud).concat(Object.keys(local)));
        subjects.forEach(function(sub){
          var c = cloud[sub] || {};
          var l = local[sub] || {};
          merged[sub] = {
            total:          Math.max(c.total          || 0, l.total          || 0),
            bestRun:        Math.max(c.bestRun        || 0, l.bestRun        || 0),
            completedRuns:  Math.max(c.completedRuns  || 0, l.completedRuns  || 0),
            totalStars:     Math.max(c.totalStars     || 0, l.totalStars     || 0),
            lastSessionAt:  Math.max(c.lastSessionAt  || 0, l.lastSessionAt  || 0)
          };
        });
        try{ localStorage.setItem('learning_progress', JSON.stringify(merged)); }catch(e){}
        renderProgressBadges();
      })
      .catch(function(err){ console.warn('[fetchProgressFromCloud]', err); });
  }catch(e){}
}
