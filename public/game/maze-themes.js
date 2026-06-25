/* ═══════════════════════════════════════════════════
   MAZE-THEMES.JS — Nền tương phản cao + sprite trang trí
═══════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  function hash(x, y, seed) {
    var n = (x * 374761 + y * 668265 + seed * 982451) | 0;
    return ((n ^ (n >> 13)) * 1274126177) >>> 0;
  }

  var THEMES = {
    grass: {
      bg: '#6daf3c',
      path: ['#e8f5c8', '#d4ed9a', '#c5e384'],
      pathEdge: 'rgba(139,195,74,0.55)',
      wall: ['#1b4d1a', '#0d3310', '#245c22'],
      wallEdge: 'rgba(0,0,0,0.45)',
      exitGlow: 'rgba(255,235,59,0.55)'
    },
    jungle: {
      bg: '#0f2918',
      path: ['#b8e6c8', '#8fd4a8', '#6bc48a'],
      pathEdge: 'rgba(46,125,50,0.5)',
      wall: ['#041208', '#0a1f0f', '#143d20'],
      wallEdge: 'rgba(0,0,0,0.5)',
      exitGlow: 'rgba(129,199,132,0.55)'
    },
    cave: {
      bg: '#0c1220',
      path: ['#d5dde8', '#b8c4d4', '#9aa8bc'],
      pathEdge: 'rgba(100,116,139,0.45)',
      wall: ['#020408', '#0a1018', '#1a2432'],
      wallEdge: 'rgba(0,0,0,0.55)',
      exitGlow: 'rgba(147,197,253,0.5)'
    },
    desert: {
      bg: '#c8871a',
      path: ['#fff4cc', '#ffe08a', '#f5c842'],
      pathEdge: 'rgba(180,83,9,0.4)',
      wall: ['#5c2e05', '#78350f', '#92400e'],
      wallEdge: 'rgba(60,20,0,0.45)',
      exitGlow: 'rgba(254,243,199,0.6)'
    },
    city: {
      bg: '#3d4f63',
      path: ['#f1f5f9', '#e2e8f0', '#cbd5e1'],
      pathEdge: 'rgba(71,85,105,0.4)',
      wall: ['#0f172a', '#1e293b', '#334155'],
      wallEdge: 'rgba(0,0,0,0.5)',
      exitGlow: 'rgba(196,181,253,0.55)'
    },
    inferno: {
      bg: '#3b0a0a',
      path: ['#fecaca', '#fca5a5', '#f87171'],
      pathEdge: 'rgba(127,29,29,0.45)',
      wall: ['#1a0303', '#450a0a', '#7f1d1d'],
      wallEdge: 'rgba(0,0,0,0.55)',
      exitGlow: 'rgba(251,191,36,0.6)'
    }
  };

  function drawCell(ctx, theme, gx, gy, tile, isWall, isExit, seed) {
    var px = gx * tile;
    var py = gy * tile;
    var th = THEMES[theme] || THEMES.grass;
    var h = hash(gx, gy, seed);
    var pad = 2;
    var inner = tile - pad * 2;

    if (isWall) {
      var wci = h % th.wall.length;
      var grad = ctx.createLinearGradient(px, py, px + tile, py + tile);
      grad.addColorStop(0, th.wall[wci]);
      grad.addColorStop(0.55, th.wall[(wci + 1) % th.wall.length]);
      grad.addColorStop(1, th.wall[(wci + 2) % th.wall.length]);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.roundRect(px + pad, py + pad, inner, inner, 7);
      ctx.fill();
      ctx.strokeStyle = th.wallEdge;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(px + pad + 0.5, py + pad + 0.5, inner - 1, inner - 1, 7);
      ctx.stroke();
      if (global.MazeAssets) {
        global.MazeAssets.drawWallDeco(ctx, theme, gx, gy, tile, seed);
      }
      return;
    }

    var pci = h % th.path.length;
    var cx = px + tile / 2;
    var cy = py + tile / 2;
    var pgrad = ctx.createRadialGradient(cx, cy, 1, cx, cy, tile * 0.75);
    pgrad.addColorStop(0, th.path[pci]);
    pgrad.addColorStop(1, th.path[(pci + 1) % th.path.length]);
    ctx.fillStyle = pgrad;
    ctx.beginPath();
    ctx.roundRect(px + pad, py + pad, inner, inner, isExit ? 11 : 9);
    ctx.fill();
    ctx.strokeStyle = th.pathEdge;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(px + pad + 0.5, py + pad + 0.5, inner - 1, inner - 1, isExit ? 11 : 9);
    ctx.stroke();

    if (isExit) {
      ctx.fillStyle = th.exitGlow;
      ctx.beginPath();
      ctx.roundRect(px + 4, py + 4, tile - 8, tile - 8, 11);
      ctx.fill();
    }

    if (global.MazeAssets && !isExit) {
      global.MazeAssets.drawDeco(ctx, theme, gx, gy, tile, seed);
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
  }

  global.MazeThemes = { drawWorld: drawWorld, THEMES: THEMES };
})(window);
