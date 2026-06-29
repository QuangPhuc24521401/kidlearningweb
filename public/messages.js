/* ═══════════════════════════════════════════════════
   MESSAGES.JS — Hộp thư & chat 1-1
═══════════════════════════════════════════════════ */
(function () {
  'use strict';

  var activeChatId = '';
  var activeOtherUid = '';
  var unsubMessages = null;
  var myUid = '';

  function $(id) { return document.getElementById(id); }

  function queryUid() {
    try {
      return new URLSearchParams(location.search).get('uid') || '';
    } catch (e) { return ''; }
  }

  function avatarHtml(prof, className) {
    className = className || 'msg-inbox-av';
    if (typeof KidSocial.renderAvatarHtml === 'function') {
      return KidSocial.renderAvatarHtml(prof, className);
    }
    return '<span class="' + className + '">' + (prof && prof.role === 'teacher' ? '👩‍🏫' : '🧒') + '</span>';
  }

  function renderInbox(rows) {
    var box = $('msgInboxList');
    if (!box) return;
    if (!rows.length) {
      box.innerHTML = '<div class="msg-empty">Chưa có hội thoại — tìm bạn và nhắn tin!</div>';
      return;
    }
    box.innerHTML = rows.map(function (r) {
      var active = r.chatId === activeChatId ? ' is-active' : '';
      var avProf = Object.assign({ role: 'parent' }, r.otherAvatar || {});
      return '<button type="button" class="msg-inbox-item' + active + '" data-chat="' + KidSocial.esc(r.chatId) +
        '" data-uid="' + KidSocial.esc(r.otherUid) + '" data-name="' + KidSocial.esc(r.otherName) + '">' +
        avatarHtml(avProf, 'msg-inbox-av soc-av') +
        '<span class="msg-inbox-meta">' +
          '<strong>' + KidSocial.esc(r.otherName) + '</strong>' +
          '<em>' + KidSocial.esc(r.lastText || 'Bắt đầu trò chuyện') + '</em>' +
        '</span>' +
        '<span class="msg-inbox-time">' + KidSocial.esc(r.timeAgo) + '</span>' +
      '</button>';
    }).join('');
    box.querySelectorAll('.msg-inbox-item').forEach(function (btn) {
      var cid = btn.getAttribute('data-chat');
      var row = rows.find(function (r) { return r.chatId === cid; });
      btn.onclick = function () {
        openChat(
          btn.getAttribute('data-chat'),
          btn.getAttribute('data-uid'),
          btn.getAttribute('data-name'),
          row ? row.otherAvatar : null
        );
      };
    });
  }

  function renderMessages(list) {
    var box = $('msgList');
    if (!box) return;
    if (!list.length) {
      box.innerHTML = '<div class="msg-empty">Chưa có tin nhắn — hãy chào bạn nhé! 👋</div>';
      return;
    }
    box.innerHTML = list.map(function (m) {
      var mine = m.senderUid === myUid;
      var avProf = {
        role: 'parent',
        avatarMode: m.avatarMode,
        avatarEmoji: m.avatarEmoji,
        avatarRing: m.avatarRing,
        avatarPhoto: m.avatarPhoto
      };
      var av = avatarHtml(avProf, 'msg-bubble-av soc-av');
      return '<div class="msg-bubble-row' + (mine ? ' is-mine' : '') + '">' +
        (mine ? '' : av) +
        '<div class="msg-bubble">' + KidSocial.esc(m.text) +
        '<span class="msg-bubble-time">' + KidSocial.esc(m.timeAgo) + '</span></div>' +
        (mine ? av : '') +
      '</div>';
    }).join('');
    box.scrollTop = box.scrollHeight;
  }

  function openChat(chatId, otherUid, otherName, otherAvatar) {
    activeChatId = chatId;
    activeOtherUid = otherUid;
    if (unsubMessages) { unsubMessages(); unsubMessages = null; }
    var head = $('msgHeader');
    if (head) {
      var avProf = Object.assign({ role: 'parent' }, otherAvatar || {});
      head.innerHTML =
        avatarHtml(avProf, 'msg-head-av soc-av') +
        '<a href="profile.html?uid=' + encodeURIComponent(otherUid) + '" class="msg-head-user">' +
        KidSocial.esc(otherName) + '</a>' +
        '<a href="profile.html?uid=' + encodeURIComponent(otherUid) + '" class="msg-head-link">Hồ sơ</a>';
    }
    var panel = $('msgChat');
    if (panel) panel.classList.add('is-open');
    document.querySelectorAll('.msg-inbox-item').forEach(function (el) {
      el.classList.toggle('is-active', el.getAttribute('data-chat') === chatId);
    });
    history.replaceState(null, '', 'messages.html?uid=' + encodeURIComponent(otherUid));
    unsubMessages = KidSocial.subscribeMessages(chatId, renderMessages);
    loadInbox();
  }

  function loadInbox() {
    KidSocial.listConversations().then(renderInbox);
    KidSocial.listIncomingFriendRequests().then(function (reqs) {
      var box = $('msgRequests');
      if (!box) return;
      if (!reqs.length) { box.innerHTML = ''; return; }
      box.innerHTML = '<h3 class="msg-req-title">🤝 Lời mời kết bạn</h3>' +
        reqs.map(function (r) {
          return '<div class="msg-req-row">' +
            '<span>' + KidSocial.esc(r.fromName) + '</span>' +
            '<button type="button" data-accept="' + KidSocial.esc(r.id) + '">Chấp nhận</button>' +
            '<button type="button" data-decline="' + KidSocial.esc(r.id) + '">Từ chối</button>' +
          '</div>';
        }).join('');
      box.querySelectorAll('[data-accept]').forEach(function (btn) {
        btn.onclick = function () {
          KidSocial.acceptFriendRequest(btn.getAttribute('data-accept')).then(function () {
            loadInbox();
          }).catch(function (e) { alert(e.message); });
        };
      });
      box.querySelectorAll('[data-decline]').forEach(function (btn) {
        btn.onclick = function () {
          KidSocial.declineFriendRequest(btn.getAttribute('data-decline')).then(loadInbox)
            .catch(function (e) { alert(e.message); });
        };
      });
    });
  }

  function wireForm() {
    var form = $('msgForm');
    if (!form) return;
    form.onsubmit = function (e) {
      e.preventDefault();
      if (!activeChatId) return;
      var inp = $('msgInput');
      var text = inp.value.trim();
      if (!text) return;
      KidSocial.sendMessage(activeChatId, text).then(function () {
        inp.value = '';
      }).catch(function (err) { alert(err.message); });
    };
  }

  function init() {
    wireForm();
    KidSocial.whenAuthReady().then(function (user) {
      if (!user) {
        window.location.replace('auth/login.html');
        return;
      }
      myUid = user.uid;
      return KidSocial.ensureUserDoc();
    }).then(function () {
      loadInbox();
      if (typeof mountUserBar === 'function') mountUserBar();
      var uid = queryUid();
      if (uid) {
        KidSocial.ensureChat(uid).then(function (chat) {
          openChat(chat.chatId, chat.otherUid, chat.otherName, chat.otherAvatar);
        }).catch(function (e) { alert(e.message); });
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
