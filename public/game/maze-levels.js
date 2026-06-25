/* ═══════════════════════════════════════════════════
   MAZE-LEVELS.JS — Mê cung 2D: lưới, bẫy, quái, độ khó tăng dần
   # tường  . đường  S xuất phát  E lối ra  T bẫy  M quái
═══════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  var LEVELS = [
    {
      id: 1,
      name: 'Lá xanh đầu tiên',
      theme: 'grass',
      subjects: ['nhan_biet'],
      gates: 2,
      hearts: 3,
      timeLimit: 0,
      reverseControls: false,
      badge: '🌿',
      grid: [
        '#############',
        '#S....#.....#',
        '#.###.#.###.#',
        '#...#.#...#.#',
        '###.#.###.#.#',
        '#...#.....#.#',
        '#.#######.#.#',
        '#.........#E#',
        '#############'
      ]
    },
    {
      id: 2,
      name: 'Rừng rậm',
      theme: 'jungle',
      subjects: ['nhan_biet', 'ghep_hinh'],
      gates: 3,
      hearts: 3,
      timeLimit: 0,
      reverseControls: false,
      badge: '🌳',
      grid: [
        '###############',
        '#S....#.......#',
        '#.###.#.#####.#',
        '#.#...#...#...#',
        '#.#.#####.#.###',
        '#.#.....#.#...#',
        '#.#####.#.###.#',
        '#.....#.#...#.#',
        '###.#.#.###.#.#',
        '#...#.#.....#E#',
        '###############'
      ]
    },
    {
      id: 3,
      name: 'Hang đá ẩn',
      theme: 'cave',
      subjects: ['ghep_hinh', 'am_nhac'],
      gates: 3,
      hearts: 3,
      timeLimit: 150,
      reverseControls: false,
      badge: '🪨',
      grid: [
        '#################',
        '#S.....#........#',
        '#.###.#.#######.#',
        '#.#...#.#.....#.#',
        '#.#.###.#.###.#.#',
        '#.#.....#.#.T.#.#',
        '#.#######.#.#.#.#',
        '#.........#.#...#',
        '#####.#####.#.###',
        '#.....#.....#..E#',
        '#################'
      ]
    },
    {
      id: 4,
      name: 'Sa mạc bẫy',
      theme: 'desert',
      subjects: ['am_nhac', 'my_thuat'],
      gates: 4,
      hearts: 3,
      timeLimit: 120,
      reverseControls: false,
      badge: '🏜️',
      grid: [
        '###################',
        '#S.......#........#',
        '#.#####.#.#######.#',
        '#.#...#.#.#.....#.#',
        '#.#.#.#.#.#.###.#.#',
        '#.#.#...#.#.#T#.#.#',
        '#.#.#####.#.#.#.#.#',
        '#.#.......#.#...#.#',
        '#.#########.#.###.#',
        '#...........#...#E#',
        '###################'
      ]
    },
    {
      id: 5,
      name: 'Lâu đài quái',
      theme: 'city',
      subjects: ['my_thuat', 'tu_duy'],
      gates: 4,
      hearts: 2,
      timeLimit: 100,
      reverseControls: false,
      badge: '🏰',
      grid: [
        '#####################',
        '#S....#.............#',
        '#.###.#.###########.#',
        '#.#...#.#.........#.#',
        '#.#.###.#.#######.#.#',
        '#.#.....#M#.....#.#.#',
        '#.#####.#.#.###.#.#.#',
        '#.....#.#.#.T.#.#...#',
        '###.#.#.#.#.###.#####',
        '#...#.#.#.#.....#..E#',
        '#####################'
      ]
    },
    {
      id: 6,
      name: 'Mê cung đảo ngược',
      theme: 'inferno',
      subjects: ['tu_duy', 'ngon_ngu'],
      gates: 5,
      hearts: 2,
      timeLimit: 90,
      reverseControls: true,
      badge: '🔥',
      grid: [
        '#######################',
        '#S......#.............#',
        '#.######.#.#########.#',
        '#.#....#.#.#.......#.#',
        '#.#.##.#.#.#.#####.#.#',
        '#.#.#T#.#M#.#.#...#.#.#',
        '#.#.#.#.###.#.#.#.#.#.#',
        '#.#...#.....#.#.#...#.#',
        '#.#########.#.#.#####.#',
        '#...........#.#.....#E#',
        '#######################'
      ]
    }
  ];

  function shuffle(arr) {
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
    var options = shuffle([correct, distractor]);
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
      if (Array.isArray(list)) {
        list.forEach(function (q) { pool.push(q); });
      }
    });
    if (!pool.length) {
      Object.keys(data).forEach(function (sub) {
        (data[sub] || []).forEach(function (q) { pool.push(q); });
      });
    }
    return pool;
  }

  function buildLevelQuestions(level) {
    var n = Math.max(1, level.gates || 3);
    var pool = shuffle(poolForLevel(level));
    var picked = pool.slice(0, n);
    while (picked.length < n && pool.length) {
      picked.push(pool[picked.length % pool.length]);
    }
    return picked.map(buildBinaryChoice).filter(Boolean);
  }

  function parseGrid(grid) {
    var rows = grid.length;
    var cols = grid[0] ? grid[0].length : 0;
    var start = { x: 0, y: 0 };
    var exit = { x: 0, y: 0 };
    var traps = [];
    var monsters = [];
    var walls = [];

    for (var y = 0; y < rows; y++) {
      for (var x = 0; x < cols; x++) {
        var c = grid[y][x];
        if (c === '#') walls.push({ x: x, y: y });
        else if (c === 'S') start = { x: x, y: y };
        else if (c === 'E') exit = { x: x, y: y };
        else if (c === 'T') traps.push({ x: x, y: y, id: 't' + traps.length });
        else if (c === 'M') monsters.push({ x: x, y: y, id: 'm' + monsters.length, dir: 1 });
      }
    }
    return { rows: rows, cols: cols, start: start, exit: exit, traps: traps, monsters: monsters, walls: walls };
  }

  global.MazeLevels = {
    LEVELS: LEVELS,
    buildLevelQuestions: buildLevelQuestions,
    parseGrid: parseGrid,
    totalStarsForLevel: function (level) { return Math.max(1, level.gates || 3); }
  };
})(window);
