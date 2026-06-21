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
    // nền đất (cỏ trên, đất dưới)
    makeBlockTexture(scene, 'ground', 64, 64, 0x6abe30, 0x9c6b3f, 0);
    // bục nhảy
    makeBlockTexture(scene, 'platform', 110, 28, 0xa7e57d, 0x6aa84f, 10);
    // địa hình bổ sung
    makeCrate(scene);
    makeCloudPlat(scene);
    makeWater(scene);

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
    gate: function () { resume(); slide(200, 500, 0, 0.25, 'triangle', 0.14); }
  };

  global.GameAssets = {
    createTextures: createTextures,
    getStudentAvatar: getStudentAvatar,
    HERO: { w: HERO_W, h: HERO_H, ss: HERO_SS },
    Sfx: Sfx
  };
})(window);
