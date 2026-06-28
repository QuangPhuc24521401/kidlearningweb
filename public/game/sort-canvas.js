/* ═══════════════════════════════════════════════════
   SORT-CANVAS.JS — Phân loại thông minh
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
      mapBtn.title = 'Chọn màn phân loại';
    }
    if (ctrls) ctrls.classList.toggle('is-map-mode', mode === 'map' || mode === 'result');
  }

  function wireDomControls() {
    var replay = $('btnReplay');
    var map = $('btnMap');
    if (replay && !replay._sortBound) {
      replay._sortBound = true;
      replay.addEventListener('click', function () {
        if (!state || state.view !== 'play') return;
        startLevel(state.levelIndex);
      });
    }
    if (map && !map._sortBound) {
      map._sortBound = true;
      map.addEventListener('click', function () {
        if (!global.__kidSortActive) return;
        showLevelSelect();
      });
    }
  }

  function showLevelSelect() {
    state = { view: 'select' };
    global.__kidSortActive = true;
    setUiMode('map');
    var mount = clearMount();
    if (!mount) return;
    var wrap = document.createElement('div');
    wrap.className = 'maze-ui maze-ui--select sort-ui';
    wrap.innerHTML =
      '<div class="maze-select-head">' +
        '<h2>📦 Phân loại thông minh</h2>' +
        '<p>Chọn đồ vật rồi bấm thùng đúng · trả lời câu hỏi để nhận sao</p>' +
      '</div>' +
      '<div class="maze-select-grid" id="sortSelectGrid"></div>' +
      '<button type="button" class="maze-hub-link" id="sortHubLink">← Chọn game khác</button>';
    mount.appendChild(wrap);
    var grid = $('sortSelectGrid');
    var levels = (global.SortLevels && global.SortLevels.LEVELS) || [];
    var SP = global.SortProgress;
    levels.forEach(function (lv, i) {
      var unlocked = SP ? SP.isLevelUnlocked(lv.id) : lv.id === 1;
      var prog = SP ? SP.getLevelProgress(lv.id) : {};
      var done = (prog.completedRuns || 0) > 0;
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'maze-lvl-btn' + (unlocked ? '' : ' is-locked') + (done ? ' is-done' : '');
      btn.disabled = !unlocked;
      var meta = [lv.items + ' món', '⏱' + lv.timeLimit + 's'];
      if (done) meta.push('⭐' + (prog.bestRun || 0));
      if (!unlocked) meta = ['🔒'];
      btn.innerHTML =
        '<span class="maze-lvl-icon">' + (lv.badge || '📦') + '</span>' +
        '<span class="maze-lvl-name">' + lv.name + '</span>' +
        '<span class="maze-lvl-meta">' + meta.join(' ') + '</span>';
      btn.addEventListener('click', function () { startLevel(i); });
      grid.appendChild(btn);
    });
    $('sortHubLink').addEventListener('click', function () {
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
    if (won && global.SortProgress) {
      global.SortProgress.saveLevelResult(lv, { stars: stars, total: total, finished: true });
    }
    var wrap = document.createElement('div');
    wrap.className = 'maze-ui maze-ui--result';
    wrap.innerHTML =
      '<h2>' + (won ? '🎉 Xuất sắc!' : '😢 Thử lại nhé!') + '</h2>' +
      '<p>' + lv.name + ' · ' + stars + '/' + total + ' ⭐</p>' +
      '<div class="maze-result-actions">' +
        '<button type="button" class="maze-act-btn maze-act-btn--green" id="sortRetry">Chơi lại</button>' +
        '<button type="button" class="maze-act-btn maze-act-btn--purple" id="sortMap">Chọn màn</button>' +
      '</div>';
    mount.appendChild(wrap);
    $('sortRetry').addEventListener('click', function () { startLevel(state.levelIndex); });
    $('sortMap').addEventListener('click', showLevelSelect);
  }

  function startLevel(levelIndex) {
    var levels = (global.SortLevels && global.SortLevels.LEVELS) || [];
    var level = levels[levelIndex];
    if (!level) return;
    setUiMode('play');
    var queue = global.SortLevels.buildQueue(level);
    var questions = global.SortLevels.buildLevelQuestions(level);
    state = {
      view: 'play',
      levelIndex: levelIndex,
      level: level,
      queue: queue,
      queueIndex: 0,
      selectedItem: null,
      hearts: level.hearts || 3,
      starsGot: 0,
      qIndex: 0,
      quizActive: false,
      timeLeft: level.timeLimit || 80,
      questions: questions,
      sorted: 0
    };
    global.__kidSortActive = true;
    renderPlay();
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

  function currentItem() {
    return state.queue[state.queueIndex] || null;
  }

  function updateHud() {
    var hud = $('sortHud');
    if (!hud || !state) return;
    var left = state.queue.length - state.queueIndex;
    hud.textContent = '❤️ ' + state.hearts + '  ·  ⭐ ' + state.starsGot + '/' + (state.level.gates || 1) + '  ·  Còn ' + left + '  ·  ⏱ ' + state.timeLeft + 's';
  }

  function renderPlay() {
    var mount = clearMount();
    if (!mount || !state) return;
    var item = currentItem();
    var wrap = document.createElement('div');
    wrap.className = 'sort-ui sort-ui--play';
    var binsHtml = (state.level.bins || []).map(function (bin) {
      return '<button type="button" class="sort-bin" data-bin="' + bin.id + '">' +
        '<span class="sort-bin-emoji">' + bin.emoji + '</span>' +
        '<span class="sort-bin-label">' + bin.label + '</span></button>';
    }).join('');
    wrap.innerHTML =
      '<div class="sort-hud" id="sortHud"></div>' +
      '<div class="sort-stage">' +
        '<div class="sort-item' + (state.selectedItem ? ' is-selected' : '') + '" id="sortItem">' +
          (item ? '<span class="sort-item-emoji">' + item.emoji + '</span><span class="sort-item-label">' + item.label + '</span>' : '✅ Xong!') +
        '</div>' +
        '<p class="sort-hint">Bấm đồ vật rồi chọn thùng phù hợp</p>' +
      '</div>' +
      '<div class="sort-bins">' + binsHtml + '</div>';
    mount.appendChild(wrap);
    updateHud();
    var itemEl = $('sortItem');
    if (itemEl && item) {
      itemEl.addEventListener('click', function () {
        if (state.quizActive) return;
        state.selectedItem = item;
        renderPlay();
      });
    }
    wrap.querySelectorAll('.sort-bin').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (state.quizActive || !item) return;
        if (!state.selectedItem) {
          state.selectedItem = item;
        }
        var binId = btn.getAttribute('data-bin');
        var correct = global.SortLevels.correctBin(state.level, item.typeId);
        if (binId === correct) {
          state.sorted += 1;
          state.queueIndex += 1;
          state.selectedItem = null;
          if (state.queueIndex >= state.queue.length) {
            clearInterval(state.timer);
            showResult(true);
            return;
          }
          if (state.sorted % 3 === 0 && state.qIndex < (state.questions || []).length) {
            askQuiz();
            return;
          }
          renderPlay();
        } else {
          state.hearts -= 1;
          state.selectedItem = null;
          if (state.hearts <= 0) {
            clearInterval(state.timer);
            showResult(false);
            return;
          }
          renderPlay();
        }
      });
    });
  }

  function askQuiz() {
    var q = state.questions[state.qIndex];
    if (!q || !global.GameQuizUI) {
      state.qIndex += 1;
      renderPlay();
      return;
    }
    state.quizActive = true;
    global.GameQuizUI.show(q, {
      onCorrect: function () {
        state.quizActive = false;
        state.starsGot += 1;
        state.qIndex += 1;
        renderPlay();
      },
      onWrong: function () {
        state.hearts -= 1;
        if (state.hearts <= 0) {
          clearInterval(state.timer);
          showResult(false);
          return false;
        }
        renderPlay();
        return true;
      }
    });
  }

  function shutdown() {
    if (state && state.timer) clearInterval(state.timer);
    state = null;
    global.__kidSortActive = false;
    clearMount();
    if (global.GameQuizUI) global.GameQuizUI.hide();
  }

  function boot() {
    wireDomControls();
    showLevelSelect();
  }

  global.GameSort = { boot: boot, shutdown: shutdown };
})(window);
