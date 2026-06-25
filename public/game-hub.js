/* ═══════════════════════════════════════════════════
   GAME-HUB.JS — Chọn game: Platformer hoặc Mê cung
═══════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  function $(id) { return document.getElementById(id); }

  function getPlayParam() {
    try { return new URLSearchParams(global.location.search).get('play'); } catch (e) { return null; }
  }

  function destroyGames() {
    if (global.__kidGame) {
      try { global.__kidGame.destroy(true); } catch (e) {}
      global.__kidGame = null;
    }
    if (global.__kidMaze) {
      try { global.__kidMaze.destroy(true); } catch (e) {}
      global.__kidMaze = null;
    }
    if (global.GameQuizUI) global.GameQuizUI.hide();
  }

  function showHub() {
    var hub = $('gameHub');
    var area = $('gamePlayArea');
    if (hub) hub.hidden = false;
    if (area) area.hidden = true;
    destroyGames();
    document.body.classList.remove('game-pick-platformer', 'game-pick-maze', 'game-force-landscape', 'game-virt-landscape');
    document.body.classList.add('game-hub-visible');
    try { history.replaceState(null, '', 'game.html'); } catch (e) {}
  }

  function restorePlatformerTouchLabels() {
    var jumpBtn = document.querySelector('#gameTouch [data-key="jump"]');
    if (jumpBtn) {
      jumpBtn.textContent = '⤴';
      jumpBtn.setAttribute('aria-label', 'Nhảy');
    }
  }

  function startGame(which) {
    var hub = $('gameHub');
    var area = $('gamePlayArea');
    if (hub) hub.hidden = true;
    if (area) area.hidden = false;
    document.body.classList.remove('game-hub-visible');
    document.body.classList.remove('game-pick-platformer', 'game-pick-maze');
    document.body.classList.add(which === 'maze' ? 'game-pick-maze' : 'game-pick-platformer');

    var hint = $('gameHintText');
    if (hint) {
      hint.innerHTML = which === 'maze'
        ? 'Mẹo: <b>◀ ▶ ▲ ▼</b> di chuyển · tránh <b>⚠️</b> bẫy &amp; <b>👾</b> quái · trả lời đúng để qua!'
        : 'Mẹo: <b>← →</b> đi, <b>Space/↑</b> nhảy, <b>↓</b> trên ống xanh nhạt để vào màn bí mật. Giẫm quái, ăn 🍄/⭐, trả lời đúng mở cổng!';
    }

    destroyGames();

    try { sessionStorage.setItem('kidGameLandscape', '1'); } catch (e) {}
    try { history.replaceState(null, '', 'game.html?play=' + encodeURIComponent(which)); } catch (e) {}

    if (which === 'maze') {
      if (global.GameMaze && global.GameMaze.boot) global.GameMaze.boot();
    } else {
      restorePlatformerTouchLabels();
      if (global.GamePlatformer && global.GamePlatformer.boot) global.GamePlatformer.boot();
    }

    if (global.KidGameOrientation && global.KidGameOrientation.enter) {
      global.KidGameOrientation.enter({ userGesture: false });
    }
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
    var pick = getPlayParam();
    if (pick === 'platformer' || pick === 'maze') {
      startGame(pick);
    } else {
      showHub();
    }
  }

  global.GameHub = { show: showHub, start: startGame };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(window);
