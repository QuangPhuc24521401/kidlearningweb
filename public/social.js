/* ═══════════════════════════════════════════════════
   SOCIAL.JS — UI trang Cộng đồng
═══════════════════════════════════════════════════ */
(function () {
  'use strict';

  var currentFeed = 'class';
  var postsCache = [];

  function $(id) { return document.getElementById(id); }

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
        '<input type="text" maxlength="300" placeholder="Viết bình luận…" aria-label="Bình luận">' +
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
        feed.innerHTML = '<div class="soc-empty">Chưa có bài đăng — hãy là người đầu tiên chia sẻ!</div>';
        return;
      }
      feed.innerHTML = posts.map(renderPost).join('');
      wirePostEvents();
    }).catch(function (err) {
      feed.innerHTML = '<div class="soc-empty">Không tải được: ' + KidSocial.esc(err.message) + '</div>';
    });
  }

  function wirePostEvents() {
    document.querySelectorAll('[data-like]').forEach(function (btn) {
      btn.onclick = function () {
        var id = btn.getAttribute('data-like');
        KidSocial.toggleLike(id).then(function (liked) {
          btn.classList.toggle('is-liked', liked);
          btn.innerHTML = (liked ? '❤️' : '🤍') + ' <span>' + (parseInt(btn.querySelector('span').textContent, 10) + (liked ? 1 : -1)) + '</span>';
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
              : '<div class="soc-cmt soc-cmt--empty">Chưa có bình luận</div>';
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
                return '<div class="soc-cmt"><b>' + KidSocial.esc(c.authorName) + '</b> ' +
                  KidSocial.esc(c.text) + '</div>';
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
        var url = location.origin + location.pathname.replace(/social\.html.*/, '') + 'social.html#post-' + id;
        if (navigator.share) {
          navigator.share({ title: 'Kid Learning', text: p.text, url: url }).catch(function () {});
        } else if (navigator.clipboard) {
          navigator.clipboard.writeText(p.text + '\n' + url);
          alert('Đã copy link bài đăng!');
        }
      };
    });
  }

  function loadSuggestions() {
    var box = $('socSuggest');
    if (!box) return;
    KidSocial.suggestClassmates().then(function (list) {
      if (!list.length) { box.innerHTML = '<h3 class="soc-side-title">👋 Bạn cùng lớp</h3><p style="font-size:12px;color:#64748b">Lưu mã lớp ở Hồ sơ để thấy bạn học.</p>'; return; }
      box.innerHTML = '<h3 class="soc-side-title">👋 Bạn cùng lớp</h3>' +
        list.slice(0, 8).map(function (u) {
          return renderUserRow(u);
        }).join('');
      wireUserActionButtons(box);
    });
  }

  function renderUserRow(u) {
    return '<div class="soc-search-item" data-uid="' + KidSocial.esc(u.uid) + '">' +
      '<a href="profile.html?uid=' + encodeURIComponent(u.uid) + '">' + KidSocial.esc(u.displayName) + '</a>' +
      '<div class="soc-search-actions">' +
        '<button type="button" data-follow="' + KidSocial.esc(u.uid) + '">Theo dõi</button>' +
        '<button type="button" data-friend="' + KidSocial.esc(u.uid) + '">Kết bạn</button>' +
        '<a class="soc-msg-link" href="messages.html?uid=' + encodeURIComponent(u.uid) + '">Nhắn tin</a>' +
      '</div></div>';
  }

  function wireUserActionButtons(root) {
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
        else if (st === 'pending_received') { btn.textContent = 'Chấp nhận?'; }
      });
      btn.onclick = function () {
        KidSocial.getFriendStatus(uid).then(function (st) {
          if (st === 'pending_received') {
            window.location.href = 'messages.html';
            return;
          }
          KidSocial.sendFriendRequest(uid).then(function () {
            btn.textContent = 'Đã gửi';
            btn.disabled = true;
          }).catch(function (e) { alert(e.message); });
        });
      };
    });
  }

  var searchTimer = null;
  function wireSearch() {
    var inp = $('socSearchInput');
    var box = $('socSearchResults');
    if (!inp || !box) return;
    inp.addEventListener('input', function () {
      clearTimeout(searchTimer);
      var q = inp.value.trim();
      if (q.length < 2) {
        box.innerHTML = '<div class="soc-empty" style="padding:8px">Gõ ít nhất 2 ký tự</div>';
        return;
      }
      searchTimer = setTimeout(function () {
        box.innerHTML = '<div class="soc-empty" style="padding:8px">Đang tìm…</div>';
        KidSocial.searchUsers(q).then(function (list) {
          if (!list.length) {
            box.innerHTML = '<div class="soc-empty" style="padding:8px">Không tìm thấy trong lớp của bạn</div>';
            return;
          }
          box.innerHTML = list.map(renderUserRow).join('');
          wireUserActionButtons(box);
        });
      }, 350);
    });
  }

  function wireTabs() {
    document.querySelectorAll('.soc-tab').forEach(function (tab) {
      tab.onclick = function () {
        document.querySelectorAll('.soc-tab').forEach(function (t) { t.classList.remove('is-active'); });
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
      var ta = $('socComposeText');
      var text = ta.value.trim();
      if (!text) return;
      KidSocial.createPost({ text: text }).then(function () {
        ta.value = '';
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
          text: 'Mình vừa đạt ' + stars + ' ⭐ trên Kid Learning! Cùng cố gắng nhé! 🎉',
          type: 'achievement',
          shareMeta: { label: stars + ' sao tích lũy' }
        }).then(function () { loadFeed(); }).catch(function (e) { alert(e.message); });
      };
    }
  }

  function init() {
    wireTabs();
    wireComposer();
    wireSearch();
    var boot = Promise.resolve();
    if (typeof KidSocial !== 'undefined' && KidSocial.whenAuthReady) {
      boot = KidSocial.whenAuthReady().then(function (user) {
        if (!user) {
          window.location.replace('auth/login.html');
          return;
        }
        if (KidSocial.ensureUserDoc) return KidSocial.ensureUserDoc();
      });
    }
    boot.then(function () {
      loadFeed();
      loadSuggestions();
      if (typeof mountUserBar === 'function') mountUserBar();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
