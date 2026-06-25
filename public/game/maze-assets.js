/* ═══════════════════════════════════════════════════
   MAZE-ASSETS.JS — Sprite vẽ canvas (không dùng emoji)
═══════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  var cache = {};
  var heroImg = null;
  var heroReady = false;
  var heroCallbacks = [];

  function roundRect(ctx, x, y, w, h, r) {
    if (ctx.roundRect) {
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, r);
      return;
    }
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function shade(hex, amt) {
    var n = parseInt(String(hex).replace('#', ''), 16);
    if (isNaN(n)) return hex;
    var r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    var t = amt < 0 ? 0 : 255, p = Math.abs(amt);
    r = Math.max(0, Math.min(255, Math.round((t - r) * p + r)));
    g = Math.max(0, Math.min(255, Math.round((t - g) * p + g)));
    b = Math.max(0, Math.min(255, Math.round((t - b) * p + b)));
    return 'rgb(' + r + ',' + g + ',' + b + ')';
  }

  function makeCanvas(w, h) {
    var c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    return c;
  }

  function store(key, canvas) {
    cache[key] = canvas;
    return canvas;
  }

  function get(key) {
    return cache[key] || null;
  }

  /* ── Trang trí theo chủ đề ── */
  function drawGrassFlower(ctx, s) {
    ctx.fillStyle = '#2e7d32';
    ctx.fillRect(s * 0.46, s * 0.55, s * 0.08, s * 0.35);
    ['#f48fb1', '#fff59d', '#ce93d8', '#ff8a65'].forEach(function (col, i) {
      var a = (i / 4) * Math.PI * 2;
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(s / 2 + Math.cos(a) * s * 0.18, s / 2 + Math.sin(a) * s * 0.18, s * 0.12, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.fillStyle = '#ffeb3b';
    ctx.beginPath();
    ctx.arc(s / 2, s / 2, s * 0.1, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawBush(ctx, s, dark, light) {
    ctx.fillStyle = dark;
    ctx.beginPath();
    ctx.arc(s * 0.35, s * 0.62, s * 0.22, 0, Math.PI * 2);
    ctx.arc(s * 0.65, s * 0.62, s * 0.22, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = light;
    ctx.beginPath();
    ctx.arc(s * 0.5, s * 0.48, s * 0.28, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawTree(ctx, s) {
    ctx.fillStyle = '#6b4423';
    ctx.fillRect(s * 0.44, s * 0.52, s * 0.12, s * 0.38);
    ctx.fillStyle = '#1b5e20';
    ctx.beginPath();
    ctx.arc(s * 0.5, s * 0.38, s * 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#43a047';
    ctx.beginPath();
    ctx.arc(s * 0.42, s * 0.32, s * 0.18, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawPalm(ctx, s) {
    ctx.fillStyle = '#7a4a23';
    ctx.fillRect(s * 0.47, s * 0.42, s * 0.06, s * 0.48);
    ctx.fillStyle = '#2e7d32';
    ctx.beginPath();
    ctx.ellipse(s * 0.22, s * 0.42, s * 0.28, s * 0.1, -0.4, 0, Math.PI * 2);
    ctx.ellipse(s * 0.78, s * 0.42, s * 0.28, s * 0.1, 0.4, 0, Math.PI * 2);
    ctx.ellipse(s * 0.5, s * 0.28, s * 0.2, s * 0.12, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawRock(ctx, s, col1, col2) {
    ctx.fillStyle = col2;
    ctx.beginPath();
    ctx.moveTo(s * 0.15, s * 0.72);
    ctx.lineTo(s * 0.32, s * 0.28);
    ctx.lineTo(s * 0.72, s * 0.35);
    ctx.lineTo(s * 0.88, s * 0.78);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = col1;
    ctx.beginPath();
    ctx.moveTo(s * 0.28, s * 0.68);
    ctx.lineTo(s * 0.42, s * 0.38);
    ctx.lineTo(s * 0.62, s * 0.42);
    ctx.lineTo(s * 0.55, s * 0.7);
    ctx.closePath();
    ctx.fill();
  }

  function drawCrystal(ctx, s) {
    ctx.fillStyle = 'rgba(111,214,245,0.35)';
    ctx.beginPath();
    ctx.moveTo(s * 0.5, s * 0.12);
    ctx.lineTo(s * 0.72, s * 0.78);
    ctx.lineTo(s * 0.28, s * 0.78);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#6fd6f5';
    ctx.beginPath();
    ctx.moveTo(s * 0.5, s * 0.18);
    ctx.lineTo(s * 0.64, s * 0.72);
    ctx.lineTo(s * 0.36, s * 0.72);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.fillRect(s * 0.46, s * 0.28, s * 0.04, s * 0.32);
  }

  function drawCactus(ctx, s) {
    ctx.fillStyle = '#2e7d32';
    roundRect(ctx, s * 0.42, s * 0.22, s * 0.16, s * 0.62, 6);
    ctx.fill();
    roundRect(ctx, s * 0.22, s * 0.42, s * 0.14, s * 0.22, 5);
    ctx.fill();
    roundRect(ctx, s * 0.64, s * 0.36, s * 0.14, s * 0.24, 5);
    ctx.fill();
  }

  function drawLamp(ctx, s) {
    ctx.fillStyle = '#475569';
    ctx.fillRect(s * 0.47, s * 0.35, s * 0.06, s * 0.55);
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.moveTo(s * 0.32, s * 0.38);
    ctx.lineTo(s * 0.68, s * 0.38);
    ctx.lineTo(s * 0.62, s * 0.18);
    ctx.lineTo(s * 0.38, s * 0.18);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(251,191,36,0.35)';
    ctx.beginPath();
    ctx.arc(s * 0.5, s * 0.55, s * 0.22, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawEmber(ctx, s) {
    ctx.fillStyle = '#451a03';
    drawRock(ctx, s, '#7f1d1d', '#450a0a');
    ctx.fillStyle = '#f97316';
    ctx.beginPath();
    ctx.arc(s * 0.55, s * 0.55, s * 0.08, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fde047';
    ctx.beginPath();
    ctx.arc(s * 0.55, s * 0.52, s * 0.04, 0, Math.PI * 2);
    ctx.fill();
  }

  /* ── Bẫy theo chủ đề (không tam giác chấm than) ── */
  function drawTrapThorn(ctx, s) {
    ctx.fillStyle = 'rgba(76,175,80,0.25)';
    ctx.beginPath();
    ctx.arc(s / 2, s / 2, s * 0.42, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#c62828';
    for (var i = 0; i < 8; i++) {
      var a = (i / 8) * Math.PI * 2;
      var x = s / 2 + Math.cos(a) * s * 0.22;
      var y = s / 2 + Math.sin(a) * s * 0.22;
      ctx.beginPath();
      ctx.moveTo(x, y - s * 0.14);
      ctx.lineTo(x - s * 0.07, y + s * 0.1);
      ctx.lineTo(x + s * 0.07, y + s * 0.1);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = '#8d1b1b';
    ctx.beginPath();
    ctx.arc(s / 2, s / 2, s * 0.1, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawTrapVine(ctx, s) {
    ctx.strokeStyle = '#1b5e20';
    ctx.lineWidth = s * 0.07;
    ctx.lineCap = 'round';
    for (var i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(s * 0.2, s * 0.2);
      ctx.bezierCurveTo(s * 0.5, s * 0.1, s * 0.8, s * 0.5, s * 0.5 + i * 0.05, s * 0.82);
      ctx.stroke();
    }
    ctx.fillStyle = '#2e7d32';
    ctx.beginPath();
    ctx.ellipse(s * 0.28, s * 0.72, s * 0.14, s * 0.08, -0.5, 0, Math.PI * 2);
    ctx.ellipse(s * 0.72, s * 0.68, s * 0.12, s * 0.07, 0.6, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawTrapPit(ctx, s) {
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.ellipse(s / 2, s / 2, s * 0.38, s * 0.32, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#334155';
    ctx.beginPath();
    ctx.ellipse(s / 2, s / 2, s * 0.28, s * 0.22, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#94a3b8';
    for (var i = 0; i < 5; i++) {
      var a = (i / 5) * Math.PI * 2 + 0.3;
      ctx.beginPath();
      ctx.moveTo(s / 2, s / 2);
      ctx.lineTo(s / 2 + Math.cos(a) * s * 0.34, s / 2 + Math.sin(a) * s * 0.28);
      ctx.lineTo(s / 2 + Math.cos(a + 0.15) * s * 0.2, s / 2 + Math.sin(a + 0.15) * s * 0.16);
      ctx.closePath();
      ctx.fill();
    }
  }

  function drawTrapSand(ctx, s) {
    ctx.fillStyle = '#d97706';
    ctx.beginPath();
    ctx.arc(s / 2, s / 2, s * 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#b45309';
    ctx.lineWidth = 2;
    for (var r = 0.12; r < 0.38; r += 0.1) {
      ctx.beginPath();
      ctx.arc(s / 2, s / 2, s * r, 0, Math.PI * 1.6);
      ctx.stroke();
    }
    ctx.fillStyle = '#78350f';
    ctx.beginPath();
    ctx.ellipse(s / 2, s / 2, s * 0.12, s * 0.08, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawTrapSpikes(ctx, s) {
    ctx.fillStyle = '#64748b';
    roundRect(ctx, s * 0.08, s * 0.68, s * 0.84, s * 0.18, 4);
    ctx.fill();
    ctx.fillStyle = '#cbd5e1';
    for (var i = 0; i < 5; i++) {
      var x = s * 0.14 + i * s * 0.16;
      ctx.beginPath();
      ctx.moveTo(x, s * 0.68);
      ctx.lineTo(x + s * 0.06, s * 0.22);
      ctx.lineTo(x + s * 0.12, s * 0.68);
      ctx.closePath();
      ctx.fill();
    }
  }

  function drawTrapLava(ctx, s) {
    ctx.fillStyle = '#450a0a';
    ctx.beginPath();
    ctx.moveTo(s * 0.12, s * 0.55);
    ctx.lineTo(s * 0.35, s * 0.42);
    ctx.lineTo(s * 0.55, s * 0.58);
    ctx.lineTo(s * 0.78, s * 0.4);
    ctx.lineTo(s * 0.88, s * 0.62);
    ctx.lineTo(s * 0.1, s * 0.72);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ea580c';
    ctx.beginPath();
    ctx.moveTo(s * 0.2, s * 0.58);
    ctx.lineTo(s * 0.42, s * 0.48);
    ctx.lineTo(s * 0.62, s * 0.6);
    ctx.lineTo(s * 0.38, s * 0.66);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#fde047';
    ctx.beginPath();
    ctx.arc(s * 0.48, s * 0.54, s * 0.06, 0, Math.PI * 2);
    ctx.arc(s * 0.62, s * 0.52, s * 0.04, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawExitDoor(ctx, s) {
    ctx.fillStyle = '#5d4037';
    roundRect(ctx, s * 0.18, s * 0.08, s * 0.64, s * 0.88, 6);
    ctx.fill();
    ctx.fillStyle = '#8d6e63';
    roundRect(ctx, s * 0.24, s * 0.14, s * 0.52, s * 0.76, 5);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,235,59,0.45)';
    roundRect(ctx, s * 0.3, s * 0.22, s * 0.4, s * 0.58, 4);
    ctx.fill();
    ctx.fillStyle = '#ffd54f';
    ctx.beginPath();
    ctx.arc(s * 0.62, s * 0.52, s * 0.05, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#3e2723';
    ctx.lineWidth = 2;
    roundRect(ctx, s * 0.18, s * 0.08, s * 0.64, s * 0.88, 6);
    ctx.stroke();
  }

  function drawMonster(ctx, s) {
    ctx.fillStyle = '#5a3417';
    ctx.beginPath();
    ctx.ellipse(s / 2, s * 0.82, s * 0.38, s * 0.12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#7c3aed';
    ctx.beginPath();
    ctx.ellipse(s / 2, s * 0.48, s * 0.42, s * 0.38, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#a78bfa';
    ctx.beginPath();
    ctx.ellipse(s / 2, s * 0.4, s * 0.3, s * 0.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(s * 0.38, s * 0.46, s * 0.1, 0, Math.PI * 2);
    ctx.arc(s * 0.62, s * 0.46, s * 0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1e1e1e';
    ctx.beginPath();
    ctx.arc(s * 0.4, s * 0.47, s * 0.05, 0, Math.PI * 2);
    ctx.arc(s * 0.6, s * 0.47, s * 0.05, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#4c1d95';
    ctx.fillRect(s * 0.38, s * 0.6, s * 0.24, s * 0.05);
  }

  function drawHeroToCanvas(canvas, avatar, photoImg) {
    var SS = 3, W = 52, H = 64;
    canvas.width = W * SS;
    canvas.height = H * SS;
    var ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.scale(SS, SS);

    var ring = (avatar && avatar.ring) || '#FF9800';
    var bodyDark = shade(ring, -0.3);
    var bodyLight = shade(ring, 0.28);

    ctx.fillStyle = '#6b4423';
    roundRect(ctx, 10, H - 10, 12, 9, 4); ctx.fill();
    roundRect(ctx, W - 22, H - 10, 12, 9, 4); ctx.fill();
    ctx.fillStyle = bodyDark;
    ctx.beginPath(); ctx.arc(6, 40, 5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(W - 6, 40, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = bodyDark;
    roundRect(ctx, 3, 14, W - 6, H - 22, 15); ctx.fill();
    ctx.fillStyle = ring;
    roundRect(ctx, 5, 16, W - 10, H - 26, 13); ctx.fill();
    ctx.fillStyle = bodyLight;
    roundRect(ctx, 12, H - 24, W - 24, 14, 8); ctx.fill();

    var fx = W / 2, fy = 19, fr = 17;
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(fx, fy, fr, 0, Math.PI * 2); ctx.fill();
    ctx.save();
    ctx.beginPath(); ctx.arc(fx, fy, fr - 2, 0, Math.PI * 2); ctx.clip();
    if (photoImg) {
      var d = (fr - 2) * 2;
      var si = Math.min(photoImg.width, photoImg.height) || 1;
      ctx.drawImage(photoImg, (photoImg.width - si) / 2, (photoImg.height - si) / 2, si, si, fx - d / 2, fy - d / 2, d, d);
    } else {
      ctx.fillStyle = '#eef4ff';
      ctx.fillRect(fx - fr, fy - fr, fr * 2, fr * 2);
      ctx.font = '24px "Segoe UI Emoji",sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText((avatar && avatar.emoji) || '🧒', fx, fy + 1);
    }
    ctx.restore();
    ctx.lineWidth = 3;
    ctx.strokeStyle = bodyDark;
    ctx.beginPath(); ctx.arc(fx, fy, fr, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }

  function buildSprite(key, size, drawFn) {
    var c = makeCanvas(size, size);
    var ctx = c.getContext('2d');
    drawFn(ctx, size);
    return store(key, c);
  }

  function buildAllSprites() {
    var S = 48;
    buildSprite('deco_flower', S, drawGrassFlower);
    buildSprite('deco_bush', S, function (ctx, s) { drawBush(ctx, s, '#1b5e20', '#43a047'); });
    buildSprite('deco_tree', S, drawTree);
    buildSprite('deco_palm', S, drawPalm);
    buildSprite('deco_rock', S, function (ctx, s) { drawRock(ctx, s, '#78909c', '#546e7a'); });
    buildSprite('deco_crystal', S, drawCrystal);
    buildSprite('deco_cactus', S, drawCactus);
    buildSprite('deco_lamp', S, drawLamp);
    buildSprite('deco_ember', S, drawEmber);

    buildSprite('trap_grass', S, drawTrapThorn);
    buildSprite('trap_jungle', S, drawTrapVine);
    buildSprite('trap_cave', S, drawTrapPit);
    buildSprite('trap_desert', S, drawTrapSand);
    buildSprite('trap_city', S, drawTrapSpikes);
    buildSprite('trap_inferno', S, drawTrapLava);

    buildSprite('exit_door', S + 8, drawExitDoor);
    buildSprite('monster', S, drawMonster);
  }

  function init(done) {
    buildAllSprites();
    var avatar = global.GameAssets && global.GameAssets.getStudentAvatar
      ? global.GameAssets.getStudentAvatar()
      : { mode: 'emoji', emoji: '🧒', ring: '#FF9800', photo: '' };

    var canvas = makeCanvas(156, 192);
    if (avatar.mode === 'photo' && avatar.photo) {
      var img = new Image();
      var settled = false;
      var finish = function (photo) {
        if (settled) return;
        settled = true;
        drawHeroToCanvas(canvas, avatar, photo);
        heroImg = canvas;
        heroReady = true;
        heroCallbacks.splice(0).forEach(function (cb) { cb(); });
        if (done) done();
      };
      img.onload = function () { finish(img); };
      img.onerror = function () { finish(null); };
      setTimeout(function () { finish(null); }, 2500);
      img.src = avatar.photo;
    } else {
      drawHeroToCanvas(canvas, avatar, null);
      heroImg = canvas;
      heroReady = true;
      if (done) done();
    }
  }

  function whenReady(cb) {
    if (heroReady) cb();
    else heroCallbacks.push(cb);
  }

  var THEME_DECO = {
    grass: ['deco_flower', 'deco_bush', 'deco_tree'],
    jungle: ['deco_palm', 'deco_bush', 'deco_flower'],
    cave: ['deco_crystal', 'deco_rock', 'deco_rock'],
    desert: ['deco_cactus', 'deco_rock', 'deco_rock'],
    city: ['deco_lamp', 'deco_rock', 'deco_bush'],
    inferno: ['deco_ember', 'deco_rock', 'deco_rock']
  };

  var THEME_WALL_DECO = {
    grass: ['deco_tree', 'deco_rock'],
    jungle: ['deco_palm', 'deco_tree'],
    cave: ['deco_rock', 'deco_crystal'],
    desert: ['deco_cactus', 'deco_rock'],
    city: ['deco_lamp', 'deco_rock'],
    inferno: ['deco_ember', 'deco_rock']
  };

  var TRAP_KEY = {
    grass: 'trap_grass',
    jungle: 'trap_jungle',
    cave: 'trap_cave',
    desert: 'trap_desert',
    city: 'trap_city',
    inferno: 'trap_inferno'
  };

  function drawSprite(ctx, key, x, y, size, alpha) {
    var spr = get(key);
    if (!spr) return;
    ctx.save();
    if (alpha != null) ctx.globalAlpha = alpha;
    ctx.drawImage(spr, x - size / 2, y - size / 2, size, size);
    ctx.restore();
  }

  function drawDeco(ctx, theme, gx, gy, tile, seed) {
    var list = THEME_DECO[theme] || THEME_DECO.grass;
    var h = ((gx * 374761 + gy * 668265 + seed) | 0) >>> 0;
    if (h % 4 !== 0 && h % 9 !== 0) return;
    var key = list[h % list.length];
    var size = tile * (0.72 + (h % 5) * 0.04);
    drawSprite(ctx, key, gx * tile + tile / 2, gy * tile + tile / 2 + (h % 2 ? 2 : -1), size, 0.92);
  }

  function drawWallDeco(ctx, theme, gx, gy, tile, seed) {
    var list = THEME_WALL_DECO[theme] || THEME_WALL_DECO.grass;
    var h = ((gx * 912371 + gy * 123457 + seed + 99) | 0) >>> 0;
    if (h % 6 !== 0) return;
    var key = list[h % list.length];
    drawSprite(ctx, key, gx * tile + tile / 2, gy * tile + tile / 2, tile * 0.78, 0.88);
  }

  function drawTrap(ctx, theme, x, y, tile) {
    var key = TRAP_KEY[theme] || 'trap_grass';
    drawSprite(ctx, key, x, y, tile * 0.92, 1);
  }

  function drawMonsterAt(ctx, x, y, tile) {
    drawSprite(ctx, 'monster', x, y, tile * 0.88, 1);
  }

  function drawExit(ctx, x, y, tile) {
    drawSprite(ctx, 'exit_door', x, y, tile * 1.05, 1);
  }

  function drawHero(ctx, x, y, tile) {
    if (!heroImg) return;
    var size = tile * 1.15;
    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.beginPath();
    ctx.ellipse(x, y + tile * 0.18, size * 0.38, size * 0.14, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,152,0,0.85)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x, y, size * 0.48, 0, Math.PI * 2);
    ctx.stroke();
    ctx.drawImage(heroImg, x - size / 2, y - size / 2 - tile * 0.05, size, size * (heroImg.height / heroImg.width));
    ctx.restore();
  }

  global.MazeAssets = {
    init: init,
    whenReady: whenReady,
    drawDeco: drawDeco,
    drawWallDeco: drawWallDeco,
    drawTrap: drawTrap,
    drawMonsterAt: drawMonsterAt,
    drawExit: drawExit,
    drawHero: drawHero,
    TRAP_KEY: TRAP_KEY
  };
})(window);
