/* ═══════════════════════════════════════════════════
   DIGGER-CANVAS.JS — Game đào vàng (Gold Miner style)
   Lấy vàng → trả lời câu hỏi → mới vào túi
═══════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  var Sfx = {};
  var loopId = null;
  var state = null;
  var fireTouch = false;

  var SWING_SPEED = 1.65;
  var MAX_ANGLE = 1.25;
  var EXTEND_SPEED = 320;
  var PULL_BASE = 240;
  var ROPE_MIN = 36;

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
      jumpBtn.textContent = '⛏';
      jumpBtn.setAttribute('aria-label', 'Thả móc');
    }
    var left = document.querySelector('#gameTouch [data-key="left"]');
    var right = document.querySelector('#gameTouch [data-key="right"]');
    var down = document.querySelector('#gameTouch [data-key="down"]');
    if (left) left.style.visibility = mode === 'play' ? 'hidden' : '';
    if (right) right.style.visibility = mode === 'play' ? 'hidden' : '';
    if (down) down.style.visibility = mode === 'play' ? 'hidden' : '';
    var replay = $('btnReplay');
    var mapBtn = $('btnMap');
    var ctrls = $('gameControls');
    if (replay) replay.hidden = mode !== 'play';
    if (mapBtn) {
      mapBtn.hidden = mode !== 'play';
      mapBtn.title = 'Chọn màn đào vàng';
    }
    if (ctrls) ctrls.classList.toggle('is-map-mode', mode === 'map' || mode === 'result');
  }

  function wireDomControls() {
    var sound = $('btnSound');
    var replay = $('btnReplay');
    var map = $('btnMap');
    if (sound && !sound._diggerBound) {
      sound._diggerBound = true;
      sound.addEventListener('click', function () {
        if (!state || state.view !== 'play') return;
        var m = Sfx.toggleMute ? Sfx.toggleMute() : false;
        sound.textContent = m ? '🔇' : '🔊';
        sound.classList.toggle('is-muted', m);
      });
    }
    if (replay && !replay._diggerBound) {
      replay._diggerBound = true;
      replay.addEventListener('click', function () {
        if (!state || state.view !== 'play') return;
        startLevel(state.levelIndex);
      });
    }
    if (map && !map._diggerBound) {
      map._diggerBound = true;
      map.addEventListener('click', function () {
        if (!global.__kidDiggerActive) return;
        showLevelSelect();
      });
    }
  }

  function stopLoop() {
    if (loopId) {
      cancelAnimationFrame(loopId);
      loopId = null;
    }
  }

  function showLevelSelect() {
    stopLoop();
    cleanupPlayListeners();
    state = { view: 'select' };
    global.__kidDiggerActive = true;
    setUiMode('map');

    var mount = clearMount();
    if (!mount) return;

    var wrap = document.createElement('div');
    wrap.className = 'maze-ui maze-ui--select';
    wrap.innerHTML =
      '<div class="maze-select-head">' +
        '<h2>⛏️ Chọn màn đào vàng</h2>' +
        '<p>Móc đung đưa · nhấn <b>Space</b> hoặc nút ⛏ để thả · trả lời đúng mới giữ vàng!</p>' +
      '</div>' +
      '<div class="maze-select-grid" id="diggerSelectGrid"></div>' +
      '<button type="button" class="maze-hub-link" id="diggerHubLink">← Chọn game khác</button>';
    mount.appendChild(wrap);

    var grid = $('diggerSelectGrid');
    var levels = (global.DiggerLevels && global.DiggerLevels.LEVELS) || [];
    var DP = global.DiggerProgress;

    levels.forEach(function (lv, i) {
      var unlocked = DP ? DP.isLevelUnlocked(lv.id) : lv.id === 1;
      var prog = DP ? DP.getLevelProgress(lv.id) : {};
      var done = (prog.completedRuns || 0) > 0;
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'maze-lvl-btn' + (unlocked ? '' : ' is-locked') + (done ? ' is-done' : '');
      btn.disabled = !unlocked;
      var meta = [];
      meta.push('🎯' + lv.target);
      meta.push('⏱' + lv.timeLimit + 's');
      if (done) meta.push('⭐' + (prog.bestRun || 0));
      if (!unlocked) meta = ['🔒'];
      btn.innerHTML =
        '<span class="maze-lvl-icon">' + (lv.badge || '⛏️') + '</span>' +
        '<span class="maze-lvl-name">' + lv.name + '</span>' +
        '<span class="maze-lvl-meta">' + meta.join(' ') + '</span>';
      btn.addEventListener('click', function () { startLevel(i); });
      grid.appendChild(btn);
    });

    $('diggerHubLink').addEventListener('click', function () {
      shutdown();
      if (global.GameHub && global.GameHub.show) global.GameHub.show();
    });
  }

  function startLevel(levelIndex) {
    stopLoop();
    cleanupPlayListeners();
    var levels = (global.DiggerLevels && global.DiggerLevels.LEVELS) || [];
    var level = levels[levelIndex];
    if (!level) return;

    var mount = clearMount();
    if (!mount) return;

    var canvas = document.createElement('canvas');
    canvas.id = 'diggerCanvas';
    canvas.className = 'maze-canvas digger-canvas';
    canvas.setAttribute('aria-label', 'Đào vàng ' + level.name);
    mount.appendChild(canvas);

    state = {
      view: 'play',
      levelIndex: levelIndex,
      level: level,
      questions: global.DiggerLevels.buildLevelQuestions(level),
      qIndex: 0,
      hearts: level.hearts || 3,
      bagGold: 0,
      target: level.target || 300,
      timeLeft: level.timeLimit || 60,
      quizActive: false,
      finished: false,
      clawMode: 'swing',
      angle: -0.6,
      swingDir: 1,
      ropeLen: ROPE_MIN,
      grabbed: null,
      pendingItem: null,
      items: [],
      canvas: canvas,
      ctx: canvas.getContext('2d'),
      lastTick: 0,
      keys: {},
      minerX: 0,
      minerY: 72,
      groundY: 130,
      worldW: 800,
      worldH: 500
    };

    global.__kidDiggerActive = true;
    setUiMode('play');

    if (global.GameInput) {
      global.GameInput.bindTouchPad({ fire: false }, { jump: 'fire' });
    }

    canvas.tabIndex = 0;
    canvas.focus();

    function onKeyDown(e) {
      state.keys[e.code] = true;
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        tryFire();
      }
    }
    function onKeyUp(e) { state.keys[e.code] = false; }
    state._keyDown = onKeyDown;
    state._keyUp = onKeyUp;
    global.addEventListener('keydown', onKeyDown);
    global.addEventListener('keyup', onKeyUp);

    var jumpBtn = document.querySelector('#gameTouch [data-key="jump"]');
    if (jumpBtn && !jumpBtn._diggerFire) {
      jumpBtn._diggerFire = true;
      jumpBtn.addEventListener('pointerdown', function (e) {
        e.preventDefault();
        fireTouch = true;
        tryFire();
      });
    }

    state._resize = function () { resizeCanvas(); };
    global.addEventListener('resize', state._resize);
    if (global.visualViewport) global.visualViewport.addEventListener('resize', state._resize);

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
    state.worldW = w;
    state.worldH = h;
    state.minerX = w / 2;
    state.groundY = Math.floor(h * 0.22);
    state.minerY = state.groundY - 28;
    if (!state.items || !state.items.length) {
      state.items = global.DiggerLevels.spawnItems(state.level, w, state.groundY, h - 10);
    }
  }

  function tryFire() {
    if (!state || state.quizActive || state.finished || state.clawMode !== 'swing') return;
    state.clawMode = 'extend';
    if (Sfx.gate) Sfx.gate();
  }

  function clawTip() {
    return {
      x: state.minerX + Math.sin(state.angle) * state.ropeLen,
      y: state.minerY + Math.cos(state.angle) * state.ropeLen
    };
  }

  function hitItem(tip) {
    var hit = null;
    var best = Infinity;
    state.items.forEach(function (it) {
      if (!it.active) return;
      var dx = tip.x - it.x, dy = tip.y - it.y;
      var d = Math.sqrt(dx * dx + dy * dy);
      if (d < it.radius + 8 && d < best) {
        best = d;
        hit = it;
      }
    });
    return hit;
  }

  function maxRope() {
    var h = state.worldH - state.minerY;
    var w = state.worldW;
    return Math.sqrt(h * h + (w * 0.45) * (w * 0.45));
  }

  function updateSwing(dt) {
    var sec = dt / 1000;
    state.angle += state.swingDir * SWING_SPEED * sec;
    if (state.angle >= MAX_ANGLE) { state.angle = MAX_ANGLE; state.swingDir = -1; }
    if (state.angle <= -MAX_ANGLE) { state.angle = -MAX_ANGLE; state.swingDir = 1; }
  }

  function updateExtend(dt) {
    var sec = dt / 1000;
    state.ropeLen += EXTEND_SPEED * sec;
    var tip = clawTip();
    var item = hitItem(tip);
    if (item) {
      state.grabbed = item;
      state.clawMode = 'pull';
      return;
    }
    if (state.ropeLen >= maxRope() || tip.y >= state.worldH - 8) {
      state.clawMode = 'pull';
    }
  }

  function updatePull(dt) {
    var sec = dt / 1000;
    var weight = state.grabbed ? state.grabbed.weight : 1;
    var speed = PULL_BASE / weight;
    state.ropeLen -= speed * sec;
    if (state.ropeLen <= ROPE_MIN) {
      state.ropeLen = ROPE_MIN;
      onClawHome();
    }
  }

  function onClawHome() {
    if (state.grabbed && state.grabbed.active) {
      var item = state.grabbed;
      state.grabbed = null;
      state.clawMode = 'swing';
      if (item.quiz) {
        state.pendingItem = item;
        triggerQuiz(item);
      } else {
        item.active = false;
        state.bagGold += item.value;
        if (Sfx.coin) Sfx.coin();
        checkWin();
      }
    } else {
      state.grabbed = null;
      state.clawMode = 'swing';
    }
  }

  function triggerQuiz(item) {
    if (state.quizActive) return;
    var q = state.questions[state.qIndex % state.questions.length];
    if (!q) {
      acceptGold(item);
      return;
    }
    state.quizActive = true;
    state.qIndex++;

    global.GameQuizUI.show(q, {
      onCorrect: function () {
        state.quizActive = false;
        acceptGold(item);
      },
      onWrong: function () {
        state.hearts--;
        state.quizActive = false;
        if (item) item.active = false;
        state.pendingItem = null;
        if (Sfx.hurt) Sfx.hurt();
        if (state.hearts <= 0) {
          showResult(false, 'Hết mạng!');
          return false;
        }
        checkWin();
        return false;
      }
    });
  }

  function acceptGold(item) {
    if (!item) return;
    item.active = false;
    state.bagGold += item.value;
    state.pendingItem = null;
    if (Sfx.coin) Sfx.coin();
    checkWin();
  }

  function checkWin() {
    if (state.bagGold >= state.target) {
      winLevel();
    }
  }

  function updateTimer(dt) {
    if (state.quizActive) return;
    state._timeAcc = (state._timeAcc || 0) + dt;
    if (state._timeAcc >= 1000) {
      state._timeAcc -= 1000;
      state.timeLeft--;
      if (state.timeLeft <= 0) {
        if (state.bagGold >= state.target) winLevel();
        else showResult(false, 'Hết giờ!');
      }
    }
  }

  function gameLoop(ts) {
    if (!state || state.view !== 'play' || state.finished) return;
    var dt = state.lastTick ? Math.min(50, ts - state.lastTick) : 16;
    state.lastTick = ts;

    if (!state.quizActive) {
      updateTimer(dt);
      if (state.clawMode === 'swing') updateSwing(dt);
      else if (state.clawMode === 'extend') updateExtend(dt);
      else if (state.clawMode === 'pull') updatePull(dt);
    }

    drawFrame();
    loopId = requestAnimationFrame(gameLoop);
  }

  function drawFrame() {
    var s = state;
    if (!s || s.view !== 'play') return;
    var ctx = s.ctx;
    var dpr = s.dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = true;

    var DA = global.DiggerAssets;
    if (DA) DA.drawSkyGround(ctx, s.worldW, s.worldH, s.groundY);

    s.items.forEach(function (it) {
      if (it.active && it !== s.grabbed && DA) DA.drawItem(ctx, it);
    });

    var tip = clawTip();
    ctx.strokeStyle = '#5d4037';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(s.minerX, s.minerY);
    ctx.lineTo(tip.x, tip.y);
    ctx.stroke();

    if (s.grabbed && s.grabbed.active) {
      ctx.save();
      ctx.translate(tip.x - s.grabbed.x, tip.y - s.grabbed.y);
      if (DA) DA.drawItem(ctx, s.grabbed);
      ctx.restore();
    }

    ctx.save();
    ctx.translate(tip.x, tip.y);
    ctx.rotate(-s.angle);
    if (DA) DA.drawHook(ctx, 40);
    ctx.restore();

    if (DA) DA.drawMiner(ctx, 56, s.minerX - 28, s.minerY - 36);

    var fill = s.target > 0 ? s.bagGold / s.target : 0;
    if (DA) DA.drawBag(ctx, 52, 16, s.groundY - 20, fill);

    ctx.font = 'bold 14px Nunito, sans-serif';
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'left';
    ctx.strokeStyle = 'rgba(0,0,0,0.4)';
    ctx.lineWidth = 3;
    var hud = '💰 ' + s.bagGold + ' / ' + s.target;
    ctx.strokeText(hud, 78, 32);
    ctx.fillText(hud, 78, 32);

    var hearts = '';
    for (var i = 0; i < s.hearts; i++) hearts += '❤️';
    ctx.fillText(hearts, 12, 28);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#fde68a';
    var timeTxt = '⏱ ' + s.timeLeft + 's';
    ctx.strokeText(timeTxt, s.viewW - 12, 28);
    ctx.fillText(timeTxt, s.viewW - 12, 28);

    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    if (s.clawMode === 'swing' && !s.quizActive) {
      var hint = 'Nhấn Space / ⛏ để thả móc';
      ctx.font = 'bold 13px Nunito, sans-serif';
      ctx.strokeText(hint, s.viewW / 2, s.viewH - 14);
      ctx.fillText(hint, s.viewW / 2, s.viewH - 14);
    }
  }

  function winLevel() {
    if (state.finished) return;
    state.finished = true;
    var stars = Math.max(1, Math.min(3, state.hearts));
    if (global.DiggerProgress) {
      global.DiggerProgress.saveLevelResult(state.level, { stars: stars, finished: true });
    }
    if (Sfx.win) Sfx.win();
    showResult(true, stars);
  }

  function showResult(win, starsOrMsg, msg) {
    stopLoop();
    cleanupPlayListeners();
    setUiMode('result');
    var mount = clearMount();
    if (!mount) return;

    var stars = typeof starsOrMsg === 'number' ? starsOrMsg : 0;
    var message = typeof starsOrMsg === 'string' ? starsOrMsg : msg;

    var wrap = document.createElement('div');
    wrap.className = 'maze-ui maze-ui--result';
    wrap.innerHTML =
      '<div class="maze-result-card">' +
        '<h2>' + (win ? '🎉 Đủ vàng mục tiêu!' : '😢 ' + (message || 'Thử lại nhé')) + '</h2>' +
        (win ? '<p class="maze-result-stars">⭐ ' + stars + '/3 · 💰 ' + state.bagGold + '</p>' : '') +
        '<div class="maze-result-actions" id="diggerResultActions"></div>' +
      '</div>';
    mount.appendChild(wrap);

    var actions = $('diggerResultActions');
    var levels = (global.DiggerLevels && global.DiggerLevels.LEVELS) || [];

    function addBtn(label, cls, fn) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'maze-act-btn ' + (cls || '');
      b.textContent = label;
      b.addEventListener('click', fn);
      actions.appendChild(b);
    }

    if (win && levels[state.levelIndex + 1] && global.DiggerProgress &&
        global.DiggerProgress.isLevelUnlocked(levels[state.levelIndex + 1].id)) {
      addBtn('Màn tiếp ▶', 'maze-act-btn--green', function () { startLevel(state.levelIndex + 1); });
    }
    addBtn(win ? 'Chơi lại' : 'Thử lại', 'maze-act-btn--blue', function () { startLevel(state.levelIndex); });
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
    fireTouch = false;
  }

  function shutdown() {
    stopLoop();
    cleanupPlayListeners();
    clearMount();
    global.__kidDiggerActive = false;
    state = null;
    if (global.GameInput) global.GameInput.setTouchPad('hub');
  }

  function boot() {
    if (global.GameQuizUI) global.GameQuizUI.init();
    if (global.GameAssets && global.GameAssets.Sfx) Sfx = global.GameAssets.Sfx;
    wireDomControls();
    global.__kidDiggerActive = true;
    showLevelSelect();
    global.setTimeout(function () {
      var stage = $('gameStage');
      if (stage) stage.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }, 50);
  }

  global.GameDigger = { boot: boot, shutdown: shutdown };
})(window);
