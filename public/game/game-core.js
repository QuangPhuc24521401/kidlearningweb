/* ═══════════════════════════════════════════════════
   GAME-CORE.JS — Phaser platformer "Cuộc phiêu lưu học tập"

   Scenes: Boot → LevelSelect → Play → Result
   • Boot       : sinh texture & âm thanh (GameAssets)
   • LevelSelect: bản đồ màn chơi (mở/khoá theo GameProgress)
   • Play       : platformer; gặp cổng → overlay câu hỏi 2 lựa chọn
   • Result     : thắng/thua, sao, đi tiếp/chơi lại/bản đồ

   Phụ thuộc: Phaser 3 (CDN), GameAssets, GameLevels, GameProgress.
   TTS: dùng window.speak() nếu có.
═══════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  if (typeof Phaser === 'undefined') {
    console.error('[game-core] Phaser chưa được nạp.');
    return;
  }

  var W = 960, H = 540;
  var GROUND_H = 56;
  // Render ở độ phân giải theo màn hình (chống vỡ chữ / nhòe hình trên màn DPI cao)
  var DPR = Math.max(1, Math.min(2, Math.round(global.devicePixelRatio || 1)));
  var Sfx = (global.GameAssets && global.GameAssets.Sfx) || {};

  /* Tăng độ nét cho mọi Text trong scene + map toạ độ logic cho camera tĩnh */
  function sharpenTexts(scene) {
    var list = (scene.children && scene.children.list) || [];
    for (var i = 0; i < list.length; i++) {
      var o = list[i];
      if (o && o.type === 'Text' && o.setResolution) o.setResolution(DPR);
    }
  }
  function fitStaticCamera(scene) {
    scene.cameras.main.setZoom(DPR);
    scene.cameras.main.centerOn(W / 2, H / 2);
  }

  /* Trạng thái nút cảm ứng dùng chung với PlayScene */
  var touch = { left: false, right: false, down: false, jumpQueued: false, jumpHeld: false };

  function safeSpeak(text) {
    try { if (typeof global.speak === 'function') global.speak(text); } catch (e) {}
  }
  function stopSpeak() {
    try { if (global.speechSynthesis) global.speechSynthesis.cancel(); } catch (e) {}
  }

  /* ════════════════ Overlay câu hỏi (DOM) ════════════════ */
  var GameUI = {
    el: null, meta: null, q: null, ans: null, fb: null, busy: false,
    init: function () {
      this.el = document.getElementById('gameQuiz');
      this.meta = document.getElementById('gameQuizMeta');
      this.q = document.getElementById('gameQuizQuestion');
      this.ans = document.getElementById('gameQuizAnswers');
      this.fb = document.getElementById('gameQuizFeedback');
    },
    /** handlers = { onCorrect(), onWrong() -> aliveBool } */
    show: function (question, handlers) {
      if (!this.el) this.init();
      var self = this;
      this.busy = false;
      this.meta.textContent = question.topic || 'Câu hỏi';
      this.q.textContent = question.question || '';
      this.fb.textContent = '';
      this.fb.className = 'game-quiz-feedback';
      this.ans.innerHTML = '';

      question.options.forEach(function (opt) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'game-quiz-ans';
        b.textContent = opt;
        b.addEventListener('click', function () { self._choose(b, opt, question, handlers); });
        self.ans.appendChild(b);
      });

      this.el.hidden = false;
      safeSpeak(question.voiceText || question.question);
    },
    _buttons: function () { return Array.prototype.slice.call(this.ans.querySelectorAll('.game-quiz-ans')); },
    _choose: function (btn, opt, question, handlers) {
      if (this.busy) return;
      this.busy = true;
      var self = this;
      var buttons = this._buttons();
      buttons.forEach(function (b) { b.disabled = true; });

      if (opt === question.correct) {
        btn.classList.add('is-correct');
        this.fb.textContent = 'Đúng rồi! 🎉';
        this.fb.className = 'game-quiz-feedback ok';
        if (Sfx.correct) Sfx.correct();
        stopSpeak();
        setTimeout(function () {
          self.hide();
          if (handlers.onCorrect) handlers.onCorrect();
        }, 850);
      } else {
        btn.classList.add('is-wrong');
        this.fb.textContent = 'Chưa đúng, thử lại nhé!';
        this.fb.className = 'game-quiz-feedback no';
        if (Sfx.wrong) Sfx.wrong();
        stopSpeak();
        var alive = handlers.onWrong ? handlers.onWrong() : true;
        if (!alive) {
          setTimeout(function () { self.hide(); }, 700);
        } else {
          setTimeout(function () {
            self.busy = false;
            buttons.forEach(function (b) { b.disabled = false; b.classList.remove('is-wrong', 'is-correct'); });
            self.fb.textContent = '';
            self.fb.className = 'game-quiz-feedback';
          }, 850);
        }
      }
    },
    hide: function () {
      if (this.el) this.el.hidden = true;
      if (this.ans) this.ans.innerHTML = '';
      this.busy = false;
    }
  };

  /* ════════════════ Nút cảm ứng ════════════════ */
  function wireTouchControls() {
    var pad = document.getElementById('gameTouch');
    if (!pad) return;
    var isTouch = ('ontouchstart' in global) || (navigator.maxTouchPoints > 0);
    if (!isTouch) { pad.hidden = true; return; }
    pad.hidden = false;

    function bind(key, onDown, onUp) {
      var btn = pad.querySelector('[data-key="' + key + '"]');
      if (!btn) return;
      var down = function (e) { e.preventDefault(); onDown(); };
      var up = function (e) { e.preventDefault(); onUp(); };
      btn.addEventListener('pointerdown', down);
      btn.addEventListener('pointerup', up);
      btn.addEventListener('pointercancel', up);
      btn.addEventListener('pointerleave', up);
    }
    bind('left', function () { touch.left = true; }, function () { touch.left = false; });
    bind('right', function () { touch.right = true; }, function () { touch.right = false; });
    bind('down', function () { touch.down = true; }, function () { touch.down = false; });
    bind('jump', function () { touch.jumpQueued = true; touch.jumpHeld = true; }, function () { touch.jumpHeld = false; });
  }

  /* ════════════════ Nút điều khiển DOM (âm thanh / chơi lại / bản đồ) ════════════════ */
  function activePlayScene() {
    var g = global.__kidGame;
    if (!g) return null;
    var ps = g.scene.getScene('Play');
    return (ps && ps.scene && ps.scene.isActive()) ? ps : null;
  }
  function gotoScene(key, data) {
    var g = global.__kidGame; if (!g) return;
    stopSpeak(); GameUI.hide();
    ['Play', 'Result', 'LevelSelect'].forEach(function (k) {
      if (g.scene.isActive(k)) g.scene.stop(k);
    });
    g.scene.start(key, data || {});
  }
  function wireGameControls() {
    var sound = document.getElementById('btnSound');
    var replay = document.getElementById('btnReplay');
    var map = document.getElementById('btnMap');
    if (sound) {
      var muted = Sfx.isMuted ? Sfx.isMuted() : false;
      sound.textContent = muted ? '🔇' : '🔊';
      sound.classList.toggle('is-muted', muted);
      sound.addEventListener('click', function () {
        var m = Sfx.toggleMute ? Sfx.toggleMute() : false;
        sound.textContent = m ? '🔇' : '🔊';
        sound.classList.toggle('is-muted', m);
        if (!m && Sfx.coin) Sfx.coin();
      });
    }
    if (replay) {
      replay.addEventListener('click', function () {
        var g = global.__kidGame; if (!g) return;
        var ps = g.scene.getScene('Play');
        var idx = ps && typeof ps.levelIndex === 'number' ? ps.levelIndex : 0;
        gotoScene('Play', { levelIndex: idx });
      });
    }
    if (map) {
      map.addEventListener('click', function () { gotoScene('LevelSelect'); });
    }
  }

  /* ════════════════ BootScene ════════════════ */
  var BootScene = new Phaser.Class({
    Extends: Phaser.Scene,
    initialize: function BootScene() { Phaser.Scene.call(this, { key: 'Boot' }); },
    create: function () {
      var self = this;
      if (global.GameAssets) {
        var avatar = global.GameAssets.getStudentAvatar ? global.GameAssets.getStudentAvatar() : null;
        global.GameAssets.createTextures(this, avatar, function () { self.scene.start('LevelSelect'); });
      } else {
        this.scene.start('LevelSelect');
      }
    }
  });

  /* ════════════════ LevelSelectScene ════════════════ */
  var LevelSelectScene = new Phaser.Class({
    Extends: Phaser.Scene,
    initialize: function LevelSelectScene() { Phaser.Scene.call(this, { key: 'LevelSelect' }); },
    create: function () {
      var self = this;
      fitStaticCamera(this);
      // ───── nền: trời + đồi xa ─────
      if (this.textures.exists('sky')) this.add.image(0, 0, 'sky').setOrigin(0, 0).setDisplaySize(W, H).setDepth(-20);
      else this.cameras.main.setBackgroundColor('#7ec0ee');
      if (this.textures.exists('hill2')) {
        this.add.image(240, H + 10, 'hill2').setOrigin(0.5, 1).setDepth(-15).setDisplaySize(560, 260);
        this.add.image(740, H + 10, 'hill2').setOrigin(0.5, 1).setDepth(-15).setDisplaySize(560, 260);
      }

      // ───── tiện ích vẽ đường đứt nét ─────
      function dashLine(g, x1, y1, x2, y2, dash, gap, color, width, alpha) {
        g.lineStyle(width, color, alpha == null ? 1 : alpha);
        var dx = x2 - x1, dy = y2 - y1, dist = Math.sqrt(dx * dx + dy * dy) || 1;
        var vx = dx / dist, vy = dy / dist, step = dash + gap;
        for (var s = 0; s < dist; s += step) {
          var e = Math.min(s + dash, dist);
          g.beginPath();
          g.moveTo(x1 + vx * s, y1 + vy * s);
          g.lineTo(x1 + vx * e, y1 + vy * e);
          g.strokePath();
        }
      }

      // ───── tấm bản đồ giấy da ─────
      var map = this.add.graphics().setDepth(-6);
      map.fillStyle(0x000000, 0.10); map.fillRoundedRect(42, 98, W - 84, 380, 26);
      map.fillStyle(0xcda86a, 1); map.fillRoundedRect(34, 92, W - 68, 380, 26);
      map.fillStyle(0xf2e4b6, 1); map.fillRoundedRect(44, 100, W - 88, 364, 20);
      map.fillStyle(0xe6d29a, 0.55); map.fillEllipse(170, 175, 170, 100);
      map.fillEllipse(820, 405, 200, 120); map.fillEllipse(560, 150, 150, 80);
      dashLine(map, 64, 118, W - 64, 118, 12, 9, 0x9a6b34, 3, 0.8);
      dashLine(map, 64, H - 118, W - 64, H - 118, 12, 9, 0x9a6b34, 3, 0.8);
      dashLine(map, 64, 118, 64, H - 118, 12, 9, 0x9a6b34, 3, 0.8);
      dashLine(map, W - 64, 118, W - 64, H - 118, 12, 9, 0x9a6b34, 3, 0.8);
      // băng dính 4 góc
      [[60, 110], [W - 60, 110], [60, H - 78], [W - 60, H - 78]].forEach(function (p) {
        map.fillStyle(0xffffff, 0.4); map.fillRoundedRect(p[0] - 26, p[1] - 12, 52, 24, 4);
      });

      // ───── tiêu đề ─────
      this.add.text(W / 2, 40, '🗺️ Bản đồ kho báu', {
        fontFamily: 'Baloo 2, cursive', fontSize: '32px', color: '#fff7e6', stroke: '#7c3f12', strokeThickness: 6
      }).setOrigin(0.5).setDepth(12);
      this.add.text(W / 2, 74, 'Vượt qua từng chặng để lấy được kho báu nhé!', {
        fontFamily: 'Nunito, sans-serif', fontSize: '14px', color: '#3a2a12'
      }).setOrigin(0.5).setDepth(12);

      var levels = (global.GameLevels && global.GameLevels.LEVELS) || [];
      var GP = global.GameProgress;
      var totalStars = 0;
      var n = levels.length;

      // ───── vị trí các chặng (đường mòn ngoằn ngoèo) ─────
      var perRow = 4;
      var rows = Math.max(1, Math.ceil(n / perRow));
      var ax0 = 132, ax1 = 760, aTop = 226, aBottom = 360;
      function posOf(i) {
        var row = Math.floor(i / perRow), col = i % perRow;
        if (row % 2 === 1) col = perRow - 1 - col; // ngoằn ngoèo
        var x = ax0 + (ax1 - ax0) * (perRow === 1 ? 0 : col / (perRow - 1));
        var y = aBottom - (rows <= 1 ? 0 : (aBottom - aTop) * (row / (rows - 1)));
        return { x: x, y: y };
      }
      var pos = [], unlockedArr = [], progArr = [];
      for (var k = 0; k < n; k++) {
        pos.push(posOf(k));
        var u = GP ? GP.isLevelUnlocked(levels[k].id) : (levels[k].id === 1);
        unlockedArr.push(u);
        var pr = GP ? GP.getLevelProgress(levels[k].id) : { totalStars: 0, completedRuns: 0, bestRun: 0 };
        progArr.push(pr);
        totalStars += (pr.totalStars || 0);
      }

      // ───── đường mòn nối các chặng ─────
      var trail = this.add.graphics().setDepth(0);
      for (var t = 0; t < n - 1; t++) {
        var a = pos[t], b = pos[t + 1];
        if (unlockedArr[t + 1]) {
          // đã đi qua: nét vàng liền + chấm chân
          trail.lineStyle(8, 0xc8862a, 0.45); trail.lineBetween(a.x, a.y, b.x, b.y);
          dashLine(trail, a.x, a.y, b.x, b.y, 3, 16, 0xfff3c4, 4, 0.9);
        } else {
          dashLine(trail, a.x, a.y, b.x, b.y, 12, 12, 0x8a5a2b, 5, 0.85);
        }
      }

      // ───── trang trí ─────
      this.add.text(74, 436, '🌴', { fontSize: '48px' }).setOrigin(0.5).setDepth(1);
      this.add.text(120, 150, '⛵', { fontSize: '34px' }).setOrigin(0.5).setDepth(1);
      this.add.text(470, 165, '🐚', { fontSize: '22px' }).setOrigin(0.5).setDepth(1).setAlpha(0.9);
      this.add.text(540, 432, '🧭', { fontSize: '38px' }).setOrigin(0.5).setDepth(1);

      // ───── rương báu ở góc trên-phải, đường mòn vòng lên ─────
      var allDone = n > 0 && progArr.every(function (p) { return (p.completedRuns || 0) > 0; });
      var last = pos[n - 1];
      var chestX = 856, chestY = 156;
      var routeY = 150, lastDone = n > 0 && (progArr[n - 1].completedRuns || 0) > 0;
      if (lastDone) {
        dashLine(trail, last.x, last.y, last.x, routeY, 3, 16, 0xfff3c4, 4, 0.9);
        dashLine(trail, last.x, routeY, chestX - 34, routeY, 3, 16, 0xfff3c4, 4, 0.9);
      } else {
        dashLine(trail, last.x, last.y, last.x, routeY, 12, 12, 0x8a5a2b, 5, 0.85);
        dashLine(trail, last.x, routeY, chestX - 34, routeY, 12, 12, 0x8a5a2b, 5, 0.85);
      }
      // dấu X "kho báu ở đây"
      var xg = this.add.graphics().setDepth(2);
      xg.lineStyle(6, 0xdc2626, 0.85);
      xg.lineBetween(chestX - 15, chestY - 13, chestX + 15, chestY + 13);
      xg.lineBetween(chestX + 15, chestY - 13, chestX - 15, chestY + 13);
      var chest = this.add.text(chestX, chestY, allDone ? '🏆' : '💰', { fontSize: '50px' }).setOrigin(0.5).setDepth(3);
      this.add.text(chestX, chestY + 38, 'KHO BÁU', {
        fontFamily: 'Baloo 2, cursive', fontSize: '15px', color: '#7c3f12', stroke: '#fff7e6', strokeThickness: 3
      }).setOrigin(0.5).setDepth(3);
      this.tweens.add({ targets: chest, y: chestY - 8, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      this.add.text(chestX - 34, chestY - 28, '✨', { fontSize: '22px' }).setOrigin(0.5).setDepth(3).setAlpha(allDone ? 1 : 0.5);
      this.add.text(chestX + 34, chestY - 20, '✨', { fontSize: '18px' }).setOrigin(0.5).setDepth(3).setAlpha(allDone ? 1 : 0.5);

      // ───── các chặng (đảo medallion) ─────
      levels.forEach(function (lv, i) {
        var p = pos[i];
        var unlocked = unlockedArr[i];
        var prog = progArr[i];
        var done = (prog.completedRuns || 0) > 0;

        var node = self.add.container(p.x, p.y).setDepth(5);

        // hào quang cho chặng đang mở (chưa hoàn thành)
        if (unlocked && !done) {
          var glow = self.add.graphics();
          glow.lineStyle(5, 0x22c55e, 0.8); glow.strokeCircle(0, 0, 42);
          node.add(glow);
          self.tweens.add({ targets: glow, alpha: 0.12, scaleX: 1.12, scaleY: 1.12, duration: 820, yoyo: true, repeat: -1 });
        }

        // đảo cát + bóng
        var island = self.add.graphics();
        island.fillStyle(0x000000, 0.12); island.fillEllipse(0, 42, 96, 26);
        island.fillStyle(0xe7c485, 1); island.fillEllipse(0, 36, 90, 30);
        island.fillStyle(0xf3dca8, 1); island.fillEllipse(0, 32, 72, 22);
        node.add(island);

        // medallion
        var col = done ? 0xf59e0b : (unlocked ? 0x22c55e : 0x9aa6b2);
        var colDark = done ? 0xb45309 : (unlocked ? 0x15803d : 0x647082);
        var med = self.add.graphics();
        med.fillStyle(0xfff3c4, 1); med.fillCircle(0, 0, 37);
        med.lineStyle(4, colDark, 1); med.strokeCircle(0, 0, 37);
        med.fillStyle(col, 1); med.fillCircle(0, 0, 30);
        med.fillStyle(0xffffff, 0.22); med.fillEllipse(0, -11, 38, 18);
        node.add(med);

        node.add(self.add.text(0, 1, String(lv.id), {
          fontFamily: 'Baloo 2, cursive', fontSize: '28px', color: '#ffffff', stroke: colDark, strokeThickness: 3
        }).setOrigin(0.5));

        // bảng gỗ tên chặng
        var bw = Math.max(96, lv.name.length * 9 + 22);
        var sign = self.add.graphics();
        sign.fillStyle(0x000000, 0.12); sign.fillRoundedRect(-bw / 2 + 2, 54, bw, 26, 8);
        sign.fillStyle(0x7c4a1e, 1); sign.fillRoundedRect(-bw / 2, 52, bw, 26, 8);
        sign.fillStyle(0xa9683a, 1); sign.fillRoundedRect(-bw / 2 + 2, 54, bw - 4, 22, 7);
        node.add(sign);
        node.add(self.add.text(0, 65, lv.name, {
          fontFamily: 'Baloo 2, cursive', fontSize: '13px', color: '#fff3e0'
        }).setOrigin(0.5));

        if (done) {
          // số sao đạt được
          node.add(self.add.text(0, -52, '⭐ ' + (prog.bestRun || 0) + '/' + (lv.gates || 0), {
            fontFamily: 'Baloo 2, cursive', fontSize: '15px', color: '#b45309', stroke: '#fff7e6', strokeThickness: 4
          }).setOrigin(0.5));
        }

        if (!unlocked) {
          node.add(self.add.image(0, 0, 'lock').setDisplaySize(30, 30));
          med.fillStyle(0x1e293b, 0.18); med.fillCircle(0, 0, 30);
        }

        if (unlocked) {
          var hit = self.add.circle(0, 0, 44).setInteractive({ useHandCursor: true });
          hit.on('pointerover', function () { self.tweens.add({ targets: node, scaleX: 1.1, scaleY: 1.1, duration: 110 }); });
          hit.on('pointerout', function () { self.tweens.add({ targets: node, scaleX: 1, scaleY: 1, duration: 110 }); });
          hit.on('pointerdown', function () {
            if (Sfx.unlock) Sfx.unlock();
            if (Sfx.gate) Sfx.gate();
            self.scene.start('Play', { levelIndex: i });
          });
          node.add(hit);
        } else {
          var hit2 = self.add.circle(0, 0, 44).setInteractive({ useHandCursor: false });
          hit2.on('pointerdown', function () {
            if (Sfx.wrong) Sfx.wrong();
            self.tweens.add({ targets: node, x: p.x - 6, duration: 50, yoyo: true, repeat: 3, onComplete: function () { node.x = p.x; } });
          });
          node.add(hit2);
        }
      });

      // ───── thanh tổng sao (ruy băng) ─────
      var ribbon = this.add.graphics().setDepth(11);
      ribbon.fillStyle(0x1e3a8a, 0.92); ribbon.fillRoundedRect(W / 2 - 160, H - 34, 320, 26, 13);
      this.add.text(W / 2, H - 21, '⭐ Tổng sao đã thu thập: ' + totalStars, {
        fontFamily: 'Baloo 2, cursive', fontSize: '15px', color: '#fff7d6'
      }).setOrigin(0.5).setDepth(12);

      sharpenTexts(this);
    }
  });

  /* ════════════════ PlayScene ════════════════ */
  var PlayScene = new Phaser.Class({
    Extends: Phaser.Scene,
    initialize: function PlayScene() { Phaser.Scene.call(this, { key: 'Play' }); },

    init: function (data) {
      var levels = (global.GameLevels && global.GameLevels.LEVELS) || [];
      this.levelIndex = data && typeof data.levelIndex === 'number' ? data.levelIndex : 0;
      this.level = levels[this.levelIndex] || levels[0];
      this.hearts = this.level.hearts || 3;
      this.maxHearts = this.hearts;
      this.starsGot = 0;
      this.coins = 0;
      this.quizActive = false;
      this.finished = false;
      this.invuln = false;
    },

    create: function () {
      var self = this;
      var level = this.level;
      var questions = (global.GameLevels && global.GameLevels.buildLevelQuestions(level)) || [];
      this.totalGates = questions.length;

      var gateSpacing = 920;
      var firstGate = 820;
      var worldW = firstGate + this.totalGates * gateSpacing + 520;
      var groundTop = H - GROUND_H;
      this.groundTop = groundTop;
      this.worldW = worldW;

      this.physics.world.setBounds(0, 0, worldW, H);
      this.cameras.main.setBounds(0, 0, worldW, H);

      // ───── nền theo chủ đề của màn ─────
      var TH = (global.GameAssets && global.GameAssets.ensureTheme)
        ? global.GameAssets.ensureTheme(this, level.theme)
        : { skyKey: 'sky', groundKey: 'ground', platKey: 'platform', fluid: 'water', dark: false };
      this.theme = TH;

      // Cảnh nền hoàn chỉnh (bức tranh vẽ theo chủ đề, parallax bằng scrollFactor)
      if (global.GameAssets && global.GameAssets.buildScenery) {
        var scn = global.GameAssets.buildScenery(this, level.theme, worldW, groundTop);
        this._bgObjects = scn.objects;
        this._bgDrift = scn.drift || [];
      } else {
        this._bgObjects = [this.add.image(0, 0, TH.skyKey).setOrigin(0, 0).setDisplaySize(W, H).setScrollFactor(0).setDepth(-20)];
      }

      // ───── nhóm vật thể & nhân vật ─────
      this.solids = this.physics.add.staticGroup();
      this.platforms = this.physics.add.staticGroup();
      this.movers = this.physics.add.group({ allowGravity: false, immovable: true });
      this.coinsGrp = this.physics.add.group({ allowGravity: false, immovable: true });
      this.spikes = this.physics.add.staticGroup();
      this.hazards = this.physics.add.group({ allowGravity: false, immovable: true });
      this.enemies = this.physics.add.group();
      this.springs = this.physics.add.staticGroup();
      this.pipes = this.physics.add.staticGroup();
      this.powerups = this.physics.add.group();
      this.gates = [];
      this._terrainDecor = [];
      this.pits = [];
      this.pipeWarps = [];
      this.starUntil = 0;
      this._warping = false;
      this._warpCd = 0;

      // người chơi (nhân vật cá nhân hóa theo avatar tài khoản)
      var HERO = (global.GameAssets && global.GameAssets.HERO) || { w: 46, h: 56, ss: 1 };
      this.player = this.physics.add.sprite(90, groundTop - 70, 'hero');
      this.player.setDisplaySize(HERO.w, HERO.h);
      this.player.setDepth(6);
      this.player.setCollideWorldBounds(true);
      this.player.body.setSize(34 * HERO.ss, 48 * HERO.ss).setOffset(6 * HERO.ss, 6 * HERO.ss);
      this.lastSafeX = 90;
      this.physics.add.collider(this.player, this.solids);
      this.physics.add.collider(this.player, this.platforms);
      this.physics.add.collider(this.player, this.movers);
      this.physics.add.collider(this.player, this.pipes);
      this.physics.add.collider(this.player, this.springs, this.bounceSpring, null, this);
      this.physics.add.collider(this.enemies, this.solids);
      this.physics.add.collider(this.enemies, this.platforms);
      this.physics.add.collider(this.enemies, this.pipes);
      this.physics.add.collider(this.powerups, this.solids);
      this.physics.add.collider(this.powerups, this.platforms);
      this.physics.add.collider(this.powerups, this.pipes);
      this.physics.add.overlap(this.player, this.enemies, this.onEnemy, null, this);
      this.physics.add.overlap(this.player, this.powerups, this.onPowerup, null, this);
      this.cameras.main.setZoom(DPR);
      this.cameras.main.startFollow(this.player, true, 0.22, 0.2);
      this.cameras.main.setFollowOffset(-60, 20);
      this.cameras.main.centerOn(this.player.x, this.player.y);

      var self2 = this;
      var GH = GROUND_H;
      function addCoin(cx, cy) {
        var c = self2.coinsGrp.create(cx, cy, 'coin');
        c.setDisplaySize(30, 30);
        c.setDepth(4); // luôn nổi trên bục/nền (tránh bị cầu thang che)
        c.body.setCircle(13, 2, 2);
        return c;
      }
      function addSolid(cx, cy, w, h, key) {
        var t = self2.solids.create(cx, cy, key || TH.groundKey || 'ground');
        t.setDisplaySize(w || 64, h || GH).refreshBody();
        return t;
      }
      function addPlat(cx, cy, w, key) {
        var k = key || TH.platKey || 'platform';
        var p = self2.platforms.create(cx, cy, k);
        p.setDisplaySize(w || 108, k === 'cloudp' ? 40 : 26).refreshBody();
        p.setDepth(1);
        return p;
      }
      function addCrate(cx, cy) {
        var c = self2.solids.create(cx, cy, 'crate');
        c.setDisplaySize(40, 40).refreshBody();
        c.setDepth(2);
        return c;
      }
      function addSpikeAt(cx, cy) {
        // chông nổi rõ + hộp va chạm canh giữa → bẫy luôn ăn khi chạm
        var sp = self2.spikes.create(cx, (cy == null ? groundTop - 18 : cy), 'spike');
        sp.setDisplaySize(48, 40).refreshBody();
        sp.body.setSize(44, 32, true);
        sp.setDepth(5);
        return sp;
      }
      function addSaw(cx, cy, range, spd) {
        // lưỡi cưa tuần tra ngang (bẫy động kiểu Mario)
        var s = self2.hazards.create(cx, cy, 'saw');
        s.setDisplaySize(46, 46);
        s.body.setSize(38, 38, true);
        s.setDepth(5);
        s._minX = cx - range; s._maxX = cx + range; s._spd = spd || 110;
        s.setVelocityX(s._spd);
        return s;
      }
      function addPit(x1, x2) { self2.pits.push({ x1: x1, x2: x2 }); }
      function addEnemy(cx) { // quái đi bộ (giẫm để hạ)
        var e = self2.enemies.create(cx, groundTop - 22, 'goomba');
        e.setDisplaySize(42, 38); e.body.setSize(34, 28, true);
        e.setDepth(5);
        e._spd = 44 + level.id * 5;
        e.setVelocityX(Math.random() < 0.5 ? -e._spd : e._spd);
        return e;
      }
      function addSpring(cx) { // lò xo nhún
        var s = self2.springs.create(cx, groundTop - 14, 'spring');
        s.setDisplaySize(46, 30).refreshBody();
        s.body.setSize(42, 22, true);
        s.setDepth(4);
        return s;
      }
      function addPipe(cx, ph, warpTo) { // ống cống (cao ph), warpTo != null → miệng đường hầm
        ph = ph || 84;
        var p = self2.pipes.create(cx, groundTop - ph / 2, 'pipe');
        p.setDisplaySize(64, ph).refreshBody();
        p.setDepth(4);
        if (warpTo != null) { p._warpTo = warpTo; self2.pipeWarps.push(p); }
        return p;
      }
      function addPower(cx, cy, kind) { // nấm / ngôi sao
        var k = kind || 'mushroom';
        var pu = self2.powerups.create(cx, cy, k === 'star' ? 'star' : 'mushroom');
        pu.setDisplaySize(k === 'star' ? 30 : 36, k === 'star' ? 30 : 34);
        pu.body.setSize(24, 24, true);
        pu.setDepth(5);
        pu._kind = k;
        if (k === 'star') { pu.setVelocity(110, -240); pu.setBounce(1, 0.7); }
        else { pu.setVelocityX(80); pu.setBounce(0, 0); }
        return pu;
      }

      // ───── các kiểu địa hình ─────
      function fSteps(fx) { // gò đất bậc cao
        for (var k = -1; k <= 1; k++) addSolid(fx + k * 64, groundTop - GH / 2, 64, GH);
        addCoin(fx - 44, groundTop - GH - 30); addCoin(fx, groundTop - GH - 30); addCoin(fx + 44, groundTop - GH - 30);
      }
      function fCrates(fx) { // thùng gỗ chồng
        addCrate(fx, groundTop - 20); addCrate(fx, groundTop - 60);
        addCrate(fx - 84, groundTop - 20);
        addCoin(fx, groundTop - 104); addCoin(fx - 84, groundTop - 64);
      }
      function fIslands(fx) { // đảo mây bay (thưởng)
        var ys = [groundTop - 92, groundTop - 140, groundTop - 92];
        for (var k = 0; k < 3; k++) {
          addPlat(fx - 92 + k * 92, ys[k], 92, 'cloudp');
          addCoin(fx - 92 + k * 92, ys[k] - 34);
        }
      }
      function fPit(fx) { // hố nước + đảo đá giữa
        addPit(fx - 96, fx + 96);
        addPlat(fx, groundTop + 8, 96, 'platform');
        addCoin(fx, groundTop - 64); addCoin(fx - 46, groundTop - 80); addCoin(fx + 46, groundTop - 80);
      }
      function fStairs(fx) { // cầu thang bay (xu nổi rõ phía trên mỗi bậc)
        for (var k = 0; k < 3; k++) {
          var px = fx - 92 + k * 84, py = groundTop - 58 - k * 42;
          addPlat(px, py, 84);
          addCoin(px, py - 44);
        }
      }
      function fMovers(fx) { // bục thang máy + xu trên cao
        var m = self2.movers.create(fx, groundTop - 80, 'platform');
        m.setDisplaySize(96, 24);
        m.body.setSize(110, 28);
        m.setDepth(1);
        m._minY = groundTop - 184; m._maxY = groundTop - 80; m._spd = 70;
        m.setVelocityY(-m._spd);
        addCoin(fx, groundTop - 150); addCoin(fx, groundTop - 180);
      }
      function fSpikes(fx) { // bãi chông + xu thưởng phía trên (nhảy qua để nhặt)
        var n = level.id >= 6 ? 3 : 2;
        var start = fx - (n - 1) * 23;
        for (var k = 0; k < n; k++) addSpikeAt(start + k * 46);
        addCoin(fx, groundTop - 114); addCoin(fx - 40, groundTop - 100); addCoin(fx + 40, groundTop - 100);
      }
      function fSaw(fx) { // lưỡi cưa tuần tra ngang trên mặt đất → canh nhịp băng qua
        addSaw(fx, groundTop - 24, 96, 120 + level.id * 8);
        addCoin(fx, groundTop - 110); addCoin(fx - 78, groundTop - 80); addCoin(fx + 78, groundTop - 80);
      }
      function fSawAir(fx) { // lưỡi cưa treo lơ lửng chắn đường nhảy
        addSaw(fx, groundTop - 96, 70, 130);
        addPlat(fx - 120, groundTop - 44, 80); addPlat(fx + 120, groundTop - 44, 80);
        addCoin(fx, groundTop - 150);
      }
      function fSpikeGap(fx) { // hai cụm chông, nhảy qua khe ở giữa
        addSpikeAt(fx - 92); addSpikeAt(fx - 46);
        addSpikeAt(fx + 46); addSpikeAt(fx + 92);
        addCoin(fx, groundTop - 118); addCoin(fx, groundTop - 150);
      }
      function fTower(fx) { // tháp thùng gắn chông trên đỉnh → nhảy vượt cẩn thận
        addCrate(fx, groundTop - 20); addCrate(fx, groundTop - 60);
        addSpikeAt(fx, groundTop - 100);
        addCoin(fx - 70, groundTop - 70); addCoin(fx + 70, groundTop - 130);
      }
      function fGoombas(fx) { // đàn quái đi bộ (giẫm để hạ)
        var n = level.id >= 5 ? 3 : 2;
        for (var k = 0; k < n; k++) addEnemy(fx - (n - 1) * 40 + k * 80);
        addCoin(fx, groundTop - 112); addCoin(fx - 60, groundTop - 92); addCoin(fx + 60, groundTop - 92);
      }
      function fSpringJump(fx) { // lò xo nhún tới cụm xu trên cao
        addSpring(fx);
        addCoin(fx, groundTop - 150); addCoin(fx, groundTop - 196); addCoin(fx, groundTop - 240);
      }
      function fPipe(fx) { // ống cống đôi — nhấn ▼ để chui đường hầm bí mật
        addPipe(fx - 150, 84, fx + 220);
        addPipe(fx + 150, 96, null);
        addCoin(fx + 220, groundTop - 120); addCoin(fx + 188, groundTop - 150); addCoin(fx + 252, groundTop - 150);
      }
      function fPipeRow(fx) { // hàng ống cống cao thấp (nhảy vượt) + quái
        addPipe(fx - 96, 70, null); addPipe(fx + 8, 112, null); addPipe(fx + 112, 84, null);
        addEnemy(fx - 44);
        addCoin(fx - 44, groundTop - 150); addCoin(fx + 60, groundTop - 172);
      }
      function fPower(fx) { // bục thưởng có nấm (đôi khi ngôi sao)
        addPlat(fx, groundTop - 70, 100);
        addPower(fx, groundTop - 100, Math.random() < 0.28 ? 'star' : 'mushroom');
        addCoin(fx - 72, groundTop - 60); addCoin(fx + 72, groundTop - 60);
      }
      var FEATURES = {
        steps: fSteps, crates: fCrates, islands: fIslands, pit: fPit, stairs: fStairs,
        movers: fMovers, spikes: fSpikes, saw: fSaw, sawair: fSawAir, spikegap: fSpikeGap, tower: fTower,
        goombas: fGoombas, spring: fSpringJump, pipe: fPipe, piperow: fPipeRow, power: fPower
      };
      var FOOT = {
        steps: 250, crates: 220, islands: 300, pit: 270, stairs: 300, movers: 230, spikes: 210,
        saw: 250, sawair: 300, spikegap: 240, tower: 210,
        goombas: 280, spring: 200, pipe: 440, piperow: 330, power: 250
      };
      var STACKABLE = { spikes: 1, crates: 1, goombas: 1, saw: 1, spikegap: 1, steps: 1 };

      // bộ địa hình theo độ khó (càng cao càng nhiều kiểu & bẫy)
      function buildPool(id) {
        var pool = ['islands', 'steps', 'crates', 'goombas', 'spring', 'power'];
        if (id >= 2) pool.push('spikes', 'saw', 'goombas');
        if (id >= 3) pool.push('pit', 'spikegap', 'pipe');
        if (id >= 4) pool.push('stairs', 'tower', 'saw', 'piperow');
        if (id >= 5) pool.push('pit', 'sawair', 'goombas', 'pipe');
        if (id >= 6) pool.push('movers', 'spikes', 'spikegap', 'piperow');
        if (id >= 7) pool.push('saw', 'tower', 'sawair', 'goombas');
        return pool;
      }
      function shuffleArr(arr) {
        arr = arr.slice();
        for (var x = arr.length - 1; x > 0; x--) {
          var y = Math.floor(Math.random() * (x + 1));
          var tmp = arr[x]; arr[x] = arr[y]; arr[y] = tmp;
        }
        return arr;
      }
      var POOL = buildPool(level.id);
      var bag = [], lastF = null;
      function nextFeature() {
        if (!bag.length) bag = shuffleArr(POOL);
        var f = bag.pop();
        if (f === lastF && bag.length) { var alt = bag.pop(); bag.push(f); f = alt; } // tránh lặp liền nhau
        lastF = f;
        return f;
      }

      // ───── cổng câu hỏi + cụm xu thưởng dẫn tới cổng ─────
      var GATE_MARGIN = 178;
      var arcY = [54, 96, 118, 96, 54];
      var arcX = [-72, -36, 0, 36, 72];
      var gateXs = [];
      for (var gi = 0; gi < this.totalGates; gi++) {
        var gateX = firstGate + gi * gateSpacing;
        gateXs.push(gateX);
        for (var a = 0; a < arcX.length; a++) addCoin(gateX - 120 + arcX[a], groundTop - arcY[a]);
        var gate = this.physics.add.staticImage(gateX, groundTop - 40, 'padlock');
        gate.setDisplaySize(56, 72).refreshBody();
        gate.body.setSize(40, 64);
        gate.setDepth(3);
        gate.questionData = questions[gi];
        gate.answered = false;
        this.gates.push(gate);
      }
      this.gateCollider = this.physics.add.collider(this.player, this.gates);
      var flagX = firstGate + this.totalGates * gateSpacing + 200;

      // ───── dòng địa hình liên tục, không lặp mô-típ, né vùng cổng/cờ ─────
      function inGateZone(x) {
        for (var z = 0; z < gateXs.length; z++) if (Math.abs(x - gateXs[z]) < GATE_MARGIN) return true;
        return x > flagX - 150;
      }
      function spanHitsGate(a, b) {
        for (var z = 0; z < gateXs.length; z++) if (a < gateXs[z] + GATE_MARGIN && b > gateXs[z] - GATE_MARGIN) return true;
        return b > flagX - 150;
      }
      function jumpPastZone(x) {
        for (var z = 0; z < gateXs.length; z++) if (x > gateXs[z] - GATE_MARGIN && x < gateXs[z] + GATE_MARGIN) return gateXs[z] + GATE_MARGIN + 30;
        return x + 90;
      }
      var fx = 320, guard = 0;
      while (fx < flagX - 240 && guard++ < 600) {
        if (inGateZone(fx)) { fx = jumpPastZone(fx); continue; }
        var fn = nextFeature();
        var fw = FOOT[fn] || 240;
        if (spanHitsGate(fx - fw / 2, fx + fw / 2)) { fx = jumpPastZone(fx + fw / 2); continue; }
        // đôi khi xếp cùng một loại nhiều lần liền nhau thành cụm
        var reps = (STACKABLE[fn] && Math.random() < 0.34) ? (2 + (Math.random() < 0.35 ? 1 : 0)) : 1;
        for (var r = 0; r < reps; r++) {
          if (inGateZone(fx) || spanHitsGate(fx - fw / 2, fx + fw / 2)) break;
          (FEATURES[fn] || fSteps)(fx);
          fx += fw + (reps > 1 ? 18 : 0);
        }
        fx += 44 + Math.floor(Math.random() * 78);
      }

      // ───── mặt đất (chừa hố) + nước ─────
      function inPit(x) {
        for (var pi = 0; pi < self2.pits.length; pi++) {
          if (x > self2.pits[pi].x1 && x < self2.pits[pi].x2) return true;
        }
        return false;
      }
      for (var gx = 0; gx < worldW; gx += 64) {
        var cx = gx + 32;
        if (inPit(cx)) continue;
        addSolid(cx, groundTop + GH / 2, 64, GH);
      }
      var fluidKey = (TH.fluid && self2.textures.exists(TH.fluid)) ? TH.fluid : 'water';
      this.pits.forEach(function (p) {
        for (var wx = p.x1; wx < p.x2; wx += 60) {
          self2._terrainDecor.push(self2.add.image(wx + 30, groundTop + 22, fluidKey).setDisplaySize(62, 46).setDepth(-2));
        }
      });

      // xu xoay nhẹ cho sinh động
      this.tweens.add({
        targets: this.coinsGrp.getChildren(),
        scaleX: { from: 1, to: 0.25 },
        duration: 520, yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
      });

      // cờ kết thúc
      this.flag = this.physics.add.staticImage(flagX, groundTop - 36, 'flag');
      this.flag.setDisplaySize(40, 70).refreshBody();
      this.flag.setDepth(3);

      // va chạm vật phẩm
      this.physics.add.overlap(this.player, this.coinsGrp, this.collectCoin, null, this);
      this.physics.add.overlap(this.player, this.spikes, this.hitSpike, null, this);
      this.physics.add.overlap(this.player, this.hazards, this.hitSpike, null, this);
      this.physics.add.overlap(this.player, this.flag, this.reachFlag, null, this);

      // input
      this.cursors = this.input.keyboard.createCursorKeys();
      this.keySpace = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
      this.keyEsc = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);

      this.buildHud();

      // Camera riêng cho HUD: không bám theo nhân vật, giữ toạ độ logic & nét chữ
      var worldObjects = (this._bgObjects || []).concat(
        this.solids.getChildren(),
        this.platforms.getChildren(),
        this.movers.getChildren(),
        this.hazards.getChildren(),
        this.enemies.getChildren(),
        this.springs.getChildren(),
        this.pipes.getChildren(),
        this.powerups.getChildren(),
        this.coinsGrp.getChildren(),
        this.spikes.getChildren(),
        this._terrainDecor || [],
        this.gates,
        [this.player, this.flag]
      );
      this.hudCam = this.cameras.add(0, 0, this.scale.width, this.scale.height);
      this.hudCam.setZoom(DPR);
      this.hudCam.centerOn(W / 2, H / 2);
      this.hudCam.ignore(worldObjects);
      this.cameras.main.ignore(this.hudObjects);
      sharpenTexts(this);

      GameUI.hide();
    },

    buildHud: function () {
      this.hudObjects = [];
      var hud = this.hudObjects;

      // panel nền HUD (góc trái: tim, góc phải: sao)
      var panel = this.add.graphics().setScrollFactor(0).setDepth(48);
      panel.fillStyle(0x1e293b, 0.32);
      panel.fillRoundedRect(10, 10, 22 + this.hearts * 34, 40, 14);
      panel.fillRoundedRect(W - 150, 10, 140, 40, 14);
      hud.push(panel);

      this.heartIcons = [];
      for (var i = 0; i < this.hearts; i++) {
        var hImg = this.add.image(34 + i * 34, 30, 'heart').setScrollFactor(0).setDepth(50).setDisplaySize(26, 26);
        this.heartIcons.push(hImg);
        hud.push(hImg);
      }
      hud.push(this.add.image(W - 128, 30, 'coin').setScrollFactor(0).setDepth(50).setDisplaySize(24, 24));
      this.starText = this.add.text(W - 110, 30, '0/' + this.totalGates, {
        fontFamily: 'Baloo 2, cursive', fontSize: '22px', color: '#fff7d6'
      }).setOrigin(0, 0.5).setScrollFactor(0).setDepth(50);
      hud.push(this.starText);

      // tên màn ở giữa (pill)
      var titlePanel = this.add.graphics().setScrollFactor(0).setDepth(48);
      titlePanel.fillStyle(0x2563eb, 0.85);
      var tw = Math.max(160, this.level.name.length * 13 + 40);
      titlePanel.fillRoundedRect(W / 2 - tw / 2, 12, tw, 34, 17);
      hud.push(titlePanel);
      hud.push(this.add.text(W / 2, 29, this.level.name, {
        fontFamily: 'Baloo 2, cursive', fontSize: '19px', color: '#ffffff'
      }).setOrigin(0.5).setScrollFactor(0).setDepth(50));

      // (Nút âm thanh / chơi lại / bản đồ nằm ở lớp DOM overlay — xem wireGameControls)
    },

    updateHud: function () {
      for (var i = 0; i < this.heartIcons.length; i++) {
        this.heartIcons[i].setAlpha(i < this.hearts ? 1 : 0.22);
      }
      if (this.starText) this.starText.setText(this.starsGot + '/' + this.totalGates);
    },

    collectCoin: function (player, coin) {
      coin.disableBody(true, true);
      this.coins++;
      if (Sfx.coin) Sfx.coin();
    },

    fallRespawn: function () {
      if (this.finished || this.invuln) return;
      var alive = this.loseHeart();
      if (alive) {
        this.player.setVelocity(0, 0);
        var rx = Phaser.Math.Clamp(this.lastSafeX || 90, 60, (this.worldW || W) - 60);
        this.player.setPosition(rx, this.groundTop - 100);
      }
    },

    hitSpike: function () {
      if (this.invuln || this.quizActive || this.finished) return;
      if (this.time.now < this.starUntil) return; // đang bất tử
      this.loseHeart();
      // bật ngược lại một chút
      this.player.setVelocity(this.player.flipX ? 220 : -220, -260);
    },

    bounceSpring: function (player, spring) {
      // chỉ bật khi rơi xuống chạm mặt trên lò xo
      if (player.body.velocity.y >= 0 && player.y < spring.y) {
        player.setVelocityY(-1180);
        if (Sfx.jump) Sfx.jump();
        this.tweens.add({ targets: spring, scaleY: 0.6, yoyo: true, duration: 90 });
      }
    },

    onEnemy: function (player, enemy) {
      if (this.finished || this.quizActive || this._warping) return;
      var starActive = this.time.now < this.starUntil;
      var stomp = player.body.velocity.y > 0 && player.y < enemy.y - 6;
      if (starActive || stomp) {
        // hạ quái
        enemy.disableBody(true, true);
        if (stomp && !starActive) player.setVelocityY(-460);
        this.coins += 1;
        if (Sfx.coin) Sfx.coin();
      } else if (!this.invuln) {
        this.loseHeart();
        player.setVelocity(player.x < enemy.x ? -240 : 240, -260);
      }
    },

    onPowerup: function (player, pu) {
      var kind = pu._kind;
      pu.disableBody(true, true);
      if (kind === 'star') {
        this.starUntil = this.time.now + 7000;
        if (Sfx.win) Sfx.win();
      } else {
        if (this.hearts < this.maxHearts) { this.hearts += 1; this.updateHud(); }
        else { this.coins += 3; }
        this.grow();
        if (Sfx.correct) Sfx.correct();
      }
    },

    grow: function () {
      var p = this.player, self = this;
      this.tweens.add({ targets: p, scaleX: p.scaleX * 1.25, scaleY: p.scaleY * 1.25,
        yoyo: true, duration: 200, ease: 'Back.easeOut',
        onComplete: function () { self.player.setScale(self.player.scaleX, self.player.scaleY); } });
    },

    warpPipe: function (pipe) {
      if (this._warping) return;
      this._warping = true;
      this._warpCd = this.time.now + 1400;
      var self = this, p = this.player, tx = pipe._warpTo;
      p.setVelocity(0, 0);
      if (p.body) p.body.enable = false;
      if (Sfx.gate) Sfx.gate();
      this.tweens.add({ targets: p, y: p.y + 46, alpha: 0, duration: 260, ease: 'Quad.easeIn',
        onComplete: function () {
          p.setPosition(tx, self.groundTop - 90);
          // thưởng đường hầm bí mật
          for (var k = 0; k < 4; k++) {
            var c = self.coinsGrp.create(tx - 60 + k * 40, self.groundTop - 120, 'coin');
            c.setDisplaySize(30, 30).setDepth(4); c.body.setCircle(13, 2, 2);
          }
          if (Sfx.coin) Sfx.coin();
          self.tweens.add({ targets: p, alpha: 1, duration: 200,
            onComplete: function () { if (p.body) p.body.enable = true; self._warping = false; } });
        } });
    },

    loseHeart: function () {
      this.hearts = Math.max(0, this.hearts - 1);
      this.updateHud();
      if (Sfx.hurt) Sfx.hurt();
      this.invuln = true;
      var self = this;
      this.tweens.add({ targets: this.player, alpha: 0.3, yoyo: true, repeat: 3, duration: 120,
        onComplete: function () { self.player.setAlpha(1); self.invuln = false; } });
      if (this.hearts <= 0) this.gameOver();
      return this.hearts > 0;
    },

    gameOver: function () {
      if (this.finished) return;
      this.finished = true;
      stopSpeak();
      GameUI.hide();
      if (Sfx.lose) Sfx.lose();
      var self = this;
      this.time.delayedCall(400, function () {
        self.scene.start('Result', {
          levelIndex: self.levelIndex, win: false, stars: self.starsGot, total: self.totalGates
        });
      });
    },

    nearestUnansweredGate: function () {
      var px = this.player.x, best = null, bestDx = 9999;
      for (var i = 0; i < this.gates.length; i++) {
        var g = this.gates[i];
        if (g.answered) continue;
        var dx = g.x - px;
        if (dx > -40 && dx < bestDx) { bestDx = dx; best = g; }
      }
      return { gate: best, dx: bestDx };
    },

    openGate: function (gate) {
      gate.answered = true;
      this.starsGot++;
      this.updateHud();
      if (Sfx.gate) Sfx.gate();
      var self = this;
      this.tweens.add({
        targets: gate, y: gate.y - 110, alpha: 0, duration: 420, ease: 'Back.easeIn',
        onComplete: function () { if (gate.body) gate.body.enable = false; gate.destroy(); }
      });
    },

    askQuestion: function (gate) {
      if (this.quizActive || gate.answered) return;
      this.quizActive = true;
      this.player.setVelocityX(0);
      this.scene.pause();
      var self = this;
      GameUI.show(gate.questionData, {
        onCorrect: function () {
          self.quizActive = false;
          self.scene.resume();
          self.openGate(gate);
        },
        onWrong: function () {
          var alive = self.loseHeart();
          if (!alive) {
            self.quizActive = false;
            self.scene.resume();
            // gameOver đã gọi trong loseHeart
          }
          return alive;
        }
      });
    },

    reachFlag: function () {
      if (this.finished || this.quizActive) return;
      // chỉ thắng khi đã mở hết cổng (gần như chắc chắn vì cổng chặn đường)
      this.finished = true;
      stopSpeak();
      if (Sfx.win) Sfx.win();
      var self = this;
      // lưu tiến độ
      if (global.GameProgress) {
        global.GameProgress.saveLevelResult(this.level, {
          stars: this.starsGot, total: this.totalGates, finished: true
        });
      }
      this.tweens.add({ targets: this.player, y: this.player.y - 30, yoyo: true, duration: 200, repeat: 2 });
      this.time.delayedCall(700, function () {
        self.scene.start('Result', {
          levelIndex: self.levelIndex, win: true, stars: self.starsGot, total: self.totalGates
        });
      });
    },

    update: function () {
      // lớp nền xa trôi nhẹ cho sinh động (chạy cả khi đang mở câu hỏi)
      if (this._bgDrift) {
        for (var di = 0; di < this._bgDrift.length; di++) {
          this._bgDrift[di].obj.tilePositionX += this._bgDrift[di].dx;
        }
      }
      if (this.finished || this.quizActive) return;
      var p = this.player, speed = this.level.speed || 260;

      // bục thang máy chạy lên/xuống
      var movers = this.movers ? this.movers.getChildren() : [];
      for (var mi = 0; mi < movers.length; mi++) {
        var m = movers[mi], sp = m._spd || 55;
        if (m.y <= m._minY && m.body.velocity.y < 0) m.setVelocityY(sp);
        else if (m.y >= m._maxY && m.body.velocity.y > 0) m.setVelocityY(-sp);
      }

      // lưỡi cưa: tuần tra ngang + quay tròn
      var saws = this.hazards ? this.hazards.getChildren() : [];
      for (var si = 0; si < saws.length; si++) {
        var s = saws[si], ss = s._spd || 110;
        if (s.x <= s._minX && s.body.velocity.x < 0) s.setVelocityX(ss);
        else if (s.x >= s._maxX && s.body.velocity.x > 0) s.setVelocityX(-ss);
        s.angle += 12;
      }

      // quái đi bộ: quay đầu khi chạm tường, rơi xuống hố thì xoá
      var enemies = this.enemies ? this.enemies.getChildren() : [];
      for (var ei = 0; ei < enemies.length; ei++) {
        var e = enemies[ei];
        if (!e.active) continue;
        if (e.body.blocked.left) { e.setVelocityX(e._spd); e.setFlipX(true); }
        else if (e.body.blocked.right) { e.setVelocityX(-e._spd); e.setFlipX(false); }
        else if (e.body.velocity.x === 0) e.setVelocityX(e._spd);
        if (e.y > this.groundTop + 80) e.disableBody(true, true);
      }

      // power-up (nấm) trượt và quay đầu khi chạm tường
      var pups = this.powerups ? this.powerups.getChildren() : [];
      for (var pi2 = 0; pi2 < pups.length; pi2++) {
        var pu = pups[pi2];
        if (!pu.active || pu._kind === 'star') continue;
        if (pu.body.blocked.left) pu.setVelocityX(80);
        else if (pu.body.blocked.right) pu.setVelocityX(-80);
      }

      // hiệu ứng bất tử (ngôi sao): nhân vật nhấp nháy màu
      if (this.time.now < this.starUntil) {
        p.setTint(((this.time.now / 90) | 0) % 2 ? 0xffe14a : 0xff7ae0);
      } else if (this._wasStar) {
        p.clearTint();
      }
      this._wasStar = this.time.now < this.starUntil;

      // đang chui ống → khoá điều khiển
      if (this._warping) { return; }

      // nhấn xuống trên miệng ống cống → chui đường hầm bí mật
      var downPressed = this.cursors.down.isDown || touch.down;
      if (downPressed && this.time.now > this._warpCd && (p.body.blocked.down || p.body.touching.down)) {
        for (var wi = 0; wi < this.pipeWarps.length; wi++) {
          var wp = this.pipeWarps[wi];
          if (Math.abs(p.x - wp.x) < 30 && p.y < this.groundTop - 18) { this.warpPipe(wp); break; }
        }
      }

      // rơi xuống hố → mất tim, hồi sinh ở chỗ an toàn
      if (p.y > this.groundTop + 30) { this.fallRespawn(); return; }
      if (p.body.blocked.down || p.body.touching.down) this.lastSafeX = p.x;
      var left = this.cursors.left.isDown || touch.left;
      var right = this.cursors.right.isDown || touch.right;
      var jumpPressed = Phaser.Input.Keyboard.JustDown(this.cursors.up) ||
        Phaser.Input.Keyboard.JustDown(this.keySpace) || touch.jumpQueued;
      touch.jumpQueued = false;

      if (Phaser.Input.Keyboard.JustDown(this.keyEsc)) { stopSpeak(); this.scene.start('LevelSelect'); return; }

      if (left && !right) { p.setVelocityX(-speed); p.setFlipX(true); }
      else if (right && !left) { p.setVelocityX(speed); p.setFlipX(false); }
      else { p.setVelocityX(0); }

      var onFloor = p.body.blocked.down || p.body.touching.down;
      if (jumpPressed && onFloor) { p.setVelocityY(-720); if (Sfx.jump) Sfx.jump(); }
      // nhảy biến thiên kiểu Mario: nhả nút sớm → nhảy ngắn, rơi xuống nhanh hơn
      var jumpHeld = this.cursors.up.isDown || this.keySpace.isDown || touch.jumpHeld;
      if (!jumpHeld && p.body.velocity.y < -240) p.setVelocityY(-240);
      if (p.body.velocity.y > 0) p.body.velocity.y += 32; // tăng tốc rơi cho dứt khoát

      // kích hoạt câu hỏi khi tới gần cổng chưa trả lời
      var near = this.nearestUnansweredGate();
      if (near.gate && near.dx < 58) {
        this.askQuestion(near.gate);
      }
    }
  });

  /* ════════════════ ResultScene ════════════════ */
  var ResultScene = new Phaser.Class({
    Extends: Phaser.Scene,
    initialize: function ResultScene() { Phaser.Scene.call(this, { key: 'Result' }); },
    init: function (data) { this.data2 = data || {}; },
    create: function () {
      var self = this;
      var d = this.data2;
      var levels = (global.GameLevels && global.GameLevels.LEVELS) || [];
      var win = !!d.win;
      fitStaticCamera(this);
      this.cameras.main.setBackgroundColor(win ? '#bbf7d0' : '#fecdd3');

      var panel = this.add.graphics();
      panel.fillStyle(0xffffff, 0.96);
      panel.fillRoundedRect(W / 2 - 260, 96, 520, 350, 24);
      panel.lineStyle(4, win ? 0x10b981 : 0xf43f5e, 1);
      panel.strokeRoundedRect(W / 2 - 260, 96, 520, 350, 24);

      this.add.image(W / 2, 178, win ? 'trophy' : 'sad').setDisplaySize(96, 96);
      this.add.text(W / 2, 248, win ? 'Hoàn thành!' : 'Cố lên nhé!', {
        fontFamily: 'Baloo 2, cursive', fontSize: '36px', color: win ? '#059669' : '#e11d48'
      }).setOrigin(0.5);
      this.add.text(W / 2, 292, win
        ? ('Bé đã trả lời đúng ⭐ ' + (d.stars || 0) + '/' + (d.total || 0) + ' câu!')
        : ('Bé trả lời đúng ' + (d.stars || 0) + '/' + (d.total || 0) + ' câu. Thử lại nào!'), {
        fontFamily: 'Nunito, sans-serif', fontSize: '17px', color: '#334155'
      }).setOrigin(0.5);

      var hasNext = win && levels[d.levelIndex + 1];
      var btns = [];
      if (hasNext) btns.push({ label: 'Màn tiếp ▶', color: 0x10b981, act: function () { self.scene.start('Play', { levelIndex: d.levelIndex + 1 }); } });
      btns.push({ label: win ? 'Chơi lại' : 'Thử lại', color: 0x3b82f6, act: function () { self.scene.start('Play', { levelIndex: d.levelIndex }); } });
      btns.push({ label: 'Bản đồ', color: 0x8b5cf6, act: function () { self.scene.start('LevelSelect'); } });

      var bw = 150, gap = 16;
      var totalW = btns.length * bw + (btns.length - 1) * gap;
      var bx = W / 2 - totalW / 2;
      btns.forEach(function (b) {
        var cx = bx + bw / 2, cy = 392;
        var g = self.add.graphics();
        g.fillStyle(b.color, 1);
        g.fillRoundedRect(bx, cy - 24, bw, 48, 14);
        var label = self.add.text(cx, cy, b.label, {
          fontFamily: 'Baloo 2, cursive', fontSize: '20px', color: '#ffffff'
        }).setOrigin(0.5);
        var hit = self.add.rectangle(cx, cy, bw, 48).setInteractive({ useHandCursor: true });
        hit.on('pointerover', function () { label.setScale(1.08); });
        hit.on('pointerout', function () { label.setScale(1); });
        hit.on('pointerdown', function () { if (Sfx.unlock) Sfx.unlock(); b.act(); });
        bx += bw + gap;
      });

      sharpenTexts(this);
    }
  });

  /* ════════════════ Khởi tạo game ════════════════ */
  function boot() {
    var mount = document.getElementById('gameMount');
    if (!mount) { console.error('[game-core] thiếu #gameMount'); return; }
    GameUI.init();
    wireTouchControls();
    wireGameControls();

    var config = {
      type: Phaser.AUTO,
      parent: 'gameMount',
      width: W * DPR,
      height: H * DPR,
      backgroundColor: '#7ec0ee',
      pixelArt: false,
      render: { antialias: true, roundPixels: false },
      scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
      physics: { default: 'arcade', arcade: { gravity: { y: 1900 }, debug: false } },
      scene: [BootScene, LevelSelectScene, PlayScene, ResultScene]
    };
    global.__kidGame = new Phaser.Game(config);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})(window);
