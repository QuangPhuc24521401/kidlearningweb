/**
 * CLASS-SYNC.JS — Mã lớp học sinh ↔ Firestore ↔ giáo viên
 *
 * • Phụ huynh nhập/đổi mã lớp → kiểm tra GV tồn tại → ghi users/{uid}.classRoom
 * • Đồng bộ localStorage.classRoom khi đăng nhập / pull cloud
 * • Banner nhắc khi chưa có mã lớp
 *
 * API (window.KidClassSync):
 *   normalizeClassroom, getLocalClassRoom, applyClassRoomFromUserDoc
 *   syncClassRoomFromFirestore(uid), verifyTeacherClassExists(classRoom)
 *   saveStudentClassRoom(uid, classRoom), mountClassRoomBanner()
 *   wireProfileClassRoomEditor(), initClassRoomForUser(uid)
 */
(function(global){
  'use strict';

  function normalizeClassroom(raw){
    return String(raw || '').trim().toUpperCase().replace(/\s+/g, '');
  }

  function getLocalClassRoom(){
    try{ return normalizeClassroom(localStorage.getItem('classRoom') || ''); }
    catch(e){ return ''; }
  }

  function setLocalClassRoom(classRoom){
    var cr = normalizeClassroom(classRoom);
    try{
      if(cr.length >= 3) localStorage.setItem('classRoom', cr);
      else localStorage.removeItem('classRoom');
    }catch(e){}
    return cr;
  }

  /** Áp classRoom từ Firestore users doc vào localStorage (xoá nếu trống). */
  function applyClassRoomFromUserDoc(userData){
    if(!userData) return setLocalClassRoom('');
    return setLocalClassRoom(userData.classRoom || '');
  }

  function syncClassRoomFromFirestore(uid){
    return new Promise(function(resolve){
      try{
        if(!uid || typeof firebase === 'undefined' || !firebase.firestore){
          resolve(getLocalClassRoom());
          return;
        }
        firebase.firestore().collection('users').doc(uid).get()
          .then(function(snap){
            var data = snap && snap.exists ? snap.data() : null;
            resolve(applyClassRoomFromUserDoc(data));
          })
          .catch(function(err){
            console.warn('[class-sync] pull', err);
            resolve(getLocalClassRoom());
          });
      }catch(e){
        resolve(getLocalClassRoom());
      }
    });
  }

  /** Kiểm tra có giáo viên nào quản lý mã lớp này không. */
  function verifyTeacherClassExists(classRoom){
    var cr = normalizeClassroom(classRoom);
    if(cr.length < 3){
      return Promise.resolve({ ok: false, error: 'Mã lớp phải dài ít nhất 3 ký tự (vd: LOPA2024).' });
    }
    return new Promise(function(resolve){
      try{
        if(typeof firebase === 'undefined' || !firebase.firestore){
          resolve({ ok: false, error: 'Chưa kết nối Firebase.' });
          return;
        }
        firebase.firestore().collection('users')
          .where('role', '==', 'teacher')
          .where('classRoom', '==', cr)
          .limit(1)
          .get()
          .then(function(snap){
            if(!snap.size){
              resolve({
                ok: false,
                error: 'Không tìm thấy lớp "' + cr + '". Hãy kiểm tra lại mã với giáo viên.'
              });
              return;
            }
            var teacher = snap.docs[0].data() || {};
            resolve({
              ok: true,
              classRoom: cr,
              teacherName: (teacher.displayName && String(teacher.displayName).trim()) || 'Giáo viên',
              teacherUid: snap.docs[0].id
            });
          })
          .catch(function(err){
            console.warn('[class-sync] verify', err);
            resolve({ ok: false, error: 'Không kiểm tra được mã lớp. Thử lại sau.' });
          });
      }catch(e){
        resolve({ ok: false, error: 'Lỗi kiểm tra mã lớp.' });
      }
    });
  }

  /** Lưu mã lớp cho học sinh (phụ huynh) sau khi xác minh GV. */
  function saveStudentClassRoom(uid, classRoom){
    return verifyTeacherClassExists(classRoom).then(function(check){
      if(!check.ok) return check;
      if(!uid) return { ok: false, error: 'Cần đăng nhập để lưu mã lớp.' };
      try{
        return firebase.firestore().collection('users').doc(uid).set({
          classRoom: check.classRoom,
          classRoomUpdatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true })
          .then(function(){
            setLocalClassRoom(check.classRoom);
            mountClassRoomBanner();
            if(typeof global.mountUserBar === 'function') global.mountUserBar();
            if(typeof global.renderProfilePage === 'function') global.renderProfilePage();
            return {
              ok: true,
              classRoom: check.classRoom,
              teacherName: check.teacherName,
              message: 'Đã vào lớp ' + check.classRoom + ' (GV: ' + check.teacherName + '). Giáo viên sẽ thấy bé trên trang quản lý.'
            };
          })
          .catch(function(err){
            console.warn('[class-sync] save', err);
            return { ok: false, error: 'Không lưu được mã lớp. Kiểm tra kết nối hoặc quyền Firestore.' };
          });
      }catch(e){
        return { ok: false, error: 'Lỗi lưu mã lớp.' };
      }
    });
  }

  function mountClassRoomBanner(){
    var role = 'parent';
    try{ role = localStorage.getItem('userRole') || 'parent'; }catch(e){}
    if(role === 'teacher') return;

    var cr = getLocalClassRoom();
    var existing = document.getElementById('classRoomBanner');
    if(cr.length >= 3){
      if(existing) existing.remove();
      return;
    }

    var root = document.getElementById('page-root');
    if(!root) return;

    if(!existing){
      existing = document.createElement('div');
      existing.id = 'classRoomBanner';
      existing.className = 'classroom-banner';
      existing.setAttribute('role', 'alert');
      root.insertBefore(existing, root.firstChild);
    }

    existing.innerHTML =
      '<div class="classroom-banner-inner">' +
        '<span class="classroom-banner-ico" aria-hidden="true">🏫</span>' +
        '<div class="classroom-banner-text">' +
          '<strong>Chưa có mã lớp</strong>' +
          '<span>Nhập mã lớp giáo viên cung cấp để đồng bộ tiến độ với lớp học.</span>' +
        '</div>' +
        '<a href="profile.html" class="classroom-banner-btn">Thêm mã lớp</a>' +
      '</div>';
  }

  function wireProfileClassRoomEditor(){
    var box = document.getElementById('profClassBox');
    if(!box || box.dataset.wired === '1') return;
    box.dataset.wired = '1';

    var input = document.getElementById('profClassInput');
    var btn = document.getElementById('profClassSaveBtn');
    var msg = document.getElementById('profClassMsg');
    var teacherEl = document.getElementById('profClassTeacher');

    function showMsg(type, text){
      if(!msg) return;
      msg.hidden = false;
      msg.className = 'profile-class-msg profile-class-msg--' + type;
      msg.textContent = text;
    }

    function refreshTeacherHint(){
      if(!teacherEl || !input) return;
      var cr = normalizeClassroom(input.value);
      if(cr.length < 3){
        teacherEl.hidden = true;
        teacherEl.textContent = '';
        return;
      }
      verifyTeacherClassExists(cr).then(function(r){
        teacherEl.hidden = false;
        if(r.ok){
          teacherEl.textContent = '✓ Lớp ' + r.classRoom + ' — Giáo viên: ' + r.teacherName;
          teacherEl.className = 'profile-class-teacher profile-class-teacher--ok';
        } else {
          teacherEl.textContent = r.error || 'Mã lớp không hợp lệ';
          teacherEl.className = 'profile-class-teacher profile-class-teacher--err';
        }
      });
    }

    if(input){
      input.addEventListener('focus', function(){ input.dataset.userEditing = '1'; });
      input.addEventListener('blur', function(){ delete input.dataset.userEditing; });
      input.addEventListener('input', function(){
        input.value = normalizeClassroom(input.value);
        clearTimeout(input._classHintTimer);
        input._classHintTimer = setTimeout(refreshTeacherHint, 450);
      });
    }

    if(btn) btn.addEventListener('click', function(){
      var user = firebase.auth && firebase.auth().currentUser;
      if(!user){ showMsg('err', 'Cần đăng nhập.'); return; }
      var cr = normalizeClassroom(input && input.value);
      if(cr.length < 3){ showMsg('err', 'Mã lớp phải dài ít nhất 3 ký tự.'); return; }
      btn.disabled = true;
      var orig = btn.textContent;
      btn.textContent = 'Đang lưu…';
      saveStudentClassRoom(user.uid, cr).then(function(r){
        btn.disabled = false;
        btn.textContent = orig;
        if(r.ok){
          showMsg('ok', r.message || 'Đã lưu mã lớp.');
          if(input) input.value = r.classRoom;
        } else {
          showMsg('err', r.error || 'Không lưu được.');
        }
      });
    });

    if(input && input.value) refreshTeacherHint();
  }

  function initClassRoomForUser(uid){
    if(!uid) return Promise.resolve('');
    var role = 'parent';
    try{ role = localStorage.getItem('userRole') || 'parent'; }catch(e){}
    if(role === 'teacher') return Promise.resolve(getLocalClassRoom());
    return syncClassRoomFromFirestore(uid).then(function(cr){
      mountClassRoomBanner();
      return cr;
    });
  }

  global.KidClassSync = {
    normalizeClassroom: normalizeClassroom,
    getLocalClassRoom: getLocalClassRoom,
    setLocalClassRoom: setLocalClassRoom,
    applyClassRoomFromUserDoc: applyClassRoomFromUserDoc,
    syncClassRoomFromFirestore: syncClassRoomFromFirestore,
    verifyTeacherClassExists: verifyTeacherClassExists,
    saveStudentClassRoom: saveStudentClassRoom,
    mountClassRoomBanner: mountClassRoomBanner,
    wireProfileClassRoomEditor: wireProfileClassRoomEditor,
    initClassRoomForUser: initClassRoomForUser
  };
})(window);
