/* ═══════════════════════════════════════════════════
   GAME-INPUT.JS — Phát hiện mobile & điều khiển cảm ứng
═══════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  function isMobileInput() {
    try {
      if (global.matchMedia('(max-width: 900px)').matches) return true;
      if (global.matchMedia('(pointer: coarse)').matches && global.innerWidth < 1200) return true;
    } catch (e) { /* ignore */ }
    return ('ontouchstart' in global) && global.innerWidth < 1024;
  }

  function updateBodyClass() {
    document.body.classList.toggle('game-mobile-input', isMobileInput());
  }

  /** @param {'play'|'map'|'result'|'boot'|'hub'} mode */
  function setTouchPad(mode) {
    updateBodyClass();
    var pad = document.getElementById('gameTouch');
    var show = mode === 'play' && isMobileInput();
    if (pad) {
      pad.classList.toggle('is-play-active', show);
      pad.setAttribute('aria-hidden', show ? 'false' : 'true');
    }
  }

  function bindTouchPad(state, mapping) {
    var pad = document.getElementById('gameTouch');
    if (!pad) return;
    pad._touchState = state;
    pad._touchMap = mapping || { left: 'left', right: 'right', down: 'down', jump: 'jump' };
    if (pad._inputBound) return;
    pad._inputBound = true;

    function bind(key) {
      var btn = pad.querySelector('[data-key="' + key + '"]');
      if (!btn) return;
      var down = function (e) {
        e.preventDefault();
        e.stopPropagation();
        var st = pad._touchState;
        var map = pad._touchMap;
        if (st && map) st[map[key] || key] = true;
      };
      var up = function (e) {
        e.preventDefault();
        e.stopPropagation();
        var st = pad._touchState;
        var map = pad._touchMap;
        if (st && map) st[map[key] || key] = false;
      };
      btn.addEventListener('pointerdown', down);
      btn.addEventListener('pointerup', up);
      btn.addEventListener('pointercancel', up);
      btn.addEventListener('pointerleave', up);
    }
    bind('left');
    bind('right');
    bind('down');
    bind('jump');
  }

  function resetTouchState(state) {
    if (!state) return;
    Object.keys(state).forEach(function (k) { state[k] = false; });
  }

  updateBodyClass();
  global.addEventListener('resize', updateBodyClass);

  global.GameInput = {
    isMobile: isMobileInput,
    setTouchPad: setTouchPad,
    bindTouchPad: bindTouchPad,
    resetTouchState: resetTouchState
  };
})(window);
