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
  var DPR = Math.max(1, Math.min(3, Math.round(global.devicePixelRatio || 1)));
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
  var touch = { left: false, right: false, jumpQueued: false, jumpHeld: false };

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
    bind('jump', function () { touch.jumpQueued = true; touch.jumpHeld = true; }, function () { touch.jumpHeld = false; });
  }

  /* ════════════════ BootScene ════════════════ */
  var BootScene = new Phaser.Class({
    Extends: Phaser.Scene,
    initialize: function BootScene() { Phaser.Scene.call(this, { key: 'Boot' }); },
    create: function () {
      if (global.GameAssets) global.GameAssets.createTextures(this);
      this.scene.start('LevelSelect');
    }
  });

  /* ════════════════ LevelSelectScene ════════════════ */
  var LevelSelectScene = new Phaser.Class({
    Extends: Phaser.Scene,
    initialize: function LevelSelectScene() { Phaser.Scene.call(this, { key: 'LevelSelect' }); },
    create: function () {
      var self = this;
      fitStaticCamera(this);
      // nền trời + đồi
      if (this.textures.exists('sky')) this.add.image(0, 0, 'sky').setOrigin(0, 0).setDisplaySize(W, H).setDepth(-20);
      else this.cameras.main.setBackgroundColor('#7ec0ee');
      if (this.textures.exists('hill2')) {
        this.add.image(220, H + 10, 'hill2').setOrigin(0.5, 1).setDepth(-15).setDisplaySize(520, 250);
        this.add.image(720, H + 10, 'hill2').setOrigin(0.5, 1).setDepth(-15).setDisplaySize(520, 250);
        this.add.image(W / 2, H + 6, 'hill').setOrigin(0.5, 1).setDepth(-12).setDisplaySize(460, 200).setAlpha(0.95);
      }

      this.add.text(W / 2, 42, 'Cuộc phiêu lưu học tập', {
        fontFamily: 'Baloo 2, cursive', fontSize: '34px', color: '#ffffff', stroke: '#2563eb', strokeThickness: 6
      }).setOrigin(0.5);
      this.add.text(W / 2, 78, 'Chọn màn chơi — trả lời đúng để mở màn tiếp theo!', {
        fontFamily: 'Nunito, sans-serif', fontSize: '15px', color: '#1e3a8a'
      }).setOrigin(0.5);

      var levels = (global.GameLevels && global.GameLevels.LEVELS) || [];
      var GP = global.GameProgress;
      var totalStars = 0;

      var cols = 2, cardW = 400, cardH = 84, gapX = 36, gapY = 20;
      var startX = (W - (cols * cardW + (cols - 1) * gapX)) / 2;
      var startY = 116;

      levels.forEach(function (lv, i) {
        var col = i % cols, row = Math.floor(i / cols);
        var x = startX + col * (cardW + gapX);
        var y = startY + row * (cardH + gapY);
        var unlocked = GP ? GP.isLevelUnlocked(lv.id) : (lv.id === 1);
        var prog = GP ? GP.getLevelProgress(lv.id) : { totalStars: 0, completedRuns: 0, bestRun: 0 };
        totalStars += (prog.totalStars || 0);

        var c = self.add.container(x, y);
        var bg = self.add.graphics();
        bg.fillStyle(unlocked ? 0xffffff : 0xcbd5e1, unlocked ? 0.96 : 0.7);
        bg.fillRoundedRect(0, 0, cardW, cardH, 16);
        bg.lineStyle(3, unlocked ? 0x10b981 : 0x94a3b8, 1);
        bg.strokeRoundedRect(0, 0, cardW, cardH, 16);
        c.add(bg);

        // số màn
        var badge = self.add.graphics();
        badge.fillStyle(unlocked ? 0x10b981 : 0x94a3b8, 1);
        badge.fillCircle(44, cardH / 2, 26);
        c.add(badge);
        c.add(self.add.text(44, cardH / 2, String(lv.id), {
          fontFamily: 'Baloo 2, cursive', fontSize: '26px', color: '#ffffff'
        }).setOrigin(0.5));

        // tên màn
        c.add(self.add.text(86, 22, lv.name, {
          fontFamily: 'Baloo 2, cursive', fontSize: '21px', color: unlocked ? '#1e293b' : '#64748b'
        }));

        if (unlocked) {
          var done = (prog.completedRuns || 0) > 0;
          var sub = done ? ('✔ Hoàn thành · ⭐ ' + (prog.bestRun || 0) + '/' + (lv.gates || 0))
                         : ('Sẵn sàng · ' + (lv.gates || 0) + ' câu hỏi');
          c.add(self.add.text(86, 52, sub, {
            fontFamily: 'Nunito, sans-serif', fontSize: '14px', color: done ? '#059669' : '#475569'
          }));
          // vùng bấm
          var hit = self.add.rectangle(cardW / 2, cardH / 2, cardW, cardH).setInteractive({ useHandCursor: true });
          hit.on('pointerover', function () { c.setScale(1.03); });
          hit.on('pointerout', function () { c.setScale(1); });
          hit.on('pointerdown', function () {
            if (Sfx.unlock) Sfx.unlock();
            if (Sfx.gate) Sfx.gate();
            self.scene.start('Play', { levelIndex: i });
          });
          c.add(hit);
        } else {
          c.add(self.add.image(cardW - 40, cardH / 2, 'lock').setDisplaySize(34, 34));
          c.add(self.add.text(86, 52, 'Hoàn thành màn trước để mở', {
            fontFamily: 'Nunito, sans-serif', fontSize: '13px', color: '#64748b'
          }));
        }
      });

      this.add.text(W / 2, H - 22, 'Tổng sao đã thu thập: ⭐ ' + totalStars, {
        fontFamily: 'Nunito, sans-serif', fontSize: '16px', color: '#ffffff', stroke: '#1e3a8a', strokeThickness: 4
      }).setOrigin(0.5);

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

      var gateSpacing = 560;
      var firstGate = 700;
      var worldW = firstGate + this.totalGates * gateSpacing + 440;
      var groundTop = H - GROUND_H;
      this.groundTop = groundTop;

      this.physics.world.setBounds(0, 0, worldW, H);
      this.cameras.main.setBounds(0, 0, worldW, H);

      // nền trời gradient + đồi núi parallax + mây
      var bg = [];
      bg.push(this.add.image(0, 0, 'sky').setOrigin(0, 0).setDisplaySize(W, H).setScrollFactor(0).setDepth(-20));
      for (var hx = 0; hx < worldW + 400; hx += 380) {
        bg.push(this.add.image(hx, groundTop + 30, 'hill2').setOrigin(0.5, 1).setScrollFactor(0.25).setDepth(-15).setDisplaySize(440, 220));
      }
      for (var hx2 = 160; hx2 < worldW + 400; hx2 += 330) {
        bg.push(this.add.image(hx2, groundTop + 24, 'hill').setOrigin(0.5, 1).setScrollFactor(0.5).setDepth(-12).setAlpha(0.95).setDisplaySize(360, 180));
      }
      for (var m = 0; m < Math.ceil(worldW / 340); m++) {
        bg.push(this.add.image(120 + m * 340, 80 + (m % 2) * 44, 'cloud')
          .setScrollFactor(0.35).setAlpha(0.92).setDisplaySize(100, 62).setDepth(-10));
      }
      this._bgObjects = bg;

      // mặt đất liền (tile)
      this.solids = this.physics.add.staticGroup();
      for (var gx = 0; gx < worldW; gx += 64) {
        var t = this.solids.create(gx + 32, groundTop + GROUND_H / 2, 'ground');
        t.setDisplaySize(64, GROUND_H).refreshBody();
      }

      // người chơi
      this.player = this.physics.add.sprite(90, groundTop - 70, 'hero');
      this.player.setCollideWorldBounds(true);
      this.player.body.setSize(34, 48).setOffset(6, 6);
      this.physics.add.collider(this.player, this.solids);
      this.cameras.main.setZoom(DPR);
      this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
      this.cameras.main.centerOn(this.player.x, this.player.y);

      // nhóm vật thể
      this.platforms = this.physics.add.staticGroup();
      this.coinsGrp = this.physics.add.group({ allowGravity: false, immovable: true });
      this.spikes = this.physics.add.staticGroup();
      this.gates = [];

      var self2 = this;
      function addCoin(cx, cy) {
        var c = self2.coinsGrp.create(cx, cy, 'coin');
        c.setDisplaySize(30, 30);
        c.body.setCircle(13, 2, 2);
        return c;
      }

      // tầm với khi nhảy (~155px) → cụm xu vòng cung đặt trong tầm
      var arcY = [58, 104, 128, 104, 58];
      var arcX = [-74, -37, 0, 37, 74];

      for (var i = 0; i < this.totalGates; i++) {
        var gateX = firstGate + i * gateSpacing;

        // 1) Cụm xu vòng cung trên mặt đất — nhảy một nhịp là nhặt được
        var coinArcX = gateX - 400;
        for (var a = 0; a < arcX.length; a++) {
          addCoin(coinArcX + arcX[a], groundTop - arcY[a]);
        }

        // 2) Bẫy chông — có đường chạy đà 2 bên, cách xa cụm xu & ổ khóa
        if (level.id >= 2) {
          var spX = gateX - 250;
          var sp = this.spikes.create(spX, groundTop - 16, 'spike');
          sp.setDisplaySize(46, 36).refreshBody();
          sp.body.setSize(38, 22).setOffset(4, 12);
          // màn khó: thêm 1 bẫy nữa nhưng vẫn chừa khoảng nhảy
          if (level.id >= 5) {
            var sp2 = this.spikes.create(spX + 60, groundTop - 16, 'spike');
            sp2.setDisplaySize(46, 36).refreshBody();
            sp2.body.setSize(38, 22).setOffset(4, 12);
          }
        }

        // 3) Bục nổi thấp (trong tầm nhảy) + xu thưởng trên bục
        var pfX = gateX - 120, pfY = groundTop - 118;
        var pf = this.platforms.create(pfX, pfY, 'platform');
        pf.setDisplaySize(108, 26).refreshBody();
        for (var ci = 0; ci < 3; ci++) {
          addCoin(pfX - 32 + ci * 32, pfY - 26);
        }

        // 4) Ổ khóa (cổng câu hỏi)
        var gate = this.physics.add.staticImage(gateX, groundTop - 40, 'padlock');
        gate.setDisplaySize(56, 72).refreshBody();
        gate.body.setSize(40, 64);
        gate.questionData = questions[i];
        gate.answered = false;
        this.gates.push(gate);
      }
      this.gateCollider = this.physics.add.collider(this.player, this.gates);

      // xu xoay nhẹ cho sinh động
      this.tweens.add({
        targets: this.coinsGrp.getChildren(),
        scaleX: { from: 1, to: 0.25 },
        duration: 520, yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
      });

      // cờ kết thúc
      var flagX = firstGate + this.totalGates * gateSpacing + 180;
      this.flag = this.physics.add.staticImage(flagX, groundTop - 36, 'flag');
      this.flag.setDisplaySize(40, 70).refreshBody();

      // va chạm vật phẩm
      this.physics.add.collider(this.player, this.platforms);
      this.physics.add.overlap(this.player, this.coinsGrp, this.collectCoin, null, this);
      this.physics.add.overlap(this.player, this.spikes, this.hitSpike, null, this);
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
        this.coinsGrp.getChildren(),
        this.spikes.getChildren(),
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
      var self = this;
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

      var back = this.add.text(20, H - 32, '‹ Bản đồ', {
        fontFamily: 'Nunito, sans-serif', fontSize: '15px', color: '#ffffff', fontStyle: 'bold',
        backgroundColor: '#1e3a8acc', padding: { x: 12, y: 6 }
      }).setScrollFactor(0).setDepth(50).setInteractive({ useHandCursor: true });
      back.on('pointerdown', function () { stopSpeak(); self.scene.start('LevelSelect'); });
      hud.push(back);
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

    hitSpike: function () {
      if (this.invuln || this.quizActive || this.finished) return;
      this.loseHeart();
      // bật ngược lại một chút
      this.player.setVelocity(this.player.flipX ? 220 : -220, -260);
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
      if (this.finished || this.quizActive) return;
      var p = this.player, speed = this.level.speed || 180;
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
      if (jumpPressed && onFloor) { p.setVelocityY(-560); if (Sfx.jump) Sfx.jump(); }

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

    var config = {
      type: Phaser.AUTO,
      parent: 'gameMount',
      width: W * DPR,
      height: H * DPR,
      backgroundColor: '#7ec0ee',
      pixelArt: false,
      render: { antialias: true, roundPixels: false },
      scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
      physics: { default: 'arcade', arcade: { gravity: { y: 900 }, debug: false } },
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
