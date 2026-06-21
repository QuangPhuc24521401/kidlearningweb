/* ═══════════════════════════════════════════════════
   GAME-ASSETS.JS — Sinh texture & âm thanh tại runtime

   Không dùng file ảnh/âm thanh ngoài. Tất cả sprite vẽ bằng
   Phaser Graphics hoặc canvas emoji; SFX tạo bằng Web Audio API.

   Export: window.GameAssets = { createTextures(scene), Sfx }
═══════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  /* ─────────── Avatar người dùng (đồng bộ với tài khoản) ─────────── */
  var HERO_W = 46, HERO_H = 56, HERO_SS = 3; // SS: vẽ ở độ phân giải cao cho nét

  function getStudentAvatar() {
    var def = { mode: 'emoji', emoji: '🧒', ring: '#FF9800', photo: '' };
    try {
      var mode = localStorage.getItem('studentAvatarMode') === 'photo' ? 'photo' : 'emoji';
      var emoji = (localStorage.getItem('studentAvatarEmoji') || '🧒').trim() || '🧒';
      var ringRe = /^#[0-9A-Fa-f]{6}$/;
      var ringRaw = (localStorage.getItem('studentAvatarRing') || '').trim();
      var ring = ringRe.test(ringRaw) ? ringRaw : '#FF9800';
      var photo = localStorage.getItem('studentAvatarPhoto') || '';
      var photoOk = mode === 'photo'
        && photo.indexOf('data:image/jpeg;base64,') === 0
        && photo.length < 200000;
      return { mode: photoOk ? 'photo' : 'emoji', emoji: emoji, ring: ring, photo: photoOk ? photo : '' };
    } catch (e) { return def; }
  }

  /* ─────────── Tiện ích màu ─────────── */
  function clamp255(v) { return Math.max(0, Math.min(255, v)); }
  function hexToRgb(hex) {
    hex = String(hex || '').replace('#', '');
    if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    var n = parseInt(hex, 16);
    if (isNaN(n)) return { r: 255, g: 152, b: 0 };
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }
  function shade(hex, amt) {
    var c = hexToRgb(hex), t = amt < 0 ? 0 : 255, p = Math.abs(amt);
    return 'rgb(' + clamp255(Math.round((t - c.r) * p + c.r)) + ','
      + clamp255(Math.round((t - c.g) * p + c.g)) + ','
      + clamp255(Math.round((t - c.b) * p + c.b)) + ')';
  }
  function roundRectPath(ctx, x, y, w, h, r) {
    if (w < 2 * r) r = w / 2;
    if (h < 2 * r) r = h / 2;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  /* ─────────── Texture từ emoji ─────────── */
  function makeEmojiTexture(scene, key, emoji, size) {
    if (scene.textures.exists(key)) return;
    size = size || 64;
    var canvas = scene.textures.createCanvas(key, size, size);
    if (!canvas) return;
    var ctx = canvas.context || (canvas.getContext && canvas.getContext('2d'));
    if (!ctx) return;
    ctx.clearRect(0, 0, size, size);
    ctx.font = Math.floor(size * 0.82) + 'px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(emoji, size / 2, size / 2 + size * 0.04);
    canvas.refresh();
  }

  /* ─────────── Nhân vật cá nhân hóa theo avatar tài khoản ─────────── */
  function drawHero(scene, key, avatar, img) {
    if (scene.textures.exists(key)) scene.textures.remove(key);
    var SS = HERO_SS, W = HERO_W, H = HERO_H;
    var tex = scene.textures.createCanvas(key, W * SS, H * SS);
    if (!tex) return;
    var ctx = tex.context || (tex.getContext && tex.getContext('2d'));
    if (!ctx) return;
    ctx.clearRect(0, 0, W * SS, H * SS);
    ctx.save();
    ctx.scale(SS, SS); // vẽ theo toạ độ logic 46×56

    var ring = (avatar && avatar.ring) || '#FF9800';
    var bodyDark = shade(ring, -0.30);
    var bodyLight = shade(ring, 0.30);

    // chân
    ctx.fillStyle = '#6b4423';
    roundRectPath(ctx, 9, H - 9, 11, 8, 4); ctx.fill();
    roundRectPath(ctx, W - 20, H - 9, 11, 8, 4); ctx.fill();
    // tay
    ctx.fillStyle = bodyDark;
    ctx.beginPath(); ctx.arc(5, 36, 4.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(W - 5, 36, 4.5, 0, Math.PI * 2); ctx.fill();
    // thân (viền + nền theo màu avatar)
    ctx.fillStyle = bodyDark; roundRectPath(ctx, 2, 12, W - 4, H - 20, 14); ctx.fill();
    ctx.fillStyle = ring; roundRectPath(ctx, 4, 14, W - 8, H - 24, 12); ctx.fill();
    // bụng sáng
    ctx.fillStyle = bodyLight; roundRectPath(ctx, 11, H - 23, W - 22, 13, 8); ctx.fill();

    // khuôn mặt = avatar (emoji hoặc ảnh)
    var fx = W / 2, fy = 17, fr = 15;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(fx, fy, fr, 0, Math.PI * 2); ctx.fill();
    ctx.save();
    ctx.beginPath(); ctx.arc(fx, fy, fr - 1.6, 0, Math.PI * 2); ctx.clip();
    if (img) {
      var d = (fr - 1.6) * 2;
      var s = Math.min(img.width, img.height) || 1;
      ctx.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, fx - d / 2, fy - d / 2, d, d);
    } else {
      ctx.fillStyle = '#eef4ff';
      ctx.fillRect(fx - fr, fy - fr, fr * 2, fr * 2);
      ctx.font = '22px "Segoe UI Emoji","Noto Color Emoji",serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText((avatar && avatar.emoji) || '🧒', fx, fy + 1);
    }
    ctx.restore();
    // viền mặt theo màu avatar
    ctx.lineWidth = 2.6; ctx.strokeStyle = bodyDark;
    ctx.beginPath(); ctx.arc(fx, fy, fr, 0, Math.PI * 2); ctx.stroke();

    ctx.restore();
    tex.refresh();
  }

  function makeHero(scene, avatar, done) {
    var key = 'hero';
    done = done || function () {};
    avatar = avatar || getStudentAvatar();
    if (scene.textures.exists(key)) { done(); return; }
    if (avatar.mode === 'photo' && avatar.photo) {
      var img = new Image();
      var settled = false;
      var finish = function (image) { if (settled) return; settled = true; drawHero(scene, key, avatar, image); done(); };
      img.onload = function () { finish(img); };
      img.onerror = function () { finish(null); };
      // an toàn: nếu ảnh không tải được sau 2.5s vẫn vào game (mặt emoji)
      setTimeout(function () { finish(null); }, 2500);
      img.src = avatar.photo;
    } else {
      drawHero(scene, key, avatar, null);
      done();
    }
  }

  /* Xu vàng có ánh sáng (vẽ tay, sắc nét hơn emoji) */
  function makeCoin(scene) {
    var key = 'coin';
    if (scene.textures.exists(key)) return;
    var s = 34;
    var g = scene.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0xb8860b, 1);
    g.fillCircle(s / 2, s / 2, 15);
    g.fillStyle(0xffd24a, 1);
    g.fillCircle(s / 2, s / 2, 12.5);
    g.fillStyle(0xffe9a3, 1);
    g.fillCircle(s / 2, s / 2, 8);
    g.fillStyle(0xb8860b, 1);
    g.fillRoundedRect(s / 2 - 2.5, s / 2 - 7, 5, 14, 2);
    g.fillStyle(0xffffff, 0.8);
    g.fillCircle(s / 2 - 5, s / 2 - 5, 2.4);
    g.generateTexture(key, s, s);
    g.destroy();
  }

  /* Ổ khóa (padlock) — thay cho cánh cửa, là "cổng câu hỏi" */
  function makePadlock(scene) {
    var key = 'padlock';
    if (scene.textures.exists(key)) return;
    var w = 64, h = 78;
    var g = scene.make.graphics({ x: 0, y: 0, add: false });
    // quai khóa
    g.lineStyle(9, 0x9aa3b2, 1);
    g.beginPath();
    g.arc(w / 2, 30, 16, Math.PI, 0, false);
    g.strokePath();
    g.lineStyle(9, 0xcbd5e1, 1);
    g.beginPath();
    g.arc(w / 2, 28, 16, Math.PI, 0, false);
    g.strokePath();
    // thân khóa
    g.fillStyle(0xb8860b, 1);
    g.fillRoundedRect(12, 32, w - 24, h - 34, 10);
    g.fillStyle(0xffc23c, 1);
    g.fillRoundedRect(15, 35, w - 30, h - 40, 8);
    // lỗ khóa
    g.fillStyle(0x7a4a06, 1);
    g.fillCircle(w / 2, 52, 6);
    g.fillRect(w / 2 - 2.5, 52, 5, 14);
    g.generateTexture(key, w, h);
    g.destroy();
  }

  /* Bẫy chông — hàng gai nhọn trên đế (thay cactus) */
  function makeSpike(scene) {
    var key = 'spike';
    if (scene.textures.exists(key)) return;
    var w = 48, h = 40;
    var g = scene.make.graphics({ x: 0, y: 0, add: false });
    // đế
    g.fillStyle(0x475569, 1);
    g.fillRoundedRect(0, h - 10, w, 10, 3);
    // 3 gai nhọn
    g.fillStyle(0xcbd5e1, 1);
    var n = 3, bw = w / n;
    for (var i = 0; i < n; i++) {
      var x0 = i * bw;
      g.fillTriangle(x0 + 1, h - 8, x0 + bw - 1, h - 8, x0 + bw / 2, 2);
    }
    g.fillStyle(0xffffff, 0.6);
    for (var j = 0; j < n; j++) {
      var xx = j * bw + bw / 2;
      g.fillTriangle(xx - 2, h - 9, xx, h - 9, xx, 8);
    }
    g.generateTexture(key, w, h);
    g.destroy();
  }

  /* Lưỡi cưa quay — bẫy di chuyển kiểu Mario */
  function makeSaw(scene) {
    var key = 'saw';
    if (scene.textures.exists(key)) return;
    var S = 46, r = S / 2, c = r;
    var g = scene.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0x8a929c, 1); g.fillCircle(c, c, r - 2);
    g.fillStyle(0xd2d8df, 1);
    for (var i = 0; i < 10; i++) {
      var a = (i / 10) * Math.PI * 2;
      g.fillTriangle(
        c + Math.cos(a - 0.16) * (r - 6), c + Math.sin(a - 0.16) * (r - 6),
        c + Math.cos(a + 0.16) * (r - 6), c + Math.sin(a + 0.16) * (r - 6),
        c + Math.cos(a) * (r + 2), c + Math.sin(a) * (r + 2)
      );
    }
    g.fillStyle(0x5b6470, 1); g.fillCircle(c, c, 7);
    g.fillStyle(0xeef2f6, 1); g.fillCircle(c, c, 3);
    g.generateTexture(key, S, S);
    g.destroy();
  }

  /* ─────────── Chủ đề (background) cho từng màn ─────────── */
  var THEMES = {
    grass:   { sky: [0x4aa3e8, 0xc7ecff], far: 0x8ccf72, near: 0x6fb84e, gTop: 0x6abe30, gBody: 0x9c6b3f, sun: 0xfff3b0, farType: 'hills',    tree: 'tree',    fluid: 'water', dark: false },
    jungle:  { sky: [0x2f8f57, 0xc1eccf], far: 0x2e7d4e, near: 0x3f9e5a, gTop: 0x3d8b37, gBody: 0x6b4a2a, sun: 0,        farType: 'hills',    tree: 'palm',    fluid: 'water', dark: false },
    valley:  { sky: [0x4b3b86, 0xc9b3f0], far: 0x6a5aa0, near: 0x8a72c8, gTop: 0x7e57c2, gBody: 0x4a3570, sun: 0xe6dcff, farType: 'mountain', tree: 'tree',    fluid: 'water', dark: false },
    desert:  { sky: [0xf4a93c, 0xffe7b0], far: 0xe7b86a, near: 0xf0c87e, gTop: 0xe6c068, gBody: 0xc89b4a, sun: 0xfff0b0, farType: 'dune',     tree: 'cactus',  fluid: 'water', dark: false },
    cave:    { sky: [0x161329, 0x342a4e], far: 0x2a2440, near: 0x3a3156, gTop: 0x5b5366, gBody: 0x322c44, sun: 0,        farType: 'cave',     tree: 'crystal', fluid: 'water', dark: true },
    inferno: { sky: [0x3a0808, 0xc7361f], far: 0x5e1410, near: 0x86251a, gTop: 0x6b2410, gBody: 0x371309, sun: 0xff7a3c, farType: 'volcano',  tree: 'dead',    fluid: 'lava',  dark: true },
    city:    { sky: [0xff7e5f, 0xffd0a8], far: 0x39466b, near: 0x4a566b, gTop: 0x8390a6, gBody: 0x4a566b, sun: 0xffd9a8, farType: 'city',     tree: 'tree',    fluid: 'water', dark: false },
    heaven:  { sky: [0xbfe0ff, 0xffe1f0], far: 0xffffff, near: 0xfff3d6, gTop: 0xfde7a8, gBody: 0xe9d39a, sun: 0xffffff, farType: 'cloud',    tree: 'tree',    fluid: 'water', dark: false }
  };

  function ensureTheme(scene, themeName) {
    var th = THEMES[themeName] || THEMES.grass;
    var sk = 'sky_' + themeName, hf = 'hillFar_' + themeName, hn = 'hillNear_' + themeName;
    var gk = 'ground_' + themeName, pk = 'plat_' + themeName;
    if (!scene.textures.exists(sk)) {
      var g = scene.make.graphics({ x: 0, y: 0, add: false });
      g.fillGradientStyle(th.sky[0], th.sky[0], th.sky[1], th.sky[1], 1);
      g.fillRect(0, 0, 960, 540);
      g.generateTexture(sk, 960, 540); g.destroy();
    }
    if (!scene.textures.exists(hf)) {
      var a = scene.make.graphics({ x: 0, y: 0, add: false });
      a.fillStyle(th.far, 1); a.fillEllipse(220, 220, 440, 280);
      a.generateTexture(hf, 440, 220); a.destroy();
    }
    if (!scene.textures.exists(hn)) {
      var b = scene.make.graphics({ x: 0, y: 0, add: false });
      b.fillStyle(th.near, 1); b.fillEllipse(180, 200, 360, 240);
      b.generateTexture(hn, 360, 200); b.destroy();
    }
    if (!scene.textures.exists(gk)) makeBlockTexture(scene, gk, 64, 64, th.gTop, th.gBody, 0);
    if (!scene.textures.exists(pk)) makeBlockTexture(scene, pk, 110, 28, th.gTop, th.gBody, 10);
    return {
      skyKey: sk, hillFarKey: hf, hillNearKey: hn, groundKey: gk, platKey: pk,
      fluid: th.fluid || 'water', dark: !!th.dark
    };
  }

  /* ─────────── Vẽ cảnh nền hoàn chỉnh theo chủ đề (parallax) ─────────── */
  function _drawTree(g, type, bx, by) {
    if (type === 'cactus') {
      g.fillStyle(0x3f8f4a, 1);
      g.fillRoundedRect(bx - 9, by - 64, 18, 74, 8);
      g.fillRoundedRect(bx - 30, by - 46, 16, 30, 6); g.fillRoundedRect(bx - 30, by - 46, 22, 12, 6);
      g.fillRoundedRect(bx + 14, by - 56, 16, 30, 6); g.fillRoundedRect(bx + 8, by - 56, 22, 12, 6);
      return;
    }
    if (type === 'crystal') {
      g.fillStyle(0x6fd6f5, 0.95); g.fillTriangle(bx - 16, by, bx - 3, by - 60, bx + 8, by);
      g.fillStyle(0xa7ecff, 0.95); g.fillTriangle(bx + 2, by, bx + 14, by - 42, bx + 24, by);
      return;
    }
    if (type === 'dead') {
      g.fillStyle(0x241006, 1);
      g.fillRect(bx - 5, by - 56, 10, 66);
      g.fillRect(bx - 28, by - 46, 24, 8); g.fillRect(bx + 4, by - 36, 26, 8);
      g.fillRect(bx - 22, by - 64, 8, 18); g.fillRect(bx + 14, by - 56, 8, 18);
      return;
    }
    if (type === 'palm') {
      g.fillStyle(0x7a4a23, 1); g.fillRect(bx - 5, by - 60, 10, 70);
      g.fillStyle(0x2e8b3a, 1);
      g.fillEllipse(bx - 28, by - 60, 64, 22); g.fillEllipse(bx + 28, by - 60, 64, 22);
      g.fillEllipse(bx - 16, by - 74, 44, 22); g.fillEllipse(bx + 16, by - 74, 44, 22);
      g.fillEllipse(bx, by - 68, 36, 28);
      return;
    }
    // cây lá tròn mặc định
    g.fillStyle(0x6b4423, 1); g.fillRect(bx - 6, by - 36, 12, 46);
    g.fillStyle(0x2e7d32, 1); g.fillCircle(bx, by - 48, 27); g.fillCircle(bx - 22, by - 36, 18); g.fillCircle(bx + 22, by - 36, 18);
    g.fillStyle(0x46a64f, 1); g.fillCircle(bx - 7, by - 54, 16);
  }

  function _drawFar(g, th, W, H) {
    var horizon = H - 110, c = th.far, x;
    g.fillStyle(c, 1);
    var t = th.farType;
    if (t === 'hills') {
      for (x = 0; x <= W; x += 320) g.fillEllipse(x, horizon + 110, 380, 240);
    } else if (t === 'mountain') {
      for (x = 0; x <= W; x += 240) g.fillTriangle(x - 120, horizon + 60, x, horizon - 130, x + 120, horizon + 60);
      g.fillStyle(0xffffff, 0.85);
      for (x = 0; x <= W; x += 240) g.fillTriangle(x - 26, horizon - 86, x, horizon - 130, x + 26, horizon - 86);
    } else if (t === 'dune') {
      for (x = 0; x <= W; x += 320) g.fillEllipse(x, horizon + 170, 470, 340);
    } else if (t === 'volcano') {
      for (x = 0; x <= W; x += 320) g.fillTriangle(x - 160, horizon + 70, x, horizon - 140, x + 160, horizon + 70);
      g.fillStyle(0xff7a2a, 0.95);
      for (x = 0; x <= W; x += 320) g.fillTriangle(x - 22, horizon - 110, x, horizon - 140, x + 22, horizon - 110);
    } else if (t === 'cave') {
      for (x = 0; x <= W; x += 96) g.fillTriangle(x - 48, 0, x, 100, x + 48, 0);
      g.fillRect(0, horizon + 40, W, H - horizon);
    } else if (t === 'city') {
      for (x = 0; x <= W; x += 96) { var bh = 120 + (((x / 96) | 0) % 4) * 54; g.fillRect(x - 40, horizon - bh + 130, 80, bh + 40); }
      g.fillStyle(0xffe08a, 0.75);
      for (x = 0; x <= W; x += 96) { for (var wy = horizon - 80; wy < horizon + 110; wy += 28) { g.fillRect(x - 24, wy, 11, 13); g.fillRect(x + 8, wy, 11, 13); } }
    } else if (t === 'cloud') {
      g.fillStyle(0xffffff, 0.92);
      for (x = 0; x <= W; x += 320) { g.fillCircle(x - 62, horizon + 20, 42); g.fillCircle(x, horizon, 56); g.fillCircle(x + 62, horizon + 20, 42); g.fillRoundedRect(x - 96, horizon + 14, 192, 46, 22); }
    }
  }

  function _drawMid(g, th, W, H) {
    var nc = th.near, baseY = H - 28, x;
    g.fillStyle(nc, 1);
    for (x = 0; x <= W; x += 240) g.fillEllipse(x, baseY + 44, 340, 200);
    for (x = 120; x < W + 120; x += 240) _drawTree(g, th.tree, x, baseY - 4);
  }

  function _ensureSceneryTex(scene, name, th) {
    var W = 960, H = 540;
    if (!scene.textures.exists('far_' + name)) {
      var g = scene.make.graphics({ x: 0, y: 0, add: false });
      _drawFar(g, th, W, H);
      g.generateTexture('far_' + name, W, H); g.destroy();
    }
    if (!scene.textures.exists('mid_' + name)) {
      var m = scene.make.graphics({ x: 0, y: 0, add: false });
      _drawMid(m, th, W, H);
      m.generateTexture('mid_' + name, W, H); m.destroy();
    }
  }

  /* Tạo cảnh nền nhiều lớp (tilesprite phủ toàn thế giới + parallax theo scrollFactor) */
  function buildScenery(scene, themeName, worldW, groundTop) {
    var th = THEMES[themeName] || THEMES.grass;
    ensureTheme(scene, themeName);
    _ensureSceneryTex(scene, themeName, th);
    var W = 960, H = 540, objs = [], ww = worldW + 600;

    // Trời: phủ cả thế giới, cuộn rất chậm
    objs.push(scene.add.tileSprite(0, 0, ww, H, 'sky_' + themeName).setOrigin(0, 0).setScrollFactor(0.06).setDepth(-30));

    // Mặt trời/trăng (vật trong thế giới, cuộn chậm → luôn ở phía xa) + nhịp sáng nhẹ
    if (th.sun) {
      var s = scene.add.graphics().setScrollFactor(0.06).setDepth(-28);
      s.fillStyle(th.sun, 0.22); s.fillCircle(772, 118, 78);
      s.fillStyle(th.sun, 0.95); s.fillCircle(772, 118, 48);
      objs.push(s);
      var glow = scene.add.circle(772, 118, 86, th.sun, 0.16).setScrollFactor(0.06).setDepth(-29);
      objs.push(glow);
      scene.tweens.add({ targets: glow, scale: { from: 1, to: 1.18 }, alpha: { from: 0.16, to: 0.32 }, duration: 1800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }

    // Lớp xa & gần: parallax bằng scrollFactor để hiển thị đúng dưới camera zoom
    var far = scene.add.tileSprite(0, 0, ww, H, 'far_' + themeName).setOrigin(0, 0).setScrollFactor(0.2).setDepth(-25);
    objs.push(far);
    objs.push(scene.add.tileSprite(0, 0, ww, H, 'mid_' + themeName).setOrigin(0, 0).setScrollFactor(0.5).setDepth(-18));

    // Mây trôi cho theme sáng → nền sinh động
    if (!th.dark && scene.textures.exists('cloud')) {
      for (var ci = 0; ci < 5; ci++) {
        var cy = 60 + ci * 26 + Math.random() * 20;
        var cw = 70 + Math.random() * 60;
        var cl = scene.add.image(Math.random() * W, cy, 'cloud')
          .setScrollFactor(0.12).setDepth(-23)
          .setDisplaySize(cw, cw * 0.62).setAlpha(0.55 + Math.random() * 0.25);
        objs.push(cl);
        scene.tweens.add({
          targets: cl, x: cl.x + 220 + Math.random() * 160,
          duration: 9000 + Math.random() * 8000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
        });
      }
    }

    // Lớp "sương mờ" giúp nền lùi lại, chướng ngại vật nổi bật hơn
    var veil = scene.add.graphics().setScrollFactor(0).setDepth(-9);
    if (th.dark) { veil.fillStyle(0x0a0a16, 0.42); }
    else { veil.fillStyle(0xffffff, 0.22); }
    veil.fillRect(-W, -H, W * 3, H * 3);
    objs.push(veil);

    return { objects: objs, drift: [{ obj: far, dx: 0.12 }] };
  }

  /* Nền trời gradient + texture đồi cho parallax */
  function makeSky(scene) {
    if (!scene.textures.exists('sky')) {
      var g = scene.make.graphics({ x: 0, y: 0, add: false });
      g.fillGradientStyle(0x4aa3e8, 0x4aa3e8, 0xbfe7ff, 0xbfe7ff, 1);
      g.fillRect(0, 0, 960, 540);
      g.generateTexture('sky', 960, 540);
      g.destroy();
    }
    if (!scene.textures.exists('hill')) {
      var h = scene.make.graphics({ x: 0, y: 0, add: false });
      h.fillStyle(0x7cc36a, 1);
      h.fillEllipse(180, 180, 360, 240);
      h.generateTexture('hill', 360, 200);
      h.destroy();
    }
    if (!scene.textures.exists('hill2')) {
      var h2 = scene.make.graphics({ x: 0, y: 0, add: false });
      h2.fillStyle(0x9ad97f, 1);
      h2.fillEllipse(220, 200, 440, 280);
      h2.generateTexture('hill2', 440, 220);
      h2.destroy();
    }
  }

  /* Thùng gỗ — chướng ngại để nhảy qua / leo lên */
  function makeCrate(scene) {
    var key = 'crate';
    if (scene.textures.exists(key)) return;
    var s = 42;
    var g = scene.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0x6b4423, 1); g.fillRoundedRect(0, 0, s, s, 5);
    g.fillStyle(0xa9683a, 1); g.fillRoundedRect(2, 2, s - 4, s - 4, 4);
    g.lineStyle(3, 0x6b4423, 1);
    g.strokeRect(3, 3, s - 6, s - 6);
    g.beginPath();
    g.moveTo(4, 4); g.lineTo(s - 4, s - 4);
    g.moveTo(s - 4, 4); g.lineTo(4, s - 4);
    g.strokePath();
    g.fillStyle(0xf5deb3, 1);
    [[7, 7], [s - 7, 7], [7, s - 7], [s - 7, s - 7]].forEach(function (p) { g.fillCircle(p[0], p[1], 2.2); });
    g.generateTexture(key, s, s);
    g.destroy();
  }

  /* Bệ mây — bục nổi mềm mại */
  function makeCloudPlat(scene) {
    var key = 'cloudp';
    if (scene.textures.exists(key)) return;
    var w = 120, h = 50;
    var g = scene.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0xbfe3ff, 1); g.fillRoundedRect(6, h - 18, w - 12, 16, 8);
    g.fillStyle(0xffffff, 1);
    g.fillCircle(28, 26, 20);
    g.fillCircle(60, 20, 26);
    g.fillCircle(92, 26, 20);
    g.fillRoundedRect(8, 22, w - 16, 20, 12);
    g.generateTexture(key, w, h);
    g.destroy();
  }

  /* Nước — đáy hố nguy hiểm */
  function makeWater(scene) {
    var key = 'water';
    if (scene.textures.exists(key)) return;
    var w = 64, h = 46;
    var g = scene.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0x1f78c1, 1); g.fillRect(0, 8, w, h - 8);
    g.fillStyle(0x3a98e0, 1); g.fillRect(0, 8, w, 12);
    g.fillStyle(0x9fd4ff, 1);
    for (var i = 0; i < w; i += 16) g.fillCircle(i + 8, 9, 6);
    g.fillStyle(0xffffff, 0.45);
    g.fillRoundedRect(7, 18, 12, 3, 1);
    g.fillRoundedRect(34, 24, 14, 3, 1);
    g.generateTexture(key, w, h);
    g.destroy();
  }

  /* Dung nham — đáy hố nguy hiểm (theme lửa/lòng đất) */
  function makeLava(scene) {
    var key = 'lava';
    if (scene.textures.exists(key)) return;
    var w = 64, h = 46;
    var g = scene.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0x8a1c08, 1); g.fillRect(0, 8, w, h - 8);
    g.fillStyle(0xea580c, 1); g.fillRect(0, 8, w, 14);
    g.fillStyle(0xfca5a5, 1);
    for (var i = 0; i < w; i += 16) g.fillCircle(i + 8, 9, 6);
    g.fillStyle(0xfde68a, 1);
    g.fillCircle(16, 18, 3); g.fillCircle(40, 24, 4); g.fillCircle(54, 16, 2.5);
    g.generateTexture(key, w, h);
    g.destroy();
  }

  function makeBlockTexture(scene, key, w, h, colorTop, colorBody, radius) {
    if (scene.textures.exists(key)) return;
    var g = scene.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(colorBody, 1);
    g.fillRoundedRect(0, 0, w, h, radius || 6);
    g.fillStyle(colorTop, 1);
    g.fillRoundedRect(0, 0, w, Math.max(6, h * 0.32), radius || 6);
    g.generateTexture(key, w, h);
    g.destroy();
  }

  function makeStar(scene) {
    var key = 'star';
    if (scene.textures.exists(key)) return;
    var size = 30;
    var g = scene.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0xffd54a, 1);
    g.lineStyle(2, 0xf59f00, 1);
    var cx = size / 2, cy = size / 2, spikes = 5, outer = 14, inner = 6;
    var pts = [];
    for (var i = 0; i < spikes * 2; i++) {
      var r = (i % 2 === 0) ? outer : inner;
      var a = (Math.PI / spikes) * i - Math.PI / 2;
      pts.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
    }
    g.beginPath();
    g.moveTo(pts[0].x, pts[0].y);
    for (var j = 1; j < pts.length; j++) g.lineTo(pts[j].x, pts[j].y);
    g.closePath();
    g.fillPath();
    g.strokePath();
    g.generateTexture(key, size, size);
    g.destroy();
  }

  function makeFlag(scene) {
    var key = 'flag';
    if (scene.textures.exists(key)) return;
    var w = 40, h = 70;
    var g = scene.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0x8d6e63, 1);
    g.fillRect(4, 0, 5, h);
    g.fillStyle(0x10b981, 1);
    g.fillTriangle(9, 6, 9, 30, 36, 18);
    g.generateTexture(key, w, h);
    g.destroy();
  }

  /* ─────────── Tạo tất cả texture cho 1 scene ─────────── */
  function createTextures(scene, avatar, onReady) {
    onReady = onReady || function () {};
    makeSky(scene);
    makeStar(scene);
    makeFlag(scene);
    makeCoin(scene);
    makePadlock(scene);
    makeSpike(scene);
    makeSaw(scene);
    // nền đất (cỏ trên, đất dưới)
    makeBlockTexture(scene, 'ground', 64, 64, 0x6abe30, 0x9c6b3f, 0);
    // bục nhảy
    makeBlockTexture(scene, 'platform', 110, 28, 0xa7e57d, 0x6aa84f, 10);
    // địa hình bổ sung
    makeCrate(scene);
    makeCloudPlat(scene);
    makeWater(scene);
    makeLava(scene);

    // vật phẩm/trang trí bằng emoji
    makeEmojiTexture(scene, 'cloud', '☁️', 80);
    makeEmojiTexture(scene, 'heart', '❤️', 40);
    makeEmojiTexture(scene, 'lock', '🔒', 56);
    makeEmojiTexture(scene, 'trophy', '🏆', 96);
    makeEmojiTexture(scene, 'sad', '😿', 96);

    // nhân vật cá nhân hóa (có thể async khi dùng ảnh đại diện)
    makeHero(scene, avatar || getStudentAvatar(), onReady);
  }

  /* ═════════════════ Âm thanh (Web Audio) ═════════════════ */
  var actx = null;
  var _muted = false;
  try { _muted = localStorage.getItem('kidGameMuted') === '1'; } catch (e) {}
  function ctx() {
    if (actx) return actx;
    try {
      var AC = global.AudioContext || global.webkitAudioContext;
      if (!AC) return null;
      actx = new AC();
    } catch (e) { actx = null; }
    return actx;
  }
  function resume() {
    var c = ctx();
    if (c && c.state === 'suspended') { try { c.resume(); } catch (e) {} }
  }

  function tone(freq, start, dur, type, gain) {
    if (_muted) return;
    var c = ctx();
    if (!c) return;
    var t0 = c.currentTime + (start || 0);
    var osc = c.createOscillator();
    var g = c.createGain();
    osc.type = type || 'square';
    osc.frequency.setValueAtTime(freq, t0);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain || 0.18, t0 + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + (dur || 0.15));
    osc.connect(g);
    g.connect(c.destination);
    osc.start(t0);
    osc.stop(t0 + (dur || 0.15) + 0.02);
  }

  function slide(f1, f2, start, dur, type, gain) {
    if (_muted) return;
    var c = ctx();
    if (!c) return;
    var t0 = c.currentTime + (start || 0);
    var osc = c.createOscillator();
    var g = c.createGain();
    osc.type = type || 'sawtooth';
    osc.frequency.setValueAtTime(f1, t0);
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, f2), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain || 0.16, t0 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    g.connect(c.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  var Sfx = {
    unlock: resume,
    jump: function () { resume(); slide(360, 720, 0, 0.16, 'square', 0.14); },
    coin: function () { resume(); tone(988, 0, 0.08, 'square', 0.13); tone(1318, 0.07, 0.12, 'square', 0.13); },
    correct: function () {
      resume();
      tone(659, 0, 0.12, 'square', 0.15);
      tone(784, 0.1, 0.12, 'square', 0.15);
      tone(1046, 0.2, 0.2, 'square', 0.16);
    },
    wrong: function () {
      resume();
      tone(220, 0, 0.16, 'sawtooth', 0.16);
      tone(160, 0.14, 0.24, 'sawtooth', 0.16);
    },
    hurt: function () { resume(); slide(440, 120, 0, 0.3, 'sawtooth', 0.18); },
    win: function () {
      resume();
      var notes = [523, 659, 784, 1046, 1318];
      notes.forEach(function (f, i) { tone(f, i * 0.13, 0.16, 'square', 0.16); });
    },
    lose: function () {
      resume();
      var notes = [392, 330, 262, 196];
      notes.forEach(function (f, i) { tone(f, i * 0.16, 0.2, 'triangle', 0.16); });
    },
    gate: function () { resume(); slide(200, 500, 0, 0.25, 'triangle', 0.14); },
    isMuted: function () { return _muted; },
    setMuted: function (v) {
      _muted = !!v;
      try { localStorage.setItem('kidGameMuted', _muted ? '1' : '0'); } catch (e) {}
      return _muted;
    },
    toggleMute: function () { return Sfx.setMuted(!_muted); }
  };

  global.GameAssets = {
    createTextures: createTextures,
    getStudentAvatar: getStudentAvatar,
    ensureTheme: ensureTheme,
    buildScenery: buildScenery,
    THEMES: THEMES,
    HERO: { w: HERO_W, h: HERO_H, ss: HERO_SS },
    Sfx: Sfx
  };
})(window);
