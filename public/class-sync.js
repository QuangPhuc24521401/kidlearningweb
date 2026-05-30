/**
 * CLASS-SYNC.JS — Mã lớp học sinh ↔ Firestore ↔ giáo viên
 *
 * Tra cứu mã lớp qua collection classrooms/{MALOP} (1 doc, không cần index).
 * Giáo viên đăng ký / mở trang quản lý → tạo doc classrooms tương ứng.
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

  function applyClassRoomFromUserDoc(userData){
    if(!userData) return setLocalClassRoom('');
    return setLocalClassRoom(userData.classRoom || '');
  }

  function firebaseErrorMessage(err, fallback){
    var code = err && err.code ? String(err.code) : '';
    if(code === 'permission-denied'){
      return 'Firebase từ chối quyền. Admin cần Publish file firestore.rules (có mục classrooms) trên Firebase Console.';
    }
    if(code === 'failed-precondition'){
      return 'Firestore đang tạo index — thử lại sau 1–2 phút.';
    }
    if(code === 'unavailable'){
      return 'Firebase tạm không khả dụng. Kiểm tra mạng và thử lại.';
    }
    return fallback || (err && err.message) || 'Lỗi không xác định';
  }

  /** Giáo viên: đăng ký doc classrooms/{mã} để phụ huynh tra cứu được. */
  function ensureClassroomRegistry(teacherUid){
    return new Promise(function(resolve){
      try{
        if(!teacherUid || typeof firebase === 'undefined' || !firebase.firestore){
          resolve(false);
          return;
        }
        var db = firebase.firestore();
        db.collection('users').doc(teacherUid).get()
          .then(function(userSnap){
            var u = (userSnap && userSnap.exists) ? (userSnap.data() || {}) : {};
            if(u.role !== 'teacher'){ resolve(false); return; }
            var cr = normalizeClassroom(u.classRoom || '');
            if(cr.length < 3){ resolve(false); return; }
            return db.collection('classrooms').doc(cr).set({
              classRoom: cr,
              teacherUid: teacherUid,
              teacherName: (u.displayName && String(u.displayName).trim()) || 'Giáo viên',
              updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true }).then(function(){ resolve(true); });
          })
          .catch(function(err){
            console.warn('[class-sync] ensureClassroomRegistry', err);
            resolve(false);
          });
      }catch(e){
        resolve(false);
      }
    });
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

  /** Đọc classrooms/{mã} — nhanh, không cần composite index. */
  function lookupClassroomDoc(cr){
    return firebase.firestore().collection('classrooms').doc(cr).get()
      .then(function(snap){
        if(!snap || !snap.exists) return null;
        var d = snap.data() || {};
        if(normalizeClassroom(d.classRoom || cr) !== cr) return null;
        return {
          ok: true,
          classRoom: cr,
          teacherName: (d.teacherName && String(d.teacherName).trim()) || 'Giáo viên',
          teacherUid: d.teacherUid || ''
        };
      });
  }

  /** Fallback: query users (cần rules + index; dùng khi chưa có doc classrooms). */
  function lookupTeacherByQuery(cr){
    return firebase.firestore().collection('users')
      .where('role', '==', 'teacher')
      .where('classRoom', '==', cr)
      .limit(1)
      .get()
      .then(function(snap){
        if(!snap.size) return null;
        var teacher = snap.docs[0].data() || {};
        return {
          ok: true,
          classRoom: cr,
          teacherName: (teacher.displayName && String(teacher.displayName).trim()) || 'Giáo viên',
          teacherUid: snap.docs[0].id
        };
      });
  }

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
        lookupClassroomDoc(cr)
          .then(function(hit){
            if(hit) return hit;
            return lookupTeacherByQuery(cr);
          })
          .then(function(hit){
            if(hit){
              resolve(hit);
              return;
            }
            resolve({
              ok: false,
              error: 'Không tìm thấy lớp "' + cr + '". Kiểm tra mã với giáo viên — giáo viên cần đăng nhập trang quản lý ít nhất một lần.'
            });
          })
          .catch(function(err){
            console.warn('[class-sync] verify', err);
            resolve({ ok: false, error: firebaseErrorMessage(err, 'Không kiểm tra được mã lớp.') });
          });
      }catch(e){
        resolve({ ok: false, error: 'Lỗi kiểm tra mã lớp.' });
      }
    });
  }

  function registerStudentInClassroom(classRoom, studentUid){
    var cr = normalizeClassroom(classRoom);
    if(!cr || cr.length < 3 || !studentUid) return Promise.resolve();
    try{
      return firebase.firestore().collection('classrooms').doc(cr).set({
        studentUids: firebase.firestore.FieldValue.arrayUnion(studentUid),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true }).catch(function(err){
        console.warn('[class-sync] registerStudentInClassroom', err);
      });
    }catch(e){
      return Promise.resolve();
    }
  }

  function getClassroomStudentUids(classRoom){
    var cr = normalizeClassroom(classRoom);
    if(cr.length < 3) return Promise.resolve([]);
    return firebase.firestore().collection('classrooms').doc(cr).get()
      .then(function(snap){
        var d = snap && snap.exists ? (snap.data() || {}) : {};
        var list = Array.isArray(d.studentUids) ? d.studentUids : [];
        var seen = {};
        return list.filter(function(uid){
          if(!uid || seen[uid]) return false;
          seen[uid] = true;
          return true;
        });
      })
      .catch(function(err){
        console.warn('[class-sync] getClassroomStudentUids', err);
        return [];
      });
  }

  /** Quét mọi user cùng classRoom (kể cả doc thiếu field role). */
  function findStudentUidsByClassRoom(classRoom){
    var cr = normalizeClassroom(classRoom);
    if(cr.length < 3) return Promise.resolve([]);
    return firebase.firestore().collection('users')
      .where('classRoom', '==', cr)
      .get()
      .then(function(snap){
        var uids = [];
        snap.forEach(function(doc){
          var d = doc.data() || {};
          if(d.role === 'teacher') return;
          uids.push(doc.id);
        });
        return uids;
      })
      .catch(function(err){
        console.warn('[class-sync] findStudentUidsByClassRoom', err);
        return [];
      });
  }

  /** Giáo viên: quét users cùng lớp → ghi vào classrooms.studentUids (backfill + đồng bộ). */
  function syncClassroomStudentListFromUsers(classRoom){
    var cr = normalizeClassroom(classRoom);
    if(cr.length < 3) return Promise.resolve([]);
    var db = firebase.firestore();
    return getClassroomStudentUids(cr).then(function(existing){
      var merged = existing.slice();
      function addUid(uid){
        if(uid && merged.indexOf(uid) === -1) merged.push(uid);
      }
      return findStudentUidsByClassRoom(cr).then(function(fromClass){
        fromClass.forEach(addUid);
        if(!merged.length) return [];
        var patch = {
          classRoom: cr,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
          studentUids: firebase.firestore.FieldValue.arrayUnion.apply(
            firebase.firestore.FieldValue, merged
          )
        };
        return db.collection('classrooms').doc(cr).set(patch, { merge: true })
          .then(function(){ return merged; })
          .catch(function(err){
            console.warn('[class-sync] syncClassroomStudentListFromUsers write', err);
            return merged;
          });
      });
    });
  }

  function resolveTeacherClassRoom(teacherUid){
    return new Promise(function(resolve){
      if(!teacherUid || typeof firebase === 'undefined' || !firebase.firestore){
        resolve(normalizeClassroom(localStorage.getItem('classRoom') || ''));
        return;
      }
      firebase.firestore().collection('users').doc(teacherUid).get()
        .then(function(snap){
          var data = snap && snap.exists ? (snap.data() || {}) : {};
          var cr = normalizeClassroom(data.classRoom || localStorage.getItem('classRoom') || '');
          if(cr.length >= 3) setLocalClassRoom(cr);
          resolve(cr);
        })
        .catch(function(){
          resolve(normalizeClassroom(localStorage.getItem('classRoom') || ''));
        });
    });
  }

  function saveStudentClassRoom(uid, classRoom){
    return verifyTeacherClassExists(classRoom).then(function(check){
      if(!check.ok) return check;
      if(!uid) return { ok: false, error: 'Cần đăng nhập để lưu mã lớp.' };
      try{
        return firebase.firestore().collection('users').doc(uid).get()
          .then(function(userSnap){
            var prev = userSnap && userSnap.exists ? (userSnap.data() || {}) : {};
            var patch = {
              classRoom: check.classRoom,
              classRoomUpdatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            if(prev.role !== 'teacher'){
              patch.role = 'parent';
            }
            if(!prev.email && firebase.auth().currentUser && firebase.auth().currentUser.email){
              patch.email = firebase.auth().currentUser.email;
            }
            return firebase.firestore().collection('users').doc(uid).set(patch, { merge: true });
          })
          .then(function(){
            return registerStudentInClassroom(check.classRoom, uid);
          })
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
            return { ok: false, error: firebaseErrorMessage(err, 'Không lưu được mã lớp.') };
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
    if(global.__kidClassRoomEditorWired) return;
    global.__kidClassRoomEditorWired = true;

    global.addEventListener('click', function(e){
      var btn = e.target && e.target.closest ? e.target.closest('#profClassSaveBtn') : null;
      if(!btn) return;
      var input = document.getElementById('profClassInput');
      var msg = document.getElementById('profClassMsg');
      var user = firebase.auth && firebase.auth().currentUser;
      if(!user){
        if(msg){
          msg.hidden = false;
          msg.className = 'profile-class-msg profile-class-msg--err';
          msg.textContent = 'Cần đăng nhập. Mở lại trang và đăng nhập trước.';
        }
        return;
      }
      var cr = normalizeClassroom(input && input.value);
      if(cr.length < 3){
        if(msg){
          msg.hidden = false;
          msg.className = 'profile-class-msg profile-class-msg--err';
          msg.textContent = 'Mã lớp phải dài ít nhất 3 ký tự.';
        }
        return;
      }
      btn.disabled = true;
      var orig = btn.textContent;
      btn.textContent = 'Đang lưu…';
      saveStudentClassRoom(user.uid, cr).then(function(r){
        btn.disabled = false;
        btn.textContent = orig;
        if(msg){
          msg.hidden = false;
          msg.className = 'profile-class-msg profile-class-msg--' + (r.ok ? 'ok' : 'err');
          msg.textContent = r.ok ? (r.message || 'Đã lưu mã lớp.') : (r.error || 'Không lưu được.');
        }
        if(r.ok && input) input.value = r.classRoom;
      });
    });

    global.addEventListener('input', function(e){
      if(!e.target || e.target.id !== 'profClassInput') return;
      var input = e.target;
      input.value = normalizeClassroom(input.value);
      clearTimeout(input._classHintTimer);
      input._classHintTimer = setTimeout(function(){
        refreshProfileClassHint(input.value);
      }, 450);
    });
  }

  function refreshProfileClassHint(raw){
    var teacherEl = document.getElementById('profClassTeacher');
    if(!teacherEl) return;
    var cr = normalizeClassroom(raw);
    if(cr.length < 3){
      teacherEl.hidden = true;
      teacherEl.textContent = '';
      return;
    }
    teacherEl.hidden = false;
    teacherEl.textContent = 'Đang kiểm tra mã lớp…';
    teacherEl.className = 'profile-class-teacher';
    verifyTeacherClassExists(cr).then(function(r){
      if(r.ok){
        teacherEl.textContent = '✓ Lớp ' + r.classRoom + ' — Giáo viên: ' + r.teacherName;
        teacherEl.className = 'profile-class-teacher profile-class-teacher--ok';
      } else {
        teacherEl.textContent = r.error || 'Mã lớp không hợp lệ';
        teacherEl.className = 'profile-class-teacher profile-class-teacher--err';
      }
    });
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
    ensureClassroomRegistry: ensureClassroomRegistry,
    registerStudentInClassroom: registerStudentInClassroom,
    getClassroomStudentUids: getClassroomStudentUids,
    syncClassroomStudentListFromUsers: syncClassroomStudentListFromUsers,
    findStudentUidsByClassRoom: findStudentUidsByClassRoom,
    resolveTeacherClassRoom: resolveTeacherClassRoom,
    mountClassRoomBanner: mountClassRoomBanner,
    wireProfileClassRoomEditor: wireProfileClassRoomEditor,
    refreshProfileClassHint: refreshProfileClassHint,
    initClassRoomForUser: initClassRoomForUser
  };
})(window);
