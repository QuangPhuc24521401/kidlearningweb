/* ═══════════════════════════════════════════════════
   MAZE-LEVELS.JS — Mê cung sinh theo cấp (càng sau càng lớn)
   # tường  . đường  S E T bẫy  M quái
═══════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  var TILE = 28;

  var LEVEL_DEFS = [
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
      mazeW: 9,
      mazeH: 7
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
      mazeW: 11,
      mazeH: 9
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
      mazeW: 13,
      mazeH: 11
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
      mazeW: 15,
      mazeH: 13
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
      mazeW: 17,
      mazeH: 15
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
      mazeW: 19,
      mazeH: 17
    }
  ];

  function seededRandom(seed) {
    return function () {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };
  }

  function shuffleRng(arr, rng) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(rng() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function manhattan(ax, ay, bx, by) {
    return Math.abs(ax - bx) + Math.abs(ay - by);
  }

  /** Sinh mê cung có lối đi, bẫy T và quái M */
  function generateMazeGrid(innerW, innerH, trapCount, monsterCount, seed) {
    innerW = innerW | 1;
    innerH = innerH | 1;
    var cols = innerW * 2 + 1;
    var rows = innerH * 2 + 1;
    var rng = seededRandom(seed);
    var grid = [];
    var y, x;

    for (y = 0; y < rows; y++) {
      grid[y] = [];
      for (x = 0; x < cols; x++) grid[y][x] = '#';
    }

    var visited = {};

    function carve(cx, cy) {
      visited[cx + ',' + cy] = true;
      grid[cy][cx] = '.';
      var dirs = shuffleRng([[0, -2], [0, 2], [-2, 0], [2, 0]], rng);
      dirs.forEach(function (d) {
        var nx = cx + d[0];
        var ny = cy + d[1];
        if (nx > 0 && ny > 0 && nx < cols - 1 && ny < rows - 1 && !visited[nx + ',' + ny]) {
          grid[cy + d[1] / 2][cx + d[0] / 2] = '.';
          carve(nx, ny);
        }
      });
    }

    carve(1, 1);

    var sx = 1, sy = 1;
    var ex = cols - 2, ey = rows - 2;
    grid[sy][sx] = 'S';
    grid[ey][ex] = 'E';

    var paths = [];
    for (y = 0; y < rows; y++) {
      for (x = 0; x < cols; x++) {
        if (grid[y][x] === '.') paths.push({ x: x, y: y });
      }
    }
    paths = shuffleRng(paths, rng);

    function placeMark(mark, count, minDist) {
      var placed = 0;
      for (var i = 0; i < paths.length && placed < count; i++) {
        var p = paths[i];
        if (manhattan(p.x, p.y, sx, sy) < minDist) continue;
        if (manhattan(p.x, p.y, ex, ey) < 4) continue;
        if (grid[p.y][p.x] !== '.') continue;
        grid[p.y][p.x] = mark;
        placed++;
      }
    }

    placeMark('T', trapCount, 5);
    placeMark('M', monsterCount, 7);

    var lines = [];
    for (y = 0; y < rows; y++) {
      var row = '';
      for (x = 0; x < cols; x++) row += grid[y][x];
      lines.push(row);
    }
    return lines;
  }

  function buildLevelGrid(def) {
    var traps = Math.max(2, def.gates || 3);
    var monsters = Math.max(2, Math.ceil((def.gates || 3) / 2) + 1);
    return generateMazeGrid(def.mazeW, def.mazeH, traps, monsters, def.id * 7919 + 17);
  }

  var LEVELS = LEVEL_DEFS.map(function (def) {
    var lv = {};
    Object.keys(def).forEach(function (k) { lv[k] = def[k]; });
    lv.grid = buildLevelGrid(def);
    return lv;
  });

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
    generateMazeGrid: generateMazeGrid,
    totalStarsForLevel: function (level) { return Math.max(1, level.gates || 3); }
  };
})(window);
