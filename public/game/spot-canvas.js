/* ═══════════════════════════════════════════════════
   SPOT-CANVAS.JS — Tìm khác biệt
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
      mapBtn.title = 'Chọn màn tìm khác biệt';
    }
    if (ctrls) ctrls.classList.toggle('is-map-mode', mode === 'map' || mode === 'result');
  }

  function wireDomControls() {
    var replay = $('btnReplay');
    var map = $('btnMap');
    if (replay && !replay._spotBound) {
      replay._spotBound = true;
      replay.addEventListener('click', function () {
        if (!state || state.view !== 'play') return;
        startLevel(state.levelIndex);
      });
    }
    if (map && !map._spotBound) {
      map._spotBound = true;
      map.addEventListener('click', function () {
        if (!global.__kidSpotActive) return;
        showLevelSelect();
      });
    }
  }

  function showLevelSelect() {
    state = { view: 'select' };
    global.__kidSpotActive = true;
    setUiMode('map');
    var mount = clearMount();
    if (!mount) return;
    var wrap = document.createElement('div');
    wrap.className = 'maze-ui maze-ui--select spot-ui';
    wrap.innerHTML =
      '<div class="maze-select-head">' +
        '<h2>🔍 Tìm khác biệt</h2>' +
        '<p>Bấm vào món khác với các món còn lại · trả lời câu hỏi để nhận sao</p>' +
      '</div>' +
      '<div class="maze-select-grid" id="spotSelectGrid"></div>' +
      '<button type="button" class="maze-hub-link" id="spotHubLink">← Chọn game khác</button>';
    mount.appendChild(wrap);
    var grid = $('spotSelectGrid');
    var levels = (global.SpotLevels && global.SpotLevels.LEVELS) || [];
    var SP = global.SpotProgress;
    levels.forEach(function (lv, i) {
      var unlocked = SP ? SP.isLevelUnlocked(lv.id) : lv.id === 1;
      var prog = SP ? SP.getLevelProgress(lv.id) : {};
      var done = (prog.completedRuns || 0) > 0;
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'maze-lvl-btn' + (unlocked ? '' : ' is-locked') + (done ? ' is-done' : '');
      btn.disabled = !unlocked;
      var meta = [lv.rounds + ' câu', '⏱' + lv.timeLimit + 's'];
      if (done) meta.push('⭐' + (prog.bestRun || 0));
      if (!unlocked) meta = ['🔒'];
      btn.innerHTML =
        '<span class="maze-lvl-icon">' + (lv.badge || '🔍') + '</span>' +
        '<span class="maze-lvl-name">' + lv.name + '</span>' +
        '<span class="maze-lvl-meta">' + meta.join(' ') + '</span>';
      btn.addEventListener('click', function () { startLevel(i); });
      grid.appendChild(btn);
    });
    $('spotHubLink').addEventListener('click', function () {
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
    if (won && global.SpotProgress) {
      global.SpotProgress.saveLevelResult(lv, { stars: stars, total: total, finished: true });
    }
    var wrap = document.createElement('div');
    wrap.className = 'maze-ui maze-ui--result';
    wrap.innerHTML =
      '<div class="maze-result-card">' +
        '<h2>' + (won ? '🎉 Mắt tinh tường!' : '😢 Thử lại nhé!') + '</h2>' +
        '<p class="maze-result-stars">' + lv.name + ' · ' + stars + '/' + total + ' ⭐</p>' +
        '<div class="maze-result-actions">' +
          '<button type="button" class="maze-act-btn maze-act-btn--green" id="spotRetry">Chơi lại</button>' +
          '<button type="button" class="maze-act-btn maze-act-btn--purple" id="spotMap">Chọn màn</button>' +
        '</div>' +
      '</div>';
    mount.appendChild(wrap);
    $('spotRetry').addEventListener('click', function () { startLevel(state.levelIndex); });
    $('spotMap').addEventListener('click', showLevelSelect);
  }

  function currentRound() {
    return state.rounds[state.roundIndex] || null;
  }

  function updateHud() {
    var hud = $('spotHud');
    if (!hud || !state) return;
    var left = state.rounds.length - state.roundIndex;
    hud.textContent = '❤️ ' + state.hearts + '  ·  ⭐ ' + state.starsGot + '/' + (state.level.gates || 1) +
      '  ·  Còn ' + left + '  ·  ⏱ ' + state.timeLeft + 's';
  }

  function onPick(item) {
    if (!state || state.quizActive || !item) return;
    if (item.isOdd) {
      state.roundIndex += 1;
      state.correct += 1;
      if (state.roundIndex >= state.rounds.length) {
        clearInterval(state.timer);
        showResult(true);
        return;
      }
      if (state.correct % 2 === 0 && state.qIndex < (state.questions || []).length) {
        askQuiz();
        return;
      }
      renderPlay();
    } else {
      state.hearts -= 1;
      if (state.hearts <= 0) {
        clearInterval(state.timer);
        showResult(false);
        return;
      }
      renderPlay(true);
    }
  }

  function renderPlay(wrongFlash) {
    var mount = clearMount();
    if (!mount || !state) return;
    var round = currentRound();
    if (!round) return;
    var wrap = document.createElement('div');
    wrap.className = 'spot-ui spot-ui--play';
    var choicesHtml = round.items.map(function (item) {
      return '<button type="button" class="spot-choice" data-id="' + item.id + '">' +
        '<span class="spot-choice-emoji">' + item.emoji + '</span></button>';
    }).join('');
    wrap.innerHTML =
      '<div class="spot-hud" id="spotHud"></div>' +
      '<p class="spot-prompt">' + round.prompt + '</p>' +
      '<div class="spot-grid' + (wrongFlash ? ' is-wrong-flash' : '') + '">' + choicesHtml + '</div>';
    mount.appendChild(wrap);
    updateHud();
    wrap.querySelectorAll('.spot-choice').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.getAttribute('data-id');
        var item = round.items.filter(function (x) { return x.id === id; })[0];
        onPick(item);
      });
    });
    if (wrongFlash) {
      global.setTimeout(function () {
        var grid = wrap.querySelector('.spot-grid');
        if (grid) grid.classList.remove('is-wrong-flash');
      }, 400);
    }
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

  function startLevel(levelIndex) {
    var levels = (global.SpotLevels && global.SpotLevels.LEVELS) || [];
    var level = levels[levelIndex];
    if (!level) return;
    setUiMode('play');
    var rounds = global.SpotLevels.buildRounds(level);
    var questions = global.SpotLevels.buildLevelQuestions(level);
    state = {
      view: 'play',
      levelIndex: levelIndex,
      level: level,
      rounds: rounds,
      roundIndex: 0,
      correct: 0,
      hearts: level.hearts || 3,
      starsGot: 0,
      qIndex: 0,
      quizActive: false,
      timeLeft: level.timeLimit || 60,
      questions: questions
    };
    global.__kidSpotActive = true;
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

  function shutdown() {
    if (state && state.timer) clearInterval(state.timer);
    state = null;
    global.__kidSpotActive = false;
    clearMount();
    if (global.GameQuizUI) global.GameQuizUI.hide();
  }

  function boot() {
    wireDomControls();
    showLevelSelect();
  }

  global.GameSpot = { boot: boot, shutdown: shutdown };
})(window);
