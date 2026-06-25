/* ═══════════════════════════════════════════════════
   DIGGER-LEVELS.JS — Màn đào vàng + câu hỏi
═══════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  var ITEM_TYPES = {
    gold_s: { label: 'Vàng nhỏ', value: 50, weight: 1, radius: 16, quiz: true, color: '#ffd54a' },
    gold_m: { label: 'Vàng vừa', value: 100, weight: 2, radius: 24, quiz: true, color: '#ffc107' },
    gold_l: { label: 'Vàng lớn', value: 200, weight: 3.5, radius: 34, quiz: true, color: '#ffb300' },
    diamond: { label: 'Kim cương', value: 150, weight: 1, radius: 14, quiz: true, color: '#81d4fa' },
    rock: { label: 'Đá', value: 15, weight: 4, radius: 28, quiz: false, color: '#78909c' }
  };

  var LEVELS = [
    { id: 1, name: 'Mỏ tân binh', badge: '⛏️', target: 250, timeLimit: 70, hearts: 3, subjects: ['nhan_biet'],
      spawn: { gold_s: 5, gold_m: 2, rock: 3 } },
    { id: 2, name: 'Hầm sáng', badge: '🪙', target: 400, timeLimit: 75, hearts: 3, subjects: ['nhan_biet', 'ghep_hinh'],
      spawn: { gold_s: 4, gold_m: 3, gold_l: 1, rock: 4 } },
    { id: 3, name: 'Địa đạo sâu', badge: '💎', target: 550, timeLimit: 80, hearts: 3, subjects: ['ghep_hinh', 'am_nhac'],
      spawn: { gold_s: 3, gold_m: 3, gold_l: 2, diamond: 1, rock: 5 } },
    { id: 4, name: 'Sa mạc vàng', badge: '🏜️', target: 700, timeLimit: 85, hearts: 3, subjects: ['am_nhac', 'my_thuat'],
      spawn: { gold_s: 4, gold_m: 4, gold_l: 2, diamond: 2, rock: 6 } },
    { id: 5, name: 'Hang báu vật', badge: '🏆', target: 900, timeLimit: 90, hearts: 2, subjects: ['my_thuat', 'tu_duy'],
      spawn: { gold_s: 3, gold_m: 5, gold_l: 3, diamond: 2, rock: 7 } },
    { id: 6, name: 'Vàng đại hải trình', badge: '👑', target: 1200, timeLimit: 100, hearts: 2, subjects: ['tu_duy', 'ngon_ngu'],
      spawn: { gold_s: 4, gold_m: 5, gold_l: 4, diamond: 3, rock: 8 } }
  ];

  function shuffle(arr, rng) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(rng() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function seededRandom(seed) {
    return function () {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };
  }

  function buildSpawnList(spawn) {
    var list = [];
    Object.keys(spawn || {}).forEach(function (k) {
      var n = spawn[k] || 0;
      for (var i = 0; i < n; i++) list.push(k);
    });
    return list;
  }

  function circlesOverlap(ax, ay, ar, bx, by, br) {
    var dx = ax - bx, dy = ay - by;
    var d = Math.sqrt(dx * dx + dy * dy);
    return d < ar + br + 8;
  }

  function spawnItems(level, worldW, groundY, floorY) {
    var rng = seededRandom(level.id * 4201 + 13);
    var types = shuffle(buildSpawnList(level.spawn), rng);
    var items = [];
    var margin = 40;
    var yMin = groundY + 50;
    var yMax = floorY - 30;

    types.forEach(function (typeKey, idx) {
      var def = ITEM_TYPES[typeKey];
      if (!def) return;
      var placed = false;
      for (var attempt = 0; attempt < 80 && !placed; attempt++) {
        var x = margin + def.radius + rng() * (worldW - margin * 2 - def.radius * 2);
        var y = yMin + def.radius + rng() * (yMax - yMin - def.radius * 2);
        var ok = true;
        for (var i = 0; i < items.length; i++) {
          if (circlesOverlap(x, y, def.radius, items[i].x, items[i].y, items[i].radius)) {
            ok = false;
            break;
          }
        }
        if (ok) {
          items.push({
            id: 'i' + idx,
            type: typeKey,
            x: x,
            y: y,
            radius: def.radius,
            value: def.value,
            weight: def.weight,
            quiz: def.quiz,
            label: def.label,
            active: true
          });
          placed = true;
        }
      }
    });
    return items;
  }

  function shufflePlain(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function buildBinaryChoice(item) {
    if (!item) return null;
    if (global.GameLevels && global.GameLevels.buildBinaryChoice) {
      return global.GameLevels.buildBinaryChoice(item);
    }
    var correct = item.correctAnswer;
    var wrongs = (item.answers || []).filter(function (a) { return a !== correct; });
    var distractor = wrongs.length ? wrongs[Math.floor(Math.random() * wrongs.length)] : correct;
    var options = shufflePlain([correct, distractor]);
    if (options[0] === options[1]) options = [correct, correct === '✔️' ? '❌' : '✔️'];
    return {
      topic: item.topic || '',
      question: item.question || '',
      voiceText: item.voiceText || item.question || '',
      options: options,
      correct: correct
    };
  }

  function poolForLevel(level) {
    var data = global.LESSON_DATA || {};
    var pool = [];
    (level.subjects || []).forEach(function (sub) {
      var list = data[sub];
      if (Array.isArray(list)) list.forEach(function (q) { pool.push(q); });
    });
    if (!pool.length) {
      Object.keys(data).forEach(function (sub) {
        (data[sub] || []).forEach(function (q) { pool.push(q); });
      });
    }
    return pool;
  }

  function buildLevelQuestions(level) {
    var n = Math.max(6, Object.values(level.spawn || {}).reduce(function (s, v) { return s + v; }, 0));
    var pool = shufflePlain(poolForLevel(level));
    var picked = pool.slice(0, n);
    while (picked.length < n && pool.length) {
      picked.push(pool[picked.length % pool.length]);
    }
    return picked.map(buildBinaryChoice).filter(Boolean);
  }

  global.DiggerLevels = {
    ITEM_TYPES: ITEM_TYPES,
    LEVELS: LEVELS,
    spawnItems: spawnItems,
    buildLevelQuestions: buildLevelQuestions
  };
})(window);
