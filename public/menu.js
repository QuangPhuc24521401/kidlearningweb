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
  try{ localStorage.removeItem('studentAvatarMode'); }catch(e){}
  try{ localStorage.removeItem('studentAvatarEmoji'); }catch(e){}
  try{ localStorage.removeItem('studentAvatarRing'); }catch(e){}
  try{ localStorage.removeItem('studentAvatarPhoto'); }catch(e){}
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
        else {
          function runAppShell(){
            reveal();
            renderProgressBadges();
            mountUserBar();
            if(typeof renderProfilePage === 'function') renderProfilePage();
            fetchProgressFromCloud(user.uid);
          }
          function maybeGuardParentOnboarding(cb){
            var pathname = '';
            try{
              pathname = String(window.location.pathname || '').replace(/\\/g,'/').toLowerCase();
            }catch(e){}
            if(pathname.indexOf('student-setup') !== -1){
              cb();
              return;
            }
            firebase.firestore().collection('users').doc(user.uid).get()
              .then(function(snap){
                var data = snap && snap.exists ? snap.data() : null;
                var role = (data && data.role) ? data.role : 'parent';
                if(role === 'parent' && data && data.studentProfileComplete === false){
                  window.location.href = 'auth/student-setup.html';
                  return;
                }
                cb();
              })
              .catch(function(err){
                console.warn('[menu auth guard]', err);
                cb();
              });
          }
          maybeGuardParentOnboarding(runAppShell);
        }
      });
    } else {
      reveal();
      renderProgressBadges();
      mountUserBar();
      if(typeof renderProfilePage === 'function') renderProfilePage();
    }
  }catch(e){
    reveal(); renderProgressBadges(); mountUserBar();
    if(typeof renderProfilePage === 'function') renderProfilePage();
  }

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
  if(typeof renderAchievementsPanel === 'function') renderAchievementsPanel();
}

/* Xoá toàn bộ tiến độ — có xác nhận */
function resetProgress(){
  if(!confirm('Xoá hết tiến độ học của tất cả các môn? Hành động này không thể hoàn tác.')) return;
  try{ localStorage.removeItem('learning_progress'); }catch(e){}
  if(typeof resetAchievementStorage === 'function') resetAchievementStorage();
  // Xoá trên Firestore (best-effort)
  try{
    if(typeof firebase !== 'undefined' && firebase.auth && firebase.firestore){
      var u = firebase.auth().currentUser;
      if(u){
        firebase.firestore().collection('learning_progress').doc(u.uid)
          .set({
            progress: {},
            achievements: {},
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
          })
          .catch(function(err){ console.warn('[resetProgress] firestore', err); });
      }
    }
  }catch(e){}
  renderProgressBadges();
  if(typeof playPop === 'function') playPop();
}


/** Đồng bộ avatar học sinh từ Firestore users/{uid} vào localStorage (giữ khớp với auth/cacheUserMeta). */
function applyStudentAvatarFromUserDoc(data){
  try{
    if(!data || data.role === 'teacher'){
      localStorage.removeItem('studentAvatarMode');
      localStorage.removeItem('studentAvatarEmoji');
      localStorage.removeItem('studentAvatarRing');
      localStorage.removeItem('studentAvatarPhoto');
      return;
    }
    var mode = data.studentAvatarMode === 'photo' ? 'photo' : 'emoji';
    localStorage.setItem('studentAvatarMode', mode);
    var em = (typeof data.studentAvatarEmoji === 'string' && data.studentAvatarEmoji.trim())
      ? data.studentAvatarEmoji.trim() : '🧒';
    localStorage.setItem('studentAvatarEmoji', em);
    var ringRe = /^#[0-9A-Fa-f]{6}$/;
    var ring = (typeof data.studentAvatarRing === 'string' && ringRe.test(data.studentAvatarRing.trim()))
      ? data.studentAvatarRing.trim() : '#FF9800';
    localStorage.setItem('studentAvatarRing', ring);
    if(mode === 'photo'
      && typeof data.studentAvatarPhoto === 'string'
      && data.studentAvatarPhoto.indexOf('data:image/jpeg;base64,') === 0
      && data.studentAvatarPhoto.length < 200000){
      localStorage.setItem('studentAvatarPhoto', data.studentAvatarPhoto);
    } else {
      localStorage.removeItem('studentAvatarPhoto');
    }
  }catch(e){}
}

