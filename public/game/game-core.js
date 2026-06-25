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

  /* ════════════════ Overlay câu hỏi (DOM — game-quiz-ui.js) ════════════════ */
  function quizUI() { return global.GameQuizUI; }

  /* ════════════════ Nút cảm ứng (chỉ hiện khi đang chơi Play) ════════════════ */
  function isTouchDevice() {
    return ('ontouchstart' in global) || (navigator.maxTouchPoints > 0);
  }

  function shouldShowTouchPad(mode) {
    if (mode !== 'play') return false;
    if (document.body.classList.contains('game-force-landscape')) return true;
    if (isTouchDevice()) return true;
    try {
      if (global.matchMedia('(pointer: coarse)').matches) return true;
      if (global.matchMedia('(max-width: 900px)').matches) return true;
    } catch (e) { /* ignore */ }
    return false;
  }

  function resetTouchState() {
    touch.left = false;
    touch.right = false;
    touch.down = false;
    touch.jumpQueued = false;
    touch.jumpHeld = false;
  }

  /** mode: 'play' | 'map' | 'result' | 'boot' */
  function setControlsMode(mode) {
    var pad = document.getElementById('gameTouch');
    var replay = document.getElementById('btnReplay');
    var mapBtn = document.getElementById('btnMap');
    var ctrls = document.getElementById('gameControls');
    var card = document.getElementById('gameCard');

    if (mode !== 'play') resetTouchState();

    if (card) card.setAttribute('data-game-ui', mode);

    if (pad) {
      var showPad = shouldShowTouchPad(mode);
      pad.classList.toggle('is-play-active', showPad);
      pad.setAttribute('aria-hidden', showPad ? 'false' : 'true');
    }
    if (replay) replay.hidden = mode !== 'play';
    if (mapBtn) mapBtn.hidden = mode !== 'play';
    if (ctrls) ctrls.classList.toggle('is-map-mode', mode === 'map' || mode === 'result');
  }

  function hookSceneControls(g) {
    var modes = { Play: 'play', LevelSelect: 'map', Result: 'result', Boot: 'boot' };
    Object.keys(modes).forEach(function (key) {
      var sc = g.scene.get(key);
      if (!sc || !sc.events) return;
      sc.events.on(Phaser.Scenes.Events.START, function () {
        setControlsMode(modes[key]);
      });
    });
  }

  function syncControlsFromActiveScene() {
    var g = global.__kidGame;
    if (!g || !g.scene) return;
    if (g.scene.isActive('Play')) setControlsMode('play');
    else if (g.scene.isActive('LevelSelect')) setControlsMode('map');
    else if (g.scene.isActive('Result')) setControlsMode('result');
  }

  global.KidGameControls = {
    setMode: setControlsMode,
    syncActiveScene: syncControlsFromActiveScene
  };

  function wireTouchControls() {
    var pad = document.getElementById('gameTouch');
    if (!pad) return;

    function bind(key, onDown, onUp) {
      var btn = pad.querySelector('[data-key="' + key + '"]');
      if (!btn) return;
      var down = function (e) { e.preventDefault(); e.stopPropagation(); onDown(); };
      var up = function (e) { e.preventDefault(); e.stopPropagation(); onUp(); };
      btn.addEventListener('pointerdown', down);
      btn.addEventListener('pointerup', up);
      btn.addEventListener('pointercancel', up);
      btn.addEventListener('pointerleave', up);
    }
    bind('left', function () { touch.left = true; }, function () { touch.left = false; });
    bind('right', function () { touch.right = true; }, function () { touch.right = false; });
    bind('down', function () { touch.down = true; }, function () { touch.down = false; });
    bind('jump', function () { touch.jumpQueued = true; touch.jumpHeld = true; }, function () { touch.jumpHeld = false; });
    setControlsMode('boot');
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
    stopSpeak(); if (quizUI()) quizUI().hide();
    var modeMap = { Play: 'play', LevelSelect: 'map', Result: 'result' };
    setControlsMode(modeMap[key] || 'boot');
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
        if (!global.__kidGame) return;
        var g = global.__kidGame;
        var ps = g.scene.getScene('Play');
        var idx = ps && typeof ps.levelIndex === 'number' ? ps.levelIndex : 0;
        gotoScene('Play', { levelIndex: idx });
      });
    }
    if (map) {
      map.addEventListener('click', function () {
        if (!global.__kidGame) return;
        gotoScene('LevelSelect');
      });
    }
  }

  /* ════════════════ BootScene ════════════════ */
  var BootScene = new Phaser.Class({
    Extends: Phaser.Scene,
    initialize: function BootScene() { Phaser.Scene.call(this, { key: 'Boot' }); },
    create: function () {
      var self = this;
      setControlsMode('boot');
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
      self._mapPickLock = false;
      setControlsMode('map');
      fitStaticCamera(this);
      this.input.topOnly = true;
      var GA = global.GameAssets || {};
      var MAP_PATH = GA.MAP_PATH || [];
      var MAP_TREASURE = GA.MAP_TREASURE || { x: 868, y: 168 };

      // ───── đại dương + viền sóng ─────
      var ocean = this.add.graphics().setDepth(-10);
      if (GA.drawMapOcean) GA.drawMapOcean(ocean, W, H);
      else { this.cameras.main.setBackgroundColor('#2b8fd4'); ocean.fillStyle(0x2b8fd4, 1); ocean.fillRect(0, 0, W, H); }

      // ───── tiện ích vẽ đường đứt nét ─────
      function dashLine(g, x1, y1, x2, y2, dash, gap, color, width, alpha) {
        g.lineStyle(width, color, alpha == null ? 1 : alpha);
        var dx = x2 - x1, dy = y2 - y1, dist = Math.sqrt(dx * dx + dy * dy) || 1;
        var vx = dx / dist, vy = dy / dist, step = dash + gap;
        for (var s = 0; s < dist; s += step) {
          var e = Math.min(s + dash, dist);
          g.beginPath(); g.moveTo(x1 + vx * s, y1 + vy * s); g.lineTo(x1 + vx * e, y1 + vy * e); g.strokePath();
        }
      }

      // ───── banner tiêu đề ─────
      var banner = this.add.graphics().setDepth(8);
      banner.fillStyle(0xfbbf24, 1); banner.fillRoundedRect(W / 2 - 200, 18, 400, 52, 10);
      banner.lineStyle(4, 0xb45309, 1); banner.strokeRoundedRect(W / 2 - 200, 18, 400, 52, 10);
      this.add.text(W / 2, 44, '🏴‍☠️ BẢN ĐỒ KHO BÁU', {
        fontFamily: 'Baloo 2, cursive', fontSize: '26px', color: '#7c2d12', stroke: '#fff7e6', strokeThickness: 4
      }).setOrigin(0.5).setDepth(9);

      // ───── la bàn ─────
      var compass = this.add.graphics().setDepth(6);
      if (GA.drawMapCompass) GA.drawMapCompass(compass, 52, 52);
      this.add.text(52, 92, 'N', { fontFamily: 'Baloo 2, cursive', fontSize: '12px', color: '#7c4a1e' }).setOrigin(0.5).setDepth(7);

      // ───── thuyền xuất phát ─────
      this.add.text(52, MAP_PATH[0] ? MAP_PATH[0].y - 36 : 390, '⛵', { fontSize: '38px' }).setOrigin(0.5).setDepth(4);

      var levels = (global.GameLevels && global.GameLevels.LEVELS) || [];
      var GP = global.GameProgress;
      var totalStars = 0, n = levels.length;
      var pos = [], unlockedArr = [], progArr = [];
      for (var k = 0; k < n; k++) {
        pos.push(MAP_PATH[k] || { x: 120 + k * 100, y: 300 });
        var u = GP ? GP.isLevelUnlocked(levels[k].id) : (levels[k].id === 1);
        unlockedArr.push(u);
        var pr = GP ? GP.getLevelProgress(levels[k].id) : { totalStars: 0, completedRuns: 0, bestRun: 0 };
        progArr.push(pr);
        totalStars += (pr.totalStars || 0);
      }

      // ───── đường mòn đứt nét nối các đảo ─────
      var trail = this.add.graphics().setDepth(1);
      for (var t = 0; t < n - 1; t++) {
        var a = pos[t], b = pos[t + 1];
        var done = unlockedArr[t + 1] && (progArr[t].completedRuns || 0) > 0;
        dashLine(trail, a.x, a.y, b.x, b.y, done ? 4 : 14, done ? 18 : 12, done ? 0x1e293b : 0x334155, done ? 5 : 6, done ? 0.85 : 0.7);
      }
      var last = pos[n - 1];
      var allDone = n > 0 && progArr.every(function (p) { return (p.completedRuns || 0) > 0; });
      if (last) {
        dashLine(trail, last.x, last.y, MAP_TREASURE.x - 20, MAP_TREASURE.y + 30, allDone ? 4 : 14, allDone ? 18 : 12, 0x334155, 5, 0.75);
      }

      // ───── cá voi / cá mập trang trí ─────
      this.add.text(820, 260, '🦈', { fontSize: '22px' }).setOrigin(0.5).setDepth(2).setAlpha(0.7);
      this.add.text(180, 480, '🐋', { fontSize: '28px' }).setOrigin(0.5).setDepth(2).setAlpha(0.65);
      this.add.text(720, 480, '🦜', { fontSize: '24px' }).setOrigin(0.5).setDepth(2).setAlpha(0.8);

      // ───── rương kho báu ─────
      var tx = MAP_TREASURE.x, ty = MAP_TREASURE.y;
      var xg = this.add.graphics().setDepth(3);
      xg.lineStyle(5, 0xdc2626, 0.9);
      xg.lineBetween(tx - 14, ty - 12, tx + 14, ty + 12);
      xg.lineBetween(tx + 14, ty - 12, tx - 14, ty + 12);
      var chest = this.add.text(tx, ty, allDone ? '🏆' : '💰', { fontSize: '48px' }).setOrigin(0.5).setDepth(4);
      this.add.text(tx, ty + 36, 'KHO BÁU', {
        fontFamily: 'Baloo 2, cursive', fontSize: '14px', color: '#7c2d12', stroke: '#fff7e6', strokeThickness: 3
      }).setOrigin(0.5).setDepth(4);
      this.tweens.add({ targets: chest, y: ty - 6, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

      // ───── các đảo theo chủ đề ─────
      var coarsePointer = global.matchMedia && global.matchMedia('(pointer: coarse)').matches;
      var hitR = coarsePointer ? 68 : 48;

      levels.forEach(function (lv, i) {
        var p = pos[i];
        var unlocked = unlockedArr[i];
        var prog = progArr[i];
        var done = (prog.completedRuns || 0) > 0;
        var node = self.add.container(p.x, p.y).setDepth(5).setScale(1.08);

        var isl = self.add.graphics();
        if (GA.drawMapIsland) GA.drawMapIsland(isl, lv.theme, 0, 0, !unlocked);
        node.add(isl);

        // số màn
        node.add(self.add.text(0, 32, String(lv.id), {
          fontFamily: 'Baloo 2, cursive', fontSize: '18px', color: '#ffffff',
          stroke: unlocked ? '#15803d' : '#64748b', strokeThickness: 3
        }).setOrigin(0.5));

        if (lv.isTeacherLevel) {
          node.add(self.add.text(0, -52, '👩‍🏫', { fontSize: '16px' }).setOrigin(0.5));
        }

        // tên màn
        node.add(self.add.text(0, 58, lv.name, {
          fontFamily: 'Nunito, sans-serif', fontSize: '11px', fontWeight: '800', color: '#1e293b',
          stroke: '#ffffff', strokeThickness: 2, align: 'center', wordWrap: { width: 100 }
        }).setOrigin(0.5, 0));

        if (done) {
          node.add(self.add.text(0, -38, '⭐' + (prog.bestRun || 0), {
            fontFamily: 'Baloo 2, cursive', fontSize: '14px', color: '#b45309', stroke: '#fff7e6', strokeThickness: 3
          }).setOrigin(0.5));
        }
        if (!unlocked) {
          node.add(self.add.image(0, -4, 'lock').setDisplaySize(28, 28));
        } else if (!done) {
          var glow = self.add.graphics();
          glow.lineStyle(4, 0x22c55e, 0.75); glow.strokeCircle(0, 4, 46);
          node.add(glow);
          self.tweens.add({ targets: glow, alpha: 0.15, scaleX: 1.1, scaleY: 1.1, duration: 800, yoyo: true, repeat: -1 });
        }

        var hit = self.add.circle(0, 4, hitR, 0xffffff, 0.0001);
        hit.setInteractive({
          useHandCursor: unlocked,
          hitArea: new Phaser.Geom.Circle(0, 4, hitR),
          hitAreaCallback: Phaser.Geom.Circle.Contains
        });
        if (unlocked) {
          hit.on('pointerover', function () { self.tweens.add({ targets: node, scaleX: 1.12, scaleY: 1.12, duration: 100 }); });
          hit.on('pointerout', function () { self.tweens.add({ targets: node, scaleX: 1.08, scaleY: 1.08, duration: 100 }); });
          hit.on('pointerup', function (pointer) {
            if (self._mapPickLock) return;
            if (pointer.getDistance && pointer.getDistance() > 22) return;
            self._mapPickLock = true;
            self.tweens.add({ targets: node, scaleX: 0.9, scaleY: 0.9, duration: 70, yoyo: true });
            if (Sfx.unlock) Sfx.unlock();
            if (Sfx.gate) Sfx.gate();
            self.time.delayedCall(60, function () {
              setControlsMode('play');
              self.scene.start('Play', { levelIndex: i });
            });
          });
        } else {
          hit.on('pointerup', function () {
            if (Sfx.wrong) Sfx.wrong();
            self.tweens.add({ targets: node, x: p.x - 5, duration: 50, yoyo: true, repeat: 3, onComplete: function () { node.x = p.x; } });
          });
        }
        node.add(hit);
        // đảo trôi nhẹ trên mặt nước
        self.tweens.add({ targets: node, y: p.y - 5, duration: 1400 + i * 120, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      });

      this.add.text(W / 2, H - 22, '⭐ Tổng sao: ' + totalStars + '  ·  Chọn đảo để bắt đầu phiêu lưu!', {
        fontFamily: 'Baloo 2, cursive', fontSize: '15px', color: '#ffffff', stroke: '#1e3a8a', strokeThickness: 4
      }).setOrigin(0.5).setDepth(9);

      sharpenTexts(this);

      var hubBtn = this.add.text(24, H - 28, '← Chọn game', {
        fontFamily: 'Nunito, sans-serif', fontSize: '14px', fontWeight: '800', color: '#93c5fd',
        backgroundColor: '#1e293b', padding: { x: 10, y: 6 }
      }).setInteractive({ useHandCursor: true }).setDepth(20);
      hubBtn.on('pointerup', function () {
        if (global.GameHub && global.GameHub.show) global.GameHub.show();
      });
    },
    shutdown: function () {
      this._mapPickLock = false;
    }
  });

  /* ════════════════ PlayScene ════════════════ */
  var PlayScene = new Phaser.Class({
    Extends: Phaser.Scene,
    initialize: function PlayScene() { Phaser.Scene.call(this, { key: 'Play' }); },

    init: function (data) {
      data = data || {};
      var levels = (global.GameLevels && global.GameLevels.LEVELS) || [];
      this.hiddenRoom = !!data.hiddenRoom;
      this.pipeReturn = data.pipeReturn || null;
      this.spawnX = data.spawnX || null;
      this.hiddenUsed = data.hiddenUsed || {};
      this.levelIndex = typeof data.levelIndex === 'number' ? data.levelIndex : 0;
      this.level = levels[this.levelIndex] || levels[0];
      this.hearts = this.level.hearts || 3;
      this.maxHearts = this.hearts;
      this.starsGot = 0;
      this.coins = 0;
      this.starUntil = 0;
      this.quizActive = false;
      this.finished = false;
      this.invuln = false;
      this._warping = false;
      this._warpCd = 0;
      // khôi phục trạng thái sau khi thoát màn ẩn
      if (data.restoreState) {
        var rs = data.restoreState;
        this.hearts = rs.hearts != null ? rs.hearts : this.hearts;
        this.maxHearts = rs.maxHearts != null ? rs.maxHearts : this.maxHearts;
        this.starsGot = rs.starsGot || 0;
        this.coins = rs.coins || 0;
        this.starUntil = rs.starUntil || 0;
        this.hiddenUsed = rs.hiddenUsed || this.hiddenUsed;
        this.spawnX = rs.x != null ? rs.x : this.spawnX;
      }
      // giữ trạng thái khi vào màn ẩn
      if (this.pipeReturn) {
        this.hearts = this.pipeReturn.hearts != null ? this.pipeReturn.hearts : this.hearts;
        this.maxHearts = this.pipeReturn.maxHearts != null ? this.pipeReturn.maxHearts : this.maxHearts;
        this.starsGot = this.pipeReturn.starsGot || 0;
        this.coins = this.pipeReturn.coins || 0;
        this.starUntil = this.pipeReturn.starUntil || 0;
      }
    },

    create: function () {
      this._controlsReady = false;
      setControlsMode('play');
      if (this.hiddenRoom) { this.buildHiddenRoom(); return; }
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
      if (this.spawnX) {
        this.player.setPosition(this.spawnX, groundTop - 90);
        this.lastSafeX = this.spawnX;
        this.cameras.main.centerOn(this.player.x, this.player.y);
      }
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
      function addPipe(cx, ph, opts) {
        ph = ph || 84;
        opts = opts || {};
        var p = self2.pipes.create(cx, groundTop - ph / 2, 'pipe');
        p.setDisplaySize(64, ph).refreshBody();
        p.setDepth(4);
        if (opts.hiddenEntry) {
          var pid = opts.pipeId || ('p' + Math.round(cx));
          if (!self2.hiddenUsed[pid]) {
            p._hiddenEntry = true;
            p._pipeId = pid;
            p._exitX = opts.exitX;
            self2.pipeWarps.push(p);
            p.setTint(0xc8f5c8); // ống bí mật: màu xanh nhạt hơn (không dùng chữ/sao)
          }
        }
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
      function fPipe(fx) { // ống cống trang trí — không chui được
        addPipe(fx - 130, 78);
        addPipe(fx + 110, 92);
        addCoin(fx, groundTop - 110);
      }
      function fSecretPipe(fx) { // chỉ 1 ống có sao vàng → vào màn ẩn
        addPipe(fx - 120, 76);
        addPipe(fx + 100, 88, { hiddenEntry: true, exitX: fx + 260, pipeId: 'sec_' + Math.round(fx) });
        addCoin(fx - 40, groundTop - 100);
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
        goombas: fGoombas, spring: fSpringJump, pipe: fPipe, piperow: fPipeRow, power: fPower, secretpipe: fSecretPipe
      };
      var FOOT = {
        steps: 250, crates: 220, islands: 300, pit: 270, stairs: 300, movers: 230, spikes: 210,
        saw: 250, sawair: 300, spikegap: 240, tower: 210,
        goombas: 280, spring: 200, pipe: 280, piperow: 330, power: 250, secretpipe: 380
      };
      var STACKABLE = { spikes: 1, crates: 1, goombas: 1, saw: 1, spikegap: 1, steps: 1 };

      // bộ địa hình theo độ khó (càng cao càng nhiều kiểu & bẫy)
      function buildPool(id) {
        var pool = ['islands', 'steps', 'crates', 'goombas', 'spring', 'power'];
        if (id >= 2) pool.push('spikes', 'saw', 'goombas');
        if (id >= 3) pool.push('pit', 'spikegap', 'pipe');
        if (id >= 4) pool.push('stairs', 'tower', 'saw', 'piperow', 'secretpipe');
        if (id >= 5) pool.push('pit', 'sawair', 'goombas');
        if (id >= 6) pool.push('movers', 'spikes', 'spikegap', 'secretpipe');
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

      if (quizUI()) quizUI().hide();
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
      hud.push(this.add.text(W / 2, 29, this.hiddenRoom ? '🌟 Màn bí mật' : this.level.name, {
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

    buildHiddenRoom: function () {
      var self = this;
      var level = this.level;
      var groundTop = H - GROUND_H;
      var worldW = 680;
      this.groundTop = groundTop;
      this.worldW = worldW;
      this.totalGates = 0;

      this.physics.world.setBounds(0, 0, worldW, H);
      this.cameras.main.setBounds(0, 0, worldW, H);

      var TH = (global.GameAssets && global.GameAssets.ensureTheme)
        ? global.GameAssets.ensureTheme(this, 'cave')
        : { skyKey: 'sky', groundKey: 'ground', platKey: 'platform', fluid: 'water', dark: true };
      this.theme = TH;
      if (global.GameAssets && global.GameAssets.buildHiddenBg) {
        this._bgObjects = global.GameAssets.buildHiddenBg(this, W, H);
      }

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

      var HERO = (global.GameAssets && global.GameAssets.HERO) || { w: 46, h: 56, ss: 1 };
      this.player = this.physics.add.sprite(70, groundTop - 70, 'hero');
      this.player.setDisplaySize(HERO.w, HERO.h);
      this.player.setDepth(6);
      this.player.setCollideWorldBounds(true);
      this.player.body.setSize(34 * HERO.ss, 48 * HERO.ss).setOffset(6 * HERO.ss, 6 * HERO.ss);
      this.lastSafeX = 70;

      this.physics.add.collider(this.player, this.solids);
      this.physics.add.collider(this.player, this.platforms);
      this.physics.add.collider(this.player, this.pipes);

      this.cameras.main.setZoom(DPR);
      this.cameras.main.startFollow(this.player, true, 0.22, 0.2);
      this.cameras.main.setFollowOffset(-60, 20);

      for (var gx = 0; gx < worldW; gx += 64) {
        var t = this.solids.create(gx + 32, groundTop + GROUND_H / 2, TH.groundKey || 'ground');
        t.setDisplaySize(64, GROUND_H).refreshBody();
      }

      // xu thưởng màn ẩn
      var coinYs = [groundTop - 90, groundTop - 130, groundTop - 170, groundTop - 130];
      for (var ci = 0; ci < 8; ci++) {
        var cx = 140 + ci * 58, cy = coinYs[ci % coinYs.length];
        var coin = this.coinsGrp.create(cx, cy, 'coin');
        coin.setDisplaySize(30, 30).setDepth(4);
        coin.body.setCircle(13, 2, 2);
      }
      var mush = this.powerups.create(420, groundTop - 100, 'mushroom');
      mush.setDisplaySize(36, 34); mush.body.setSize(24, 24, true);
      mush.setDepth(5); mush._kind = 'mushroom'; mush.setVelocityX(0);

      // ống thoát — nhấn ▼ để quay lại màn chính
      var exitPipe = this.pipes.create(580, groundTop - 44, 'pipe');
      exitPipe.setDisplaySize(64, 88).refreshBody().setDepth(4);
      exitPipe._hiddenExit = true;
      this.pipeWarps.push(exitPipe);

      this.tweens.add({
        targets: this.coinsGrp.getChildren(),
        scaleX: { from: 1, to: 0.25 }, duration: 520, yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
      });

      this.physics.add.overlap(this.player, this.coinsGrp, this.collectCoin, null, this);
      this.physics.add.overlap(this.player, this.powerups, this.onPowerup, null, this);

      this.cursors = this.input.keyboard.createCursorKeys();
      this.keySpace = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
      this.keyEsc = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
      this.buildHud();

      var worldObjects = (this._bgObjects || []).concat(
        this.solids.getChildren(), this.platforms.getChildren(), this.pipes.getChildren(),
        this.coinsGrp.getChildren(), this.powerups.getChildren(), [this.player]
      );
      this.hudCam = this.cameras.add(0, 0, this.scale.width, this.scale.height);
      this.hudCam.setZoom(DPR);
      this.hudCam.centerOn(W / 2, H / 2);
      this.hudCam.ignore(worldObjects);
      this.cameras.main.ignore(this.hudObjects);
      sharpenTexts(this);
      if (quizUI()) quizUI().hide();
    },

    collectCoin: function (player, coin) {
      coin.disableBody(true, true);
      this.coins++;
      if (Sfx.coin) Sfx.coin();
    },

    inPitX: function (x) {
      if (!this.pits) return false;
      for (var i = 0; i < this.pits.length; i++) {
        if (x > this.pits[i].x1 && x < this.pits[i].x2) return true;
      }
      return false;
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

    enterHiddenPipe: function (pipe) {
      if (this._warping || this.hiddenRoom || !pipe._hiddenEntry) return;
      this._warping = true;
      var self = this, p = this.player;
      var used = this.hiddenUsed || {};
      used[pipe._pipeId] = true;
      var returnData = {
        levelIndex: this.levelIndex,
        x: pipe._exitX,
        hearts: this.hearts,
        maxHearts: this.maxHearts,
        starsGot: this.starsGot,
        coins: this.coins,
        starUntil: this.starUntil,
        hiddenUsed: used
      };
      p.setVelocity(0, 0);
      if (p.body) p.body.enable = false;
      if (Sfx.gate) Sfx.gate();
      this.tweens.add({ targets: p, y: p.y + 46, alpha: 0, duration: 280, ease: 'Quad.easeIn',
        onComplete: function () {
          self.scene.start('Play', { hiddenRoom: true, pipeReturn: returnData });
        } });
    },

    exitHiddenRoom: function () {
      if (this._warping || !this.hiddenRoom || !this.pipeReturn) return;
      this._warping = true;
      var self = this, p = this.player, pr = this.pipeReturn;
      p.setVelocity(0, 0);
      if (p.body) p.body.enable = false;
      if (Sfx.gate) Sfx.gate();
      this.tweens.add({ targets: p, y: p.y + 46, alpha: 0, duration: 260, ease: 'Quad.easeIn',
        onComplete: function () {
          self.scene.start('Play', {
            levelIndex: pr.levelIndex,
            restoreState: pr,
            hiddenUsed: pr.hiddenUsed
          });
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
      if (quizUI()) quizUI().hide();
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
      if (quizUI()) quizUI().show(gate.questionData, {
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
      if (!this._controlsReady) {
        this._controlsReady = true;
        setControlsMode('play');
      }
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

      // nhấn xuống trên ống có sao vàng → vào màn ẩn; ống thoát → quay lại màn chính
      var downPressed = this.cursors.down.isDown || touch.down;
      if (downPressed && this.time.now > this._warpCd && (p.body.blocked.down || p.body.touching.down)) {
        for (var wi = 0; wi < this.pipeWarps.length; wi++) {
          var wp = this.pipeWarps[wi];
          if (Math.abs(p.x - wp.x) < 34 && p.y < this.groundTop - 12) {
            if (this.hiddenRoom && wp._hiddenExit) { this.exitHiddenRoom(); break; }
            if (!this.hiddenRoom && wp._hiddenEntry) { this.enterHiddenPipe(wp); break; }
          }
        }
      }

      // rơi vào hố nước/dung nham (theo vùng X) → chết ngay, không đứng được dưới đáy
      if (!this._warping && p.y > this.groundTop + 2 && this.inPitX(p.x)) { this.fallRespawn(); return; }
      // rơi quá sâu (ngoài hố) → cũng hồi sinh
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
      setControlsMode('result');
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
    if (global.__kidGame) {
      try { global.__kidGame.destroy(true); } catch (e) {}
      global.__kidGame = null;
    }
    if (quizUI()) quizUI().init();
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

    function startPhaser() {
      global.__kidGame = new Phaser.Game(config);
      hookSceneControls(global.__kidGame);
      if (global.KidGameOrientation && global.KidGameOrientation.refresh) {
        global.KidGameOrientation.refresh();
      }
    }

    var chain = Promise.resolve();
    if (global.TeacherGames && global.TeacherGames.loadForCurrentUser) {
      chain = global.TeacherGames.loadForCurrentUser().then(function (games) {
        if (global.GameLevels && global.GameLevels.mergeTeacherLevels) {
          global.GameLevels.mergeTeacherLevels(games || []);
        }
      }).catch(function (err) { console.warn('[game-core] teacher games', err); });
    }
    chain.finally(startPhaser);
  }

  global.GamePlatformer = { boot: boot };
})(window);
