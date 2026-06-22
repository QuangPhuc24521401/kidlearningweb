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

  function renderInbox(rows) {
    var box = $('msgInboxList');
    if (!box) return;
    if (!rows.length) {
      box.innerHTML = '<div class="msg-empty">Chưa có hội thoại — tìm bạn và nhắn tin!</div>';
      return;
    }
    box.innerHTML = rows.map(function (r) {
      var active = r.chatId === activeChatId ? ' is-active' : '';
      return '<button type="button" class="msg-inbox-item' + active + '" data-chat="' + KidSocial.esc(r.chatId) +
        '" data-uid="' + KidSocial.esc(r.otherUid) + '" data-name="' + KidSocial.esc(r.otherName) + '">' +
        '<span class="msg-inbox-av">' + (r.otherName.charAt(0) || '🧒') + '</span>' +
        '<span class="msg-inbox-meta">' +
          '<strong>' + KidSocial.esc(r.otherName) + '</strong>' +
          '<em>' + KidSocial.esc(r.lastText || 'Bắt đầu trò chuyện') + '</em>' +
        '</span>' +
        '<span class="msg-inbox-time">' + KidSocial.esc(r.timeAgo) + '</span>' +
      '</button>';
    }).join('');
    box.querySelectorAll('.msg-inbox-item').forEach(function (btn) {
      btn.onclick = function () {
        openChat(btn.getAttribute('data-chat'), btn.getAttribute('data-uid'), btn.getAttribute('data-name'));
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
      return '<div class="msg-bubble-row' + (mine ? ' is-mine' : '') + '">' +
        '<div class="msg-bubble">' + KidSocial.esc(m.text) +
        '<span class="msg-bubble-time">' + KidSocial.esc(m.timeAgo) + '</span></div></div>';
    }).join('');
    box.scrollTop = box.scrollHeight;
  }

  function openChat(chatId, otherUid, otherName) {
    activeChatId = chatId;
    activeOtherUid = otherUid;
    if (unsubMessages) { unsubMessages(); unsubMessages = null; }
    var head = $('msgHeader');
    if (head) {
      head.innerHTML = '<a href="profile.html?uid=' + encodeURIComponent(otherUid) + '" class="msg-head-user">' +
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
          openChat(chat.chatId, chat.otherUid, chat.otherName);
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
