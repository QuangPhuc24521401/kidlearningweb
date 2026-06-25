/* ═══════════════════════════════════════════════════
   PLATFORMER-MAPS.JS — Bản đồ thiết kế tay (8 màn)
═══════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  /**
   * Mỗi map: pits, decor, segments (đặt theo x tuyệt đối)
   * Segment types: stairs, islands, pit, crates, spikes, saw, goombas, spring, pipe, piperow, power, secretpipe, tower, movers, coins
   */
  var MAPS = {
    1: {
      decor: [
        { x: 180, kind: 'tree', y: -8 }, { x: 420, kind: 'bush' }, { x: 1100, kind: 'flower', y: -4 },
        { x: 1600, kind: 'tree', flip: true }, { x: 2400, kind: 'bush' }, { x: 3200, kind: 'tree' }
      ],
      pits: [[480, 580]],
      segments: [
        { x: 300, type: 'stairs' },
        { x: 720, type: 'crates' },
        { x: 1050, type: 'islands' },
        { x: 1480, type: 'goombas' },
        { x: 1950, type: 'spring' },
        { x: 2350, type: 'coins', n: 5, y: -100 }
      ]
    },
    2: {
      decor: [
        { x: 200, kind: 'tree' }, { x: 600, kind: 'tree', flip: true }, { x: 900, kind: 'bush' },
        { x: 1400, kind: 'flower' }, { x: 2100, kind: 'tree' }, { x: 2800, kind: 'bush' }, { x: 3500, kind: 'tree' }
      ],
      pits: [[520, 640], [2100, 2220]],
      segments: [
        { x: 350, type: 'stairs' },
        { x: 780, type: 'spikes' },
        { x: 1180, type: 'islands' },
        { x: 1580, type: 'goombas' },
        { x: 1980, type: 'pit' },
        { x: 2480, type: 'crates' },
        { x: 2880, type: 'spring' },
        { x: 3280, type: 'pipe' }
      ]
    },
    3: {
      decor: [
        { x: 250, kind: 'flower' }, { x: 700, kind: 'tree' }, { x: 1200, kind: 'rock' },
        { x: 1800, kind: 'bush' }, { x: 2600, kind: 'flower' }, { x: 3400, kind: 'tree' }
      ],
      pits: [[600, 720]],
      segments: [
        { x: 380, type: 'islands' },
        { x: 820, type: 'stairs' },
        { x: 1250, type: 'saw' },
        { x: 1680, type: 'goombas' },
        { x: 2100, type: 'spikegap' },
        { x: 2550, type: 'power' },
        { x: 2980, type: 'pipe' },
        { x: 3450, type: 'crates' }
      ]
    },
    4: {
      decor: [
        { x: 200, kind: 'cactus' }, { x: 650, kind: 'rock' }, { x: 1100, kind: 'cactus', flip: true },
        { x: 1700, kind: 'rock' }, { x: 2400, kind: 'cactus' }, { x: 3100, kind: 'rock' }, { x: 3800, kind: 'cactus' }
      ],
      pits: [[550, 680], [2300, 2440]],
      segments: [
        { x: 400, type: 'stairs' },
        { x: 850, type: 'pit' },
        { x: 1280, type: 'spikes' },
        { x: 1720, type: 'tower' },
        { x: 2150, type: 'goombas' },
        { x: 2580, type: 'saw' },
        { x: 3020, type: 'piperow' },
        { x: 3480, type: 'secretpipe' },
        { x: 3950, type: 'spring' }
      ]
    },
    5: {
      decor: [
        { x: 220, kind: 'crystal' }, { x: 680, kind: 'rock' }, { x: 1150, kind: 'crystal' },
        { x: 1750, kind: 'rock' }, { x: 2500, kind: 'crystal' }, { x: 3300, kind: 'rock' }
      ],
      pits: [[580, 700], [2500, 2620]],
      segments: [
        { x: 360, type: 'crates' },
        { x: 800, type: 'stairs' },
        { x: 1220, type: 'sawair' },
        { x: 1680, type: 'spikegap' },
        { x: 2120, type: 'goombas' },
        { x: 2560, type: 'pit' },
        { x: 3000, type: 'movers' },
        { x: 3480, type: 'power' },
        { x: 3920, type: 'secretpipe' }
      ]
    },
    6: {
      decor: [
        { x: 240, kind: 'rock' }, { x: 720, kind: 'rock', tint: 0xff7043 }, { x: 1300, kind: 'rock' },
        { x: 2000, kind: 'rock', tint: 0xff5722 }, { x: 2800, kind: 'rock' }, { x: 3600, kind: 'rock', tint: 0xff7043 }
      ],
      pits: [[620, 760], [2700, 2840]],
      segments: [
        { x: 400, type: 'spikes' },
        { x: 860, type: 'saw' },
        { x: 1300, type: 'tower' },
        { x: 1760, type: 'goombas' },
        { x: 2200, type: 'spikegap' },
        { x: 2660, type: 'sawair' },
        { x: 3120, type: 'movers' },
        { x: 3580, type: 'pit' },
        { x: 4040, type: 'secretpipe' },
        { x: 4500, type: 'power' }
      ]
    },
    7: {
      decor: [
        { x: 200, kind: 'lamp' }, { x: 700, kind: 'lamp' }, { x: 1250, kind: 'rock' },
        { x: 1900, kind: 'lamp' }, { x: 2700, kind: 'lamp' }, { x: 3500, kind: 'rock' }, { x: 4200, kind: 'lamp' }
      ],
      pits: [[640, 780], [2900, 3040]],
      segments: [
        { x: 420, type: 'piperow' },
        { x: 900, type: 'stairs' },
        { x: 1360, type: 'saw' },
        { x: 1820, type: 'tower' },
        { x: 2280, type: 'goombas' },
        { x: 2740, type: 'sawair' },
        { x: 3200, type: 'spikegap' },
        { x: 3660, type: 'movers' },
        { x: 4120, type: 'secretpipe' },
        { x: 4580, type: 'power' }
      ]
    },
    8: {
      decor: [
        { x: 250, kind: 'cloud', y: -120, sf: 0.5 }, { x: 600, kind: 'cloud', y: -80, sf: 0.45 },
        { x: 1100, kind: 'flower' }, { x: 1800, kind: 'cloud', y: -100, sf: 0.5 },
        { x: 2600, kind: 'flower' }, { x: 3400, kind: 'cloud', y: -90, sf: 0.45 }, { x: 4200, kind: 'flower' }
      ],
      pits: [[680, 820], [3100, 3240]],
      segments: [
        { x: 450, type: 'islands' },
        { x: 950, type: 'stairs' },
        { x: 1420, type: 'movers' },
        { x: 1880, type: 'sawair' },
        { x: 2340, type: 'goombas' },
        { x: 2800, type: 'tower' },
        { x: 3260, type: 'spikegap' },
        { x: 3720, type: 'pit' },
        { x: 4180, type: 'secretpipe' },
        { x: 4640, type: 'power' },
        { x: 5100, type: 'spring' }
      ]
    }
  };

  function defaultMap(levelId) {
    return {
      decor: [{ x: 300, kind: 'tree' }, { x: 900, kind: 'bush' }],
      pits: [],
      segments: [
        { x: 400, type: 'stairs' },
        { x: 900, type: 'goombas' },
        { x: 1400, type: 'coins', n: 4, y: -90 }
      ]
    };
  }

  function getMap(level) {
    var id = level && level.id ? level.id : 1;
    if (level && level.isTeacherLevel) return defaultMap(id);
    return MAPS[id] || MAPS[1] || defaultMap(id);
  }

  function inGateZone(x, gateXs, margin, flagX) {
    for (var z = 0; z < gateXs.length; z++) {
      if (Math.abs(x - gateXs[z]) < margin) return true;
    }
    return x > flagX - 150;
  }

  function applySegment(seg, F, gateXs, flagX) {
    var x = seg.x;
    if (inGateZone(x, gateXs, 178, flagX)) return;
    var fn = F[seg.type];
    if (fn) {
      fn(x);
      return;
    }
    if (seg.type === 'coins' && F.coins) {
      F.coins(x, seg.n || 3, seg.y || -80);
    }
  }

  /**
   * Dựng thế giới từ bản đồ SVG + segment thiết kế tay.
   * ctx: { scene, level, theme, groundTop, gateXs, flagX, F, PS }
   */
  function buildWorld(ctx) {
    var map = getMap(ctx.level);
    var PS = global.PlatformerSvg;
    var decorItems = (map.decor || []).slice();

    if (PS && PS.placeDecor) {
      var decoPlaced = PS.placeDecor(ctx.scene, ctx.level.theme, decorItems, ctx.groundTop);
      ctx.scene._terrainDecor = (ctx.scene._terrainDecor || []).concat(decoPlaced);
    }

    (map.pits || []).forEach(function (p) {
      if (ctx.F.addPit) ctx.F.addPit(p[0], p[1]);
    });

    (map.segments || []).forEach(function (seg) {
      applySegment(seg, ctx.F, ctx.gateXs, ctx.flagX);
    });
  }

  global.PlatformerMaps = {
    MAPS: MAPS,
    getMap: getMap,
    buildWorld: buildWorld
  };
})(window);
