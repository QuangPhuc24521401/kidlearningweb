/* ═══════════════════════════════════════════════════
   GAME-ORIENTATION.JS — Tự động chế độ ngang trên mobile
   • Xoay ảo khi cầm dọc (CSS) — game full màn hình ngay
   • Thử khóa landscape + fullscreen khi trình duyệt cho phép
═══════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  var STORAGE_KEY = 'kidGameLandscape';

  function isMobileGame() {
    return global.matchMedia('(max-width: 900px)').matches ||
      (global.matchMedia('(pointer: coarse)').matches && global.innerWidth < 1024);
  }

  function isPortrait() {
    return global.matchMedia('(orientation: portrait)').matches;
  }

  function refreshPhaser() {
    var g = global.__kidGame;
    if (!g || !g.scale) return;
    try {
      if (typeof g.scale.refresh === 'function') g.scale.refresh();
      else if (typeof g.scale.resize === 'function') g.scale.resize();
    } catch (e) { /* ignore */ }
  }

  function tryLockLandscape() {
    if (!isMobileGame()) return Promise.resolve(false);
    var o = global.screen && global.screen.orientation;
    if (!o || typeof o.lock !== 'function') return Promise.resolve(false);
    return o.lock('landscape').catch(function () {
      return o.lock('landscape-primary').catch(function () { return false; });
    });
  }

  function tryFullscreen(el) {
    if (!el) return Promise.resolve(false);
    var fn = el.requestFullscreen ||
      el.webkitRequestFullscreen ||
      el.webkitEnterFullscreen;
    if (!fn) return Promise.resolve(false);
    return Promise.resolve(fn.call(el)).catch(function () { return false; });
  }

  function unlockOrientation() {
    try {
      if (global.screen && global.screen.orientation && global.screen.orientation.unlock) {
        global.screen.orientation.unlock();
      }
    } catch (e) { /* ignore */ }
  }

  function scheduleRefresh() {
    refreshPhaser();
    global.setTimeout(refreshPhaser, 80);
    global.setTimeout(refreshPhaser, 280);
    global.setTimeout(refreshPhaser, 600);
    global.setTimeout(function () {
      if (global.KidGameControls && global.KidGameControls.syncActiveScene) {
        global.KidGameControls.syncActiveScene();
      }
    }, 100);
  }

  function updateVirtClass() {
    if (!document.body.classList.contains('game-force-landscape')) return;
    document.body.classList.toggle('game-virt-landscape', isPortrait());
    scheduleRefresh();
  }

  function enableLandscapeMode() {
    if (!isMobileGame()) return;
    if (document.body.classList.contains('game-hub-visible')) return;
    document.body.classList.add('game-force-landscape');
    updateVirtClass();
    try { sessionStorage.setItem(STORAGE_KEY, '1'); } catch (e) { /* ignore */ }
  }

  function exitGameMode() {
    document.body.classList.remove('game-force-landscape', 'game-virt-landscape');
    unlockOrientation();
    try { sessionStorage.removeItem(STORAGE_KEY); } catch (e) { /* ignore */ }
  }

  function enterGameMode(opts) {
    opts = opts || {};
    if (!isMobileGame()) return;
    enableLandscapeMode();
    if (!opts.userGesture) return;
    var vp = document.querySelector('.game-landscape-viewport');
    tryLockLandscape();
    tryFullscreen(vp || document.documentElement);
    scheduleRefresh();
  }

  function wireGameLinks() {
    document.querySelectorAll('a[href="game.html"], a[href="./game.html"], a.topbar-link[href*="game.html"]').forEach(function (a) {
      a.addEventListener('click', function () {
        try { sessionStorage.setItem(STORAGE_KEY, '1'); } catch (e) { /* ignore */ }
        if (document.body.classList.contains('page-game')) {
          enterGameMode({ userGesture: true });
        }
      });
    });
  }

  function wireExitBtn() {
    var btn = document.getElementById('gameExitBtn');
    if (!btn) return;
    btn.addEventListener('click', function () {
      unlockOrientation();
      try { sessionStorage.removeItem(STORAGE_KEY); } catch (e) { /* ignore */ }
    });
  }

  function initGamePage() {
    wireGameLinks();
    wireExitBtn();

    var shouldEnter = isMobileGame();
    try {
      if (sessionStorage.getItem(STORAGE_KEY) === '1') shouldEnter = true;
    } catch (e) { /* ignore */ }

    var urlPlay = null;
    try { urlPlay = new URLSearchParams(global.location.search).get('play'); } catch (e) {}

    var landscapeGames = ['platformer', 'maze', 'digger'];
    if (shouldEnter && urlPlay && landscapeGames.indexOf(urlPlay) >= 0) {
      enableLandscapeMode();
      var stage = document.querySelector('.game-stage');
      if (stage) {
        var once = function () {
          enterGameMode({ userGesture: true });
          stage.removeEventListener('pointerdown', once);
        };
        stage.addEventListener('pointerdown', once, { passive: true });
      }
      global.setTimeout(function () { enterGameMode({ userGesture: false }); }, 300);
    }

    global.addEventListener('orientationchange', function () {
      global.setTimeout(updateVirtClass, 120);
    });
    global.addEventListener('resize', updateVirtClass);

    if (global.visualViewport) {
      global.visualViewport.addEventListener('resize', updateVirtClass);
    }

    global.addEventListener('pagehide', unlockOrientation);
  }

  function init() {
    if (document.body.classList.contains('page-game')) {
      initGamePage();
    } else {
      wireGameLinks();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  global.KidGameOrientation = {
    enter: enterGameMode,
    exit: exitGameMode,
    refresh: scheduleRefresh
  };
})(window);
