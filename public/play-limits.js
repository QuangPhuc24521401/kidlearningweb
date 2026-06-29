/* ═══════════════════════════════════════════════════
   PLAY-LIMITS.JS — Giới hạn lượt chơi (Basic: 3/game)
═══════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  var LIMIT = 3;
  var STORAGE_KEY = 'kid_game_play_counts';
  var GAME_IDS = ['platformer', 'maze', 'digger', 'memory', 'sort', 'spot'];
  var GAME_LABELS = {
    platformer: 'Phiêu lưu Platformer',
    maze: 'Mê cung 2D',
    digger: 'Đào vàng',
    memory: 'Ghép cặp trí nhớ',
    sort: 'Phân loại thông minh',
    spot: 'Tìm khác biệt'
  };

  function readLocal() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') || {}; } catch (e) { return {}; }
  }

  function writeLocal(obj) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(obj || {})); } catch (e) {}
  }

  function getCount(gameId) {
    var o = readLocal();
    return typeof o[gameId] === 'number' ? o[gameId] : 0;
  }

  function setCount(gameId, n) {
    var o = readLocal();
    o[gameId] = Math.max(0, n | 0);
    writeLocal(o);
    pushCloud(o);
  }

  function pushCloud(counts) {
    try {
      if (typeof firebase === 'undefined' || !firebase.auth || !firebase.firestore) return;
      var user = firebase.auth().currentUser;
      if (!user) return;
      firebase.firestore().collection('users').doc(user.uid).set({
        gamePlayCounts: counts,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true }).catch(function () {});
    } catch (e) {}
  }

  function mergeCloud(counts) {
    counts = counts || {};
    var local = readLocal();
    GAME_IDS.forEach(function (id) {
      var a = typeof local[id] === 'number' ? local[id] : 0;
      var b = typeof counts[id] === 'number' ? counts[id] : 0;
      local[id] = Math.max(a, b);
    });
    writeLocal(local);
    return local;
  }

  function pullFromCloud() {
    return new Promise(function (resolve) {
      if (typeof firebase === 'undefined' || !firebase.auth || !firebase.firestore) {
        resolve(readLocal());
        return;
      }
      var user = firebase.auth().currentUser;
      if (!user) { resolve(readLocal()); return; }
      firebase.firestore().collection('users').doc(user.uid).get()
        .then(function (snap) {
          var data = snap && snap.exists ? snap.data() : {};
          if (global.KidAccountPlan && global.KidAccountPlan.syncFromUserDoc) {
            global.KidAccountPlan.syncFromUserDoc(data);
          }
          resolve(mergeCloud(data.gamePlayCounts));
        })
        .catch(function () { resolve(readLocal()); });
    });
  }

  function isLimited() {
    return !(global.KidAccountPlan && global.KidAccountPlan.isPro && global.KidAccountPlan.isPro());
  }

  function remaining(gameId) {
    if (!isLimited()) return Infinity;
    return Math.max(0, LIMIT - getCount(gameId));
  }

  function canPlay(gameId) {
    if (!isLimited()) return true;
    return getCount(gameId) < LIMIT;
  }

  function consumePlay(gameId) {
    if (!isLimited()) return true;
    if (!canPlay(gameId)) return false;
    setCount(gameId, getCount(gameId) + 1);
    return true;
  }

  function ensureModal() {
    var el = document.getElementById('playLimitModal');
    if (el) return el;
    el = document.createElement('div');
    el.id = 'playLimitModal';
    el.className = 'play-limit-modal';
    el.hidden = true;
    el.innerHTML =
      '<div class="play-limit-card" role="dialog" aria-modal="true" aria-labelledby="playLimitTitle">' +
        '<button type="button" class="play-limit-close" id="playLimitClose" aria-label="Đóng">×</button>' +
        '<div class="play-limit-icon">⭐</div>' +
        '<h2 id="playLimitTitle" class="play-limit-title">Hết lượt chơi miễn phí</h2>' +
        '<p id="playLimitMsg" class="play-limit-msg"></p>' +
        '<div class="play-limit-actions">' +
          '<a href="pro.html" class="play-limit-btn play-limit-btn--pro" id="playLimitProBtn">Nâng cấp Pro ✨</a>' +
          '<button type="button" class="play-limit-btn play-limit-btn--ghost" id="playLimitOkBtn">Để sau</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(el);
    el.querySelector('#playLimitClose').addEventListener('click', function () { el.hidden = true; });
    el.querySelector('#playLimitOkBtn').addEventListener('click', function () { el.hidden = true; });
    el.addEventListener('click', function (e) { if (e.target === el) el.hidden = true; });
    return el;
  }

  function showLimitModal(gameId) {
    var modal = ensureModal();
    var name = GAME_LABELS[gameId] || 'game này';
    var msg = document.getElementById('playLimitMsg');
    if (msg) {
      msg.textContent = 'Tài khoản Basic chỉ được chơi "' + name + '" ' + LIMIT + ' lần. Bạn đã dùng hết lượt — nâng cấp Pro để chơi không giới hạn!';
    }
    var proBtn = document.getElementById('playLimitProBtn');
    if (proBtn && global.spaGo) {
      proBtn.addEventListener('click', function (e) {
        if (location.pathname.endsWith('game.html')) return;
        e.preventDefault();
        global.spaGo('pro.html');
      }, { once: true });
    }
    modal.hidden = false;
  }

  function tryStartGame(gameId) {
    if (canPlay(gameId)) {
      consumePlay(gameId);
      return true;
    }
    showLimitModal(gameId);
    return false;
  }

  function badgeText(gameId) {
    if (!isLimited()) return 'Pro · không giới hạn';
    var r = remaining(gameId);
    return r > 0 ? ('Còn ' + r + '/' + LIMIT + ' lượt') : 'Hết lượt · cần Pro';
  }

  global.KidPlayLimits = {
    LIMIT: LIMIT,
    GAME_IDS: GAME_IDS,
    pullFromCloud: pullFromCloud,
    remaining: remaining,
    canPlay: canPlay,
    consumePlay: consumePlay,
    tryStartGame: tryStartGame,
    showLimitModal: showLimitModal,
    badgeText: badgeText,
    getCount: getCount
  };
})(window);
