/* ═══════════════════════════════════════════════════
   MEMORY-CANVAS.JS — Ghép cặp trí nhớ
═══════════════════════════════════════════════════ */
(function (global) {
  'use strict';

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
    var replay = $('btnReplay');
    var mapBtn = $('btnMap');
    var ctrls = $('gameControls');
    if (replay) replay.hidden = mode !== 'play';
    if (mapBtn) {
      mapBtn.hidden = mode !== 'play';
      mapBtn.title = 'Chọn màn ghép cặp';
    }
    if (ctrls) ctrls.classList.toggle('is-map-mode', mode === 'map' || mode === 'result');
  }

  function wireDomControls() {
    var replay = $('btnReplay');
    var map = $('btnMap');
    if (replay && !replay._memBound) {
      replay._memBound = true;
      replay.addEventListener('click', function () {
        if (!state || state.view !== 'play') return;
        startLevel(state.levelIndex);
      });
    }
    if (map && !map._memBound) {
      map._memBound = true;
      map.addEventListener('click', function () {
        if (!global.__kidMemoryActive) return;
        showLevelSelect();
      });
    }
  }

  function showLevelSelect() {
    state = { view: 'select' };
    global.__kidMemoryActive = true;
    setUiMode('map');
    var mount = clearMount();
    if (!mount) return;
    var wrap = document.createElement('div');
    wrap.className = 'maze-ui maze-ui--select memory-ui';
    wrap.innerHTML =
      '<div class="maze-select-head">' +
        '<h2>🃏 Ghép cặp trí nhớ</h2>' +
        '<p>Lật 2 thẻ giống nhau · trả lời câu hỏi để nhận sao</p>' +
      '</div>' +
      '<div class="maze-select-grid" id="memSelectGrid"></div>' +
      '<button type="button" class="maze-hub-link" id="memHubLink">← Chọn game khác</button>';
    mount.appendChild(wrap);
    var grid = $('memSelectGrid');
    var levels = (global.MemoryLevels && global.MemoryLevels.LEVELS) || [];
    var MP = global.MemoryProgress;
    levels.forEach(function (lv, i) {
      var unlocked = MP ? MP.isLevelUnlocked(lv.id) : lv.id === 1;
      var prog = MP ? MP.getLevelProgress(lv.id) : {};
      var done = (prog.completedRuns || 0) > 0;
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'maze-lvl-btn' + (unlocked ? '' : ' is-locked') + (done ? ' is-done' : '');
      btn.disabled = !unlocked;
      var meta = [lv.pairs + ' cặp', '⏱' + lv.timeLimit + 's'];
      if (done) meta.push('⭐' + (prog.bestRun || 0));
      if (!unlocked) meta = ['🔒'];
      btn.innerHTML =
        '<span class="maze-lvl-icon">' + (lv.badge || '🃏') + '</span>' +
        '<span class="maze-lvl-name">' + lv.name + '</span>' +
        '<span class="maze-lvl-meta">' + meta.join(' ') + '</span>';
      btn.addEventListener('click', function () { startLevel(i); });
      grid.appendChild(btn);
    });
    $('memHubLink').addEventListener('click', function () {
      shutdown();
      if (global.GameHub && global.GameHub.show) global.GameHub.show();
    });
  }

  function showResult(won) {
    setUiMode('result');
    var mount = clearMount();
    if (!mount || !state || !state.level) return;
    var lv = state.level;
    var total = lv.gates || 1;
    var stars = won ? Math.max(1, Math.min(total, state.starsGot)) : 0;
    if (won && global.MemoryProgress) {
      global.MemoryProgress.saveLevelResult(lv, { stars: stars, total: total, finished: true });
    }
    var wrap = document.createElement('div');
    wrap.className = 'maze-ui maze-ui--result';
    wrap.innerHTML =
      '<h2>' + (won ? '🎉 Tuyệt vời!' : '😢 Thử lại nhé!') + '</h2>' +
      '<p>' + lv.name + ' · ' + stars + '/' + total + ' ⭐</p>' +
      '<div class="maze-result-actions">' +
        '<button type="button" class="maze-act-btn maze-act-btn--green" id="memRetry">Chơi lại</button>' +
        '<button type="button" class="maze-act-btn maze-act-btn--purple" id="memMap">Chọn màn</button>' +
      '</div>';
    mount.appendChild(wrap);
    $('memRetry').addEventListener('click', function () { startLevel(state.levelIndex); });
    $('memMap').addEventListener('click', showLevelSelect);
  }

  function startLevel(levelIndex) {
    var levels = (global.MemoryLevels && global.MemoryLevels.LEVELS) || [];
    var level = levels[levelIndex];
    if (!level) return;
    var mount = clearMount();
    if (!mount) return;
    setUiMode('play');
    var deck = global.MemoryLevels.buildDeck(level);
    var questions = global.MemoryLevels.buildLevelQuestions(level);
    state = {
      view: 'play',
      levelIndex: levelIndex,
      level: level,
      deck: deck,
      flipped: [],
      matched: {},
      pairsFound: 0,
      hearts: level.hearts || 3,
      starsGot: 0,
      qIndex: 0,
      quizActive: false,
      timeLeft: level.timeLimit || 90,
      questions: questions,
      lock: false
    };
    global.__kidMemoryActive = true;
    renderBoard();
    if (state.timer) clearInterval(state.timer);
    state.timer = setInterval(function () {
      if (!state || state.view !== 'play' || state.quizActive) return;
      state.timeLeft -= 1;
      updateHud();
      if (state.timeLeft <= 0) {
        clearInterval(state.timer);
        showResult(false);
      }
    }, 1000);
  }

  function updateHud() {
    var hud = $('memHud');
    if (!hud || !state) return;
    hud.textContent = '❤️ ' + state.hearts + '  ·  ⭐ ' + state.starsGot + '/' + (state.level.gates || 1) + '  ·  ⏱ ' + state.timeLeft + 's';
  }

  function renderBoard() {
    var mount = clearMount();
    if (!mount || !state) return;
    var wrap = document.createElement('div');
    wrap.className = 'memory-ui memory-ui--play';
    var cols = state.deck.length <= 8 ? 4 : (state.deck.length <= 12 ? 4 : 4);
    wrap.innerHTML =
      '<div class="memory-hud" id="memHud"></div>' +
      '<div class="memory-grid" id="memGrid" style="--mem-cols:' + cols + '"></div>';
    mount.appendChild(wrap);
    updateHud();
    var grid = $('memGrid');
    state.deck.forEach(function (card, idx) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'memory-card' + (state.matched[card.uid] ? ' is-matched' : '');
      btn.dataset.idx = String(idx);
      var open = state.flipped.indexOf(idx) >= 0 || state.matched[card.uid];
      btn.innerHTML = open
        ? '<span class="memory-card-face">' + card.emoji + '</span>'
        : '<span class="memory-card-back">?</span>';
      btn.disabled = state.matched[card.uid] || state.lock;
      btn.addEventListener('click', function () { onCardClick(idx); });
      grid.appendChild(btn);
    });
  }

  function onCardClick(idx) {
    if (!state || state.lock || state.quizActive) return;
    var card = state.deck[idx];
    if (state.matched[card.uid] || state.flipped.indexOf(idx) >= 0) return;
    state.flipped.push(idx);
    renderBoard();
    if (state.flipped.length < 2) return;
    state.lock = true;
    var a = state.deck[state.flipped[0]];
    var b = state.deck[state.flipped[1]];
    if (a.pairId === b.pairId) {
      state.matched[a.uid] = true;
      state.matched[b.uid] = true;
      state.pairsFound += 1;
      state.flipped = [];
      state.lock = false;
      renderBoard();
      if (state.pairsFound >= state.level.pairs) {
        clearInterval(state.timer);
        showResult(true);
        return;
      }
      if (state.pairsFound % 2 === 0 && state.qIndex < (state.questions || []).length) {
        askQuiz();
      }
    } else {
      setTimeout(function () {
        if (!state) return;
        state.hearts -= 1;
        state.flipped = [];
        state.lock = false;
        if (state.hearts <= 0) {
          clearInterval(state.timer);
          showResult(false);
          return;
        }
        renderBoard();
      }, 650);
    }
  }

  function askQuiz() {
    var q = state.questions[state.qIndex];
    if (!q || !global.GameQuizUI) {
      state.qIndex += 1;
      return;
    }
    state.quizActive = true;
    global.GameQuizUI.show(q, {
      onCorrect: function () {
        state.quizActive = false;
        state.starsGot += 1;
        state.qIndex += 1;
        updateHud();
      },
      onWrong: function () {
        state.hearts -= 1;
        if (state.hearts <= 0) {
          clearInterval(state.timer);
          showResult(false);
          return false;
        }
        updateHud();
        return true;
      }
    });
  }

  function shutdown() {
    if (state && state.timer) clearInterval(state.timer);
    state = null;
    global.__kidMemoryActive = false;
    clearMount();
    if (global.GameQuizUI) global.GameQuizUI.hide();
  }

  function boot() {
    wireDomControls();
    showLevelSelect();
  }

  global.GameMemory = { boot: boot, shutdown: shutdown };
})(window);
