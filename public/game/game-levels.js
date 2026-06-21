/* ═══════════════════════════════════════════════════
   GAME-LEVELS.JS — Định nghĩa màn chơi & bộ câu hỏi

   • Lấy câu hỏi từ window.LESSON_DATA (lessons-data.js)
   • buildBinaryChoice(): biến câu 4 đáp án thành 2 lựa chọn
   • Độ khó tăng dần: số cổng nhiều hơn, tốc độ cao hơn,
     câu hỏi lấy từ môn dễ -> khó.

   Export: window.GameLevels = { LEVELS, buildBinaryChoice, buildLevelQuestions, totalStarsForLevel }
═══════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  var SUBJECT_TITLES = {
    nhan_biet: 'Nhận biết',
    ghep_hinh: 'Ghép hình',
    am_nhac: 'Âm nhạc',
    my_thuat: 'Mỹ thuật',
    tu_duy: 'Tư duy',
    ngon_ngu: 'Ngôn ngữ'
  };

  /* Các màn — độ khó tăng dần. subjects: ưu tiên rút câu hỏi từ đây. */
  var LEVELS = [
    { id: 1, name: 'Đồng cỏ xanh',   theme: 'grass',   subjects: ['nhan_biet'],            gates: 3, speed: 250, hearts: 3 },
    { id: 2, name: 'Rừng rậm vui nhộn', theme: 'jungle', subjects: ['nhan_biet', 'ghep_hinh'], gates: 4, speed: 268, hearts: 3 },
    { id: 3, name: 'Thung lũng nhạc', theme: 'valley',  subjects: ['ghep_hinh', 'am_nhac'], gates: 4, speed: 284, hearts: 3 },
    { id: 4, name: 'Sa mạc sắc màu', theme: 'desert',   subjects: ['am_nhac', 'my_thuat'],  gates: 5, speed: 300, hearts: 3 },
    { id: 5, name: 'Hang động lòng đất', theme: 'cave', subjects: ['my_thuat', 'tu_duy'],   gates: 5, speed: 316, hearts: 2 },
    { id: 6, name: 'Luyện ngục lửa', theme: 'inferno',  subjects: ['tu_duy'],               gates: 6, speed: 332, hearts: 2 },
    { id: 7, name: 'Thành phố chữ',  theme: 'city',     subjects: ['tu_duy', 'ngon_ngu'],   gates: 6, speed: 348, hearts: 2 },
    { id: 8, name: 'Thiên đường vô địch', theme: 'heaven', subjects: ['ngon_ngu'],          gates: 7, speed: 364, hearts: 2 }
  ];

  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  /* Biến 1 câu hỏi (4 đáp án) thành câu 2 lựa chọn: đúng + 1 nhiễu. */
  function buildBinaryChoice(item) {
    if (!item) return null;
    var correct = item.correctAnswer;
    var wrongs = (item.answers || []).filter(function (a) { return a !== correct; });
    var distractor = wrongs.length ? wrongs[Math.floor(Math.random() * wrongs.length)] : correct;
    var options = shuffle([correct, distractor]);
    // tránh trùng nếu chỉ có 1 đáp án
    if (options[0] === options[1]) options = [correct, correct === '✔️' ? '❌' : '✔️'];
    return {
      topic: item.topic || '',
      question: item.question || '',
      voiceText: item.voiceText || item.question || '',
      options: options,
      correct: correct
    };
  }

  /* Lấy toàn bộ câu của các môn trong 1 màn. */
  function poolForLevel(level) {
    var data = global.LESSON_DATA || {};
    var pool = [];
    (level.subjects || []).forEach(function (sub) {
      var list = data[sub];
      if (Array.isArray(list)) {
        list.forEach(function (q) {
          pool.push(Object.assign({ _subject: sub }, q));
        });
      }
    });
    // fallback nếu môn rỗng: gom tất cả
    if (!pool.length) {
      Object.keys(data).forEach(function (sub) {
        (data[sub] || []).forEach(function (q) { pool.push(Object.assign({ _subject: sub }, q)); });
      });
    }
    return pool;
  }

  /* Trả về danh sách câu hỏi 2 lựa chọn cho 1 màn (theo số cổng). */
  function buildLevelQuestions(level) {
    var pool = shuffle(poolForLevel(level));
    var n = Math.max(1, level.gates || 3);
    var picked = pool.slice(0, n);
    // nếu pool ít hơn số cổng, cho lặp lại
    while (picked.length < n && pool.length) {
      picked.push(pool[picked.length % pool.length]);
    }
    return picked.map(buildBinaryChoice).filter(Boolean);
  }

  function totalStarsForLevel(level) {
    return Math.max(1, level.gates || 3);
  }

  global.GameLevels = {
    LEVELS: LEVELS,
    SUBJECT_TITLES: SUBJECT_TITLES,
    buildBinaryChoice: buildBinaryChoice,
    buildLevelQuestions: buildLevelQuestions,
    totalStarsForLevel: totalStarsForLevel
  };
})(window);
