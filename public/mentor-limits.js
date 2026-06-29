/* ═══════════════════════════════════════════════════
   MENTOR-LIMITS.JS — Giới hạn hỏi Cô giáo AI (Basic)
   Basic: 5 câu / ngày · Pro: không giới hạn
═══════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  var DAILY_LIMIT = 5;
  var STORAGE_KEY = 'kid_mentor_daily';

  function pad2(n) { return (n < 10 ? '0' : '') + n; }

  function todayKey() {
    var d = new Date();
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
  }

  function readLocal() {
    try {
      var raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') || {};
      var today = todayKey();
      if (raw.date !== today) return { date: today, count: 0 };
      return { date: today, count: typeof raw.count === 'number' ? raw.count : 0 };
    } catch (e) {
      return { date: todayKey(), count: 0 };
    }
  }

  function writeLocal(state) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) {}
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
    if (!isLimited()) return true;
    return getCount() < DAILY_LIMIT;
  }

  function consumeAsk() {
    if (!isLimited()) return true;
    if (!canAsk()) return false;
    var state = readLocal();
    state.count = (state.count || 0) + 1;
    writeLocal(state);
    pushCloud(state);
    refreshUI();
    return true;
  }

  function pushCloud(state) {
    try {
      if (typeof firebase === 'undefined' || !firebase.auth || !firebase.firestore) return;
      var user = firebase.auth().currentUser;
      if (!user) return;
      firebase.firestore().collection('users').doc(user.uid).set({
        mentorDaily: { date: state.date, count: state.count },
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true }).catch(function () {});
    } catch (e) {}
  }

  function mergeCloud(cloud) {
    cloud = cloud || {};
    var local = readLocal();
    var today = todayKey();
    var cloudDate = cloud.date || '';
    var cloudCount = typeof cloud.count === 'number' ? cloud.count : 0;
    if (cloudDate === today && cloudCount > local.count) {
      local.count = cloudCount;
      writeLocal(local);
    }
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
          resolve(mergeCloud(data.mentorDaily));
        })
        .catch(function () { resolve(readLocal()); });
    });
  }

  function badgeText() {
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
      } else {
        fill.classList.remove('is-pro');
        var used = getCount();
        var pct = DAILY_LIMIT ? Math.min(100, Math.round((DAILY_LIMIT - remaining()) / DAILY_LIMIT * 100)) : 0;
        fill.style.width = pct + '%';
        fill.classList.toggle('is-low', remaining() <= 1 && remaining() > 0);
        fill.classList.toggle('is-empty', remaining() === 0);
      }
    }

    var warn = document.getElementById('mentorUsageWarn');
    if (warn) {
      if (limited && remaining() === 0) {
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
    consumeAsk: consumeAsk,
    showLimitModal: showLimitModal,
    badgeText: badgeText,
    refreshUI: refreshUI,
    isLimited: isLimited
  };
})(window);
