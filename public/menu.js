/* ═══════════════════════════════════════════════════
   MENU.JS — Điều hướng, auth guard, tiến độ, hồ sơ

   Load trên các trang shell: index, progress, pvp, profile.
   Không load trên trang bài học (lessons/ten-mon/index.html).

   Chức năng chính:
   • goLesson(type)     — chuyển sang lessons/<type>/index.html
   • handleLogout()     — xoá cache local + Firebase signOut
   • Auth guard (IIFE) — chưa đăng nhập → auth/login.html;
                         phụ huynh chưa setup học sinh → student-setup.html
   • renderProgressBadges() — badge trạng thái trên thẻ môn học (menu grid)
   • mountUserBar()     — avatar + tên + tổng sao (góc phải, link profile)
   • renderProfilePage() — render nội dung trang profile.html (SPA hoặc direct)
   • resetProgress()    — xoá tiến độ local + Firestore (có confirm)
   • fetchProgressFromCloud(uid) — gọi KidProgressSync.pullFromCloud

   Phụ thuộc: firebase.js, progress-sync.js, class-sync.js, achievements.js, shared.js
═══════════════════════════════════════════════════ */

/** Mở trang danh sách chủ đề của một môn học. type = nhan_biet | tu_duy | … */
function goLesson(type){
  try{ if(typeof playPop === 'function') playPop(); }catch(e){}
  // Vào danh sách chủ đề (Màu sắc, Hình dạng, …) — mỗi chủ đề có tiến độ riêng.
  window.location.href = 'lessons/' + type + '/index.html';
}
/** Mở game phiêu lưu học tập (platformer). */
function goGame(){
  try{ if(typeof playPop === 'function') playPop(); }catch(e){}
  window.location.href = 'game.html';
}
/** Đăng xuất: xoá cache avatar/role local rồi redirect login. */
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

/* Auth guard + hiển thị shell sau khi xác thực Firebase.
   Ẩn trang (visibility:hidden) cho đến khi auth xong; timeout 4s fallback. */
