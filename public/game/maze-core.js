/* ═══════════════════════════════════════════════════
   MAZE-CORE.JS — Game mê cung 2D (Phaser 3)
   Tìm lối ra · bẫy/quái → câu hỏi · độ khó tăng dần
═══════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  if (typeof Phaser === 'undefined') {
    console.error('[maze-core] Phaser chưa được nạp.');
    return;
  }

  var TILE = 40;
  var touch = { left: false, right: false, up: false, down: false };
  var Sfx = {};

  function safeSpeak(text) {
    try { if (typeof global.speak === 'function') global.speak(text); } catch (e) {}
  }

  function setMazeControlsMode(mode) {
    var pad = document.getElementById('gameTouch');
    var replay = document.getElementById('btnReplay');
    var mapBtn = document.getElementById('btnMap');
    var ctrls = document.getElementById('gameControls');
    var card = document.getElementById('gameCard');
    var jumpBtn = pad && pad.querySelector('[data-key="jump"]');

    if (card) card.setAttribute('data-game-ui', mode);
    if (jumpBtn) jumpBtn.textContent = '▲';
    if (jumpBtn) jumpBtn.setAttribute('aria-label', 'Lên');

    var showPad = mode === 'play';
    if (pad) {
      pad.classList.toggle('is-play-active', showPad);
      pad.setAttribute('aria-hidden', showPad ? 'false' : 'true');
    }
    if (replay) replay.hidden = mode !== 'play';
    if (mapBtn) {
      mapBtn.hidden = mode !== 'play';
      mapBtn.title = 'Chọn màn mê cung';
    }
    if (ctrls) ctrls.classList.toggle('is-map-mode', mode === 'map' || mode === 'result');
  }

  function wireMazeTouch() {
    var pad = document.getElementById('gameTouch');
    if (!pad || pad._mazeWired) return;
    pad._mazeWired = true;
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
    bind('jump', function () { touch.up = true; }, function () { touch.up = false; });
  }

  function wireMazeDomControls() {
    var sound = document.getElementById('btnSound');
    var replay = document.getElementById('btnReplay');
    var map = document.getElementById('btnMap');
    if (sound && !sound._mazeWired) {
      sound._mazeWired = true;
      sound.addEventListener('click', function () {
        var m = Sfx.toggleMute ? Sfx.toggleMute() : false;
        sound.textContent = m ? '🔇' : '🔊';
        sound.classList.toggle('is-muted', m);
      });
    }
    if (replay && !replay._mazeWired) {
      replay._mazeWired = true;
      replay.addEventListener('click', function () {
        if (!global.__kidMaze) return;
        var g = global.__kidMaze;
        var ps = g.scene.getScene('MazePlay');
        var idx = ps && typeof ps.levelIndex === 'number' ? ps.levelIndex : 0;
        g.scene.start('MazePlay', { levelIndex: idx });
      });
    }
    if (map && !map._mazeWired) {
      map._mazeWired = true;
      map.addEventListener('click', function () {
        if (!global.__kidMaze) return;
        var g = global.__kidMaze;
        global.GameQuizUI && global.GameQuizUI.hide();
        g.scene.start('MazeSelect');
      });
    }
  }

  function shareMazeWin(level, stars, total) {
    var text = 'Mình vừa thoát mê cung "' + level.name + '" với ' + stars + '/' + total + ' sao! 🧩';
    if (!global.KidSocial || !global.KidSocial.createPost) {
      if (confirm('Chia sẻ lên Cộng đồng?\n\n' + text + '\n\n(Bạn cần đăng nhập trên trang Cộng đồng)')) {
        global.location.href = 'social.html?tab=feed';
      }
      return;
    }
    global.KidSocial.createPost({
      text: text,
      type: 'achievement',
      shareMeta: { label: 'Mê cung · ' + stars + '/' + total + ' ⭐' }
    }).then(function () {
      alert('Đã chia sẻ lên Cộng đồng! 🎉');
    }).catch(function (e) {
      alert(e.message || 'Không chia sẻ được.');
    });
  }

  /* ── Chọn màn ── */
  var MazeSelectScene = new Phaser.Class({
    Extends: Phaser.Scene,
    initialize: function () { Phaser.Scene.call(this, { key: 'MazeSelect' }); },
    create: function () {
      var self = this;
      setMazeControlsMode('map');
      var levels = (global.MazeLevels && global.MazeLevels.LEVELS) || [];
      var MP = global.MazeProgress;
      var W = this.scale.width;
      var H = this.scale.height;

      this.cameras.main.setBackgroundColor('#1e3a5f');
      this.add.text(W / 2, 36, '🧩 CHỌN MÊ CUNG', {
        fontFamily: 'Baloo 2, cursive', fontSize: '28px', color: '#fef08a',
        stroke: '#1e3a8a', strokeThickness: 4
      }).setOrigin(0.5);

      this.add.text(W / 2, 68, 'Tìm lối ra · tránh bẫy & quái · trả lời đúng để qua!', {
        fontFamily: 'Nunito, sans-serif', fontSize: '13px', color: '#bae6fd'
      }).setOrigin(0.5);

      var cols = Math.min(3, levels.length);
      var cardW = 140;
      var cardH = 110;
      var gap = 14;
      var totalW = cols * cardW + (cols - 1) * gap;
      var startX = W / 2 - totalW / 2 + cardW / 2;
      var startY = 120;

      levels.forEach(function (lv, i) {
        var col = i % cols;
        var row = Math.floor(i / cols);
        var cx = startX + col * (cardW + gap);
        var cy = startY + row * (cardH + gap);
        var unlocked = MP ? MP.isLevelUnlocked(lv.id) : (lv.id === 1);
        var prog = MP ? MP.getLevelProgress(lv.id) : {};
        var done = (prog.completedRuns || 0) > 0;

        var g = self.add.graphics();
        g.fillStyle(unlocked ? 0x4f46e5 : 0x64748b, unlocked ? 0.95 : 0.7);
        g.fillRoundedRect(cx - cardW / 2, cy - cardH / 2, cardW, cardH, 14);
        if (done) {
          g.lineStyle(3, 0xfbbf24, 1);
          g.strokeRoundedRect(cx - cardW / 2, cy - cardH / 2, cardW, cardH, 14);
        }

        self.add.text(cx, cy - 28, lv.badge || '🧩', { fontSize: '32px' }).setOrigin(0.5);
        self.add.text(cx, cy + 4, lv.name, {
          fontFamily: 'Nunito, sans-serif', fontSize: '11px', fontWeight: '800',
          color: '#fff', align: 'center', wordWrap: { width: cardW - 16 }
        }).setOrigin(0.5);

        var meta = '';
        if (lv.timeLimit) meta += '⏱' + lv.timeLimit + 's ';
        if (lv.reverseControls) meta += '↔️ ';
        if (done) meta += '⭐' + (prog.bestRun || 0);
        if (!unlocked) meta = '🔒';
        self.add.text(cx, cy + 36, meta, {
          fontFamily: 'Nunito, sans-serif', fontSize: '10px', color: '#e0e7ff'
        }).setOrigin(0.5);

        var hit = self.add.rectangle(cx, cy, cardW, cardH).setInteractive({ useHandCursor: unlocked });
        if (unlocked) {
          hit.on('pointerup', function () {
            self.scene.start('MazePlay', { levelIndex: i });
          });
        }
      });

      var hubBtn = self.add.text(16, H - 28, '← Chọn game khác', {
        fontFamily: 'Nunito, sans-serif', fontSize: '14px', fontWeight: '800', color: '#93c5fd',
        backgroundColor: '#1e293b', padding: { x: 10, y: 6 }
      }).setInteractive({ useHandCursor: true });
      hubBtn.on('pointerup', function () {
        if (global.GameHub && global.GameHub.show) global.GameHub.show();
        if (global.__kidMaze) global.__kidMaze.destroy(true);
        global.__kidMaze = null;
      });
    }
  });

  /* ── Chơi mê cung ── */
  var MazePlayScene = new Phaser.Class({
    Extends: Phaser.Scene,
    initialize: function () { Phaser.Scene.call(this, { key: 'MazePlay' }); },

    init: function (data) {
      data = data || {};
      var levels = (global.MazeLevels && global.MazeLevels.LEVELS) || [];
      this.levelIndex = typeof data.levelIndex === 'number' ? data.levelIndex : 0;
      this.level = levels[this.levelIndex] || levels[0];
      this.parsed = global.MazeLevels.parseGrid(this.level.grid);
      this.questions = global.MazeLevels.buildLevelQuestions(this.level);
      this.qIndex = 0;
      this.hearts = this.level.hearts || 3;
      this.starsGot = 0;
      this.quizActive = false;
      this.finished = false;
      this.moveLock = false;
      this.disabledTraps = {};
      this.disabledMonsters = {};
      this.timeLeft = this.level.timeLimit || 0;
    },

    create: function () {
      var self = this;
      setMazeControlsMode('play');
      wireMazeTouch();

      var p = this.parsed;
      var worldW = p.cols * TILE;
      var worldH = p.rows * TILE;
      this.physics.world.setBounds(0, 0, worldW, worldH);

      var bg = this.add.graphics();
      bg.fillStyle(0x0f172a, 1);
      bg.fillRect(0, 0, worldW, worldH);

      var floorG = this.add.graphics();
      for (var y = 0; y < p.rows; y++) {
        for (var x = 0; x < p.cols; x++) {
          var ch = this.level.grid[y][x];
          if (ch === '#') {
            var wg = this.add.graphics();
            wg.fillStyle(0x334155, 1);
            wg.fillRect(x * TILE, y * TILE, TILE, TILE);
            wg.lineStyle(2, 0x1e293b, 1);
            wg.strokeRect(x * TILE, y * TILE, TILE, TILE);
          } else {
            floorG.fillStyle(ch === 'E' ? 0x22c55e : 0x1e3a5f, ch === 'E' ? 0.35 : 0.5);
            floorG.fillRect(x * TILE + 1, y * TILE + 1, TILE - 2, TILE - 2);
          }
        }
      }

      this.exitPos = { x: p.exit.x, y: p.exit.y };
      this.add.text(p.exit.x * TILE + TILE / 2, p.exit.y * TILE + TILE / 2, '🚪', {
        fontSize: '28px'
      }).setOrigin(0.5);

      this.trapSprites = {};
      p.traps.forEach(function (t) {
        self.trapSprites[t.id] = self.add.text(t.x * TILE + TILE / 2, t.y * TILE + TILE / 2, '⚠️', {
          fontSize: '22px'
        }).setOrigin(0.5);
      });

      this.monsterSprites = {};
      this.monsterData = p.monsters.map(function (m) {
        return { id: m.id, x: m.x, y: m.y, dir: 1, homeX: m.x };
      });
      this.monsterData.forEach(function (m) {
        self.monsterSprites[m.id] = self.add.text(m.x * TILE + TILE / 2, m.y * TILE + TILE / 2, '👾', {
          fontSize: '24px'
        }).setOrigin(0.5);
      });

      this.gridX = p.start.x;
      this.gridY = p.start.y;
      this.player = this.add.text(p.start.x * TILE + TILE / 2, p.start.y * TILE + TILE / 2, '🧒', {
        fontSize: '30px'
      }).setOrigin(0.5).setDepth(10);

      this.cursors = this.input.keyboard.createCursorKeys();
      this.keyW = this.input.keyboard.addKey('W');
      this.keyA = this.input.keyboard.addKey('A');
      this.keyS = this.input.keyboard.addKey('S');
      this.keyD = this.input.keyboard.addKey('D');

      this.hudHearts = this.add.text(12, 10, '', {
        fontFamily: 'Baloo 2, cursive', fontSize: '18px', color: '#fff',
        stroke: '#000', strokeThickness: 3
      }).setScrollFactor(0).setDepth(100);

      this.hudStars = this.add.text(12, 34, '', {
        fontFamily: 'Nunito, sans-serif', fontSize: '14px', fontWeight: '800', color: '#fde68a',
        stroke: '#000', strokeThickness: 2
      }).setScrollFactor(0).setDepth(100);

      this.hudTime = this.add.text(worldW - 12, 10, '', {
        fontFamily: 'Baloo 2, cursive', fontSize: '18px', color: '#fca5a5',
        stroke: '#000', strokeThickness: 3
      }).setOrigin(1, 0).setScrollFactor(0).setDepth(100);

      this.hudHint = this.add.text(worldW / 2, worldH - 14, this.level.reverseControls ? '↔️ Điều khiển NGƯỢC!' : '', {
        fontFamily: 'Nunito, sans-serif', fontSize: '12px', fontWeight: '800', color: '#fbbf24'
      }).setOrigin(0.5, 1).setScrollFactor(0).setDepth(100);

      this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
      this.cameras.main.setBounds(0, 0, worldW, worldH);

      if (this.timeLeft > 0) {
        this.timerEvent = this.time.addEvent({
          delay: 1000, loop: true,
          callback: function () {
            if (self.finished || self.quizActive) return;
            self.timeLeft--;
            self.updateHud();
            if (self.timeLeft <= 0) self.gameOver('Hết giờ!');
          }
        });
      }
      this.updateHud();
    },

    updateHud: function () {
      var h = '';
      for (var i = 0; i < this.hearts; i++) h += '❤️';
      this.hudHearts.setText(h);
      this.hudStars.setText('⭐ ' + this.starsGot + '/' + (this.level.gates || 0));
      if (this.timeLeft > 0) {
        this.hudTime.setText('⏱ ' + this.timeLeft + 's');
      }
    },

    isWall: function (gx, gy) {
      var p = this.parsed;
      if (gx < 0 || gy < 0 || gx >= p.cols || gy >= p.rows) return true;
      return this.level.grid[gy][gx] === '#';
    },

    tryMove: function (dx, dy) {
      if (this.moveLock || this.quizActive || this.finished) return;
      var ngx = this.gridX + dx;
      var ngy = this.gridY + dy;
      if (this.isWall(ngx, ngy)) return;

      var self = this;
      this.moveLock = true;
      this.gridX = ngx;
      this.gridY = ngy;
      this.tweens.add({
        targets: this.player,
        x: ngx * TILE + TILE / 2,
        y: ngy * TILE + TILE / 2,
        duration: 110,
        ease: 'Linear',
        onComplete: function () {
          self.moveLock = false;
          self.afterMove();
        }
      });
    },

    afterMove: function () {
      var self = this;
      if (this.gridX === this.exitPos.x && this.gridY === this.exitPos.y) {
        this.winLevel();
        return;
      }

      var trap = this.parsed.traps.find(function (t) {
        return t.x === self.gridX && t.y === self.gridY && !self.disabledTraps[t.id];
      });
      if (trap) {
        this.triggerQuiz('trap', trap.id);
        return;
      }

      var mon = this.monsterData.find(function (m) {
        return m.x === self.gridX && m.y === self.gridY && !self.disabledMonsters[m.id];
      });
      if (mon) {
        this.triggerQuiz('monster', mon.id);
      }
    },

    triggerQuiz: function (type, entityId) {
      var self = this;
      if (this.quizActive) return;
      var q = this.questions[this.qIndex % this.questions.length];
      if (!q) return;
      this.quizActive = true;
      this.qIndex++;

      global.GameQuizUI.show(q, {
        onCorrect: function () {
          self.quizActive = false;
          self.starsGot++;
          if (type === 'trap') {
            self.disabledTraps[entityId] = true;
            if (self.trapSprites[entityId]) self.trapSprites[entityId].destroy();
          } else {
            self.disabledMonsters[entityId] = true;
            if (self.monsterSprites[entityId]) self.monsterSprites[entityId].destroy();
          }
          self.updateHud();
        },
        onWrong: function () {
          self.hearts--;
          self.updateHud();
          if (self.hearts <= 0) {
            self.gameOver('Hết mạng!');
            return false;
          }
          return true;
        }
      });
    },

    gameOver: function (msg) {
      if (this.finished) return;
      this.finished = true;
      this.scene.start('MazeResult', {
        levelIndex: this.levelIndex,
        win: false,
        stars: this.starsGot,
        total: this.level.gates || 0,
        msg: msg || 'Cố lên nhé!'
      });
    },

    winLevel: function () {
      if (this.finished) return;
      this.finished = true;
      if (global.MazeProgress) {
        global.MazeProgress.saveLevelResult(this.level, {
          stars: this.starsGot,
          total: this.level.gates || 0,
          finished: true
        });
      }
      if (Sfx.win) Sfx.win();
      this.scene.start('MazeResult', {
        levelIndex: this.levelIndex,
        win: true,
        stars: this.starsGot,
        total: this.level.gates || 0
      });
    },

    updateMonsters: function () {
      var self = this;
      this.monsterData.forEach(function (m) {
        if (self.disabledMonsters[m.id]) return;
        if (Math.random() > 0.02) return;
        var dirs = [{ dx: 1, dy: 0 }, { dx: -1, dy: 0 }, { dx: 0, dy: 1 }, { dx: 0, dy: -1 }];
        var d = dirs[Math.floor(Math.random() * dirs.length)];
        var nx = m.x + d.dx;
        var ny = m.y + d.dy;
        if (!self.isWall(nx, ny) && !(nx === self.exitPos.x && ny === self.exitPos.y)) {
          m.x = nx;
          m.y = ny;
          var spr = self.monsterSprites[m.id];
          if (spr) {
            spr.x = nx * TILE + TILE / 2;
            spr.y = ny * TILE + TILE / 2;
          }
          if (m.x === self.gridX && m.y === self.gridY) {
            self.triggerQuiz('monster', m.id);
          }
        }
      });
    },

    update: function () {
      if (this.finished || this.quizActive) return;

      var rev = !!this.level.reverseControls;
      var dx = 0;
      var dy = 0;

      if (Phaser.Input.Keyboard.JustDown(this.cursors.left) || Phaser.Input.Keyboard.JustDown(this.keyA) || touch.left) {
        dx = rev ? 1 : -1;
      } else if (Phaser.Input.Keyboard.JustDown(this.cursors.right) || Phaser.Input.Keyboard.JustDown(this.keyD) || touch.right) {
        dx = rev ? -1 : 1;
      } else if (Phaser.Input.Keyboard.JustDown(this.cursors.up) || Phaser.Input.Keyboard.JustDown(this.keyW) || touch.up) {
        dy = rev ? 1 : -1;
      } else if (Phaser.Input.Keyboard.JustDown(this.cursors.down) || Phaser.Input.Keyboard.JustDown(this.keyS) || touch.down) {
        dy = rev ? -1 : 1;
      }

      if (dx || dy) this.tryMove(dx, dy);
      this.updateMonsters();
    }
  });

  /* ── Kết quả ── */
  var MazeResultScene = new Phaser.Class({
    Extends: Phaser.Scene,
    initialize: function () { Phaser.Scene.call(this, { key: 'MazeResult' }); },
    init: function (data) { this.data2 = data || {}; },
    create: function () {
      var self = this;
      setMazeControlsMode('result');
      var d = this.data2;
      var levels = (global.MazeLevels && global.MazeLevels.LEVELS) || [];
      var win = !!d.win;
      var W = this.scale.width;
      var H = this.scale.height;

      this.cameras.main.setBackgroundColor(win ? '#14532d' : '#7f1d1d');

      this.add.graphics().fillStyle(0xffffff, 0.95).fillRoundedRect(W / 2 - 220, 60, 440, 320, 20);

      this.add.text(W / 2, 110, win ? '🎉 Thoát mê cung!' : '😢 ' + (d.msg || 'Thử lại nhé'), {
        fontFamily: 'Baloo 2, cursive', fontSize: '30px', color: win ? '#15803d' : '#b91c1c'
      }).setOrigin(0.5);

      this.add.text(W / 2, 160, 'Sao: ⭐ ' + (d.stars || 0) + '/' + (d.total || 0), {
        fontFamily: 'Nunito, sans-serif', fontSize: '18px', fontWeight: '800', color: '#334155'
      }).setOrigin(0.5);

      if (win) {
        this.add.text(W / 2, 195, '🏅 +1 huy hiệu mê cung (nếu đủ điều kiện)', {
          fontFamily: 'Nunito, sans-serif', fontSize: '12px', color: '#64748b'
        }).setOrigin(0.5);
      }

      var btns = [];
      if (win && levels[d.levelIndex + 1] && global.MazeProgress && global.MazeProgress.isLevelUnlocked(levels[d.levelIndex + 1].id)) {
        btns.push({ label: 'Màn tiếp ▶', color: '#10b981', act: function () {
          self.scene.start('MazePlay', { levelIndex: d.levelIndex + 1 });
        }});
      }
      btns.push({ label: win ? 'Chơi lại' : 'Thử lại', color: '#3b82f6', act: function () {
        self.scene.start('MazePlay', { levelIndex: d.levelIndex });
      }});
      if (win) {
        btns.push({ label: '📣 Chia sẻ', color: '#ec4899', act: function () {
          shareMazeWin(levels[d.levelIndex] || { name: 'Mê cung' }, d.stars || 0, d.total || 0);
        }});
      }
      btns.push({ label: 'Chọn màn', color: '#8b5cf6', act: function () {
        self.scene.start('MazeSelect');
      }});

      var bw = 120;
      var gap = 10;
      var totalW = btns.length * bw + (btns.length - 1) * gap;
      var bx = W / 2 - totalW / 2;
      var by = 250;
      btns.forEach(function (b) {
        var cx = bx + bw / 2;
        var rect = self.add.rectangle(cx, by, bw, 42, Phaser.Display.Color.HexStringToColor(b.color).color)
          .setInteractive({ useHandCursor: true });
        self.add.text(cx, by, b.label, {
          fontFamily: 'Baloo 2, cursive', fontSize: '15px', color: '#fff'
        }).setOrigin(0.5);
        rect.on('pointerup', b.act);
        bx += bw + gap;
      });
    }
  });

  function boot() {
    var mount = document.getElementById('gameMount');
    if (!mount) return;
    if (global.__kidMaze) {
      try { global.__kidMaze.destroy(true); } catch (e) {}
    }
    if (global.GameQuizUI) global.GameQuizUI.init();
    wireMazeTouch();
    wireMazeDomControls();

    if (global.GameAssets && global.GameAssets.Sfx) Sfx = global.GameAssets.Sfx;

    var p = (global.MazeLevels && global.MazeLevels.LEVELS[0]) ? global.MazeLevels.parseGrid(global.MazeLevels.LEVELS[0].grid) : { cols: 13, rows: 9 };
    var worldW = Math.max(520, p.cols * TILE);
    var worldH = Math.max(400, p.rows * TILE);

    var config = {
      type: Phaser.AUTO,
      parent: 'gameMount',
      width: worldW,
      height: worldH,
      backgroundColor: '#0f172a',
      scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
      scene: [MazeSelectScene, MazePlayScene, MazeResultScene]
    };

    global.__kidMaze = new Phaser.Game(config);
    if (global.KidGameOrientation && global.KidGameOrientation.refresh) {
      global.KidGameOrientation.refresh();
    }
  }

  global.GameMaze = { boot: boot };
})(window);
