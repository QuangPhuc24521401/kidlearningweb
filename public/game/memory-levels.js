/* ═══════════════════════════════════════════════════
   MEMORY-LEVELS.JS — Ghép cặp trí nhớ
═══════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  var PAIRS = [
    { id: 'red', emoji: '🔴', label: 'Đỏ' },
    { id: 'blue', emoji: '🔵', label: 'Xanh' },
    { id: 'yellow', emoji: '🟡', label: 'Vàng' },
    { id: 'green', emoji: '🟢', label: 'Lá' },
    { id: 'star', emoji: '⭐', label: 'Sao' },
    { id: 'heart', emoji: '❤️', label: 'Tim' },
    { id: 'moon', emoji: '🌙', label: 'Trăng' },
    { id: 'sun', emoji: '☀️', label: 'Mặt trời' },
    { id: 'apple', emoji: '🍎', label: 'Táo' },
    { id: 'fish', emoji: '🐟', label: 'Cá' }
  ];

  var LEVELS = [
    { id: 1, name: 'Làm quen', badge: '🃏', pairs: 4, hearts: 3, timeLimit: 90, subjects: ['nhan_biet'], gates: 1 },
    { id: 2, name: 'Tập trung', badge: '🧠', pairs: 5, hearts: 3, timeLimit: 85, subjects: ['nhan_biet', 'ghep_hinh'], gates: 2 },
    { id: 3, name: 'Siêu trí nhớ', badge: '✨', pairs: 6, hearts: 3, timeLimit: 80, subjects: ['ghep_hinh'], gates: 2 },
    { id: 4, name: 'Thử thách', badge: '🏆', pairs: 7, hearts: 2, timeLimit: 75, subjects: ['am_nhac', 'my_thuat'], gates: 3 },
    { id: 5, name: 'Bậc thầy', badge: '👑', pairs: 8, hearts: 2, timeLimit: 70, subjects: ['tu_duy', 'ngon_ngu'], gates: 3 }
  ];

  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function buildDeck(level) {
    var pool = shuffle(PAIRS).slice(0, level.pairs);
    var cards = [];
    pool.forEach(function (p, i) {
      cards.push({ uid: p.id + '_a', pairId: p.id, emoji: p.emoji, label: p.label });
      cards.push({ uid: p.id + '_b', pairId: p.id, emoji: p.emoji, label: p.label });
    });
    return shuffle(cards);
  }

  function buildLevelQuestions(level) {
    var GL = global.GameLevels;
    if (!GL || !GL.buildLevelQuestions) return [];
    return GL.buildLevelQuestions(level);
  }

  global.MemoryLevels = {
    LEVELS: LEVELS,
    buildDeck: buildDeck,
    buildLevelQuestions: buildLevelQuestions
  };
})(window);
