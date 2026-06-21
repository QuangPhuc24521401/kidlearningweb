/* ═══════════════════════════════════════════════════
   GAME-ASSETS.JS — Sinh texture & âm thanh tại runtime

   Không dùng file ảnh/âm thanh ngoài. Tất cả sprite vẽ bằng
   Phaser Graphics hoặc canvas emoji; SFX tạo bằng Web Audio API.

   Export: window.GameAssets = { createTextures(scene), Sfx }
═══════════════════════════════════════════════════ */
(function (global) {
  'use strict';

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

  /* ─────────── Texture vẽ tay (Graphics) ─────────── */
  function makeHero(scene) {
    var key = 'hero';
    if (scene.textures.exists(key)) return;
    var w = 44, h = 52;
    var g = scene.make.graphics({ x: 0, y: 0, add: false });
    // thân tròn vàng cam
    g.fillStyle(0xffb84d, 1);
    g.fillRoundedRect(2, 8, w - 4, h - 10, 14);
    // bụng sáng
    g.fillStyle(0xffe0a3, 1);
    g.fillRoundedRect(10, 22, w - 20, h - 26, 10);
    // mũ đỏ
    g.fillStyle(0xe53935, 1);
    g.fillRoundedRect(2, 0, w - 4, 16, 8);
    g.fillStyle(0xffffff, 1);
    g.fillCircle(w / 2, 8, 5);
    // mắt
    g.fillStyle(0x1e293b, 1);
    g.fillCircle(w / 2 - 7, 26, 3.2);
    g.fillCircle(w / 2 + 7, 26, 3.2);
    // má hồng
    g.fillStyle(0xff8a8a, 0.7);
    g.fillCircle(w / 2 - 13, 32, 3);
    g.fillCircle(w / 2 + 13, 32, 3);
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
  function createTextures(scene) {
    makeHero(scene);
    makeStar(scene);
    makeFlag(scene);
    // nền đất (cỏ trên, đất dưới)
    makeBlockTexture(scene, 'ground', 64, 64, 0x6abe30, 0x8d6e44, 0);
    // bục nhảy
    makeBlockTexture(scene, 'platform', 96, 28, 0x9ccc65, 0x7cb342, 8);
    // hộp gạch
    makeBlockTexture(scene, 'brick', 40, 40, 0xd98a3a, 0xb5651d, 6);

    // chướng ngại & cổng & vật phẩm bằng emoji
    makeEmojiTexture(scene, 'gate', '🚪', 72);
    makeEmojiTexture(scene, 'enemy', '👾', 60);
    makeEmojiTexture(scene, 'spike', '🌵', 56);
    makeEmojiTexture(scene, 'coin', '🪙', 40);
    makeEmojiTexture(scene, 'cloud', '☁️', 80);
    makeEmojiTexture(scene, 'heart', '❤️', 40);
    makeEmojiTexture(scene, 'lock', '🔒', 56);
    makeEmojiTexture(scene, 'trophy', '🏆', 96);
    makeEmojiTexture(scene, 'sad', '😿', 96);
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
    Sfx: Sfx
  };
})(window);
