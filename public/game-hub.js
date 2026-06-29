/* ═══════════════════════════════════════════════════
   GAME-HUB.JS — Chọn game (6 trò chơi học tập)
═══════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  var GAME_IDS = ['platformer', 'maze', 'digger', 'memory', 'sort', 'spot'];

  function $(id) { return document.getElementById(id); }

  function getPlayParam() {
    try { return new URLSearchParams(global.location.search).get('play'); } catch (e) { return null; }
  }

  function destroyGames() {
    if (global.__kidGame) {
      try { global.__kidGame.destroy(true); } catch (e) {}
      global.__kidGame = null;
    }
    if (global.GameMaze && global.GameMaze.shutdown) global.GameMaze.shutdown();
    else if (global.__kidMaze) {
      try { global.__kidMaze.destroy(true); } catch (e) {}
      global.__kidMaze = null;
    }
    if (global.GameDigger && global.GameDigger.shutdown) global.GameDigger.shutdown();
    if (global.GameMemory && global.GameMemory.shutdown) global.GameMemory.shutdown();
    if (global.GameSort && global.GameSort.shutdown) global.GameSort.shutdown();
    if (global.GameSpot && global.GameSpot.shutdown) global.GameSpot.shutdown();
    var mount = $('gameMount');
    if (mount) mount.innerHTML = '';
    if (global.GameQuizUI) global.GameQuizUI.hide();
  }

  var LANDSCAPE_GAMES = ['platformer', 'maze', 'digger'];

  function bootGame(which) {
    if (which === 'maze' && global.GameMaze) global.GameMaze.boot();
    else if (which === 'digger' && global.GameDigger) global.GameDigger.boot();
    else if (which === 'memory' && global.GameMemory) global.GameMemory.boot();
    else if (which === 'sort' && global.GameSort) global.GameSort.boot();
    else if (which === 'spot' && global.GameSpot) global.GameSpot.boot();
    else if (global.GamePlatformer) global.GamePlatformer.boot();
    if (LANDSCAPE_GAMES.indexOf(which) >= 0 && global.KidGameOrientation && global.KidGameOrientation.enter) {
      global.KidGameOrientation.enter({ userGesture: true });
    } else if (global.KidGameOrientation && global.KidGameOrientation.exit) {
      global.KidGameOrientation.exit();
    }
  }

  function refreshHubBadges() {
    var PL = global.KidPlayLimits;
    if (!PL) return;
    document.querySelectorAll('[data-game-pick]').forEach(function (btn) {
      var pick = btn.getAttribute('data-game-pick');
      var badge = btn.querySelector('.game-hub-plays');
      if (!badge) {
        badge = document.createElement('span');
        badge.className = 'game-hub-plays';
        btn.appendChild(badge);
      }
      var txt = PL.badgeText(pick);
      badge.textContent = txt;
      badge.classList.toggle('is-empty', txt.indexOf('Hết lượt') >= 0);
    });
  }

  function showHub() {
    var hub = $('gameHub');
    var area = $('gamePlayArea');
    if (hub) hub.hidden = false;
    if (area) area.hidden = true;
    destroyGames();
    document.body.classList.remove(
      'game-pick-platformer', 'game-pick-maze', 'game-pick-digger',
      'game-pick-memory', 'game-pick-sort', 'game-pick-spot', 'game-force-landscape', 'game-virt-landscape'
    );
    document.body.classList.add('game-hub-visible');
    if (global.KidGameOrientation && global.KidGameOrientation.exit) {
      global.KidGameOrientation.exit();
    }
    try { history.replaceState(null, '', 'game.html'); } catch (e) {}
    if (global.KidPlayLimits) {
      global.KidPlayLimits.pullFromCloud().then(refreshHubBadges);
    } else {
      refreshHubBadges();
    }
    var note = $('gameHubPlanNote');
    if (note && global.KidAccountPlan) {
      note.textContent = global.KidAccountPlan.isPro()
        ? ' · Gói Pro — không giới hạn!'
        : ' · Basic: 3 lượt / game';
    }
  }

  function restorePlatformerTouchLabels() {
    var jumpBtn = document.querySelector('#gameTouch [data-key="jump"]');
    if (jumpBtn) {
      jumpBtn.textContent = '⤴';
      jumpBtn.setAttribute('aria-label', 'Nhảy');
    }
    ['left', 'right', 'down'].forEach(function (k) {
      var btn = document.querySelector('#gameTouch [data-key="' + k + '"]');
      if (btn) btn.style.visibility = '';
    });
  }

  function setHint(which) {
    var hint = $('gameHintText');
    if (!hint) return;
    var hints = {
      maze: 'Mẹo: <b>◀ ▶ ▲ ▼</b> di chuyển · tránh bẫy &amp; quái · trả lời đúng để qua!',
      digger: 'Mẹo: Móc <b>đung đưa</b> — nhấn <b>Space</b> hoặc nút <b>⛏</b> để thả · kéo vàng lên · <b>trả lời đúng</b> mới vào túi!',
      memory: 'Mẹo: <b>Bấm 2 thẻ</b> giống nhau để ghép cặp · trả lời câu hỏi để nhận thêm sao!',
      sort: 'Mẹo: <b>Bấm đồ vật</b> rồi chọn <b>thùng đúng</b> · phân loại hết trước khi hết giờ!',
      spot: 'Mẹo: <b>Bấm món khác biệt</b> trong 4 lựa chọn · trả lời câu hỏi để nhận thêm sao!',
      platformer: 'Mẹo: <b>← →</b> đi, <b>Space/↑</b> nhảy · trả lời đúng mở cổng!'
    };
    hint.innerHTML = hints[which] || hints.platformer;
  }

  function startGame(which) {
    if (GAME_IDS.indexOf(which) < 0) which = 'platformer';

    if (global.KidPlayLimits && !global.KidPlayLimits.tryStartGame(which)) {
      return;
    }

    var hub = $('gameHub');
    var area = $('gamePlayArea');
    if (hub) hub.hidden = true;
    if (area) {
      area.hidden = false;
      area.removeAttribute('hidden');
    }
    document.body.classList.remove('game-hub-visible');
    document.body.classList.remove(
      'game-pick-platformer', 'game-pick-maze', 'game-pick-digger', 'game-pick-memory', 'game-pick-sort', 'game-pick-spot'
    );
    document.body.classList.add('game-pick-' + which);

    if (which !== 'maze' && which !== 'digger') restorePlatformerTouchLabels();
    setHint(which);

    destroyGames();
    try { sessionStorage.setItem('kidGameLandscape', '1'); } catch (e) {}
    try { history.replaceState(null, '', 'game.html?play=' + encodeURIComponent(which)); } catch (e) {}

    global.requestAnimationFrame(function () {
      global.requestAnimationFrame(function () { bootGame(which); });
    });
  }

  function wireHub() {
    document.querySelectorAll('[data-game-pick]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var pick = btn.getAttribute('data-game-pick');
        if (pick) startGame(pick);
      });
    });
    var back = $('gameHubBack');
    if (back) back.addEventListener('click', function (e) {
      e.preventDefault();
      global.location.href = 'index.html';
    });
    var sw = $('gameSwitchBtn');
    if (sw) sw.addEventListener('click', function () { showHub(); });
  }

  function init() {
    wireHub();
    var boot = function () {
      var pick = getPlayParam();
      if (GAME_IDS.indexOf(pick) >= 0) startGame(pick);
      else showHub();
    };
    if (global.KidAccountPlan && global.KidPlayLimits) {
      Promise.all([
        global.KidAccountPlan.pullFromCloud(),
        global.KidPlayLimits.pullFromCloud()
      ]).then(boot);
    } else {
      boot();
    }
  }

  global.GameHub = { show: showHub, start: startGame, refreshBadges: refreshHubBadges };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(window);