function _readStudentAvatarFromStorage(){
  var mode = localStorage.getItem('studentAvatarMode') === 'photo' ? 'photo' : 'emoji';
  var emoji = (localStorage.getItem('studentAvatarEmoji') || '🧒').trim() || '🧒';
  var ringRe = /^#[0-9A-Fa-f]{6}$/;
  var ringRaw = localStorage.getItem('studentAvatarRing') || '';
  var ring = ringRe.test(ringRaw.trim()) ? ringRaw.trim() : '#FF9800';
  var photo = localStorage.getItem('studentAvatarPhoto') || '';
  var photoOk = mode === 'photo'
    && typeof photo === 'string'
    && photo.indexOf('data:image/jpeg;base64,') === 0
    && photo.length < 200000;
  return { mode: photoOk ? 'photo' : 'emoji', emoji: emoji, ring: ring, photo: photoOk ? photo : '' };
}

function _safeDataUrlForAttr(u){
  if(typeof u !== 'string' || u.indexOf('data:image/jpeg;base64,') !== 0 || u.length > 200000) return '';
  if(/["\s<>]/.test(u)) return '';
  return u;
}

function fetchProgressFromCloud(uid){
  try{
    if(typeof firebase === 'undefined' || !firebase.firestore) return;
    var db = firebase.firestore();
    var profRef = db.collection('learning_progress').doc(uid);
    var userRef = db.collection('users').doc(uid);
    Promise.all([profRef.get(), userRef.get()])
      .then(function(results){
        var snap = results[0];
        var userSnap = results[1];
        if(userSnap && userSnap.exists){
          var udata = userSnap.data() || {};
          applyStudentAvatarFromUserDoc(udata);
          try{
            if(udata.displayName) localStorage.setItem('userDisplayName', udata.displayName);
            if(udata.classRoom)   localStorage.setItem('classRoom', udata.classRoom);
          }catch(err){}
          mountUserBar();
          if(typeof renderProfilePage === 'function') renderProfilePage();
        }
        function finish(){
          if(typeof recomputeAchievementsAfterCloudMerge === 'function') recomputeAchievementsAfterCloudMerge();
          renderProgressBadges();
          if(typeof flushAchievementsToCloud === 'function') flushAchievementsToCloud();
        }
        if(!snap || !snap.exists){
          finish();
          return;
        }
        var d = snap.data() || {};
        if(d.achievements && typeof mergeAchievementsFromCloud === 'function'){
          mergeAchievementsFromCloud(d.achievements);
        }
        var cloud = d.progress;
        if(!cloud || typeof cloud !== 'object'){
          finish();
          return;
        }
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
        finish();
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

/* ───────────── Profile info (dropdown avatar) ───────────── */

function _escapeHtml(s){
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function _formatJoinDate(date){
  if(!date) return '—';
  var d = String(date.getDate()).padStart(2, '0');
  var m = String(date.getMonth() + 1).padStart(2, '0');
  return d + '/' + m + '/' + date.getFullYear();
}

/** "3 tháng", "5 ngày", "1 năm 2 tháng" — khoảng cách từ `date` tới hiện tại. */
function _formatAccountAge(date){
  if(!date) return '';
  var days = Math.max(0, Math.floor((Date.now() - date.getTime()) / 86400000));
  if(days < 1)   return 'hôm nay';
  if(days < 7)   return days + ' ngày';
  if(days < 30)  return Math.floor(days / 7) + ' tuần';
  if(days < 365){
    var m = Math.floor(days / 30);
    return m + ' tháng';
  }
  var y = Math.floor(days / 365);
  var remM = Math.floor((days % 365) / 30);
  return y + ' năm' + (remM ? ' ' + remM + ' tháng' : '');
}

/** Đọc dữ liệu profile từ Firebase auth + localStorage + achievements. */
function _readProfileInfo(){
  var role        = localStorage.getItem('userRole') || 'parent';
  var displayName = (localStorage.getItem('userDisplayName') || '').trim();
  var classRoom   = localStorage.getItem('classRoom') || '';
  var stars       = _computeTotalStars();

  var email = '';
  var createdAt = null;
  try{
    if(typeof firebase !== 'undefined' && firebase.auth){
      var u = firebase.auth().currentUser;
      if(u){
        email = u.email || '';
        var ct = u.metadata && u.metadata.creationTime;
        if(ct){
          var dt = new Date(ct);
          if(!isNaN(dt.getTime())) createdAt = dt;
        }
      }
    }
  }catch(e){}

  var streak = 0, unlocked = 0, totalBadges = 0, honor = 0;
  try{
    if(typeof window.readAchievements === 'function'){
      var a = window.readAchievements();
      streak   = a && a.streak ? a.streak : 0;
      unlocked = a && a.unlocked ? Object.keys(a.unlocked).length : 0;
    }
    if(window.ACHIEVEMENT_DEFS && window.ACHIEVEMENT_DEFS.length){
      totalBadges = window.ACHIEVEMENT_DEFS.length;
    }
    honor = parseInt(localStorage.getItem('arena_honor') || '0', 10) || 0;
  }catch(e){}

  return {
    role:        role,
    isTeacher:   role === 'teacher',
    roleLabel:   role === 'teacher' ? 'Tài khoản giáo viên' : 'Tài khoản phụ huynh',
    name:        displayName || (role === 'teacher' ? 'Giáo viên' : 'Bé học sinh'),
    email:       email,
    classRoom:   classRoom,
    createdAt:   createdAt,
    stars:       stars,
    streak:      streak,
    unlocked:    unlocked,
    totalBadges: totalBadges,
    honor:       honor,
    studentAvatar: !role || role !== 'teacher' ? _readStudentAvatarFromStorage() : null
  };
}

function mountUserBar(){
  var info  = _readProfileInfo();
  var slot  = document.getElementById('topbarUserSlot');
  var bar   = document.getElementById('userBar');
  if(!bar){
    bar = document.createElement('div');
    bar.id = 'userBar';
  }
  bar.className = slot ? 'user-bar user-bar--topbar' : 'user-bar';
  var safeName  = _escapeHtml(info.name);
  var shortName = info.name.length > 16 ? _escapeHtml(info.name.slice(0,15)) + '…' : safeName;

  var avHtml;
  if(info.isTeacher){
    avHtml = '<span class="ub-avatar ub-avatar--teacher" aria-hidden="true">👩‍🏫</span>';
  } else {
    var sv = info.studentAvatar || _readStudentAvatarFromStorage();
    var ringEsc = _escapeHtml(sv.ring);
    var ph = sv.mode === 'photo' ? _safeDataUrlForAttr(sv.photo) : '';
    if(ph){
      avHtml = '<span class="ub-avatar ub-avatar--student ub-avatar--photo" aria-hidden="true" style="--avatar-ring:' + ringEsc + '">' +
        '<img class="ub-avatar-img" src="' + ph + '" alt="" decoding="async" />' +
        '</span>';
    } else {
      avHtml = '<span class="ub-avatar ub-avatar--student ub-avatar--emoji" aria-hidden="true" style="--avatar-ring:' + ringEsc + '">' +
        '<span class="ub-avatar-emoji-inner">' + _escapeHtml(sv.emoji) + '</span>' +
        '</span>';
    }
  }

  /* Avatar = link sang trang Hồ sơ. SPA router sẽ intercept click, không reload. */
  bar.innerHTML =
    '<a href="profile.html" class="ub-trigger ub-trigger--link" aria-label="Mở trang hồ sơ">' +
      avHtml +
      '<span class="ub-name" title="' + safeName + '">' + shortName + '</span>' +
      '<span class="ub-divider" aria-hidden="true"></span>' +
      '<span class="ub-stars" title="Tổng sao đã đạt">🌟 ' + info.stars + '</span>' +
    '</a>';
  if(slot){
    slot.innerHTML = '';
    slot.appendChild(bar);
  } else if(!bar.parentNode){
    document.body.appendChild(bar);
  } else if(bar.parentNode !== document.body){
    document.body.appendChild(bar);
  }
}

/* ───────────── Render trang Hồ sơ (profile.html) ─────────────
   Được gọi mỗi khi SPA mount route 'profile' hoặc khi profile.html
   được load trực tiếp (qua DOMContentLoaded listener bên dưới). */
function renderProfilePage(){
  var card = document.querySelector('.profile-page-card');
  if(!card) return; // không phải trang hồ sơ → skip

  var info = _readProfileInfo();

  var set = function(id, text){
    var el = document.getElementById(id);
    if(el) el.textContent = text;
  };
  var setHtml = function(id, html){
    var el = document.getElementById(id);
    if(el) el.innerHTML = html;
  };
  var show = function(id, visible){
    var el = document.getElementById(id);
    if(el) el.hidden = !visible;
  };

  var av = document.getElementById('profAvatar');
  if(av){
    if(info.isTeacher){
      av.className = 'profile-avatar-big';
      av.style.removeProperty('--avatar-ring');
      av.innerHTML = '';
      av.textContent = '👩‍🏫';
    } else {
      var sv = info.studentAvatar || _readStudentAvatarFromStorage();
      var ringEscProfile = sv.ring;
      av.style.setProperty('--avatar-ring', ringEscProfile);
      var ph2 = sv.mode === 'photo' ? _safeDataUrlForAttr(sv.photo) : '';
      if(ph2){
        av.className = 'profile-avatar-big profile-avatar-big--photo';
        av.innerHTML = '<img class="profile-avatar-img" src="' + ph2 + '" alt="" decoding="async" />';
      } else {
        av.className = 'profile-avatar-big profile-avatar-big--emoji';
        av.innerHTML = '<span class="profile-avatar-emoji-txt">' + _escapeHtml(sv.emoji) + '</span>';
      }
    }
  }

  set('profName',   info.name);
  set('profEmail',  info.email || '');
  set('profRole',   info.roleLabel);
  set('profStars',  info.stars);
  set('profBadges', info.unlocked + '/' + info.totalBadges);
  set('profStreak', info.streak);
  set('profHonor',  info.honor);
  set('profJoin',   _formatJoinDate(info.createdAt));
  set('profAge',    info.createdAt ? '(' + _formatAccountAge(info.createdAt) + ')' : '');

  if(info.isTeacher && info.classRoom){
    setHtml('profClass', _escapeHtml(info.classRoom));
    show('profClassRow', true);
  } else {
    show('profClassRow', false);
  }

  // UID hiển thị (rút gọn 6 ký tự đầu… 4 ký tự cuối)
  try{
    var u = (typeof firebase !== 'undefined' && firebase.auth) ? firebase.auth().currentUser : null;
    if(u && u.uid){
      var uid = u.uid;
      setHtml('profUid', _escapeHtml(uid.slice(0,6) + '…' + uid.slice(-4)));
      show('profUidRow', true);
    } else {
      show('profUidRow', false);
    }
  }catch(e){ show('profUidRow', false); }

  // Teacher: ẩn 2 thẻ stats không phù hợp (huy hiệu, chuỗi, vinh dự) — chỉ giữ sao.
  // Học sinh: giữ tất cả.
  var grid = document.getElementById('profStatsGrid');
  if(grid){
    grid.querySelectorAll('.profile-stat-card').forEach(function(c){ c.style.display = ''; });
    if(info.isTeacher){
      var hideClasses = ['.profile-stat-stars','.profile-stat-badges','.profile-stat-streak','.profile-stat-honor'];
      hideClasses.forEach(function(sel){
        var el = grid.querySelector(sel);
        if(el) el.style.display = 'none';
      });
    } else if((info.honor || 0) === 0){
      // Ẩn ô vinh dự khi chưa đạt
      var el = grid.querySelector('.profile-stat-honor');
      if(el) el.style.display = 'none';
    }
  }

  // Wire action buttons (idempotent)
  _wireProfileActions(card);
}

function _wireProfileActions(card){
  if(card.getAttribute('data-wired') === '1') return;
  card.setAttribute('data-wired', '1');
  var bM = document.getElementById('profBtnMusic');
  var bS = document.getElementById('profBtnSettings');
  var bL = document.getElementById('profBtnLogout');
  if(bM) bM.addEventListener('click', function(){
    if(typeof toggleMusic === 'function') toggleMusic();
  });
  if(bS) bS.addEventListener('click', function(){
    if(typeof openSettings === 'function') openSettings();
  });
  if(bL) bL.addEventListener('click', function(){
    if(typeof handleLogout === 'function') handleLogout();
  });
}

/* Mount profile khi page load trực tiếp /profile.html (không qua SPA navigation). */
document.addEventListener('DOMContentLoaded', function(){
  if(document.querySelector('.profile-page-card')) renderProfilePage();
});
