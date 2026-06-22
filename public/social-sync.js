/* ═══════════════════════════════════════════════════
   SOCIAL-SYNC.JS — Cộng đồng: bài đăng, like, comment, follow
═══════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  function db() {
    return global.firebase && global.firebase.firestore ? global.firebase.firestore() : null;
  }

  function authUser() {
    return global.firebase && global.firebase.auth ? global.firebase.auth().currentUser : null;
  }

  function whenAuthReady() {
    return new Promise(function (resolve) {
      if (!global.firebase || !global.firebase.auth) {
        resolve(null);
        return;
      }
      var user = firebase.auth().currentUser;
      if (user) {
        resolve(user);
        return;
      }
      var unsub = firebase.auth().onAuthStateChanged(function (u) {
        if (typeof unsub === 'function') unsub();
        resolve(u || null);
      });
    });
  }

  function friendlyFirestoreError(err) {
    var code = err && err.code ? String(err.code) : '';
    var msg = err && err.message ? String(err.message) : 'Lỗi không xác định';
    if (code === 'permission-denied' || /insufficient permissions/i.test(msg)) {
      return 'Firestore chưa cho phép Cộng đồng. Vào Firebase Console → Firestore → Rules, dán file firestore.rules rồi bấm Publish (hoặc chạy: npm run deploy:rules).';
    }
    return msg;
  }

  function ts() {
    return firebase.firestore.FieldValue.serverTimestamp();
  }

  function esc(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function timeAgo(ms) {
    if (!ms) return '';
    var diff = Date.now() - ms;
    if (diff < 60000) return 'Vừa xong';
    if (diff < 3600000) return Math.floor(diff / 60000) + ' phút';
    if (diff < 86400000) return Math.floor(diff / 3600000) + ' giờ';
    return Math.floor(diff / 86400000) + ' ngày';
  }

  function docTime(doc) {
    var t = doc.createdAt;
    if (t && t.toMillis) return t.toMillis();
    if (typeof t === 'number') return t;
    return 0;
  }

  function profileFromLocal(uid) {
    var user = authUser();
    var name = '';
    try { name = (localStorage.getItem('userDisplayName') || '').trim(); } catch (e) {}
    if (!name && user && user.displayName) name = user.displayName;
    if (!name) name = 'Bé học sinh';
    var role = 'parent';
    try { role = localStorage.getItem('userRole') || 'parent'; } catch (e) {}
    var classRoom = '';
    try { classRoom = localStorage.getItem('classRoom') || ''; } catch (e) {}
    return {
      uid: uid,
      displayName: name,
      role: role,
      classRoom: classRoom,
      avatarEmoji: '',
      avatarMode: 'emoji',
      avatarRing: '#fbbf24'
    };
  }

  /** Hồ sơ công khai (cùng lớp hoặc đã đăng nhập). */
  function getPublicProfile(uid) {
    var firestore = db();
    if (!firestore || !uid) return Promise.reject(new Error('Thiếu uid'));
    return firestore.collection('users').doc(uid).get().then(function (snap) {
      if (!snap.exists) return profileFromLocal(uid);
      var d = snap.data();
      var local = profileFromLocal(uid);
      return {
        uid: uid,
        displayName: d.displayName || d.nickname || d.childName || local.displayName,
        role: d.role || local.role,
        classRoom: d.classRoom || local.classRoom,
        avatarEmoji: d.avatarEmoji || '',
        avatarMode: d.avatarMode || 'emoji',
        avatarRing: d.avatarRing || '#fbbf24'
      };
    }).catch(function () {
      return profileFromLocal(uid);
    });
  }

  /** Tạo doc users tối thiểu nếu chưa có (tránh lỗi khi mới đăng ký). */
  function ensureUserDoc() {
    return whenAuthReady().then(function (user) {
      if (!user) return null;
      var ref = db().collection('users').doc(user.uid);
      return ref.get().then(function (snap) {
        if (snap.exists) return snap.data();
        var prof = profileFromLocal(user.uid);
        var patch = {
          displayName: prof.displayName,
          nickname: prof.displayName,
          role: prof.role,
          classRoom: prof.classRoom || '',
          updatedAt: ts()
        };
        return ref.set(patch, { merge: true }).then(function () { return patch; });
      });
    });
  }

  /** Tiến độ / thành tựu tóm tắt từ learning_progress. */
  function getUserAchievements(uid) {
    var firestore = db();
    if (!firestore) return Promise.resolve({ stars: 0, badges: 0, gameLevels: 0 });
    return firestore.collection('learning_progress').doc(uid).get().then(function (snap) {
      var prog = snap.exists && snap.data().progress ? snap.data().progress : {};
      var stars = 0, badges = 0, gameLevels = 0;
      Object.keys(prog).forEach(function (sub) {
        var entry = prog[sub];
        if (!entry || !entry.topics) return;
        Object.values(entry.topics).forEach(function (t) {
          stars += t.totalStars || 0;
          if ((t.completedRuns || 0) > 0) {
            if (sub === 'game') gameLevels += 1;
            else badges += 1;
          }
        });
      });
      return { stars: stars, badges: badges, gameLevels: gameLevels };
    }).catch(function () { return { stars: 0, badges: 0, gameLevels: 0 }; });
  }

  function isFollowing(targetUid) {
    var user = authUser();
    if (!user || !targetUid || user.uid === targetUid) return Promise.resolve(false);
    return db().collection('follows').doc(user.uid).collection('following').doc(targetUid).get()
      .then(function (s) { return s.exists; })
      .catch(function () { return false; });
  }

  function follow(targetUid) {
    var user = authUser();
    if (!user) return Promise.reject(new Error('Cần đăng nhập'));
    if (user.uid === targetUid) return Promise.reject(new Error('Không thể theo dõi chính mình'));
    var batch = db().batch();
    var myRef = db().collection('follows').doc(user.uid).collection('following').doc(targetUid);
    var theirRef = db().collection('follows').doc(targetUid).collection('followers').doc(user.uid);
    batch.set(myRef, { targetUid: targetUid, createdAt: ts() });
    batch.set(theirRef, { followerUid: user.uid, createdAt: ts() });
    return batch.commit();
  }

  function unfollow(targetUid) {
    var user = authUser();
    if (!user) return Promise.reject(new Error('Cần đăng nhập'));
    var batch = db().batch();
    batch.delete(db().collection('follows').doc(user.uid).collection('following').doc(targetUid));
    batch.delete(db().collection('follows').doc(targetUid).collection('followers').doc(user.uid));
    return batch.commit();
  }

  function listFollowingUids(uid) {
    return db().collection('follows').doc(uid).collection('following').get()
      .then(function (snap) { return snap.docs.map(function (d) { return d.id; }); })
      .catch(function () { return []; });
  }

  function createPost(opts) {
    return whenAuthReady().then(function (user) {
      if (!user) return Promise.reject(new Error('Cần đăng nhập'));
      opts = opts || {};
      var text = String(opts.text || '').trim();
      if (!text) return Promise.reject(new Error('Nhập nội dung bài đăng'));
      return ensureUserDoc().then(function () {
        return getPublicProfile(user.uid);
      }).then(function (prof) {
        var payload = {
          authorUid: user.uid,
          authorName: prof.displayName,
          authorRole: prof.role,
          classRoom: prof.classRoom || '',
          text: text.slice(0, 500),
          type: opts.type || 'text',
          likes: [],
          likeCount: 0,
          commentCount: 0,
          createdAt: ts()
        };
        if (opts.shareMeta) payload.shareMeta = opts.shareMeta;
        return db().collection('posts').add(payload);
      });
    }).catch(function (err) {
      return Promise.reject(new Error(friendlyFirestoreError(err)));
    });
  }

  function toggleLike(postId) {
    var user = authUser();
    if (!user) return Promise.reject(new Error('Cần đăng nhập'));
    var ref = db().collection('posts').doc(postId);
    return db().runTransaction(function (tx) {
      return tx.get(ref).then(function (snap) {
        if (!snap.exists) throw new Error('Bài đăng không tồn tại');
        var d = snap.data();
        var likes = Array.isArray(d.likes) ? d.likes.slice() : [];
        var idx = likes.indexOf(user.uid);
        if (idx >= 0) likes.splice(idx, 1);
        else likes.push(user.uid);
        tx.update(ref, { likes: likes, likeCount: likes.length });
        return likes.indexOf(user.uid) >= 0;
      });
    });
  }

  function addComment(postId, text) {
    var user = authUser();
    if (!user) return Promise.reject(new Error('Cần đăng nhập'));
    text = String(text || '').trim();
    if (!text) return Promise.reject(new Error('Nhập bình luận'));
    return getPublicProfile(user.uid).then(function (prof) {
      var postRef = db().collection('posts').doc(postId);
      var cRef = postRef.collection('comments').doc();
      var batch = db().batch();
      batch.set(cRef, {
        authorUid: user.uid,
        authorName: prof.displayName,
        text: text.slice(0, 300),
        createdAt: ts()
      });
      batch.update(postRef, { commentCount: firebase.firestore.FieldValue.increment(1) });
      return batch.commit().then(function () { return cRef.id; });
    });
  }

  function listComments(postId) {
    return db().collection('posts').doc(postId).collection('comments')
      .orderBy('createdAt', 'asc').limit(50).get()
      .then(function (snap) {
        return snap.docs.map(function (d) {
          var x = d.data();
          return {
            id: d.id,
            authorUid: x.authorUid,
            authorName: x.authorName,
            text: x.text,
            timeAgo: timeAgo(docTime(x))
          };
        });
      });
  }

  /** feed: 'class' | 'following' | 'all' */
  function listPosts(feed) {
    return whenAuthReady().then(function (user) {
      if (!user) return [];
      feed = feed || 'class';
      return listPostsInner(user, feed);
    }).catch(function (err) {
      console.warn('[KidSocial] listPosts', err);
      return [];
    });
  }

  function listPostsInner(user, feed) {

    function mapDocs(docs) {
      return docs.map(function (d) {
        var x = d.data();
        var likes = Array.isArray(x.likes) ? x.likes : [];
        return {
          id: d.id,
          authorUid: x.authorUid,
          authorName: x.authorName,
          authorRole: x.authorRole,
          classRoom: x.classRoom,
          text: x.text,
          type: x.type,
          shareMeta: x.shareMeta,
          likeCount: x.likeCount || likes.length,
          liked: likes.indexOf(user.uid) >= 0,
          commentCount: x.commentCount || 0,
          timeAgo: timeAgo(docTime(x)),
          createdMs: docTime(x)
        };
      }).sort(function (a, b) { return b.createdMs - a.createdMs; });
    }

    if (feed === 'following') {
      return listFollowingUids(user.uid).then(function (uids) {
        if (!uids.length) return [];
        uids = uids.slice(0, 10);
        var reads = uids.map(function (uid) {
          return db().collection('posts').where('authorUid', '==', uid).limit(5).get();
        });
        return Promise.all(reads).then(function (snaps) {
          var docs = [];
          snaps.forEach(function (s) { docs = docs.concat(s.docs); });
          return mapDocs(docs).slice(0, 30);
        });
      });
    }

    if (feed === 'class') {
      return getPublicProfile(user.uid).then(function (prof) {
        if (!prof.classRoom) return listPostsInner(user, 'all');
        return db().collection('posts')
          .where('classRoom', '==', prof.classRoom)
          .limit(40).get()
          .then(function (snap) { return mapDocs(snap.docs); });
      });
    }

    return db().collection('posts').orderBy('createdAt', 'desc').limit(30).get()
      .then(function (snap) { return mapDocs(snap.docs); })
      .catch(function () {
        return db().collection('posts').limit(30).get().then(function (snap) { return mapDocs(snap.docs); });
      });
  }

  function suggestClassmates() {
    var user = authUser();
    if (!user) return Promise.resolve([]);
    return getPublicProfile(user.uid).then(function (prof) {
      if (!prof.classRoom) return [];
      return db().collection('users').where('classRoom', '==', prof.classRoom).limit(20).get()
        .then(function (snap) {
          return snap.docs.filter(function (d) { return d.id !== user.uid; }).map(function (d) {
            var x = d.data();
            return {
              uid: d.id,
              displayName: x.displayName || x.nickname || x.childName || 'Bé',
              role: x.role || 'parent'
            };
          });
        });
    }).catch(function () { return []; });
  }

  global.KidSocial = {
    esc: esc,
    timeAgo: timeAgo,
    whenAuthReady: whenAuthReady,
    ensureUserDoc: ensureUserDoc,
    friendlyFirestoreError: friendlyFirestoreError,
    getPublicProfile: getPublicProfile,
    getUserAchievements: getUserAchievements,
    isFollowing: isFollowing,
    follow: follow,
    unfollow: unfollow,
    listFollowingUids: listFollowingUids,
    createPost: createPost,
    toggleLike: toggleLike,
    addComment: addComment,
    listComments: listComments,
    listPosts: listPosts,
    suggestClassmates: suggestClassmates
  };
})(window);
