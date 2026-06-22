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

  /** Hồ sơ công khai (cùng lớp hoặc đã đăng nhập). */
  function getPublicProfile(uid) {
    var firestore = db();
    if (!firestore || !uid) return Promise.reject(new Error('Thiếu uid'));
    return firestore.collection('users').doc(uid).get().then(function (snap) {
      if (!snap.exists) throw new Error('Không tìm thấy người dùng');
      var d = snap.data();
      return {
        uid: uid,
        displayName: d.displayName || d.nickname || d.childName || 'Bé học sinh',
        role: d.role || 'parent',
        classRoom: d.classRoom || '',
        avatarEmoji: d.avatarEmoji || '',
        avatarMode: d.avatarMode || 'emoji',
        avatarRing: d.avatarRing || '#fbbf24'
      };
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
    var user = authUser();
    if (!user) return Promise.reject(new Error('Cần đăng nhập'));
    opts = opts || {};
    var text = String(opts.text || '').trim();
    if (!text) return Promise.reject(new Error('Nhập nội dung bài đăng'));
    return getPublicProfile(user.uid).then(function (prof) {
      return db().collection('posts').add({
        authorUid: user.uid,
        authorName: prof.displayName,
        authorRole: prof.role,
        classRoom: prof.classRoom || '',
        text: text.slice(0, 500),
        type: opts.type || 'text',
        shareMeta: opts.shareMeta || null,
        likes: [],
        likeCount: 0,
        commentCount: 0,
        createdAt: ts()
      });
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
    var user = authUser();
    if (!user) return Promise.resolve([]);
    feed = feed || 'class';

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
        if (!prof.classRoom) return listPosts('all');
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
