/* ═══════════════════════════════════════════════════
   MAZE-LEVELS.JS — Mê cung lớn, bẫy & quái mọi màn
   # tường  . đường  S E T bẫy  M quái
═══════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  var TILE = 28;

  var LEVELS = [
    {
      id: 1,
      name: 'Đồng cỏ xanh',
      theme: 'grass',
      subjects: ['nhan_biet'],
      gates: 3,
      hearts: 3,
      timeLimit: 0,
      reverseControls: false,
      speed: 155,
      badge: '🌿',
      grid: [
        '#####################',
        '#S.....T....M.......#',
        '#.###.###.###.###.#.#',
        '#.#...#...#...#...#.#',
        '#.#.#.#.#.#.#.#.#.#.#',
        '#...#...T.....M...#.#',
        '###.#.#####.#####.#.#',
        '#...#.....#.....#.#.#',
        '#.###.###.#.###.#.#.#',
        '#...M...#...T...#...#',
        '#.#####.#.#####.#.#.#',
        '#.......#.....#...#E#',
        '#####################'
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
      speed: 158,
      badge: '🌳',
      grid: [
        '#######################',
        '#S.......T.....M......#',
        '#.#####.#.#####.#.###.#',
        '#.#...#.#.#...#.#.#...#',
        '#.#.#.#.#.#.#.#.#.#.#.#',
        '#...#...M.....T...#...#',
        '###.#.#######.#.###.#.#',
        '#...#.#.....#.#...#.#.#',
        '#.###.#.###.#.###.#.#.#',
        '#.#...#...#...#...#.#.#',
        '#.#.#####.#.#####.#.#.#',
        '#.T...#...M...#...#...#',
        '#.###.#.#####.#.###.#.#',
        '#.....#.......#.....#E#',
        '#######################'
      ]
    },
    {
      id: 3,
      name: 'Hang đá ẩn',
      theme: 'cave',
      subjects: ['ghep_hinh', 'am_nhac'],
      gates: 4,
      hearts: 3,
      timeLimit: 150,
      reverseControls: false,
      speed: 152,
      badge: '🪨',
      grid: [
        '#########################',
        '#S........T.....M.......#',
        '#.#######.#.#######.###.#',
        '#.#.....#.#.#.....#.#...#',
        '#.#.###.#.#.#.###.#.#.#.#',
        '#.#.#...#...#...#.#.T...#',
        '#.#.#.#####.#####.#.#.#.#',
        '#...#.....M.....#.#.#...#',
        '###.#.#######.#.#.#.###.#',
        '#...#.#.....#.#.#.#...#.#',
        '#.###.#.###.#.#.###.#.#.#',
        '#...M...#...T...#...#...#',
        '#.#####.#.#####.#.###.#.#',
        '#.......#.......#.....#E#',
        '#########################'
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
      speed: 160,
      badge: '🏜️',
      grid: [
        '###########################',
        '#S..........T.....M.......#',
        '#.#######.#.#######.#.###.#',
        '#.#.....#.#.#.....#.#.#...#',
        '#.#.###.#.#.#.###.#.#.#.#.#',
        '#.#.#...#...#...#...#.T...#',
        '#.#.#.#####.#####.#####.#.#',
        '#...#.....M.....#.....#.#.#',
        '###.#.#######.#.#######.#.#',
        '#...#.#.....#.#.#.....#.#.#',
        '#.###.#.###.#.#.#.###.#.#.#',
        '#.#...#...#...M...T...#.#.#',
        '#.#.#####.#.#####.#.###.#.#',
        '#.#.......#.......#.....#E#',
        '###########################'
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
      speed: 162,
      badge: '🏰',
      grid: [
        '#############################',
        '#S............T.....M.......#',
        '#.#########.#.#########.#.###',
        '#.#.......#.#.#.......#.#...#',
        '#.#.#####.#.#.#.#####.#.#.#.#',
        '#.#.#...#...#...#...#...#.T.#',
        '#.#.#.#.#####.#####.#####.#.#',
        '#...#.#.....M.....#.....#.#.#',
        '###.#.#.#########.#.#####.#.#',
        '#...#.#.#.......#.#.#.....#.#',
        '#.###.#.#.#####.#.#.#.###.#.#',
        '#...M...#...#...T...#...#.#.#',
        '#.#####.#.#.#.#####.#.#.#.#.#',
        '#.......#.#.#.......#.#...#.#',
        '#.#######.#.#########.#.#.#E#',
        '#############################'
      ]
    },
    {
      id: 6,
      name: 'Vực lửa đảo ngược',
      theme: 'inferno',
      subjects: ['tu_duy', 'ngon_ngu'],
      gates: 5,
      hearts: 2,
      timeLimit: 90,
      reverseControls: true,
      speed: 168,
      badge: '🔥',
      grid: [
        '###############################',
        '#S..........T.......M.........#',
        '#.#########.#.#########.#.#####',
        '#.#.......#.#.#.......#.#.....#',
        '#.#.#####.#.#.#.#####.#.#.###.#',
        '#.#.#...#...#...#...#...#...#.#',
        '#.#.#.#.#####.#####.#####.###.#',
        '#...#.#.....M.....T.....#...#.#',
        '###.#.#.###########.#.#####.#.#',
        '#...#.#.#.........#.#.#.....#.#',
        '#.###.#.#.#######.#.#.#.###.#.#',
        '#...M...#...#...#...T...#...#.#',
        '#.#####.#.#.#.#####.#.#.###.#.#',
        '#.......#.#...#.......#.....#E#',
        '###############################'
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
    var n = Math.max(1, level.gates || 3);
    var pool = shuffle(poolForLevel(level));
    var picked = pool.slice(0, n);
    while (picked.length < n && pool.length) {
      picked.push(pool[picked.length % pool.length]);
    }
    return picked.map(buildBinaryChoice).filter(Boolean);
  }

  function cellCenter(gx, gy, tile) {
    return { px: gx * tile + tile / 2, py: gy * tile + tile / 2, x: gx, y: gy };
  }

  function parseGrid(grid, tile) {
    tile = tile || TILE;
    var rows = grid.length;
    var cols = grid[0] ? grid[0].length : 0;
    var wallMap = [];
    var start = { x: 0, y: 0, px: 0, py: 0 };
    var exit = { x: 0, y: 0, px: 0, py: 0 };
    var traps = [];
    var monsters = [];

    for (var y = 0; y < rows; y++) {
      wallMap[y] = [];
      for (var x = 0; x < cols; x++) {
        var c = grid[y][x];
        wallMap[y][x] = (c === '#');
        if (c === 'S') {
          start = cellCenter(x, y, tile);
        } else if (c === 'E') {
          exit = cellCenter(x, y, tile);
        } else if (c === 'T') {
          var t = cellCenter(x, y, tile);
          t.id = 't' + traps.length;
          traps.push(t);
        } else if (c === 'M') {
          var m = cellCenter(x, y, tile);
          m.id = 'm' + monsters.length;
          m.vx = 0;
          m.vy = 0;
          monsters.push(m);
        }
      }
    }

    return {
      rows: rows,
      cols: cols,
      tile: tile,
      wallMap: wallMap,
      start: start,
      exit: exit,
      traps: traps,
      monsters: monsters
    };
  }

  global.MazeLevels = {
    TILE: TILE,
    LEVELS: LEVELS,
    buildLevelQuestions: buildLevelQuestions,
    parseGrid: parseGrid,
    totalStarsForLevel: function (level) { return Math.max(1, level.gates || 3); }
  };
})(window);
