/* ═══════════════════════════════════════════════════
   SPA.JS — Mini SPA router cho Kid Learning Web

   Chuyển trang giữa 4 page (index / progress / arena / pvp)
   KHÔNG reload, KHÔNG mất nhạc nền, KHÔNG mất state Firebase.

   Cơ chế:
   - Chặn click trên <a href="..."> cùng origin & trỏ tới 1 SPA route.
   - Fetch HTML đích, parse, lấy <main id="page-root">.
   - Replace <main id="page-root"> hiện tại bằng <main> mới (View Transitions).
   - Cập nhật document.title, body class, active nav link.
   - Gọi unmount của trang cũ + mount của trang mới.

   Trang ngoài SPA (mentor / lessons / auth / mentor-teacher):
   click vẫn navigate thật → reload bình thường.
═══════════════════════════════════════════════════ */

(function(){
  'use strict';

  /** Set các pathname được SPA xử lý.
      Lưu ý: cùng origin + path khớp 1 trong các pattern dưới đây mới được intercept. */
  var SPA_ROUTES = ['/', '/index.html', '/arena.html', '/pvp.html', '/progress.html', '/profile.html'];

  /** Trả về tên page chuẩn hoá ('index', 'arena', 'pvp', 'progress', 'profile') hoặc null nếu không phải SPA. */
  function routeName(pathname){
    if(pathname === '/' || pathname.endsWith('/index.html')) return 'index';
    if(pathname.endsWith('/arena.html'))    return 'arena';
    if(pathname.endsWith('/pvp.html'))      return 'pvp';
    if(pathname.endsWith('/progress.html')) return 'progress';
    if(pathname.endsWith('/profile.html'))  return 'profile';
    return null;
  }

  function isSpaUrl(url){
    try{
      var u = new URL(url, location.href);
      if(u.origin !== location.origin) return false;
      return routeName(u.pathname) !== null;
    }catch(e){ return false; }
  }

  /** Cache HTML đã fetch để back/forward nhanh hơn. */
  var pageCache = new Map();

  /** State: tên trang hiện tại (sau khi mount xong). Dùng để biết unmount nào cần chạy. */
  var currentPage = routeName(location.pathname);

  /** Đang xử lý 1 navigation? — chặn double-click. */
  var navigating = false;

  /** Mount/Unmount table. Mỗi function chạy mỗi lần trang được hiển thị / rời đi.
      Lưu ý: shared.js / menu.js / arena.js / pvp.js / progress.js / lessons-data.js
      đều đã được load 1 lần ở shell, các function dưới đây chỉ orchestrate. */
  var MOUNTS = {
    index: function(){
      if(typeof window.renderProgressBadges === 'function') window.renderProgressBadges();
      if(typeof window.mountUserBar === 'function') window.mountUserBar();
      if(typeof window.renderAchievementsPanel === 'function') window.renderAchievementsPanel();
    },
    progress: function(){
      if(typeof window.renderProgressBadges  === 'function') window.renderProgressBadges();
      if(typeof window.renderAchievementsPanel === 'function') window.renderAchievementsPanel();
      if(typeof window.mountUserBar          === 'function') window.mountUserBar();
    },
    arena: function(){
      // arena.js đã expose window.arenaEnter; chỉ gọi nếu đã đăng nhập.
      if(typeof window.mountUserBar === 'function') window.mountUserBar();
      if(typeof window.arenaRefreshHonor === 'function') window.arenaRefreshHonor();
      try{
        if(typeof firebase !== 'undefined' && firebase.auth && firebase.auth().currentUser
           && typeof window.arenaEnter === 'function'){
          window.arenaEnter();
        }
      }catch(e){}
      // Đăng ký 1-lần listener auth → vào arena khi user đăng nhập (chỉ khi đang ở arena route).
      if(!window.__spaArenaAuthBound){
        window.__spaArenaAuthBound = true;
        try{
          firebase.auth().onAuthStateChanged(function(user){
            if(currentPage !== 'arena') return;
            if(user && typeof window.arenaEnter === 'function') window.arenaEnter();
          });
        }catch(e){}
      }
    },
    pvp: function(){
      if(typeof window.mountUserBar === 'function') window.mountUserBar();
      if(typeof window.pvpInit === 'function') window.pvpInit();
    },
    profile: function(){
      if(typeof window.mountUserBar === 'function') window.mountUserBar();
      if(typeof window.renderProfilePage === 'function') window.renderProfilePage();
    }
  };

  var UNMOUNTS = {
    arena: function(){
      if(typeof window.arenaLeavePage === 'function') window.arenaLeavePage();
    },
    pvp: function(){
      if(typeof window.pvpCleanup === 'function') window.pvpCleanup();
    }
    // index / progress không cần cleanup đặc biệt.
  };

  /** Cập nhật trạng thái active của các topbar link. */
  function updateActiveNav(){
    var page = currentPage;
    var nav = document.querySelector('.topbar-nav');
    if(!nav) return;
    nav.querySelectorAll('.topbar-link').forEach(function(a){
      var href = a.getAttribute('href') || '';
      var hrefPage = routeName(new URL(href, location.href).pathname);
      if(hrefPage === page){
        a.classList.add('is-current');
        a.setAttribute('aria-current', 'page');
      } else {
        a.classList.remove('is-current');
        a.removeAttribute('aria-current');
      }
    });
  }

  /** Fetch + cache HTML 1 trang đích. */
  function fetchPageHtml(url){
    var key = new URL(url, location.href).pathname;
    if(pageCache.has(key)) return Promise.resolve(pageCache.get(key));
    return fetch(url, { credentials: 'same-origin' })
      .then(function(r){
        if(!r.ok) throw new Error('HTTP ' + r.status);
        return r.text();
      })
      .then(function(html){
        pageCache.set(key, html);
        return html;
      });
  }

  /** Parse HTML, extract <main id="page-root"> + body class + title. */
  function extractPageBundle(html){
    var doc = new DOMParser().parseFromString(html, 'text/html');
    var root = doc.querySelector('#page-root');
    if(!root) throw new Error('Trang đích thiếu <main id="page-root">');
    return {
      root:      root,
      bodyClass: doc.body.getAttribute('class') || '',
      title:     doc.title || document.title
    };
  }

  /** Swap content (đã có DOM mới). Tách ra để có thể bọc trong startViewTransition. */
  function applyBundle(bundle){
    var oldRoot = document.getElementById('page-root');
    if(oldRoot && bundle.root){
      oldRoot.replaceWith(bundle.root);
    }
    document.body.setAttribute('class', bundle.bodyClass);
    document.title = bundle.title;
  }

  /** Log chẩn đoán — luôn bật để dễ debug giai đoạn đầu. Tắt bằng `localStorage.setItem('spa_quiet','1')`. */
  function debug(){
    try{ if(localStorage.getItem('spa_quiet') === '1') return; }catch(e){}
    var args = ['%c[spa]', 'color:#3b82f6;font-weight:bold'];
    for(var i=0;i<arguments.length;i++) args.push(arguments[i]);
    console.log.apply(console, args);
  }

  /** Navigate tới url (đã chắc chắn là SPA route). */
  function spaNavigate(url, push){
    if(navigating){ debug('skip — already navigating', url); return Promise.resolve(); }
    navigating = true;
    var prevPage = currentPage;
    var nextPage = routeName(new URL(url, location.href).pathname);
    var t0 = performance.now();
    debug('navigate', prevPage, '→', nextPage, url);

    // Loading state (tùy CSS sử dụng để hiển thị progress bar nhỏ).
    document.documentElement.classList.add('spa-loading');

    return fetchPageHtml(url)
      .then(function(html){
        debug('fetched', url, '(+' + Math.round(performance.now()-t0) + 'ms)');
        var bundle = extractPageBundle(html);

        // Update URL ngay — back/forward đúng dù animation đang chạy
        if(push){
          try { history.pushState({ spa: true, page: nextPage }, '', url); } catch(e){}
        }

        // Unmount trang cũ (nếu khác trang đích)
        try {
          if(prevPage && prevPage !== nextPage && UNMOUNTS[prevPage]) UNMOUNTS[prevPage]();
        } catch(e){ console.warn('[spa] unmount', prevPage, e); }

        var doSwap = function(){
          applyBundle(bundle);
          currentPage = nextPage;
          updateActiveNav();
          try { window.scrollTo(0, 0); } catch(e){}
          // Mount ngay sau khi DOM swap — Firestore queries / TTS warmup chạy song song với animation.
          var tm = performance.now();
          try { if(MOUNTS[nextPage]) MOUNTS[nextPage](); }
          catch(e){ console.warn('[spa] mount', nextPage, e); }
          debug('mount ' + nextPage + ' done (+' + Math.round(performance.now()-tm) + 'ms)');
        };

        // View Transitions API — fade mượt 280ms (Chromium 111+, Safari 18+).
        // Wrap try/catch để nếu API lỗi vẫn fallback sang sync swap, không gọi location.href = url.
        if(typeof document.startViewTransition === 'function'){
          try{
            var transition = document.startViewTransition(doSwap);
            return transition.finished.catch(function(){ /* user cancel / fail ok */ });
          }catch(vtErr){
            debug('view transition threw, fallback sync swap', vtErr);
            doSwap();
            return Promise.resolve();
          }
        } else {
          doSwap();
          return Promise.resolve();
        }
      })
      .catch(function(err){
        console.warn('[spa] navigate fallback → reload', url, err);
        // Fallback: reload thật
        location.href = url;
      })
      .then(function(){
        document.documentElement.classList.remove('spa-loading');
        navigating = false;
        debug('navigate done (+' + Math.round(performance.now()-t0) + 'ms)');
      });
  }

  /** Intercept clicks trên link nội bộ. */
  function onClick(e){
    if(e.defaultPrevented) return;
    if(e.button !== 0) return;
    if(e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var a = e.target.closest && e.target.closest('a[href]');
    if(!a) return;
    if(a.hasAttribute('download')) return;
    var target = a.getAttribute('target');
    if(target && target !== '_self') return;
    var href = a.getAttribute('href');
    if(!href) return;
    if(/^(#|mailto:|tel:|javascript:|data:)/i.test(href)) return;
    if(!isSpaUrl(href)){ debug('click → real nav (non-SPA url)', href); return; }
    // Self-link: vẫn preventDefault để không reload, nhưng skip navigate.
    var nextPage = routeName(new URL(href, location.href).pathname);
    if(nextPage === currentPage){
      e.preventDefault();
      debug('click self-link, skip', href);
      return;
    }
    e.preventDefault();
    debug('click intercepted', href);
    spaNavigate(href, true);
  }
  document.addEventListener('click', onClick);

  /** Back / Forward */
  window.addEventListener('popstate', function(){
    spaNavigate(location.href, false);
  });

  /** Khởi tạo state ban đầu */
  debug('spa.js loaded; currentPage =', currentPage, '; pathname =', location.pathname);
  if(currentPage){
    history.replaceState({ spa: true, page: currentPage }, '', location.href);
    updateActiveNav();
    window.__spaReady = true;

    /* Initial mount — đảm bảo trang được mount khi load trực tiếp (không qua SPA navigation).
       Đặt vào DOMContentLoaded để tất cả script (firebase, arena.js, pvp.js…) đã được parse. */
    var doInitialMount = function(){
      try { if(MOUNTS[currentPage]) MOUNTS[currentPage](); }
      catch(e){ console.warn('[spa] initial mount', currentPage, e); }
    };
    if(document.readyState === 'loading'){
      document.addEventListener('DOMContentLoaded', doInitialMount, { once: true });
    } else {
      doInitialMount();
    }
  }

  /** Expose để pages có thể chủ động gọi (vd nút "Quay về trang chủ"). */
  window.spaGo = function(url){
    if(!isSpaUrl(url)){
      location.href = url;
      return;
    }
    spaNavigate(url, true);
  };
  window.__spaCurrentPage = function(){ return currentPage; };

})();
