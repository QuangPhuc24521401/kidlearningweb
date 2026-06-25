/* ═══════════════════════════════════════════════════
   MAZE-THEMES.JS — Vẽ nền & trang trí theo chủ đề màn
═══════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  function hash(x, y, seed) {
    var n = (x * 374761 + y * 668265 + seed * 982451) | 0;
    return ((n ^ (n >> 13)) * 1274126177) >>> 0;
  }

  function decoPick(x, y, seed, list) {
    if (!list.length) return '';
    return list[hash(x, y, seed) % list.length];
  }

  var THEMES = {
    grass: {
      bg: '#87c95a',
      path: ['#9fd96d', '#7cb342', '#8bc34a'],
      wall: ['#2e7d32', '#388e3c', '#1b5e20'],
      deco: ['🌿', '🍀', '🌸', '🌼', '🦋', '🌱'],
      wallDeco: ['🌳', '🪨', '🌲'],
      exitGlow: 'rgba(255,235,59,0.45)'
    },
    jungle: {
      bg: '#1b4332',
      path: ['#2d6a4f', '#40916c', '#52b788'],
      wall: ['#1b4332', '#081c15', '#2d6a4f'],
      deco: ['🍃', '🌿', '🌺', '🐸', '🪴', '🌴'],
      wallDeco: ['🌴', '🪵', '🌳'],
      exitGlow: 'rgba(129,199,132,0.5)'
    },
    cave: {
      bg: '#1e293b',
      path: ['#475569', '#64748b', '#94a3b8'],
      wall: ['#0f172a', '#1e293b', '#334155'],
      deco: ['💎', '✨', '🪨', '🔦', '💧'],
      wallDeco: ['🪨', '⛰️', '🧊'],
      exitGlow: 'rgba(147,197,253,0.45)'
    },
    desert: {
      bg: '#eab308',
      path: ['#fbbf24', '#f59e0b', '#fcd34d'],
      wall: ['#b45309', '#92400e', '#78350f'],
      deco: ['🌵', '🏜️', '☀️', '🦎', '🪨', '🐪'],
      wallDeco: ['🪨', '🌵', '🏜️'],
      exitGlow: 'rgba(254,243,199,0.55)'
    },
    city: {
      bg: '#64748b',
      path: ['#94a3b8', '#cbd5e1', '#e2e8f0'],
      wall: ['#334155', '#475569', '#1e293b'],
      deco: ['🏮', '🪟', '🚩', '💡', '📜'],
      wallDeco: ['🧱', '🏰', '🪨'],
      exitGlow: 'rgba(196,181,253,0.5)'
    },
    inferno: {
      bg: '#7f1d1d',
      path: ['#b91c1c', '#dc2626', '#ef4444'],
      wall: ['#450a0a', '#7f1d1d', '#991b1b'],
      deco: ['🔥', '💥', '🌋', '⚡', '🔴'],
      wallDeco: ['🪨', '🔥', '🌋'],
      exitGlow: 'rgba(251,191,36,0.55)'
    }
  };

  function drawCell(ctx, theme, gx, gy, tile, isWall, isExit, seed) {
    var px = gx * tile;
    var py = gy * tile;
    var th = THEMES[theme] || THEMES.grass;
    var h = hash(gx, gy, seed);
    var pad = 1;

    if (isWall) {
      var wci = h % th.wall.length;
      var grad = ctx.createLinearGradient(px, py, px + tile, py + tile);
      grad.addColorStop(0, th.wall[wci]);
      grad.addColorStop(1, th.wall[(wci + 1) % th.wall.length]);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.roundRect(px + pad, py + pad, tile - pad * 2, tile - pad * 2, 6);
      ctx.fill();
      if (h % 5 === 0) {
        ctx.font = Math.floor(tile * 0.45) + 'px "Segoe UI Emoji", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(decoPick(gx, gy, seed + 9, th.wallDeco), px + tile / 2, py + tile / 2);
      }
      return;
    }

    var pci = h % th.path.length;
    var pgrad = ctx.createRadialGradient(
      px + tile / 2, py + tile / 2, 2,
      px + tile / 2, py + tile / 2, tile * 0.7
    );
    pgrad.addColorStop(0, th.path[pci]);
    pgrad.addColorStop(1, th.path[(pci + 1) % th.path.length]);
    ctx.fillStyle = pgrad;
    ctx.beginPath();
    ctx.roundRect(px + pad, py + pad, tile - pad * 2, tile - pad * 2, isExit ? 10 : 8);
    ctx.fill();

    if (isExit) {
      ctx.fillStyle = th.exitGlow;
      ctx.beginPath();
      ctx.roundRect(px + 2, py + 2, tile - 4, tile - 4, 10);
      ctx.fill();
    }

    if (h % 3 === 0 || h % 7 === 0) {
      ctx.font = Math.floor(tile * 0.38) + 'px "Segoe UI Emoji", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.globalAlpha = 0.85;
      ctx.fillText(decoPick(gx, gy, seed + 3, th.deco), px + tile / 2, py + tile / 2 + (h % 2 ? 2 : -2));
      ctx.globalAlpha = 1;
    }
  }

  function drawWorld(ctx, level, parsed, tile, seed) {
    var theme = level.theme || 'grass';
    var th = THEMES[theme] || THEMES.grass;
    var p = parsed;
    var mapW = p.cols * tile;
    var mapH = p.rows * tile;

    ctx.fillStyle = th.bg;
    ctx.fillRect(0, 0, mapW, mapH);

    for (var y = 0; y < p.rows; y++) {
      for (var x = 0; x < p.cols; x++) {
        var wall = p.wallMap[y][x];
        var isExit = (x === p.exit.x && y === p.exit.y);
        drawCell(ctx, theme, x, y, tile, wall, isExit, seed);
      }
    }

    ctx.font = 'bold ' + Math.floor(tile * 0.55) + 'px "Segoe UI Emoji", "Apple Color Emoji", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🚪', p.exit.px, p.exit.py);
  }

  global.MazeThemes = { drawWorld: drawWorld, THEMES: THEMES };
})(window);
