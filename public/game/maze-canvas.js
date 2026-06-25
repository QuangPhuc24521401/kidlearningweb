/* ═══════════════════════════════════════════════════
   MAZE-CANVAS.JS — Mê cung 2D (Canvas thuần, sắc nét)
   Không dùng Phaser → tránh xung đột với platformer
═══════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  var TILE = 36;
  var touch = { left: false, right: false, up: false, down: false };
  var Sfx = {};
  var loopId = null;
  var state = null;

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

  /* ── Level select (DOM) ── */
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
        '<p>Tìm 🚪 lối ra · tránh ⚠️ và 👾 · trả lời đúng để qua</p>' +
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

  /* ── Play (Canvas) ── */
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

    var parsed = global.MazeLevels.parseGrid(level.grid);
    var questions = global.MazeLevels.buildLevelQuestions(level);

    state = {
      view: 'play',
      levelIndex: levelIndex,
      level: level,
      parsed: parsed,
      questions: questions,
      qIndex: 0,
      hearts: level.hearts || 3,
      starsGot: 0,
      quizActive: false,
      finished: false,
      moveLock: false,
      disabledTraps: {},
      disabledMonsters: {},
      timeLeft: level.timeLimit || 0,
      gridX: parsed.start.x,
      gridY: parsed.start.y,
      monsterData: parsed.monsters.map(function (m) {
        return { id: m.id, x: m.x, y: m.y };
      }),
      canvas: canvas,
      ctx: canvas.getContext('2d'),
      lastTick: 0,
      keys: {}
    };

    global.__kidMazeActive = true;
    setUiMode('play');

    if (global.GameInput) {
      global.GameInput.bindTouchPad(touch, { left: 'left', right: 'right', down: 'down', jump: 'up' });
    }

    canvas.tabIndex = 0;
    canvas.focus();

    function onKeyDown(e) {
      state.keys[e.code] = true;
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].indexOf(e.code) >= 0) {
        e.preventDefault();
      }
    }
    function onKeyUp(e) { state.keys[e.code] = false; }
    state._keyDown = onKeyDown;
    state._keyUp = onKeyUp;
    global.addEventListener('keydown', onKeyDown);
    global.addEventListener('keyup', onKeyUp);

    state._resize = function () { resizeAndDraw(); };
    global.addEventListener('resize', state._resize);
    if (global.visualViewport) {
      global.visualViewport.addEventListener('resize', state._resize);
    }

    resizeAndDraw();
    loopId = requestAnimationFrame(gameLoop);
  }

  function resizeAndDraw() {
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
    drawFrame(0);
  }

  function drawFrame(dt) {
    var s = state;
    if (!s || s.view !== 'play') return;
    var ctx = s.ctx;
    var dpr = s.dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = true;

    var p = s.parsed;
    var mapW = p.cols * TILE;
    var mapH = p.rows * TILE;
    var scale = Math.min(s.viewW / mapW, s.viewH / mapH) * 0.92;
    var offX = (s.viewW - mapW * scale) / 2;
    var offY = (s.viewH - mapH * scale) / 2;

    s.scale = scale;
    s.offX = offX;
    s.offY = offY;

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, s.viewW, s.viewH);

    ctx.save();
    ctx.translate(offX, offY);
    ctx.scale(scale, scale);

    for (var y = 0; y < p.rows; y++) {
      for (var x = 0; x < p.cols; x++) {
        var ch = s.level.grid[y][x];
        var px = x * TILE;
        var py = y * TILE;
        if (ch === '#') {
          ctx.fillStyle = '#334155';
          ctx.fillRect(px, py, TILE, TILE);
          ctx.strokeStyle = '#1e293b';
          ctx.strokeRect(px + 0.5, py + 0.5, TILE - 1, TILE - 1);
        } else {
          ctx.fillStyle = ch === 'E' ? 'rgba(34,197,94,0.35)' : '#1e3a5f';
          ctx.fillRect(px + 1, py + 1, TILE - 2, TILE - 2);
        }
      }
    }

    ctx.font = 'bold ' + Math.floor(TILE * 0.55) + 'px "Segoe UI Emoji", "Apple Color Emoji", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.fillText('🚪', p.exit.x * TILE + TILE / 2, p.exit.y * TILE + TILE / 2);

    p.traps.forEach(function (t) {
      if (s.disabledTraps[t.id]) return;
      ctx.fillText('⚠️', t.x * TILE + TILE / 2, t.y * TILE + TILE / 2);
    });

    s.monsterData.forEach(function (m) {
      if (s.disabledMonsters[m.id]) return;
      ctx.fillText('👾', m.x * TILE + TILE / 2, m.y * TILE + TILE / 2);
    });

    ctx.fillText('🧒', s.gridX * TILE + TILE / 2, s.gridY * TILE + TILE / 2);

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
    var dt = state.lastTick ? ts - state.lastTick : 0;
    state.lastTick = ts;

    if (!state.quizActive) {
      if (state.timeLeft > 0 && dt > 0) {
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
      handleInput();
      updateMonsters();
    }

    drawFrame(dt);
    loopId = requestAnimationFrame(gameLoop);
  }

  function handleInput() {
    if (state.moveLock || state.quizActive) return;
    var rev = !!state.level.reverseControls;
    var dx = 0;
    var dy = 0;
    var k = state.keys;

    if (edgeKey('ArrowLeft') || edgeKey('KeyA') || edgeTouch('left')) dx = rev ? 1 : -1;
    else if (edgeKey('ArrowRight') || edgeKey('KeyD') || edgeTouch('right')) dx = rev ? -1 : 1;
    else if (edgeKey('ArrowUp') || edgeKey('KeyW') || edgeTouch('up')) dy = rev ? 1 : -1;
    else if (edgeKey('ArrowDown') || edgeKey('KeyS') || edgeTouch('down')) dy = rev ? -1 : 1;

    if (dx || dy) tryMove(dx, dy);

    state._prevKeys = {};
    Object.keys(k).forEach(function (code) { state._prevKeys[code] = k[code]; });
    state._prevTouch = { left: touch.left, right: touch.right, up: touch.up, down: touch.down };
  }

  function edgeKey(code) {
    return state.keys[code] && !(state._prevKeys && state._prevKeys[code]);
  }

  function edgeTouch(key) {
    return touch[key] && !(state._prevTouch && state._prevTouch[key]);
  }

  function isWall(gx, gy) {
    var p = state.parsed;
    if (gx < 0 || gy < 0 || gx >= p.cols || gy >= p.rows) return true;
    return state.level.grid[gy][gx] === '#';
  }

  function tryMove(dx, dy) {
    var ngx = state.gridX + dx;
    var ngy = state.gridY + dy;
    if (isWall(ngx, ngy)) return;

    state.gridX = ngx;
    state.gridY = ngy;
    state.moveLock = true;
    global.setTimeout(function () {
      state.moveLock = false;
      afterMove();
    }, 80);
  }

  function afterMove() {
    if (state.gridX === state.parsed.exit.x && state.gridY === state.parsed.exit.y) {
      winLevel();
      return;
    }
    var trap = state.parsed.traps.find(function (t) {
      return t.x === state.gridX && t.y === state.gridY && !state.disabledTraps[t.id];
    });
    if (trap) { triggerQuiz('trap', trap.id); return; }
    var mon = state.monsterData.find(function (m) {
      return m.x === state.gridX && m.y === state.gridY && !state.disabledMonsters[m.id];
    });
    if (mon) triggerQuiz('monster', mon.id);
  }

  function triggerQuiz(type, entityId) {
    if (state.quizActive) return;
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

  function updateMonsters() {
    if (Math.random() > 0.03) return;
    var dirs = [{ dx: 1, dy: 0 }, { dx: -1, dy: 0 }, { dx: 0, dy: 1 }, { dx: 0, dy: -1 }];
    state.monsterData.forEach(function (m) {
      if (state.disabledMonsters[m.id]) return;
      var d = dirs[Math.floor(Math.random() * dirs.length)];
      var nx = m.x + d.dx;
      var ny = m.y + d.dy;
      if (!isWall(nx, ny) && !(nx === state.parsed.exit.x && ny === state.parsed.exit.y)) {
        m.x = nx;
        m.y = ny;
        if (m.x === state.gridX && m.y === state.gridY) {
          triggerQuiz('monster', m.id);
        }
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
