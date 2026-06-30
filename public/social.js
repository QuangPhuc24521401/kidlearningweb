/* ═══════════════════════════════════════════════════
   SOCIAL.JS — Hub cộng đồng (feed / khám phá / tìm bạn / bạn bè / chat)
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
  var isMobile = false;

  var NEWS_ITEMS = [
    { tag: 'Mới', title: '6 game học tập Basic & Pro', desc: 'Platformer, mê cung, trí nhớ, phân loại và tìm khác biệt.', link: 'game.html', icon: '🎮' },
    { tag: 'Sự kiện', title: 'Tuần lửa học tập', desc: 'Học 7 ngày liên tiếp để mở huy hiệu Tuần vàng trên trang Tiến độ.', link: 'progress.html', icon: '🔥' },
    { tag: 'Mẹo', title: 'Chia sẻ thành tích', desc: 'Bấm nút vàng khi đăng bài để bạn bè cổ vũ bé học giỏi!', link: '', icon: '⭐' },
    { tag: 'Cộng đồng', title: 'Kết bạn để nhắn tin', desc: 'Gửi lời mời ở tab Tìm bạn — chấp nhận xong mới chat được.', link: '', icon: '💬' },
    { tag: 'PvP', title: 'Thi đấu cùng bạn', desc: 'Vào sảnh PvP để thi đấu trí tuệ realtime với bạn bè.', link: 'pvp.html', icon: '⚔️' }
  ];

  function $(id) { return document.getElementById(id); }

  function checkMobile() {
    isMobile = window.matchMedia('(max-width: 768px)').matches;
    document.body.classList.toggle('soc-is-mobile', isMobile);
    syncScrollLock();
  }

  function syncScrollLock() {
    var lock = isMobile && document.body.classList.contains('soc-chat-open');
    document.body.classList.toggle('soc-no-scroll', lock);
  }

  function updateBodyPanelClass(panel) {
    document.body.classList.toggle('soc-panel-chat', panel === 'chat');
    document.body.classList.toggle('soc-panel-discover', panel === 'discover');
    if (panel !== 'chat') {
      document.body.classList.remove('soc-chat-open');
    }
  }

  function rankMedal(i) {
    if (i === 0) return '🥇';
    if (i === 1) return '🥈';
    if (i === 2) return '🥉';
    return String(i + 1);
  }

  function renderFeaturedHtml(posts, compact) {
    if (!posts || !posts.length) {
      return '<div class="soc-widget-empty">Chưa có tin nổi bật — hãy đăng bài đầu tiên!</div>';
    }
    return posts.map(function (p, idx) {
      var hot = (p.likeCount || 0) >= 2 || p.type === 'achievement';
      var text = p.text.length > (compact ? 72 : 120) ? p.text.slice(0, compact ? 72 : 120) + '…' : p.text;
      return '<article class="soc-hot-item' + (hot ? ' is-hot' : '') + '" data-post-id="' + KidSocial.esc(p.id) + '">' +
        '<div class="soc-hot-top">' +
          (hot ? '<span class="soc-hot-badge">🔥 Nổi bật</span>' : '<span class="soc-hot-badge soc-hot-badge--soft">📌 Mới</span>') +
          '<span class="soc-hot-meta">❤️ ' + (p.likeCount || 0) + '</span>' +
        '</div>' +
        '<a class="soc-hot-user" href="profile.html?uid=' + encodeURIComponent(p.authorUid) + '">' +
          avatarHtml(postAuthorProf(p)).replace('soc-av', 'soc-av soc-hot-av') +
          '<span>' + KidSocial.esc(p.authorName) + '</span>' +
        '</a>' +
        '<p class="soc-hot-text">' + KidSocial.esc(text) + '</p>' +
        (compact ? '' : '<button type="button" class="soc-hot-link" data-goto-post="' + KidSocial.esc(p.id) + '">Xem trên bảng tin →</button>') +
      '</article>';
    }).join('');
  }

  function renderLeaderboardHtml(data, compact) {
    data = data || { rows: [], classRoom: '', myRank: null };
    var rows = data.rows || [];
    if (!rows.length) {
      return '<div class="soc-widget-empty">Chưa có dữ liệu xếp hạng. Hãy học bài để tích sao nhé!</div>';
    }
    var head = data.classRoom
      ? '<p class="soc-lb-sub">Lớp <strong>' + KidSocial.esc(data.classRoom) + '</strong>' +
        (data.myRank ? ' · Bạn đang hạng <strong>#' + data.myRank + '</strong>' : '') + '</p>'
      : '<p class="soc-lb-sub">Thêm mã lớp ở Hồ sơ để xem bảng vàng cùng lớp.</p>';
    var list = rows.map(function (r, i) {
      var prof = {
        avatarMode: r.avatarMode,
        avatarEmoji: r.avatarEmoji,
        avatarRing: r.avatarRing,
        avatarPhoto: r.avatarPhoto
      };
      return '<div class="soc-lb-row' + (r.isMe ? ' is-me' : '') + '">' +
        '<span class="soc-lb-rank" aria-hidden="true">' + rankMedal(i) + '</span>' +
        '<a class="soc-lb-user" href="profile.html?uid=' + encodeURIComponent(r.uid) + '">' +
          avatarHtml(prof).replace('soc-av', 'soc-av soc-lb-av') +
          '<span class="soc-lb-name">' + KidSocial.esc(r.displayName) + (r.isMe ? ' (bạn)' : '') + '</span>' +
        '</a>' +
        '<span class="soc-lb-stars">⭐ ' + (r.stars || 0) + '</span>' +
      '</div>';
    }).join('');
    return head + '<div class="soc-lb-list">' + list + '</div>';
  }

  function renderNewsHtml() {
    return NEWS_ITEMS.map(function (n) {
      var inner =
        '<div class="soc-news-item">' +
          '<span class="soc-news-icon" aria-hidden="true">' + n.icon + '</span>' +
          '<div class="soc-news-body">' +
            '<span class="soc-news-tag">' + KidSocial.esc(n.tag) + '</span>' +
            '<strong class="soc-news-title">' + KidSocial.esc(n.title) + '</strong>' +
            '<p class="soc-news-desc">' + KidSocial.esc(n.desc) + '</p>' +
          '</div>' +
        '</div>';
      if (n.link) return '<a class="soc-news-link" href="' + KidSocial.esc(n.link) + '">' + inner + '</a>';
      return inner;
    }).join('');
  }

  function widgetShell(icon, title, bodyHtml) {
    return '<div class="soc-widget-head">' +
      '<span class="soc-widget-icon">' + icon + '</span>' +
      '<h3>' + title + '</h3>' +
    '</div>' +
    '<div class="soc-widget-body">' + bodyHtml + '</div>';
  }

  function wireFeaturedLinks(root) {
    if (!root) return;
    root.querySelectorAll('[data-goto-post]').forEach(function (btn) {
      btn.onclick = function () {
        switchPanel('feed');
        setTimeout(function () {
          var el = document.querySelector('.soc-post[data-id="' + btn.getAttribute('data-goto-post') + '"]');
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 350);
      };
    });
  }

  function fillWidget(id, html) {
    var el = $(id);
    if (el) el.innerHTML = html;
  }

  function loadSidebar() {
    var featTargets = ['socFeaturedWidget', 'socDiscoverFeatured'];
    var lbTargets = ['socLeaderboardWidget', 'socDiscoverLeaderboard'];
    var newsTargets = ['socNewsWidget', 'socDiscoverNews'];

    featTargets.forEach(function (id) {
      fillWidget(id, widgetShell('🔥', 'Tin nổi bật', '<div class="soc-loading">Đang tải…</div>'));
    });
    lbTargets.forEach(function (id) {
      fillWidget(id, widgetShell('🏆', 'Bảng vàng lớp', '<div class="soc-loading">Đang tải…</div>'));
    });
    newsTargets.forEach(function (id) {
      fillWidget(id, widgetShell('📰', 'Tin tức & sự kiện', renderNewsHtml()));
    });

    KidSocial.listFeaturedPosts(4).then(function (posts) {
      var sidebarHtml = widgetShell('🔥', 'Tin nổi bật', renderFeaturedHtml(posts, true));
      var discoverHtml = widgetShell('🔥', 'Tin nổi bật', renderFeaturedHtml(posts, false));
      fillWidget('socFeaturedWidget', sidebarHtml);
      fillWidget('socDiscoverFeatured', discoverHtml);
      wireFeaturedLinks($('socFeaturedWidget'));
      wireFeaturedLinks($('socDiscoverFeatured'));
    });

    KidSocial.getClassLeaderboard(8).then(function (data) {
      var html = widgetShell('🏆', 'Bảng vàng lớp', renderLeaderboardHtml(data, true));
      fillWidget('socLeaderboardWidget', html);
      fillWidget('socDiscoverLeaderboard', widgetShell('🏆', 'Bảng vàng học sinh', renderLeaderboardHtml(data, false)));
      updateHeroStats(data);
    });
  }

  function loadDiscoverPanel() {
    loadSidebar();
  }

  function updateHeroStats(lbData) {
    var classEl = $('socStatClass');
    var starsEl = $('socStatStars');
    var rankEl = $('socStatRank');
    if (lbData) {
      if (classEl) classEl.textContent = lbData.memberCount ? String(lbData.memberCount) : '—';
      if (rankEl) rankEl.textContent = lbData.myRank ? ('#' + lbData.myRank) : '—';
    }
    if (myUid && KidSocial.getUserAchievements) {
      KidSocial.getUserAchievements(myUid).then(function (ach) {
        if (starsEl) starsEl.textContent = String(ach.stars || 0);
      });
    }
  }

  function loadHeroStats() {
    KidSocial.getClassLeaderboard(8).then(updateHeroStats);
  }

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
    updateBodyPanelClass(panel);
    if (panel !== 'chat') resetChatView();
    setUrlTab(panel, panel === 'chat' && activeChatId ? activeOtherUid() : '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (panel === 'feed') loadFeed();
    if (panel === 'discover') loadDiscoverPanel();
    if (panel === 'search') renderSearchHint();
    if (panel === 'friends') loadFriendsPanel();
    if (panel === 'chat') loadChatPanel();
  }

  function resetChatView() {
    var main = $('socChatMain');
    if (main) main.classList.remove('is-open');
    document.body.classList.remove('soc-chat-open');
    syncScrollLock();
    if (unsubMessages) { unsubMessages(); unsubMessages = null; }
    activeChatId = '';
    var inp = $('msgInput');
    var sendBtn = $('msgSendBtn');
    if (inp) { inp.disabled = true; inp.value = ''; }
    if (sendBtn) sendBtn.disabled = true;
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
  function avatarHtml(prof) {
    if (typeof KidSocial.renderAvatarHtml === 'function') {
      return KidSocial.renderAvatarHtml(prof, 'soc-av');
    }
    var icon = prof && prof.role === 'teacher' ? '👩‍🏫' : '🧒';
    return '<span class="soc-av" aria-hidden="true">' + icon + '</span>';
  }

  function postAuthorProf(p) {
    return {
      role: p.authorRole,
      avatarMode: p.authorAvatarMode || p.avatarMode,
      avatarEmoji: p.authorAvatarEmoji || p.avatarEmoji,
      avatarRing: p.authorAvatarRing || p.avatarRing,
      avatarPhoto: p.authorAvatarPhoto || p.avatarPhoto
    };
  }

  function renderPost(p) {
    var share = '';
    if (p.shareMeta && p.shareMeta.label) {
      share = '<div class="soc-share-badge">🏆 ' + KidSocial.esc(p.shareMeta.label) + '</div>';
    }
    return '<article class="soc-post" data-id="' + p.id + '">' +
      '<header class="soc-post-head">' +
        '<a class="soc-post-user" href="profile.html?uid=' + encodeURIComponent(p.authorUid) + '">' +
          avatarHtml(postAuthorProf(p)) +
          '<span class="soc-name">' + KidSocial.esc(p.authorName) + '</span>' +
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
      KidSocial.listFeaturedPosts(4).then(function (featured) {
        fillWidget('socFeaturedWidget', widgetShell('🔥', 'Tin nổi bật', renderFeaturedHtml(featured, true)));
        wireFeaturedLinks($('socFeaturedWidget'));
      });
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
                return '<div class="soc-cmt">' +
                  avatarHtml({
                    role: 'parent',
                    avatarMode: c.avatarMode,
                    avatarEmoji: c.avatarEmoji,
                    avatarRing: c.avatarRing,
                    avatarPhoto: c.avatarPhoto
                  }) +
                  '<div class="soc-cmt-body"><b>' + KidSocial.esc(c.authorName) + '</b> ' +
                  KidSocial.esc(c.text) + ' <em>' + KidSocial.esc(c.timeAgo) + '</em></div></div>';
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
                return '<div class="soc-cmt">' +
                  avatarHtml({
                    role: 'parent',
                    avatarMode: c.avatarMode,
                    avatarEmoji: c.avatarEmoji,
                    avatarRing: c.avatarRing,
                    avatarPhoto: c.avatarPhoto
                  }) +
                  '<div class="soc-cmt-body"><b>' + KidSocial.esc(c.authorName) + '</b> ' +
                  KidSocial.esc(c.text) + '</div></div>';
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
    return '<div class="soc-user-card" data-uid="' + KidSocial.esc(u.uid) + '">' +
      '<a class="soc-user-card-av" href="profile.html?uid=' + encodeURIComponent(u.uid) + '">' +
        avatarHtml(u) + '</a>' +
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
      var avProf = Object.assign({ role: 'parent' }, r.otherAvatar || {});
      return '<button type="button" class="soc-inbox-item' + active + '" data-chat="' + KidSocial.esc(r.chatId) +
        '" data-uid="' + KidSocial.esc(r.otherUid) + '" data-name="' + KidSocial.esc(r.otherName) + '">' +
        avatarHtml(avProf).replace('soc-av', 'soc-av soc-inbox-av') +
        '<span class="soc-inbox-meta"><strong>' + KidSocial.esc(r.otherName) + '</strong>' +
        '<em>' + KidSocial.esc(r.lastText || 'Bắt đầu trò chuyện') + '</em></span>' +
        '<span class="soc-inbox-time">' + KidSocial.esc(r.timeAgo) + '</span></button>';
    }).join('');
    box.querySelectorAll('.soc-inbox-item').forEach(function (btn) {
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

  var activeOtherAvatar = null;

  function renderMessages(list) {
    var box = $('msgList');
    if (!box) return;
    if (!list.length) {
      box.innerHTML = '<div class="soc-empty"><span class="soc-empty-icon">👋</span>Chào bạn nhé!</div>';
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
      var av = avatarHtml(avProf).replace('soc-av', 'soc-av soc-msg-av');
      return '<div class="soc-bubble-row' + (mine ? ' is-mine' : '') + '">' +
        (mine ? '' : av) +
        '<div class="soc-bubble">' + KidSocial.esc(m.text) +
        '<span class="soc-bubble-time">' + KidSocial.esc(m.timeAgo) + '</span></div>' +
        (mine ? av : '') +
        '</div>';
    }).join('');
    box.scrollTop = box.scrollHeight;
  }

  function openChat(chatId, otherUid, otherName, otherAvatar) {
    activeChatId = chatId;
    activeOtherAvatar = otherAvatar || null;
    if (unsubMessages) { unsubMessages(); unsubMessages = null; }
    var head = $('msgHeader');
    var inp = $('msgInput');
    var sendBtn = $('msgSendBtn');
    var main = $('socChatMain');
    if (head) {
      head.dataset.otherUid = otherUid;
      var headAv = Object.assign({ role: 'parent' }, otherAvatar || {});
      head.innerHTML =
        '<button type="button" class="soc-chat-back" id="socChatBack" aria-label="Quay lại danh sách">←</button>' +
        '<a class="soc-chat-head-user" href="profile.html?uid=' + encodeURIComponent(otherUid) + '">' +
          avatarHtml(headAv).replace('soc-av', 'soc-av soc-inbox-av') +
          '<span class="soc-chat-head-name">' + KidSocial.esc(otherName) + '</span></a>' +
        '<a class="soc-chat-head-link" href="profile.html?uid=' + encodeURIComponent(otherUid) + '">Hồ sơ</a>';
      var back = $('socChatBack');
      if (back) back.onclick = function () { closeChatView(); };
    }
    if (inp) {
      inp.disabled = false;
      if (isMobile) setTimeout(function () { inp.focus(); }, 280);
    }
    if (sendBtn) sendBtn.disabled = false;
    if (main) main.classList.add('is-open');
    document.body.classList.add('soc-chat-open');
    syncScrollLock();
    document.querySelectorAll('.soc-inbox-item').forEach(function (el) {
      el.classList.toggle('is-active', el.getAttribute('data-chat') === chatId);
    });
    setUrlTab('chat', otherUid);
    unsubMessages = KidSocial.subscribeMessages(chatId, renderMessages);
    KidSocial.listConversations().then(renderInbox);
  }

  function closeChatView() {
    var main = $('socChatMain');
    var head = $('msgHeader');
    if (main) main.classList.remove('is-open');
    document.body.classList.remove('soc-chat-open');
    syncScrollLock();
    activeChatId = '';
    if (unsubMessages) { unsubMessages(); unsubMessages = null; }
    if (head) {
      delete head.dataset.otherUid;
      head.innerHTML = '<div class="soc-chat-placeholder"><span class="soc-chat-placeholder-icon">💬</span><p>Chọn cuộc trò chuyện bên trái<br>hoặc nhắn tin từ hồ sơ bạn bè</p></div>';
    }
    var inp = $('msgInput');
    var sendBtn = $('msgSendBtn');
    var list = $('msgList');
    if (inp) { inp.disabled = true; inp.value = ''; inp.blur(); }
    if (sendBtn) sendBtn.disabled = true;
    if (list) list.innerHTML = '';
    document.querySelectorAll('.soc-inbox-item').forEach(function (el) { el.classList.remove('is-active'); });
    setUrlTab('chat', '');
    KidSocial.listConversations().then(renderInbox);
  }

  function openChatWithUid(uid) {
    if (!uid) return;
    switchPanel('chat');
    KidSocial.ensureChat(uid).then(function (chat) {
      openChat(chat.chatId, chat.otherUid, chat.otherName, chat.otherAvatar);
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
    checkMobile();
    window.addEventListener('resize', checkMobile);
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
      loadSidebar();
      loadHeroStats();
      var tab = getTabFromUrl();
      var chatUid = getChatUidFromUrl();
      switchPanel(tab);
      if (tab === 'chat' && chatUid) openChatWithUid(chatUid);
      else if (tab !== 'friends' && tab !== 'discover') loadFriendsPanel();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
