/* ═══════════════════════════════════════════════════
   MENTOR-LIMITS.JS — Giới hạn hỏi Cô giáo AI (Basic)
   Basic: 5 câu / ngày · Pro: không giới hạn
═══════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  var DAILY_LIMIT = 5;
  var STORAGE_KEY = 'kid_mentor_daily';
  var _ready = false;

  function pad2(n) { return (n < 10 ? '0' : '') + n; }

  function todayKey() {
    var d = new Date();
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
  }

  function parseCount(v) {
    var n = parseInt(v, 10);
    if (!isFinite(n) || n < 0) return 0;
    return n;
  }

  function clampCount(n) {
    return Math.min(DAILY_LIMIT, Math.max(0, parseCount(n)));
  }

  function readLocal() {
    try {
      var raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') || {};
      var today = todayKey();
      if (raw.date !== today) {
        return { date: today, count: 0, syncTs: 0 };
      }
      var count = clampCount(raw.count);
      /* Dữ liệu cũ không có syncTs mà đã “hết lượt” — thường do bug ghi đè cloud. */
      if (typeof raw.syncTs !== 'number' && count >= DAILY_LIMIT) {
        return { date: today, count: 0, syncTs: 0 };
      }
      return {
        date: today,
        count: count,
        syncTs: typeof raw.syncTs === 'number' ? raw.syncTs : 0
      };
    } catch (e) {
      return { date: todayKey(), count: 0, syncTs: 0 };
    }
  }

  function writeLocal(state) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        date: state.date,
        count: clampCount(state.count),
        syncTs: typeof state.syncTs === 'number' ? state.syncTs : Date.now()
      }));
    } catch (e) {}
  }

  function getCount() {
    return readLocal().count;
  }

  function isLimited() {
    return !(global.KidAccountPlan && global.KidAccountPlan.isPro && global.KidAccountPlan.isPro());
  }

  function remaining() {
    if (!isLimited()) return Infinity;
    return Math.max(0, DAILY_LIMIT - getCount());
  }

  function canAsk() {
    if (!_ready) return false;
    if (!isLimited()) return true;
    return getCount() < DAILY_LIMIT;
  }

  function isReady() {
    return _ready;
  }

  function consumeAsk() {
    if (!isLimited()) return true;
    var state = readLocal();
    if (state.count >= DAILY_LIMIT) return false;
    state.count = clampCount(state.count + 1);
    state.syncTs = Date.now();
    writeLocal(state);
    pushCloud(state);
    refreshUI();
    return true;
  }

  /** Trừ lượt ngay khi bắt đầu hỏi — tránh double-click / mic gọi nhiều lần. */
  function tryAsk() {
    if (!isLimited()) return true;
    if (!canAsk()) return false;
    return consumeAsk();
  }

  function pushCloud(state) {
    try {
      if (typeof firebase === 'undefined' || !firebase.auth || !firebase.firestore) return;
      var user = firebase.auth().currentUser;
      if (!user) return;
      firebase.firestore().collection('users').doc(user.uid).set({
        mentorDaily: {
          date: state.date,
          count: clampCount(state.count),
          syncTs: state.syncTs || Date.now()
        },
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true }).catch(function () {});
    } catch (e) {}
  }

  function normalizeCloud(cloud) {
    if (!cloud || typeof cloud !== 'object') return { date: '', count: 0, syncTs: 0 };
    return {
      date: typeof cloud.date === 'string' ? cloud.date : '',
      count: clampCount(cloud.count),
      syncTs: typeof cloud.syncTs === 'number' ? cloud.syncTs : 0
    };
  }

  function mergeCloud(cloud) {
    cloud = normalizeCloud(cloud);
    var local = readLocal();
    var today = todayKey();

    if (cloud.date !== today) {
      return local;
    }

    /* Dữ liệu cloud cũ (không có syncTs) — không tin, tránh count sai ghi đè local. */
    if (!cloud.syncTs) {
      return local;
    }

    var localTs = local.syncTs || 0;
    if (cloud.syncTs > localTs) {
      local.count = cloud.count;
      local.syncTs = cloud.syncTs;
    } else if (localTs > cloud.syncTs) {
      local.count = clampCount(local.count);
    } else {
      local.count = clampCount(Math.max(local.count, cloud.count));
    }

    writeLocal(local);
    return local;
  }

  function pullFromCloud() {
    _ready = false;
    refreshUI();
    return new Promise(function (resolve) {
      function finish(state) {
        _ready = true;
        refreshUI();
        resolve(state);
      }
      if (typeof firebase === 'undefined' || !firebase.auth || !firebase.firestore) {
        finish(readLocal());
        return;
      }
      var user = firebase.auth().currentUser;
      if (!user) {
        finish(readLocal());
        return;
      }
      firebase.firestore().collection('users').doc(user.uid).get()
        .then(function (snap) {
          var data = snap && snap.exists ? snap.data() : {};
          if (global.KidAccountPlan && global.KidAccountPlan.syncFromUserDoc) {
            global.KidAccountPlan.syncFromUserDoc(data);
          }
          finish(mergeCloud(data.mentorDaily));
        })
        .catch(function () { finish(readLocal()); });
    });
  }

  function badgeText() {
    if (!_ready) return 'Đang tải lượt hỏi…';
    if (!isLimited()) return 'Pro · hỏi không giới hạn';
    var r = remaining();
    return r > 0 ? ('Còn ' + r + '/' + DAILY_LIMIT + ' câu hôm nay') : 'Hết lượt hôm nay · cần Pro';
  }

  function refreshUI() {
    var label = document.getElementById('mentorUsageLabel');
    var fill = document.getElementById('mentorUsageFill');
    var badge = document.getElementById('mentorPlanBadge');
    var limited = isLimited();

    if (badge) {
      badge.textContent = limited ? 'Basic' : 'Pro ✨';
      badge.className = 'mentor-plan-badge' + (limited ? ' mentor-plan-badge--basic' : ' mentor-plan-badge--pro');
    }

    if (label) label.textContent = badgeText();

    if (fill) {
      if (!limited) {
        fill.style.width = '100%';
        fill.classList.add('is-pro');
        fill.classList.remove('is-low', 'is-empty');
      } else {
        fill.classList.remove('is-pro');
        var r = remaining();
        var used = DAILY_LIMIT - r;
        var pct = DAILY_LIMIT ? Math.min(100, Math.round(used / DAILY_LIMIT * 100)) : 0;
        fill.style.width = pct + '%';
        fill.classList.toggle('is-low', r <= 1 && r > 0);
        fill.classList.toggle('is-empty', r === 0);
      }
    }

    var bar = document.querySelector('.mentor-usage-bar-wrap');
    if (bar && limited && _ready) {
      bar.setAttribute('aria-valuenow', String(remaining()));
      bar.setAttribute('aria-valuemax', String(DAILY_LIMIT));
    }

    var warn = document.getElementById('mentorUsageWarn');
    if (warn) {
      if (!_ready) {
        warn.hidden = true;
      } else if (limited && remaining() === 0) {
        warn.hidden = false;
        warn.textContent = 'Bé đã hỏi đủ ' + DAILY_LIMIT + ' câu hôm nay. Nâng cấp Pro để hỏi Cô giáo không giới hạn!';
      } else if (limited && remaining() === 1) {
        warn.hidden = false;
        warn.textContent = 'Chỉ còn 1 câu hỏi miễn phí hôm nay.';
      } else {
        warn.hidden = true;
      }
    }
  }

  function ensureModal() {
    var el = document.getElementById('mentorLimitModal');
    if (el) return el;
    el = document.createElement('div');
    el.id = 'mentorLimitModal';
    el.className = 'mentor-limit-modal';
    el.hidden = true;
    el.innerHTML =
      '<div class="mentor-limit-card" role="dialog" aria-modal="true" aria-labelledby="mentorLimitTitle">' +
        '<button type="button" class="mentor-limit-close" id="mentorLimitClose" aria-label="Đóng">×</button>' +
        '<div class="mentor-limit-icon">👩‍🏫</div>' +
        '<h2 id="mentorLimitTitle" class="mentor-limit-title">Hết lượt hỏi hôm nay</h2>' +
        '<p class="mentor-limit-msg">Tài khoản Basic được hỏi Cô giáo AI <strong>' + DAILY_LIMIT + ' câu mỗi ngày</strong>. Bé đã dùng hết — nâng cấp Pro để hỏi không giới hạn!</p>' +
        '<div class="mentor-limit-actions">' +
          '<a href="pro.html" class="mentor-limit-btn mentor-limit-btn--pro">Nâng cấp Pro ✨</a>' +
          '<button type="button" class="mentor-limit-btn mentor-limit-btn--ghost" id="mentorLimitOkBtn">Để sau</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(el);
    el.querySelector('#mentorLimitClose').addEventListener('click', function () { el.hidden = true; });
    el.querySelector('#mentorLimitOkBtn').addEventListener('click', function () { el.hidden = true; });
    el.addEventListener('click', function (e) { if (e.target === el) el.hidden = true; });
    return el;
  }

  function showLimitModal() {
    ensureModal().hidden = false;
    refreshUI();
  }

  global.KidMentorLimits = {
    DAILY_LIMIT: DAILY_LIMIT,
    pullFromCloud: pullFromCloud,
    remaining: remaining,
    canAsk: canAsk,
    tryAsk: tryAsk,
    consumeAsk: consumeAsk,
    showLimitModal: showLimitModal,
    badgeText: badgeText,
    refreshUI: refreshUI,
    isLimited: isLimited,
    isReady: isReady
  };
})(window);