(function(){
  var revealed = false;
  var shellPainted = false;

  function reveal(){
    if(!revealed){
      revealed = true;
      document.documentElement.style.visibility='';
    }
  }

  /** Vẽ tiến độ + user bar — gọi ngay, không chờ Firestore (tránh treo UI). */
  function paintShellUI(){
    if(shellPainted) return;
    shellPainted = true;
    reveal();
    renderProgressBadges();
    mountUserBar();
    if(typeof KidClassSync !== 'undefined' && KidClassSync.mountClassRoomBanner){
      KidClassSync.mountClassRoomBanner();
    }
    if(typeof renderProfilePage === 'function') renderProfilePage();
  }

  function maybeGuardParentOnboarding(user){
    if(!user || !firebase.firestore) return;
    var pathname = '';
    try{
      pathname = String(window.location.pathname || '').replace(/\\/g,'/').toLowerCase();
    }catch(e){}
    if(pathname.indexOf('student-setup') !== -1) return;

    firebase.firestore().collection('users').doc(user.uid).get()
      .then(function(snap){
        var data = snap && snap.exists ? snap.data() : null;
        var role = (data && data.role) ? data.role : 'parent';
        if(typeof KidClassSync !== 'undefined' && KidClassSync.applyClassRoomFromUserDoc){
          KidClassSync.applyClassRoomFromUserDoc(data);
          if(typeof KidClassSync.mountClassRoomBanner === 'function'){
            KidClassSync.mountClassRoomBanner();
          }
        }
        if(role === 'parent' && data && data.studentProfileComplete === false){
          window.location.href = 'auth/student-setup.html';
        }
      })
      .catch(function(err){ console.warn('[menu auth guard]', err); });
  }

  try{
    if(firebase.apps.length>0 && firebase.app().options.apiKey && !firebase.app().options.apiKey.includes('YOUR_')){
      firebase.auth().onAuthStateChanged(function(user){
        paintShellUI();
        if(user){
          maybeGuardParentOnboarding(user);
          if(typeof KidClassSync !== 'undefined' && KidClassSync.initClassRoomForUser){
            KidClassSync.initClassRoomForUser(user.uid);
          }
          fetchProgressFromCloud(user.uid);
        }
      });
    } else {
      paintShellUI();
    }
  }catch(e){
    paintShellUI();
  }

  /* Fallback: nếu Firebase/auth chậm, vẫn phải vẽ UI (không chỉ reveal trống). */
  setTimeout(paintShellUI, 4000);
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
  if(!uid || typeof KidProgressSync === 'undefined' || !KidProgressSync.pullFromCloud) return;
  KidProgressSync.pullFromCloud(uid).then(function(result){
    result = result || {};
    if(result.userData){
      applyStudentAvatarFromUserDoc(result.userData);
      try{
        if(result.userData.displayName) localStorage.setItem('userDisplayName', result.userData.displayName);
        if(typeof KidClassSync !== 'undefined' && KidClassSync.applyClassRoomFromUserDoc){
          KidClassSync.applyClassRoomFromUserDoc(result.userData);
        } else if(result.userData.classRoom){
          localStorage.setItem('classRoom', result.userData.classRoom);
        }
      }catch(err){}
      mountUserBar();
      if(typeof KidClassSync !== 'undefined' && KidClassSync.mountClassRoomBanner){
        KidClassSync.mountClassRoomBanner();
      }
      if(typeof renderProfilePage === 'function') renderProfilePage();
    }
    if(result.achievements && typeof mergeAchievementsFromCloud === 'function'){
      mergeAchievementsFromCloud(result.achievements);
    }
    if(typeof recomputeAchievementsAfterCloudMerge === 'function') recomputeAchievementsAfterCloudMerge();
    renderProgressBadges();
    if(typeof flushAchievementsToCloud === 'function') flushAchievementsToCloud();
  });
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

function _profileViewUid(){
  try{
    var p = new URLSearchParams(location.search);
    return (p.get('uid') || '').trim();
  }catch(e){ return ''; }
}

function _applyProfileInfo(info, isOther){
  var set = function(id, text){
    var el = document.getElementById(id);
    if(el) el.textContent = text;
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
      if(isOther && info.avatarEmoji){
        sv = { mode: 'emoji', emoji: info.avatarEmoji, ring: info.avatarRing || '#fbbf24' };
      }
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

  set('profName', info.name);
  set('profEmail', isOther ? '' : (info.email || ''));
  set('profRole', info.roleLabel);
  set('profStars', info.stars);
  set('profBadges', info.unlocked + '/' + info.totalBadges);
  set('profStreak', info.streak);
  set('profHonor', info.honor);
  set('profJoin', _formatJoinDate(info.createdAt));
  set('profAge', info.createdAt ? '(' + _formatAccountAge(info.createdAt) + ')' : '');

  show('profNameEditBtn', !info.isTeacher && !isOther);
  show('profClassBox', !isOther && !info.isTeacher);
  show('profBtnSettings', !isOther);
  show('profBtnLogout', !isOther);
  show('profSocialActions', !!isOther);

  if(isOther && typeof KidSocial !== 'undefined'){
    var btn = document.getElementById('profFollowBtn');
    if(btn){
      KidSocial.isFollowing(info.viewUid).then(function(f){
        btn.textContent = f ? '✓ Đang theo dõi' : '👀 Theo dõi';
        btn.disabled = !!f;
        btn.onclick = function(){
          if(f) return;
          KidSocial.follow(info.viewUid).then(function(){
            btn.textContent = '✓ Đang theo dõi';
            btn.disabled = true;
          }).catch(function(e){ alert(e.message); });
        };
      });
    }
  }

  if(info.isTeacher && info.classRoom){
    set('profClass', info.classRoom);
    show('profClassRow', true);
  } else if(!isOther && !info.isTeacher){
    show('profClassRow', false);
  } else if(isOther && info.classRoom){
    set('profClass', info.classRoom);
    show('profClassRow', true);
  } else {
    show('profClassRow', false);
  }

  show('profUidRow', false);

  var grid = document.getElementById('profStatsGrid');
  if(grid){
    grid.querySelectorAll('.profile-stat-chip').forEach(function(c){ c.style.display = ''; });
    if(info.isTeacher){
      ['.profile-stat-badges','.profile-stat-streak','.profile-stat-honor'].forEach(function(sel){
        var el = grid.querySelector(sel);
        if(el) el.style.display = 'none';
      });
    }
  }
}

function renderOtherProfile(uid){
  var card = document.querySelector('.profile-page-card');
  if(!card || typeof KidSocial === 'undefined') return;
  KidSocial.getPublicProfile(uid).then(function(prof){
    return KidSocial.getUserAchievements(uid).then(function(ach){
      _applyProfileInfo({
        viewUid: uid,
        name: prof.displayName,
        isTeacher: prof.role === 'teacher',
        roleLabel: prof.role === 'teacher' ? 'Giáo viên' : 'Học sinh',
        classRoom: prof.classRoom,
        stars: ach.stars,
        unlocked: ach.badges,
        totalBadges: window.ACHIEVEMENT_DEFS ? window.ACHIEVEMENT_DEFS.length : 0,
        streak: 0,
        honor: 0,
        createdAt: null,
        avatarEmoji: prof.avatarEmoji,
        avatarRing: prof.avatarRing
      }, true);
    });
  }).catch(function(err){
    var set = function(id, text){ var el = document.getElementById(id); if(el) el.textContent = text; };
    set('profName', 'Không tìm thấy');
    set('profRole', err.message || 'Lỗi tải hồ sơ');
  });
}

/* ───────────── Render trang Hồ sơ (profile.html) ─────────────
   Được gọi mỗi khi SPA mount route 'profile' hoặc khi profile.html
   được load trực tiếp (qua DOMContentLoaded listener bên dưới). */
function renderProfilePage(){
  var card = document.querySelector('.profile-page-card');
  if(!card) return; // không phải trang hồ sơ → skip

  var viewUid = _profileViewUid();
  try{
    var me = firebase.auth && firebase.auth().currentUser;
    if(viewUid && me && viewUid !== me.uid){
      renderOtherProfile(viewUid);
      return;
    }
  }catch(e){}

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

  show('profNameEditBtn', !info.isTeacher);

  if(info.isTeacher && info.classRoom){
    set('profClass', info.classRoom);
    show('profClassRow', true);
    show('profClassBox', false);
  } else if(!info.isTeacher){
    show('profClassBox', true);
    var cr = info.classRoom;
    if(typeof KidClassSync !== 'undefined' && KidClassSync.getLocalClassRoom){
      cr = KidClassSync.getLocalClassRoom() || cr;
    }
    if(cr){
      set('profClass', cr);
      show('profClassRow', true);
    } else {
      show('profClassRow', false);
    }
    var classInput = document.getElementById('profClassInput');
    if(classInput && classInput.dataset.userEditing !== '1'){
      classInput.value = cr || '';
    }
    if(typeof KidClassSync !== 'undefined'){
      if(typeof KidClassSync.wireProfileClassRoomEditor === 'function'){
        KidClassSync.wireProfileClassRoomEditor();
      }
      if(cr && typeof KidClassSync.verifyTeacherClassExists === 'function'){
        KidClassSync.verifyTeacherClassExists(cr).then(function(r){
          var teacherEl = document.getElementById('profClassTeacher');
          if(!teacherEl) return;
          if(r.ok){
            teacherEl.hidden = false;
            teacherEl.textContent = '✓ Lớp ' + r.classRoom + ' — Giáo viên: ' + r.teacherName;
            teacherEl.className = 'profile-class-teacher profile-class-teacher--ok';
          } else {
            teacherEl.hidden = false;
            teacherEl.textContent = r.error || 'Mã lớp chưa được xác minh';
            teacherEl.className = 'profile-class-teacher profile-class-teacher--err';
          }
        });
      }
    }
  } else {
    show('profClassRow', false);
    show('profClassBox', false);
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
    grid.querySelectorAll('.profile-stat-chip').forEach(function(c){ c.style.display = ''; });
    if(info.isTeacher){
      var hideClasses = ['.profile-stat-stars','.profile-stat-badges','.profile-stat-streak','.profile-stat-honor'];
      hideClasses.forEach(function(sel){
        var el = grid.querySelector(sel);
        if(el) el.style.display = 'none';
      });
    } else if((info.honor || 0) === 0){
      var el = grid.querySelector('.profile-stat-honor');
      if(el) el.style.display = 'none';
    }
  }

  // Wire editor mã lớp (một lần, dùng event delegation — hoạt động cả SPA)
  if(typeof KidClassSync !== 'undefined'){
    if(typeof KidClassSync.wireProfileClassRoomEditor === 'function'){
      KidClassSync.wireProfileClassRoomEditor();
    }
  }

  // Wire action buttons (idempotent)
  _wireProfileActions(card);
}

function openProfNameModal(){
  var modal = document.getElementById('profNameModal');
  var input = document.getElementById('profNameInput');
  var msg = document.getElementById('profNameMsg');
  if(!modal) return;
  var savedName = (localStorage.getItem('userDisplayName') || '').trim();
  var nameEl = document.getElementById('profName');
  var current = savedName || (nameEl ? nameEl.textContent.trim() : '');
  if(input) input.value = (current === 'Bé học sinh' ? '' : current);
  if(msg){ msg.hidden = true; msg.textContent = ''; }
  modal.hidden = false;
  modal.classList.add('open');
  document.body.style.overflow = 'hidden';
  setTimeout(function(){ if(input){ input.focus(); input.select(); } }, 60);
}

function closeProfNameModal(){
  var modal = document.getElementById('profNameModal');
  if(!modal) return;
  modal.classList.remove('open');
  modal.hidden = true;
  document.body.style.overflow = '';
}

function saveStudentDisplayName(rawName){
  return new Promise(function(resolve){
    var name = String(rawName || '').trim().replace(/\s+/g, ' ');
    if(name.length < 2){
      resolve({ ok: false, error: 'Tên cần ít nhất 2 ký tự.' });
      return;
    }
    if(name.length > 32){
      resolve({ ok: false, error: 'Tên tối đa 32 ký tự.' });
      return;
    }
    if(typeof firebase === 'undefined' || !firebase.auth || !firebase.firestore){
      resolve({ ok: false, error: 'Firebase chưa sẵn sàng.' });
      return;
    }
    var user = firebase.auth().currentUser;
    if(!user){
      resolve({ ok: false, error: 'Cần đăng nhập để lưu tên.' });
      return;
    }
    var patch = {
      displayName: name,
      nickname: name,
      childName: name,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    var authUpdate = user.updateProfile ? user.updateProfile({ displayName: name }) : Promise.resolve();
    authUpdate
      .then(function(){
        return firebase.firestore().collection('users').doc(user.uid).set(patch, { merge: true });
      })
      .then(function(){
        try{ localStorage.setItem('userDisplayName', name); }catch(e){}
        if(typeof mountUserBar === 'function') mountUserBar();
        if(typeof renderProfilePage === 'function') renderProfilePage();
        closeProfNameModal();
        resolve({ ok: true, message: 'Đã lưu tên: ' + name });
      })
      .catch(function(err){
        console.warn('[profile] saveStudentDisplayName', err);
        resolve({ ok: false, error: (err && err.message) || 'Không lưu được tên.' });
      });
  });
}

function _wireProfileActions(card){
  if(card.getAttribute('data-wired') === '1') return;
  card.setAttribute('data-wired', '1');
  var bS = document.getElementById('profBtnSettings');
  var bL = document.getElementById('profBtnLogout');
  if(bS) bS.addEventListener('click', function(){
    if(typeof openSettings === 'function') openSettings();
  });
  if(bL) bL.addEventListener('click', function(){
    if(typeof handleLogout === 'function') handleLogout();
  });

  var editBtn = document.getElementById('profNameEditBtn');
  if(editBtn && !editBtn.dataset.wired){
    editBtn.dataset.wired = '1';
    editBtn.addEventListener('click', openProfNameModal);
  }

  if(!window.__profNameModalWired){
    window.__profNameModalWired = true;
    document.getElementById('profNameModalClose')?.addEventListener('click', closeProfNameModal);
    document.getElementById('profNameCancelBtn')?.addEventListener('click', closeProfNameModal);
    document.querySelectorAll('[data-prof-modal-close]').forEach(function(el){
      el.addEventListener('click', closeProfNameModal);
    });
    document.addEventListener('keydown', function(e){
      if(e.key === 'Escape'){
        var modal = document.getElementById('profNameModal');
        if(modal && !modal.hidden) closeProfNameModal();
      }
    });
  }

  var nameInput = document.getElementById('profNameInput');
  if(nameInput && !nameInput.dataset.keyWired){
    nameInput.dataset.keyWired = '1';
    nameInput.addEventListener('keydown', function(e){
      if(e.key === 'Enter'){
        var saveBtn = document.getElementById('profNameSaveBtn');
        if(saveBtn) saveBtn.click();
      }
    });
  }

  var nameBtn = document.getElementById('profNameSaveBtn');
  if(nameBtn && !nameBtn.dataset.wired){
    nameBtn.dataset.wired = '1';
    nameBtn.addEventListener('click', function(){
      var input = document.getElementById('profNameInput');
      var msg = document.getElementById('profNameMsg');
      var val = input ? input.value : '';
      nameBtn.disabled = true;
      var orig = nameBtn.textContent;
      nameBtn.textContent = 'Đang lưu…';
      saveStudentDisplayName(val).then(function(r){
        nameBtn.disabled = false;
        nameBtn.textContent = orig;
        if(msg){
          msg.hidden = false;
          msg.className = 'profile-field-msg profile-field-msg--' + (r.ok ? 'ok' : 'err');
          msg.textContent = r.ok ? (r.message || 'Đã lưu tên.') : (r.error || 'Không lưu được.');
        }
        if(r.ok && input) input.value = val.trim().replace(/\s+/g, ' ');
      });
    });
  }
}

/* Mount profile khi page load trực tiếp /profile.html (không qua SPA navigation). */
document.addEventListener('DOMContentLoaded', function(){
  if(typeof KidClassSync !== 'undefined' && KidClassSync.wireProfileClassRoomEditor){
    KidClassSync.wireProfileClassRoomEditor();
  }
  if(document.querySelector('.profile-page-card')) renderProfilePage();
});
