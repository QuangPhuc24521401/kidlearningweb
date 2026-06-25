/* ═══════════════════════════════════════════════════
   MAZE-CANVAS.JS — Mê cung 2D di chuyển mượt + theme
═══════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  var touch = { left: false, right: false, up: false, down: false };
  var Sfx = {};
  var loopId = null;
  var state = null;

  function tileSize() {
    return (global.MazeLevels && global.MazeLevels.TILE) || 28;
  }

  function playerRadius(tile) {
    return tile * 0.32;
  }

  function $(id) { return document.getElementById(id); }

  function clearMount() {
    var mount = $('gameMount');
    if (mount) mount.innerHTML = '';
    return mount;
  }

  function setUiMode(mode) {
    var card = $('gameCard');
    if (card) card.setAttribute('data-game-ui', mode);
    if (global.GameInput) global.GameInput.setTouchPad(mode);
    var jumpBtn = document.querySelector('#gameTouch [data-key="jump"]');
    if (jumpBtn) {
      jumpBtn.textContent = '▲';
      jumpBtn.setAttribute('aria-label', 'Lên');
    }
    var replay = $('btnReplay');
    var mapBtn = $('btnMap');
    var ctrls = $('gameControls');
    if (replay) replay.hidden = mode !== 'play';
    if (mapBtn) {
      mapBtn.hidden = mode !== 'play';
      mapBtn.title = 'Chọn màn mê cung';
    }
    if (ctrls) ctrls.classList.toggle('is-map-mode', mode === 'map' || mode === 'result');
  }

  function wireDomControls() {
    var sound = $('btnSound');
    var replay = $('btnReplay');
    var map = $('btnMap');
    if (sound && !sound._mazeBound) {
      sound._mazeBound = true;
      sound.addEventListener('click', function () {
        if (!state || state.view !== 'play') return;
        var m = Sfx.toggleMute ? Sfx.toggleMute() : false;
        sound.textContent = m ? '🔇' : '🔊';
        sound.classList.toggle('is-muted', m);
      });
    }
    if (replay && !replay._mazeBound) {
      replay._mazeBound = true;
      replay.addEventListener('click', function () {
        if (!state || state.view !== 'play') return;
        startLevel(state.levelIndex);
      });
    }
    if (map && !map._mazeBound) {
      map._mazeBound = true;
      map.addEventListener('click', function () {
        if (!global.__kidMazeActive) return;
        showLevelSelect();
      });
    }
  }

  function shareWin(level, stars, total) {
    var text = 'Mình vừa thoát mê cung "' + level.name + '" với ' + stars + '/' + total + ' sao! 🧩';
    if (!global.KidSocial || !global.KidSocial.createPost) {
      if (confirm('Chia sẻ lên Cộng đồng?\n\n' + text)) {
        global.location.href = 'social.html?tab=feed';
      }
      return;
    }
    global.KidSocial.createPost({
      text: text,
      type: 'achievement',
      shareMeta: { label: 'Mê cung · ' + stars + '/' + total + ' ⭐' }
    }).then(function () { alert('Đã chia sẻ lên Cộng đồng! 🎉'); })
      .catch(function (e) { alert(e.message || 'Không chia sẻ được.'); });
  }

  function stopLoop() {
    if (loopId) {
      cancelAnimationFrame(loopId);
      loopId = null;
    }
  }

  function showLevelSelect() {
    stopLoop();
    state = { view: 'select' };
    global.__kidMazeActive = true;
    setUiMode('map');

    var mount = clearMount();
    if (!mount) return;

    var wrap = document.createElement('div');
    wrap.className = 'maze-ui maze-ui--select';
    wrap.innerHTML =
      '<div class="maze-select-head">' +
        '<h2>🧩 Chọn mê cung</h2>' +
        '<p>Giữ phím/nút để chạy · tránh ⚠️ và 👾 · tìm 🚪 lối ra</p>' +
      '</div>' +
      '<div class="maze-select-grid" id="mazeSelectGrid"></div>' +
      '<button type="button" class="maze-hub-link" id="mazeHubLink">← Chọn game khác</button>';

    mount.appendChild(wrap);

    var grid = $('mazeSelectGrid');
    var levels = (global.MazeLevels && global.MazeLevels.LEVELS) || [];
    var MP = global.MazeProgress;

    levels.forEach(function (lv, i) {
      var unlocked = MP ? MP.isLevelUnlocked(lv.id) : lv.id === 1;
      var prog = MP ? MP.getLevelProgress(lv.id) : {};
      var done = (prog.completedRuns || 0) > 0;
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'maze-lvl-btn' + (unlocked ? '' : ' is-locked') + (done ? ' is-done' : '');
      btn.disabled = !unlocked;
      var meta = [];
      if (lv.timeLimit) meta.push('⏱' + lv.timeLimit + 's');
      if (lv.reverseControls) meta.push('↔️');
      if (done) meta.push('⭐' + (prog.bestRun || 0));
      if (!unlocked) meta = ['🔒'];
      btn.innerHTML =
        '<span class="maze-lvl-icon">' + (lv.badge || '🧩') + '</span>' +
        '<span class="maze-lvl-name">' + lv.name + '</span>' +
        '<span class="maze-lvl-meta">' + meta.join(' ') + '</span>';
      btn.addEventListener('click', function () { startLevel(i); });
      grid.appendChild(btn);
    });

    $('mazeHubLink').addEventListener('click', function () {
      shutdown();
      if (global.GameHub && global.GameHub.show) global.GameHub.show();
    });
  }

  function startLevel(levelIndex) {
    stopLoop();
    var levels = (global.MazeLevels && global.MazeLevels.LEVELS) || [];
    var level = levels[levelIndex];
    if (!level) return;

    var mount = clearMount();
    if (!mount) return;

    var canvas = document.createElement('canvas');
    canvas.id = 'mazeCanvas';
    canvas.className = 'maze-canvas';
    canvas.setAttribute('aria-label', 'Mê cung ' + level.name);
    mount.appendChild(canvas);

    var tile = tileSize();
    var parsed = global.MazeLevels.parseGrid(level.grid, tile);
    var questions = global.MazeLevels.buildLevelQuestions(level);

    state = {
      view: 'play',
      levelIndex: levelIndex,
      level: level,
      parsed: parsed,
      tile: tile,
      questions: questions,
      qIndex: 0,
      hearts: level.hearts || 3,
      starsGot: 0,
      quizActive: false,
      finished: false,
      disabledTraps: {},
      disabledMonsters: {},
      timeLeft: level.timeLimit || 0,
      px: parsed.start.px,
      py: parsed.start.py,
      camX: parsed.start.px,
      camY: parsed.start.py,
      speed: level.speed || 155,
      monsterData: parsed.monsters.map(function (m) {
        return {
          id: m.id,
          px: m.px,
          py: m.py,
          tx: m.px,
          ty: m.py,
          speed: (level.speed || 155) * 0.55,
          wait: 0
        };
      }),
      canvas: canvas,
      ctx: canvas.getContext('2d'),
      lastTick: 0,
      keys: {},
      themeSeed: level.id * 7919 + 17
    };

    state.monsterData.forEach(function (m) { pickMonsterTarget(m); });

    global.__kidMazeActive = true;
    setUiMode('play');

    if (global.GameInput) {
      global.GameInput.bindTouchPad(touch, { left: 'left', right: 'right', down: 'down', jump: 'up' });
    }

    canvas.tabIndex = 0;
    canvas.focus();

    function onKeyDown(e) {
      state.keys[e.code] = true;
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'KeyW', 'KeyA', 'KeyS', 'KeyD'].indexOf(e.code) >= 0) {
        e.preventDefault();
      }
    }
    function onKeyUp(e) { state.keys[e.code] = false; }
    state._keyDown = onKeyDown;
    state._keyUp = onKeyUp;
    global.addEventListener('keydown', onKeyDown);
    global.addEventListener('keyup', onKeyUp);

    state._resize = function () { resizeCanvas(); };
    global.addEventListener('resize', state._resize);
    if (global.visualViewport) {
      global.visualViewport.addEventListener('resize', state._resize);
    }

    resizeCanvas();
    loopId = requestAnimationFrame(gameLoop);
  }

  function resizeCanvas() {
    if (!state || state.view !== 'play' || !state.canvas) return;
    var canvas = state.canvas;
    var stage = $('gameStage');
    var rect = stage ? stage.getBoundingClientRect() : canvas.parentElement.getBoundingClientRect();
    var w = Math.max(320, Math.floor(rect.width));
    var h = Math.max(240, Math.floor(rect.height));
    var dpr = Math.min(2, global.devicePixelRatio || 1);

    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';

    state.viewW = w;
    state.viewH = h;
    state.dpr = dpr;
  }

  function isHeld(code) {
    return !!(state && state.keys[code]);
  }

  function readMoveInput() {
    var rev = !!state.level.reverseControls;
    var mx = 0;
    var my = 0;
    if (isHeld('ArrowLeft') || isHeld('KeyA') || touch.left) mx += rev ? 1 : -1;
    if (isHeld('ArrowRight') || isHeld('KeyD') || touch.right) mx += rev ? -1 : 1;
    if (isHeld('ArrowUp') || isHeld('KeyW') || touch.up) my += rev ? 1 : -1;
    if (isHeld('ArrowDown') || isHeld('KeyS') || touch.down) my += rev ? -1 : 1;
    return { mx: mx, my: my };
  }

  function resolveCircleWalls(px, py, radius) {
    var p = state.parsed;
    var tile = state.tile;
    var minGx = Math.floor((px - radius) / tile) - 1;
    var maxGx = Math.floor((px + radius) / tile) + 1;
    var minGy = Math.floor((py - radius) / tile) - 1;
    var maxGy = Math.floor((py + radius) / tile) + 1;

    for (var gy = minGy; gy <= maxGy; gy++) {
      for (var gx = minGx; gx <= maxGx; gx++) {
        if (gy < 0 || gx < 0 || gy >= p.rows || gx >= p.cols) continue;
        if (!p.wallMap[gy][gx]) continue;

        var left = gx * tile;
        var top = gy * tile;
        var right = left + tile;
        var bottom = top + tile;
        var closestX = Math.max(left, Math.min(px, right));
        var closestY = Math.max(top, Math.min(py, bottom));
        var dx = px - closestX;
        var dy = py - closestY;
        var distSq = dx * dx + dy * dy;

        if (distSq < radius * radius) {
          if (distSq < 0.0001) {
            px += tile * 0.5;
            continue;
          }
          var dist = Math.sqrt(distSq);
          var push = radius - dist;
          px += (dx / dist) * push;
          py += (dy / dist) * push;
        }
      }
    }
    return { px: px, py: py };
  }

  function dist(ax, ay, bx, by) {
    var dx = ax - bx;
    var dy = ay - by;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function pickMonsterTarget(m) {
    var p = state.parsed;
    var dirs = [
      { dx: 1, dy: 0 }, { dx: -1, dy: 0 },
      { dx: 0, dy: 1 }, { dx: 0, dy: -1 }
    ];
    var shuffled = dirs.slice();
    for (var i = shuffled.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = shuffled[i]; shuffled[i] = shuffled[j]; shuffled[j] = t;
    }
    var gx = Math.round(m.px / state.tile - 0.5);
    var gy = Math.round(m.py / state.tile - 0.5);
    for (var d = 0; d < shuffled.length; d++) {
      var nx = gx + shuffled[d].dx;
      var ny = gy + shuffled[d].dy;
      if (nx < 0 || ny < 0 || nx >= p.cols || ny >= p.rows) continue;
      if (p.wallMap[ny][nx]) continue;
      if (nx === p.exit.x && ny === p.exit.y) continue;
      m.tx = nx * state.tile + state.tile / 2;
      m.ty = ny * state.tile + state.tile / 2;
      return;
    }
    m.tx = m.px;
    m.ty = m.py;
  }

  function updateMonsters(dt) {
    var sec = dt / 1000;
    state.monsterData.forEach(function (m) {
      if (state.disabledMonsters[m.id]) return;

      if (m.wait > 0) {
        m.wait -= dt;
        return;
      }

      var d = dist(m.px, m.py, m.tx, m.ty);
      if (d < 4) {
        pickMonsterTarget(m);
        m.wait = 400 + Math.random() * 600;
        return;
      }

      var vx = (m.tx - m.px) / d;
      var vy = (m.ty - m.py) / d;
      var step = m.speed * sec;
      if (step > d) step = d;
      m.px += vx * step;
      m.py += vy * step;

      var r = playerRadius(state.tile) * 0.9;
      var resolved = resolveCircleWalls(m.px, m.py, r);
      m.px = resolved.px;
      m.py = resolved.py;

      if (dist(m.px, m.py, state.px, state.py) < state.tile * 0.55) {
        triggerQuiz('monster', m.id);
      }
    });
  }

  function checkEntityCollisions() {
    var hitR = state.tile * 0.42;

    if (dist(state.px, state.py, state.parsed.exit.px, state.parsed.exit.py) < hitR) {
      winLevel();
      return;
    }

    state.parsed.traps.forEach(function (t) {
      if (state.disabledTraps[t.id]) return;
      if (dist(state.px, state.py, t.px, t.py) < hitR) {
        triggerQuiz('trap', t.id);
      }
    });
  }

  function updatePlayer(dt) {
    if (state.quizActive) return;

    var inp = readMoveInput();
    if (!inp.mx && !inp.my) return;

    var len = Math.sqrt(inp.mx * inp.mx + inp.my * inp.my);
    var nx = inp.mx / len;
    var ny = inp.my / len;
    var step = state.speed * (dt / 1000);

    state.px += nx * step;
    state.py += ny * step;

    var r = playerRadius(state.tile);
    var resolved = resolveCircleWalls(state.px, state.py, r);
    state.px = resolved.px;
    state.py = resolved.py;

    checkEntityCollisions();
  }

  function updateCamera(dt) {
    var p = state.parsed;
    var tile = state.tile;
    var mapW = p.cols * tile;
    var mapH = p.rows * tile;
    var viewTiles = 13;
    var scale = Math.min(state.viewW, state.viewH) / (viewTiles * tile);
    var viewWorldW = state.viewW / scale;
    var viewWorldH = state.viewH / scale;

    var targetX = state.px - viewWorldW / 2;
    var targetY = state.py - viewWorldH / 2;
    targetX = Math.max(0, Math.min(targetX, Math.max(0, mapW - viewWorldW)));
    targetY = Math.max(0, Math.min(targetY, Math.max(0, mapH - viewWorldH)));

    var lerp = Math.min(1, dt / 120);
    state.camX += (targetX - state.camX) * lerp;
    state.camY += (targetY - state.camY) * lerp;
    state.scale = scale;
  }

  function drawFrame() {
    var s = state;
    if (!s || s.view !== 'play') return;
    var ctx = s.ctx;
    var dpr = s.dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = true;

    var p = s.parsed;
    var tile = s.tile;
    var mapW = p.cols * tile;
    var mapH = p.rows * tile;
    var scale = s.scale || 1;

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, s.viewW, s.viewH);

    ctx.save();
    ctx.scale(scale, scale);
    ctx.translate(-s.camX, -s.camY);

    if (global.MazeThemes && global.MazeThemes.drawWorld) {
      global.MazeThemes.drawWorld(ctx, s.level, p, tile, s.themeSeed);
    } else {
      ctx.fillStyle = '#1e3a5f';
      ctx.fillRect(0, 0, mapW, mapH);
    }

    ctx.font = 'bold ' + Math.floor(tile * 0.5) + 'px "Segoe UI Emoji", "Apple Color Emoji", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    p.traps.forEach(function (t) {
      if (s.disabledTraps[t.id]) return;
      ctx.fillText('⚠️', t.px, t.py);
    });

    s.monsterData.forEach(function (m) {
      if (s.disabledMonsters[m.id]) return;
      ctx.fillText('👾', m.px, m.py);
    });

    ctx.font = 'bold ' + Math.floor(tile * 0.58) + 'px "Segoe UI Emoji", "Apple Color Emoji", sans-serif';
    ctx.fillText('🧒', s.px, s.py);

    ctx.restore();

    ctx.font = 'bold 14px Nunito, sans-serif';
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'left';
    var hearts = '';
    for (var i = 0; i < s.hearts; i++) hearts += '❤️';
    ctx.fillText(hearts, 10, 22);
    ctx.fillStyle = '#fde68a';
    ctx.fillText('⭐ ' + s.starsGot + '/' + (s.level.gates || 0), 10, 42);
    if (s.timeLeft > 0) {
      ctx.textAlign = 'right';
      ctx.fillStyle = '#fca5a5';
      ctx.fillText('⏱ ' + s.timeLeft + 's', s.viewW - 10, 22);
    }
    if (s.level.reverseControls) {
      ctx.textAlign = 'center';
      ctx.fillStyle = '#fbbf24';
      ctx.fillText('↔️ Điều khiển NGƯỢC', s.viewW / 2, s.viewH - 10);
    }
  }

  function gameLoop(ts) {
    if (!state || state.view !== 'play' || state.finished) return;
    var dt = state.lastTick ? Math.min(50, ts - state.lastTick) : 16;
    state.lastTick = ts;

    if (!state.quizActive) {
      if (state.timeLeft > 0) {
        state._timeAcc = (state._timeAcc || 0) + dt;
        if (state._timeAcc >= 1000) {
          state._timeAcc -= 1000;
          state.timeLeft--;
          if (state.timeLeft <= 0) {
            showResult(false, 'Hết giờ!');
            return;
          }
        }
      }
      updatePlayer(dt);
      updateMonsters(dt);
    }

    updateCamera(dt);
    drawFrame();
    loopId = requestAnimationFrame(gameLoop);
  }

  function triggerQuiz(type, entityId) {
    if (state.quizActive || state.finished) return;
    if (type === 'trap' && state.disabledTraps[entityId]) return;
    if (type === 'monster' && state.disabledMonsters[entityId]) return;

    var q = state.questions[state.qIndex % state.questions.length];
    if (!q) return;
    state.quizActive = true;
    state.qIndex++;

    global.GameQuizUI.show(q, {
      onCorrect: function () {
        state.quizActive = false;
        state.starsGot++;
        if (type === 'trap') state.disabledTraps[entityId] = true;
        else state.disabledMonsters[entityId] = true;
      },
      onWrong: function () {
        state.hearts--;
        if (state.hearts <= 0) {
          showResult(false, 'Hết mạng!');
          return false;
        }
        return true;
      }
    });
  }

  function winLevel() {
    if (state.finished) return;
    state.finished = true;
    if (global.MazeProgress) {
      global.MazeProgress.saveLevelResult(state.level, {
        stars: state.starsGot,
        total: state.level.gates || 0,
        finished: true
      });
    }
    if (Sfx.win) Sfx.win();
    showResult(true);
  }

  function showResult(win, msg) {
    stopLoop();
    cleanupPlayListeners();
    setUiMode('result');

    var mount = clearMount();
    if (!mount) return;

    var levels = (global.MazeLevels && global.MazeLevels.LEVELS) || [];
    var lv = levels[state.levelIndex] || state.level;
    var d = { win: win, stars: state.starsGot, total: state.level.gates || 0, msg: msg };

    var wrap = document.createElement('div');
    wrap.className = 'maze-ui maze-ui--result';
    wrap.innerHTML =
      '<div class="maze-result-card">' +
        '<h2>' + (win ? '🎉 Thoát mê cung!' : '😢 ' + (msg || 'Thử lại nhé')) + '</h2>' +
        '<p class="maze-result-stars">⭐ ' + d.stars + '/' + d.total + '</p>' +
        (win ? '<p class="maze-result-badge">🏅 Huy hiệu mê cung (nếu đủ điều kiện)</p>' : '') +
        '<div class="maze-result-actions" id="mazeResultActions"></div>' +
      '</div>';
    mount.appendChild(wrap);

    var actions = $('mazeResultActions');
    function addBtn(label, cls, fn) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'maze-act-btn ' + (cls || '');
      b.textContent = label;
      b.addEventListener('click', fn);
      actions.appendChild(b);
    }

    if (win && levels[state.levelIndex + 1] && global.MazeProgress &&
        global.MazeProgress.isLevelUnlocked(levels[state.levelIndex + 1].id)) {
      addBtn('Màn tiếp ▶', 'maze-act-btn--green', function () { startLevel(state.levelIndex + 1); });
    }
    addBtn(win ? 'Chơi lại' : 'Thử lại', 'maze-act-btn--blue', function () { startLevel(state.levelIndex); });
    if (win) {
      addBtn('📣 Chia sẻ', 'maze-act-btn--pink', function () {
        shareWin(lv, d.stars, d.total);
      });
    }
    addBtn('Chọn màn', 'maze-act-btn--purple', showLevelSelect);
  }

  function cleanupPlayListeners() {
    if (!state) return;
    if (state._keyDown) global.removeEventListener('keydown', state._keyDown);
    if (state._keyUp) global.removeEventListener('keyup', state._keyUp);
    if (state._resize) {
      global.removeEventListener('resize', state._resize);
      if (global.visualViewport) global.visualViewport.removeEventListener('resize', state._resize);
    }
    if (global.GameInput) global.GameInput.resetTouchState(touch);
  }

  function shutdown() {
    stopLoop();
    cleanupPlayListeners();
    clearMount();
    global.__kidMazeActive = false;
    state = null;
    if (global.GameInput) global.GameInput.setTouchPad('hub');
  }

  function boot() {
    if (global.GameQuizUI) global.GameQuizUI.init();
    if (global.GameAssets && global.GameAssets.Sfx) Sfx = global.GameAssets.Sfx;
    if (global.GameInput) global.GameInput.bindTouchPad(touch, { left: 'left', right: 'right', down: 'down', jump: 'up' });
    wireDomControls();

    global.__kidMazeActive = true;
    showLevelSelect();

    global.setTimeout(function () {
      var stage = $('gameStage');
      if (stage) stage.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }, 50);
  }

  global.GameMaze = { boot: boot, shutdown: shutdown };
})(window);
