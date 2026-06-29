/* ═══════════════════════════════════════════════════
   SPOT-LEVELS.JS — Tìm khác biệt
═══════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  var LEVELS = [
    { id: 1, name: 'Quen thuộc', badge: '👀', rounds: 5, hearts: 3, timeLimit: 55, subjects: ['nhan_biet'], gates: 1,
      templates: [
        { prompt: 'Chọn thứ không phải quả!', same: ['🍎', '🍌', '🍇'], odd: '🐶' },
        { prompt: 'Chọn thứ không phải con vật!', same: ['🐱', '🐶', '🐰'], odd: '🍎' },
        { prompt: 'Chọn thứ không phải phương tiện!', same: ['🚗', '🚌', '🚲'], odd: '🌳' },
        { prompt: 'Chọn thứ không phải đồ chơi!', same: ['⚽', '🧸', '🎮'], odd: '🍕' },
        { prompt: 'Chọn thứ không phải cây cối!', same: ['🌳', '🌻', '🌵'], odd: '🐟' }
      ]},
    { id: 2, name: 'Màu sắc', badge: '🎨', rounds: 6, hearts: 3, timeLimit: 60, subjects: ['my_thuat'], gates: 2,
      templates: [
        { prompt: 'Chọn màu khác!', same: ['🔴', '🔴', '🔴'], odd: '🔵' },
        { prompt: 'Chọn màu khác!', same: ['🟢', '🟢', '🟢'], odd: '🟡' },
        { prompt: 'Chọn hình khác!', same: ['⬛', '⬛', '⬛'], odd: '🔺' },
        { prompt: 'Chọn hình khác!', same: ['🔵', '🔵', '🔵'], odd: '⭐' },
        { prompt: 'Chọn màu khác!', same: ['🟣', '🟣', '🟣'], odd: '🟠' },
        { prompt: 'Chọn hình khác!', same: ['🟩', '🟩', '🟩'], odd: '⭕' }
      ]},
    { id: 3, name: 'Số & chữ', badge: '🔤', rounds: 6, hearts: 3, timeLimit: 65, subjects: ['ngon_ngu', 'tu_duy'], gates: 2,
      templates: [
        { prompt: 'Chọn chữ khác!', same: ['A', 'A', 'A'], odd: 'B' },
        { prompt: 'Chọn số khác!', same: ['2', '2', '2'], odd: '5' },
        { prompt: 'Chọn chữ khác!', same: ['M', 'M', 'M'], odd: 'K' },
        { prompt: 'Chọn số khác!', same: ['8', '8', '8'], odd: '3' },
        { prompt: 'Chọn chữ khác!', same: ['E', 'E', 'E'], odd: 'O' },
        { prompt: 'Chọn số khác!', same: ['1', '1', '1'], odd: '9' }
      ]},
    { id: 4, name: 'Âm nhạc', badge: '🎵', rounds: 7, hearts: 2, timeLimit: 70, subjects: ['am_nhac'], gates: 3,
      templates: [
        { prompt: 'Chọn nhạc cụ khác!', same: ['🥁', '🥁', '🥁'], odd: '🎻' },
        { prompt: 'Chọn nhạc cụ khác!', same: ['🎹', '🎹', '🎹'], odd: '🔔' },
        { prompt: 'Chọn nhạc cụ khác!', same: ['🎺', '🎺', '🎺'], odd: '🎸' },
        { prompt: 'Chọn không phải nhạc cụ!', same: ['🎻', '🎷', '🪗'], odd: '📚' },
        { prompt: 'Chọn nhạc cụ khác!', same: ['🪘', '🪘', '🪘'], odd: '🎤' },
        { prompt: 'Chọn không phải nhạc cụ!', same: ['🎸', '🎹', '🥁'], odd: '🍎' },
        { prompt: 'Chọn nhạc cụ khác!', same: ['🎷', '🎷', '🎷'], odd: '🎐' }
      ]},
    { id: 5, name: 'Thử thách', badge: '👑', rounds: 8, hearts: 2, timeLimit: 75, subjects: ['tu_duy', 'ghep_hinh'], gates: 3,
      templates: [
        { prompt: 'Chọn hình khác!', same: ['🔺', '🔺', '🔺'], odd: '⬜' },
        { prompt: 'Chọn không phải hoa quả!', same: ['🍓', '🍑', '🍉'], odd: '🦋' },
        { prompt: 'Chọn không phải thể thao!', same: ['⚽', '🏀', '🎾'], odd: '🎨' },
        { prompt: 'Chọn không phải thời tiết!', same: ['☀️', '🌧️', '⛈️'], odd: '🐘' },
        { prompt: 'Chọn không phải đồ ăn!', same: ['🍕', '🍔', '🌮'], odd: '🚁' },
        { prompt: 'Chọn hình khác!', same: ['◼️', '◼️', '◼️'], odd: '🔶' },
        { prompt: 'Chọn không phải cảm xúc!', same: ['😀', '😊', '😄'], odd: '🌙' },
        { prompt: 'Chọn không thuộc nhóm!', same: ['🐧', '🐧', '🐧'], odd: '🦁' }
      ]}
  ];

  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function buildRounds(level) {
    var templates = (level.templates || []).slice();
    while (templates.length < level.rounds) {
      templates = templates.concat(level.templates || []);
    }
    templates = templates.slice(0, level.rounds);
    return templates.map(function (t, i) {
      var same = (t.same || []).slice(0, 3);
      while (same.length < 3) same.push((t.same || [])[0] || '❓');
      var items = same.map(function (emoji, j) {
        return { id: 's' + i + '_' + j, emoji: emoji, isOdd: false };
      }).concat([{ id: 'o' + i, emoji: t.odd, isOdd: true }]);
      items = shuffle(items);
      return { prompt: t.prompt, items: items };
    });
  }

  function buildLevelQuestions(level) {
    var GL = global.GameLevels;
    if (!GL || !GL.buildLevelQuestions) return [];
    return GL.buildLevelQuestions(level);
  }

  global.SpotLevels = {
    LEVELS: LEVELS,
    buildRounds: buildRounds,
    buildLevelQuestions: buildLevelQuestions
  };
})(window);
