/* ═══════════════════════════════════════════════════
   SOCIAL.JS — Hub cộng đồng (4 tab: feed / search / friends / chat)
═══════════════════════════════════════════════════ */
(function () {
  'use strict';

  var currentFeed = 'class';
  var currentPanel = 'feed';
  var postsCache = [];
  var myUid = '';
  var activeChatId = '';
  var unsubMessages = null;
  var searchTimer = null;

  function $(id) { return document.getElementById(id); }

  function getTabFromUrl() {
    try {
      var p = new URLSearchParams(location.search);
      return p.get('tab') || 'feed';
    } catch (e) { return 'feed'; }
  }

  function getChatUidFromUrl() {
    try {
      return new URLSearchParams(location.search).get('uid') || '';
    } catch (e) { return ''; }
  }

  function setUrlTab(panel, chatUid) {
    var q = '?tab=' + encodeURIComponent(panel);
    if (panel === 'chat' && chatUid) q += '&uid=' + encodeURIComponent(chatUid);
    history.replaceState(null, '', 'social.html' + q);
  }

  /* ── Main panel tabs ── */
  function switchPanel(panel) {
    currentPanel = panel;
    document.querySelectorAll('.soc-nav-btn').forEach(function (btn) {
      var on = btn.getAttribute('data-panel') === panel;
      btn.classList.toggle('is-active', on);
      btn.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    document.querySelectorAll('.soc-panel').forEach(function (p) {
      var on = p.getAttribute('data-panel') === panel;
      p.classList.toggle('is-active', on);
      p.hidden = !on;
    });
    setUrlTab(panel, panel === 'chat' ? activeOtherUid() : '');
    if (panel === 'feed') loadFeed();
    if (panel === 'search') renderSearchHint();
    if (panel === 'friends') loadFriendsPanel();
    if (panel === 'chat') loadChatPanel();
  }

  function wireMainNav() {
    document.querySelectorAll('.soc-nav-btn').forEach(function (btn) {
      btn.onclick = function () {
        switchPanel(btn.getAttribute('data-panel') || 'feed');
      };
    });
  }

  function activeOtherUid() {
    var head = $('msgHeader');
    return head && head.dataset.otherUid ? head.dataset.otherUid : getChatUidFromUrl();
  }

  /* ── Feed ── */
  function avatarHtml(role, name) {
    var icon = role === 'teacher' ? '👩‍🏫' : '🧒';
    return '<span class="soc-av" aria-hidden="true">' + icon + '</span>' +
      '<span class="soc-name">' + KidSocial.esc(name) + '</span>';
  }

  function renderPost(p) {
    var share = '';
    if (p.shareMeta && p.shareMeta.label) {
      share = '<div class="soc-share-badge">🏆 ' + KidSocial.esc(p.shareMeta.label) + '</div>';
    }
    return '<article class="soc-post" data-id="' + p.id + '">' +
      '<header class="soc-post-head">' +
        '<a class="soc-post-user" href="profile.html?uid=' + encodeURIComponent(p.authorUid) + '">' +
          avatarHtml(p.authorRole, p.authorName) +
        '</a>' +
        '<span class="soc-time">' + KidSocial.esc(p.timeAgo) + '</span>' +
      '</header>' +
      share +
      '<p class="soc-text">' + KidSocial.esc(p.text) + '</p>' +
      '<div class="soc-actions">' +
        '<button type="button" class="soc-act' + (p.liked ? ' is-liked' : '') + '" data-like="' + p.id + '">' +
          (p.liked ? '❤️' : '🤍') + ' <span>' + (p.likeCount || 0) + '</span></button>' +
        '<button type="button" class="soc-act" data-comments="' + p.id + '">💬 ' + (p.commentCount || 0) + '</button>' +
        '<button type="button" class="soc-act" data-share="' + p.id + '">↗ Chia sẻ</button>' +
      '</div>' +
      '<div class="soc-comments" id="comments-' + p.id + '" hidden></div>' +
      '<form class="soc-comment-form" data-post="' + p.id + '" hidden>' +
        '<input type="text" maxlength="300" placeholder="Viết bình luận…">' +
        '<button type="submit">Gửi</button>' +
      '</form>' +
    '</article>';
  }

  function loadFeed() {
    var feed = $('socFeed');
    if (!feed) return;
    feed.innerHTML = '<div class="soc-loading">Đang tải bài đăng…</div>';
    KidSocial.listPosts(currentFeed).then(function (posts) {
      postsCache = posts;
      if (!posts.length) {
        feed.innerHTML = '<div class="soc-empty"><span class="soc-empty-icon">📭</span>Chưa có bài đăng — hãy là người đầu tiên!</div>';
        return;
      }
      feed.innerHTML = posts.map(renderPost).join('');
      wirePostEvents();
    }).catch(function (err) {
      feed.innerHTML = '<div class="soc-empty">' + KidSocial.esc(err.message) + '</div>';
    });
  }

  function wirePostEvents() {
    document.querySelectorAll('[data-like]').forEach(function (btn) {
      btn.onclick = function () {
        var id = btn.getAttribute('data-like');
        KidSocial.toggleLike(id).then(function (liked) {
          btn.classList.toggle('is-liked', liked);
          var n = parseInt(btn.querySelector('span').textContent, 10) + (liked ? 1 : -1);
          btn.innerHTML = (liked ? '❤️' : '🤍') + ' <span>' + n + '</span>';
        }).catch(function (e) { alert(e.message); });
      };
    });
    document.querySelectorAll('[data-comments]').forEach(function (btn) {
      btn.onclick = function () {
        var id = btn.getAttribute('data-comments');
        var box = $('comments-' + id);
        var form = document.querySelector('.soc-comment-form[data-post="' + id + '"]');
        if (!box) return;
        var open = box.hidden;
        box.hidden = !open;
        if (form) form.hidden = !open;
        if (open && !box.dataset.loaded) {
          box.dataset.loaded = '1';
          KidSocial.listComments(id).then(function (list) {
            box.innerHTML = list.length
              ? list.map(function (c) {
                return '<div class="soc-cmt"><b>' + KidSocial.esc(c.authorName) + '</b> ' +
                  KidSocial.esc(c.text) + ' <em>' + KidSocial.esc(c.timeAgo) + '</em></div>';
              }).join('')
              : '<div class="soc-cmt">Chưa có bình luận</div>';
          });
        }
      };
    });
    document.querySelectorAll('.soc-comment-form').forEach(function (form) {
      form.onsubmit = function (e) {
        e.preventDefault();
        var id = form.getAttribute('data-post');
        var inp = form.querySelector('input');
        var text = inp.value.trim();
        if (!text) return;
        KidSocial.addComment(id, text).then(function () {
          inp.value = '';
          var box = $('comments-' + id);
          if (box) {
            box.dataset.loaded = '';
            box.hidden = false;
            form.hidden = false;
            KidSocial.listComments(id).then(function (list) {
              box.innerHTML = list.map(function (c) {
                return '<div class="soc-cmt"><b>' + KidSocial.esc(c.authorName) + '</b> ' + KidSocial.esc(c.text) + '</div>';
              }).join('');
              box.dataset.loaded = '1';
            });
          }
        }).catch(function (err) { alert(err.message); });
      };
    });
    document.querySelectorAll('[data-share]').forEach(function (btn) {
      btn.onclick = function () {
        var id = btn.getAttribute('data-share');
        var p = postsCache.find(function (x) { return x.id === id; });
        if (!p) return;
        var url = location.origin + location.pathname + '?tab=feed#post-' + id;
        if (navigator.share) navigator.share({ title: 'Kid Learning', text: p.text, url: url }).catch(function () {});
        else if (navigator.clipboard) {
          navigator.clipboard.writeText(p.text + '\n' + url);
          alert('Đã copy!');
        }
      };
    });
  }

  function wireFeedTabs() {
    document.querySelectorAll('.soc-feed-tab').forEach(function (tab) {
      tab.onclick = function () {
        document.querySelectorAll('.soc-feed-tab').forEach(function (t) { t.classList.remove('is-active'); });
        tab.classList.add('is-active');
        currentFeed = tab.getAttribute('data-feed') || 'class';
        loadFeed();
      };
    });
  }

  function wireComposer() {
    var form = $('socCompose');
    if (!form) return;
    form.onsubmit = function (e) {
      e.preventDefault();
      var text = ($('socComposeText') || {}).value.trim();
      if (!text) return;
      KidSocial.createPost({ text: text }).then(function () {
        $('socComposeText').value = '';
        switchPanel('feed');
        loadFeed();
      }).catch(function (err) { alert(err.message); });
    };
    var shareBtn = $('socShareProgress');
    if (shareBtn) {
      shareBtn.onclick = function () {
        var stars = 0;
        try {
          var p = JSON.parse(localStorage.getItem('learning_progress') || '{}');
          Object.keys(p).forEach(function (sub) {
            Object.values((p[sub] && p[sub].topics) || {}).forEach(function (t) {
              stars += t.totalStars || 0;
            });
          });
        } catch (e) {}
        KidSocial.createPost({
          text: 'Mình vừa đạt ' + stars + ' ⭐ trên Kid Learning! 🎉',
          type: 'achievement',
          shareMeta: { label: stars + ' sao tích lũy' }
        }).then(function () { loadFeed(); }).catch(function (e) { alert(e.message); });
      };
    }
  }

  /* ── User cards ── */
  function renderUserCard(u) {
    var roleLabel = u.role === 'teacher' ? 'Giáo viên' : 'Học sinh';
    var icon = u.role === 'teacher' ? '👩‍🏫' : '🧒';
    return '<div class="soc-user-card" data-uid="' + KidSocial.esc(u.uid) + '">' +
      '<a class="soc-user-card-av" href="profile.html?uid=' + encodeURIComponent(u.uid) + '">' + icon + '</a>' +
      '<div class="soc-user-card-body">' +
        '<a class="soc-user-card-name" href="profile.html?uid=' + encodeURIComponent(u.uid) + '">' + KidSocial.esc(u.displayName) + '</a>' +
        '<span class="soc-user-card-meta">' + roleLabel + (u.classRoom ? ' · Lớp ' + KidSocial.esc(u.classRoom) : '') + '</span>' +
      '</div>' +
      '<div class="soc-user-card-actions">' +
        '<div class="soc-btn-row">' +
          '<button type="button" class="soc-btn soc-btn--sm soc-btn--ghost" data-follow="' + KidSocial.esc(u.uid) + '">Theo dõi</button>' +
          '<button type="button" class="soc-btn soc-btn--sm soc-btn--green" data-friend="' + KidSocial.esc(u.uid) + '">Kết bạn</button>' +
          '<button type="button" class="soc-btn soc-btn--sm soc-btn--primary" data-msg="' + KidSocial.esc(u.uid) + '">Nhắn tin</button>' +
        '</div>' +
      '</div></div>';
  }

  function wireUserCards(root) {
    if (!root) return;
    root.querySelectorAll('[data-follow]').forEach(function (btn) {
      var uid = btn.getAttribute('data-follow');
      KidSocial.isFollowing(uid).then(function (f) {
        if (f) { btn.textContent = '✓ Theo dõi'; btn.disabled = true; }
      });
      btn.onclick = function () {
        KidSocial.follow(uid).then(function () {
          btn.textContent = '✓ Theo dõi';
          btn.disabled = true;
        }).catch(function (e) { alert(e.message); });
      };
    });
    root.querySelectorAll('[data-friend]').forEach(function (btn) {
      var uid = btn.getAttribute('data-friend');
      KidSocial.getFriendStatus(uid).then(function (st) {
        if (st === 'friends') { btn.textContent = '✓ Bạn bè'; btn.disabled = true; }
        else if (st === 'pending_sent') { btn.textContent = 'Đã gửi'; btn.disabled = true; }
        else if (st === 'pending_received') { btn.textContent = 'Chấp nhận'; }
      });
      btn.onclick = function () {
        KidSocial.getFriendStatus(uid).then(function (st) {
          if (st === 'pending_received') { switchPanel('friends'); loadFriendsPanel(); return; }
          KidSocial.sendFriendRequest(uid).then(function () {
            btn.textContent = 'Đã gửi';
            btn.disabled = true;
          }).catch(function (e) { alert(e.message); });
        });
      };
    });
    root.querySelectorAll('[data-msg]').forEach(function (btn) {
      btn.onclick = function () {
        openChatWithUid(btn.getAttribute('data-msg'));
      };
    });
  }

  /* ── Search tab ── */
  function renderSearchHint() {
    var box = $('socSearchResults');
    if (box && !box.innerHTML.trim()) {
      box.innerHTML = '<div class="soc-empty"><span class="soc-empty-icon">🔍</span>Gõ tên bạn để tìm trong lớp</div>';
    }
  }

  function wireSearch() {
    var inp = $('socSearchInput');
    var box = $('socSearchResults');
    if (!inp || !box) return;
    inp.addEventListener('input', function () {
      clearTimeout(searchTimer);
      var q = inp.value.trim();
      if (q.length < 2) {
        box.innerHTML = '<div class="soc-empty"><span class="soc-empty-icon">✏️</span>Nhập ít nhất 2 ký tự</div>';
        return;
      }
      searchTimer = setTimeout(function () {
        box.innerHTML = '<div class="soc-loading">Đang tìm…</div>';
        KidSocial.searchUsers(q).then(function (list) {
          if (!list.length) {
            box.innerHTML = '<div class="soc-empty"><span class="soc-empty-icon">😔</span>Không tìm thấy trong lớp của bạn</div>';
            return;
          }
          box.innerHTML = list.map(renderUserCard).join('');
          wireUserCards(box);
        });
      }, 300);
    });
  }

  /* ── Friends tab ── */
  function updateFriendBadge(count) {
    var badge = $('socFriendBadge');
    if (!badge) return;
    if (count > 0) {
      badge.hidden = false;
      badge.textContent = String(count);
    } else {
      badge.hidden = true;
    }
  }

  function loadFriendsPanel() {
    var reqBox = $('socFriendRequests');
    var listBox = $('socFriendsList');
    var suggestBox = $('socClassSuggest');

    KidSocial.listIncomingFriendRequests().then(function (reqs) {
      updateFriendBadge(reqs.length);
      if (!reqBox) return;
      if (!reqs.length) {
        reqBox.innerHTML = '';
        reqBox.hidden = true;
        return;
      }
      reqBox.hidden = false;
      reqBox.innerHTML = '<div class="soc-card-head"><span class="soc-card-icon">📩</span><h2>Lời mời kết bạn (' + reqs.length + ')</h2></div>' +
        reqs.map(function (r) {
          return '<div class="soc-req-row">' +
            '<span class="soc-req-name">' + KidSocial.esc(r.fromName) + '</span>' +
            '<div class="soc-req-actions">' +
              '<button type="button" class="soc-btn soc-btn--sm soc-btn--green" data-accept="' + KidSocial.esc(r.id) + '">Chấp nhận</button>' +
              '<button type="button" class="soc-btn soc-btn--sm soc-btn--ghost" data-decline="' + KidSocial.esc(r.id) + '">Từ chối</button>' +
            '</div></div>';
        }).join('');
      reqBox.querySelectorAll('[data-accept]').forEach(function (btn) {
        btn.onclick = function () {
          KidSocial.acceptFriendRequest(btn.getAttribute('data-accept')).then(loadFriendsPanel)
            .catch(function (e) { alert(e.message); });
        };
      });
      reqBox.querySelectorAll('[data-decline]').forEach(function (btn) {
        btn.onclick = function () {
          KidSocial.declineFriendRequest(btn.getAttribute('data-decline')).then(loadFriendsPanel)
            .catch(function (e) { alert(e.message); });
        };
      });
    });

    if (listBox) {
      listBox.innerHTML = '<div class="soc-loading">Đang tải…</div>';
      KidSocial.listFriends().then(function (friends) {
        if (!friends.length) {
          listBox.innerHTML = '<div class="soc-empty"><span class="soc-empty-icon">🤝</span>Chưa có bạn bè — hãy gửi lời mời!</div>';
          return;
        }
        listBox.innerHTML = friends.map(renderUserCard).join('');
        wireUserCards(listBox);
      });
    }

    if (suggestBox) {
      KidSocial.suggestClassmates().then(function (list) {
        if (!list.length) {
          suggestBox.innerHTML = '<div class="soc-empty">Lưu mã lớp ở Hồ sơ để thấy bạn cùng lớp</div>';
          return;
        }
        suggestBox.innerHTML = list.slice(0, 12).map(renderUserCard).join('');
        wireUserCards(suggestBox);
      });
    }
  }

  /* ── Chat tab ── */
  function renderInbox(rows) {
    var box = $('msgInboxList');
    if (!box) return;
    if (!rows.length) {
      box.innerHTML = '<div class="soc-empty"><span class="soc-empty-icon">💬</span>Chưa có hội thoại</div>';
      return;
    }
    box.innerHTML = rows.map(function (r) {
      var active = r.chatId === activeChatId ? ' is-active' : '';
      var initial = (r.otherName || '?').charAt(0).toUpperCase();
      return '<button type="button" class="soc-inbox-item' + active + '" data-chat="' + KidSocial.esc(r.chatId) +
        '" data-uid="' + KidSocial.esc(r.otherUid) + '" data-name="' + KidSocial.esc(r.otherName) + '">' +
        '<span class="soc-inbox-av">' + initial + '</span>' +
        '<span class="soc-inbox-meta"><strong>' + KidSocial.esc(r.otherName) + '</strong>' +
        '<em>' + KidSocial.esc(r.lastText || 'Bắt đầu trò chuyện') + '</em></span>' +
        '<span class="soc-inbox-time">' + KidSocial.esc(r.timeAgo) + '</span></button>';
    }).join('');
    box.querySelectorAll('.soc-inbox-item').forEach(function (btn) {
      btn.onclick = function () {
        openChat(btn.getAttribute('data-chat'), btn.getAttribute('data-uid'), btn.getAttribute('data-name'));
      };
    });
  }

  function renderMessages(list) {
    var box = $('msgList');
    if (!box) return;
    if (!list.length) {
      box.innerHTML = '<div class="soc-empty"><span class="soc-empty-icon">👋</span>Chào bạn nhé!</div>';
      return;
    }
    box.innerHTML = list.map(function (m) {
      var mine = m.senderUid === myUid;
      return '<div class="soc-bubble-row' + (mine ? ' is-mine' : '') + '">' +
        '<div class="soc-bubble">' + KidSocial.esc(m.text) +
        '<span class="soc-bubble-time">' + KidSocial.esc(m.timeAgo) + '</span></div></div>';
    }).join('');
    box.scrollTop = box.scrollHeight;
  }

  function openChat(chatId, otherUid, otherName) {
    activeChatId = chatId;
    if (unsubMessages) { unsubMessages(); unsubMessages = null; }
    var head = $('msgHeader');
    var inp = $('msgInput');
    var sendBtn = $('msgSendBtn');
    var main = $('socChatMain');
    if (head) {
      head.dataset.otherUid = otherUid;
      head.innerHTML =
        '<button type="button" class="soc-chat-back" id="socChatBack">←</button>' +
        '<a class="soc-chat-head-user" href="profile.html?uid=' + encodeURIComponent(otherUid) + '">' +
          '<span class="soc-inbox-av">' + (otherName.charAt(0) || '?') + '</span>' +
          '<span class="soc-chat-head-name">' + KidSocial.esc(otherName) + '</span></a>' +
        '<a class="soc-chat-head-link" href="profile.html?uid=' + encodeURIComponent(otherUid) + '">Hồ sơ</a>';
      var back = $('socChatBack');
      if (back) back.onclick = function () {
        if (main) main.classList.remove('is-open');
        activeChatId = '';
        if (unsubMessages) { unsubMessages(); unsubMessages = null; }
        head.innerHTML = '<div class="soc-chat-placeholder"><span class="soc-chat-placeholder-icon">💬</span><p>Chọn cuộc trò chuyện</p></div>';
        if (inp) { inp.disabled = true; inp.value = ''; }
        if (sendBtn) sendBtn.disabled = true;
        $('msgList').innerHTML = '';
        setUrlTab('chat', '');
      };
    }
    if (inp) inp.disabled = false;
    if (sendBtn) sendBtn.disabled = false;
    if (main) main.classList.add('is-open');
    document.querySelectorAll('.soc-inbox-item').forEach(function (el) {
      el.classList.toggle('is-active', el.getAttribute('data-chat') === chatId);
    });
    setUrlTab('chat', otherUid);
    unsubMessages = KidSocial.subscribeMessages(chatId, renderMessages);
    KidSocial.listConversations().then(renderInbox);
  }

  function openChatWithUid(uid) {
    if (!uid) return;
    switchPanel('chat');
    KidSocial.ensureChat(uid).then(function (chat) {
      openChat(chat.chatId, chat.otherUid, chat.otherName);
    }).catch(function (e) { alert(e.message); });
  }

  function loadChatPanel() {
    KidSocial.listConversations().then(renderInbox);
    KidSocial.listIncomingFriendRequests().then(function (reqs) { updateFriendBadge(reqs.length); });
  }

  function wireChatForm() {
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

  /* ── Init ── */
  function init() {
    wireMainNav();
    wireFeedTabs();
    wireComposer();
    wireSearch();
    wireChatForm();

    var boot = KidSocial.whenAuthReady().then(function (user) {
      if (!user) { window.location.replace('auth/login.html'); return; }
      myUid = user.uid;
      return KidSocial.ensureUserDoc();
    });

    boot.then(function () {
      if (typeof mountUserBar === 'function') mountUserBar();
      var tab = getTabFromUrl();
      var chatUid = getChatUidFromUrl();
      switchPanel(tab);
      if (tab === 'chat' && chatUid) openChatWithUid(chatUid);
      else loadFriendsPanel();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
