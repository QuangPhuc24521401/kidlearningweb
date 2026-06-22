/* ═══════════════════════════════════════════════════
   TEACHER-GAMES.JS — Game do giáo viên tạo (Firestore)

   Collection: teacher_games/{gameId}
   Học sinh cùng lớp thấy màn đã publish trên bản đồ game.
═══════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  var COL = 'teacher_games';
  var BASE_LEVEL_ID = 9;
  var THEMES = ['grass', 'jungle', 'valley', 'desert', 'cave', 'inferno', 'city', 'heaven'];

  function db() {
    return global.firebase && global.firebase.firestore ? global.firebase.firestore() : null;
  }

  function esc(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  /** Parse file JSON hoặc CSV thành mảng câu hỏi. */
  function parseQuestionFile(text, filename) {
    text = String(text || '').trim();
    if (!text) throw new Error('File trống');

    var lower = (filename || '').toLowerCase();
    if (lower.endsWith('.json') || text.charAt(0) === '[' || text.charAt(0) === '{') {
      var parsed = JSON.parse(text);
      var list = Array.isArray(parsed) ? parsed : (parsed.questions || parsed.items || []);
      if (!Array.isArray(list) || !list.length) throw new Error('JSON phải là mảng câu hỏi hoặc { questions: [...] }');
      return list.map(normalizeQuestion).filter(Boolean);
    }

    var lines = text.split(/\r?\n/).map(function (l) { return l.trim(); }).filter(Boolean);
    if (lines.length < 1) throw new Error('Không có dòng dữ liệu');
    var out = [];
    lines.forEach(function (line, i) {
      if (i === 0 && /question|câu/i.test(line) && /correct|đúng/i.test(line)) return;
      var parts = line.indexOf('|') >= 0 ? line.split('|') : line.split(',');
      parts = parts.map(function (p) { return p.trim(); }).filter(Boolean);
      if (parts.length < 2) return;
      var q = parts[0];
      var correct = parts[1];
      var wrongs = parts.slice(2);
      while (wrongs.length < 3) wrongs.push(wrongs.length ? wrongs[0] : '❌');
      out.push(normalizeQuestion({
        topic: 'Bài tập',
        question: q,
        answers: [correct].concat(wrongs.slice(0, 3)),
        correctAnswer: correct
      }));
    });
    if (!out.length) throw new Error('Không đọc được câu hỏi từ file');
    return out;
  }

  function normalizeQuestion(raw) {
    if (!raw || !raw.question) return null;
    var correct = raw.correctAnswer || raw.correct || '';
    var answers = raw.answers || raw.options || [];
    if (!Array.isArray(answers)) answers = [];
    if (correct && answers.indexOf(correct) < 0) answers.unshift(correct);
    while (answers.length < 4) answers.push('❓');
    answers = answers.slice(0, 4);
    if (!correct) correct = answers[0];
    return {
      topic: raw.topic || 'Bài tập',
      question: String(raw.question),
      voiceText: raw.voiceText || raw.question,
      answers: answers,
      correctAnswer: correct
    };
  }

  function docToLevel(doc, index) {
    var d = doc.data();
    var qs = Array.isArray(d.questions) ? d.questions : [];
    var gates = d.gates || Math.min(Math.max(qs.length, 1), 7);
    return {
      id: BASE_LEVEL_ID + index,
      teacherGameId: doc.id,
      name: d.title || ('Màn ' + (index + 1)),
      theme: THEMES.indexOf(d.theme) >= 0 ? d.theme : 'grass',
      gates: gates,
      speed: d.speed || 280,
      hearts: d.hearts || 3,
      customQuestions: qs,
      isTeacherLevel: true,
      teacherName: d.teacherName || 'Cô giáo'
    };
  }

  function loadPublishedForClass(classRoom) {
    var firestore = db();
    if (!firestore || !classRoom) return Promise.resolve([]);
    return firestore.collection(COL)
      .where('classRoom', '==', classRoom)
      .where('published', '==', true)
      .get()
      .then(function (snap) {
        var docs = snap.docs.slice();
        docs.sort(function (a, b) {
          var ta = (a.data().createdAt && a.data().createdAt.toMillis) ? a.data().createdAt.toMillis() : 0;
          var tb = (b.data().createdAt && b.data().createdAt.toMillis) ? b.data().createdAt.toMillis() : 0;
          return ta - tb;
        });
        return docs.map(function (d, i) { return docToLevel(d, i); });
      })
      .catch(function (err) {
        console.warn('[TeacherGames] loadPublished', err);
        return [];
      });
  }

  function loadForCurrentUser() {
    var user = global.firebase && global.firebase.auth ? global.firebase.auth().currentUser : null;
    if (!user) return Promise.resolve([]);
    var firestore = db();
    if (!firestore) return Promise.resolve([]);
    return firestore.collection('users').doc(user.uid).get()
      .then(function (snap) {
        var cr = snap.exists ? snap.data().classRoom : '';
        if (!cr) return [];
        return loadPublishedForClass(cr);
      });
  }

  function listMyGames(teacherUid) {
    var firestore = db();
    if (!firestore) return Promise.resolve([]);
    return firestore.collection(COL)
      .where('teacherUid', '==', teacherUid)
      .get()
      .then(function (snap) {
        var docs = snap.docs.slice();
        docs.sort(function (a, b) {
          var ta = (a.data().updatedAt && a.data().updatedAt.toMillis) ? a.data().updatedAt.toMillis() : 0;
          var tb = (b.data().updatedAt && b.data().updatedAt.toMillis) ? b.data().updatedAt.toMillis() : 0;
          return tb - ta;
        });
        return docs.map(function (d) {
          var data = d.data();
          return {
            id: d.id,
            title: data.title,
            theme: data.theme,
            gates: data.gates,
            speed: data.speed,
            hearts: data.hearts,
            published: !!data.published,
            questionCount: (data.questions || []).length,
            updatedAt: data.updatedAt
          };
        });
      });
  }

  function saveGame(teacherUid, classRoom, teacherName, payload, gameId) {
    var firestore = db();
    if (!firestore) return Promise.reject(new Error('Firestore chưa sẵn sàng'));
    var qs = (payload.questions || []).map(normalizeQuestion).filter(Boolean);
    if (!qs.length) return Promise.reject(new Error('Cần ít nhất 1 câu hỏi'));
    if (!payload.title) return Promise.reject(new Error('Nhập tên màn chơi'));

    var doc = {
      teacherUid: teacherUid,
      classRoom: classRoom,
      teacherName: teacherName || 'Giáo viên',
      title: String(payload.title).slice(0, 80),
      theme: THEMES.indexOf(payload.theme) >= 0 ? payload.theme : 'grass',
      gates: Math.min(Math.max(parseInt(payload.gates, 10) || qs.length, 1), 7),
      speed: Math.min(Math.max(parseInt(payload.speed, 10) || 280, 200), 400),
      hearts: Math.min(Math.max(parseInt(payload.hearts, 10) || 3, 1), 5),
      questions: qs,
      published: !!payload.published,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    if (gameId) {
      return firestore.collection(COL).doc(gameId).set(doc, { merge: true });
    }
    doc.createdAt = firebase.firestore.FieldValue.serverTimestamp();
    doc.published = false;
    return firestore.collection(COL).add(doc);
  }

  function setPublished(gameId, published) {
    return db().collection(COL).doc(gameId).update({
      published: !!published,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
  }

  function deleteGame(gameId, teacherUid) {
    return db().collection(COL).doc(gameId).get().then(function (snap) {
      if (!snap.exists || snap.data().teacherUid !== teacherUid) {
        throw new Error('Không có quyền xóa');
      }
      return db().collection(COL).doc(gameId).delete();
    });
  }

  global.TeacherGames = {
    THEMES: THEMES,
    BASE_LEVEL_ID: BASE_LEVEL_ID,
    parseQuestionFile: parseQuestionFile,
    normalizeQuestion: normalizeQuestion,
    loadForCurrentUser: loadForCurrentUser,
    loadPublishedForClass: loadPublishedForClass,
    listMyGames: listMyGames,
    saveGame: saveGame,
    setPublished: setPublished,
    deleteGame: deleteGame,
    esc: esc
  };
})(window);
