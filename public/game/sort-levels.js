/* ═══════════════════════════════════════════════════
   SORT-LEVELS.JS — Phân loại thông minh
═══════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  var LEVELS = [
    { id: 1, name: 'Màu sắc cơ bản', badge: '🎨', items: 8, hearts: 3, timeLimit: 75, subjects: ['nhan_biet'], gates: 1,
      bins: [
        { id: 'warm', label: 'Ấm', emoji: '🔥', accept: ['red', 'orange', 'yellow'] },
        { id: 'cool', label: 'Mát', emoji: '❄️', accept: ['blue', 'green', 'purple'] }
      ]},
    { id: 2, name: 'Hình học', badge: '🔷', items: 10, hearts: 3, timeLimit: 80, subjects: ['ghep_hinh'], gates: 2,
      bins: [
        { id: 'round', label: 'Tròn', emoji: '⭕', accept: ['circle', 'oval'] },
        { id: 'corner', label: 'Góc cạnh', emoji: '📐', accept: ['square', 'triangle', 'rect'] }
      ]},
    { id: 3, name: 'Số lớn nhỏ', badge: '🔢', items: 10, hearts: 3, timeLimit: 80, subjects: ['tu_duy'], gates: 2,
      bins: [
        { id: 'small', label: 'Nhỏ', emoji: '🐜', accept: ['s1', 's2', 's3'] },
        { id: 'big', label: 'Lớn', emoji: '🐘', accept: ['b7', 'b8', 'b9'] }
      ]},
    { id: 4, name: 'Âm thanh', badge: '🎵', items: 12, hearts: 2, timeLimit: 85, subjects: ['am_nhac'], gates: 3,
      bins: [
        { id: 'loud', label: 'To', emoji: '📢', accept: ['drum', 'bell'] },
        { id: 'soft', label: 'Nhẹ', emoji: '🎐', accept: ['harp', 'flute'] }
      ]},
    { id: 5, name: 'Siêu phân loại', badge: '👑', items: 14, hearts: 2, timeLimit: 90, subjects: ['ngon_ngu', 'my_thuat'], gates: 3,
      bins: [
        { id: 'living', label: 'Sống', emoji: '🌱', accept: ['cat', 'tree', 'fish'] },
        { id: 'object', label: 'Đồ vật', emoji: '📦', accept: ['book', 'ball', 'car'] }
      ]}
  ];

  var ITEM_POOL = {
    red: { emoji: '🔴', label: 'Đỏ' }, orange: { emoji: '🟠', label: 'Cam' }, yellow: { emoji: '🟡', label: 'Vàng' },
    blue: { emoji: '🔵', label: 'Xanh' }, green: { emoji: '🟢', label: 'Lá' }, purple: { emoji: '🟣', label: 'Tím' },
    circle: { emoji: '⚪', label: 'Tròn' }, oval: { emoji: '🥚', label: 'Bầu' },
    square: { emoji: '🟥', label: 'Vuông' }, triangle: { emoji: '🔺', label: 'Tam giác' }, rect: { emoji: '▬', label: 'Chữ nhật' },
    s1: { emoji: '1️⃣', label: '1' }, s2: { emoji: '2️⃣', label: '2' }, s3: { emoji: '3️⃣', label: '3' },
    b7: { emoji: '7️⃣', label: '7' }, b8: { emoji: '8️⃣', label: '8' }, b9: { emoji: '9️⃣', label: '9' },
    drum: { emoji: '🥁', label: 'Trống' }, bell: { emoji: '🔔', label: 'Chuông' },
    harp: { emoji: '🎻', label: 'Đàn' }, flute: { emoji: '🎺', label: 'Kèn' },
    cat: { emoji: '🐱', label: 'Mèo' }, tree: { emoji: '🌳', label: 'Cây' }, fish: { emoji: '🐟', label: 'Cá' },
    book: { emoji: '📚', label: 'Sách' }, ball: { emoji: '⚽', label: 'Bóng' }, car: { emoji: '🚗', label: 'Xe' }
  };

  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function buildQueue(level) {
    var ids = [];
    (level.bins || []).forEach(function (bin) {
      (bin.accept || []).forEach(function (id) { ids.push(id); });
    });
    while (ids.length < level.items) {
      ids = ids.concat(ids);
    }
    ids = shuffle(ids).slice(0, level.items);
    return ids.map(function (id, i) {
      var meta = ITEM_POOL[id] || { emoji: '❓', label: id };
      return { uid: id + '_' + i, typeId: id, emoji: meta.emoji, label: meta.label };
    });
  }

  function correctBin(level, typeId) {
    for (var i = 0; i < (level.bins || []).length; i++) {
      var b = level.bins[i];
      if ((b.accept || []).indexOf(typeId) >= 0) return b.id;
    }
    return null;
  }

  function buildLevelQuestions(level) {
    var GL = global.GameLevels;
    if (!GL || !GL.buildLevelQuestions) return [];
    return GL.buildLevelQuestions(level);
  }

  global.SortLevels = {
    LEVELS: LEVELS,
    buildQueue: buildQueue,
    correctBin: correctBin,
    buildLevelQuestions: buildLevelQuestions
  };
})(window);
