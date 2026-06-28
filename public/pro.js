/* ═══════════════════════════════════════════════════
   PRO.JS — Trang nâng cấp Pro
═══════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  var GAME_LIST = [
    { id: 'platformer', icon: '🍄', name: 'Phiêu lưu Platformer' },
    { id: 'maze', icon: '🧩', name: 'Mê cung 2D' },
    { id: 'digger', icon: '⛏️', name: 'Đào vàng' },
    { id: 'memory', icon: '🃏', name: 'Ghép cặp trí nhớ' },
    { id: 'sort', icon: '📦', name: 'Phân loại thông minh' }
  ];

  function $(id) { return document.getElementById(id); }

  function renderGamesGrid() {
    var grid = $('proGamesGrid');
    if (!grid) return;
    var PL = global.KidPlayLimits;
    var isPro = global.KidAccountPlan && global.KidAccountPlan.isPro();
    grid.innerHTML = GAME_LIST.map(function (g) {
      var badge = isPro ? 'Không giới hạn' : (PL ? PL.badgeText(g.id) : '');
      return '<div class="pro-game-chip">' +
        '<span class="pro-game-icon">' + g.icon + '</span>' +
        '<strong>' + g.name + '</strong>' +
        '<span class="pro-game-plays">' + badge + '</span></div>';
    }).join('');
  }

  function updatePlanUi() {
    var isPro = global.KidAccountPlan && global.KidAccountPlan.isPro();
    var planEl = $('proCurrentPlan');
    var basicNote = $('proBasicNote');
    var btn = $('proUpgradeBtn');
    if (planEl) {
      planEl.textContent = isPro ? '⭐ Bạn đang dùng Kid Learning Pro' : '🆓 Gói Basic — 3 lượt / game';
      planEl.classList.toggle('is-pro', isPro);
    }
    if (basicNote) basicNote.hidden = isPro;
    if (btn) {
      if (isPro) {
        btn.textContent = '✓ Đã là Pro';
        btn.disabled = true;
        btn.classList.add('is-done');
      } else {
        btn.textContent = 'Nâng cấp Pro ngay';
        btn.disabled = false;
        btn.classList.remove('is-done');
      }
    }
    renderGamesGrid();
  }

  function wireUpgrade() {
    var btn = $('proUpgradeBtn');
    if (!btn || btn._wired) return;
    btn._wired = true;
    btn.addEventListener('click', function () {
      if (global.KidAccountPlan && global.KidAccountPlan.isPro()) return;
      btn.disabled = true;
      btn.textContent = 'Đang xử lý...';
      var msg = $('proUpgradeMsg');
      global.KidAccountPlan.upgradeToPro()
        .then(function () {
          if (msg) {
            msg.hidden = false;
            msg.textContent = '🎉 Chúc mừng! Tài khoản Pro đã được kích hoạt — chơi không giới hạn!';
            msg.className = 'pro-upgrade-msg pro-upgrade-msg--ok';
          }
          updatePlanUi();
        })
        .catch(function (e) {
          btn.disabled = false;
          btn.textContent = 'Nâng cấp Pro ngay';
          if (msg) {
            msg.hidden = false;
            msg.textContent = e.message || 'Không nâng cấp được. Thử lại sau.';
            msg.className = 'pro-upgrade-msg pro-upgrade-msg--err';
          }
        });
    });
  }

  function initProPage() {
    if (!document.querySelector('.pro-wrap')) return;
    wireUpgrade();
    Promise.all([
      global.KidAccountPlan ? global.KidAccountPlan.pullFromCloud() : Promise.resolve(),
      global.KidPlayLimits ? global.KidPlayLimits.pullFromCloud() : Promise.resolve()
    ]).then(updatePlanUi);
    if (typeof global.mountUserBar === 'function') global.mountUserBar();
  }

  global.renderProPage = initProPage;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initProPage);
  } else {
    initProPage();
  }
})(window);
