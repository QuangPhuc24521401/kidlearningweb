/* ═══════════════════════════════════════════════════
   PLATFORMER-SVG.JS — Nạp SVG → texture Phaser sắc nét
═══════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  var THEMES = ['grass', 'jungle', 'valley', 'desert', 'cave', 'inferno', 'city', 'heaven'];
  var DECOS = ['tree', 'bush', 'rock', 'flower', 'cactus', 'crystal', 'lamp', 'cloud'];
  var BASE = 'game/svg/';
  var SS = 2; /* supersample SVG raster */

  function svgUrl(name) { return BASE + name + '.svg'; }

  function rasterSvg(svgText, outW, outH) {
    return new Promise(function (resolve, reject) {
      var canvas = document.createElement('canvas');
      canvas.width = outW;
      canvas.height = outH;
      var ctx = canvas.getContext('2d');
      var img = new Image();
      var blob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' });
      var url = URL.createObjectURL(blob);
      img.onload = function () {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.clearRect(0, 0, outW, outH);
        ctx.drawImage(img, 0, 0, outW, outH);
        URL.revokeObjectURL(url);
        resolve(canvas);
      };
      img.onerror = function () {
        URL.revokeObjectURL(url);
        reject(new Error('SVG load failed'));
      };
      img.src = url;
    });
  }

  function fetchSvg(name) {
    return fetch(svgUrl(name)).then(function (r) {
      if (!r.ok) throw new Error('Missing ' + name);
      return r.text();
    });
  }

  function addCanvasTexture(scene, key, canvas) {
    if (scene.textures.exists(key)) scene.textures.remove(key);
    scene.textures.addCanvas(key, canvas);
  }

  function loadOne(scene, key, file, w, h) {
    return fetchSvg(file).then(function (svg) {
      return rasterSvg(svg, w * SS, h * SS).then(function (canvas) {
        addCanvasTexture(scene, key, canvas);
      });
    });
  }

  function loadAll(scene, done) {
    var jobs = [];
    THEMES.forEach(function (t) {
      jobs.push(loadOne(scene, 'svg_ground_' + t, 'tile-ground-' + t, 64, 64));
      jobs.push(loadOne(scene, 'svg_plat_' + t, 'tile-plat-' + t, 110, 28));
      jobs.push(loadOne(scene, 'svg_bg_' + t, 'bg-' + t, 960, 540));
    });
    DECOS.forEach(function (d) {
      jobs.push(loadOne(scene, 'svg_deco_' + d, 'deco-' + d, 96, 96));
    });
    jobs.push(loadOne(scene, 'svg_coin', 'coin', 34, 34));
    jobs.push(loadOne(scene, 'svg_spike', 'spike', 48, 40));
    jobs.push(loadOne(scene, 'svg_flag', 'flag', 40, 70));

    Promise.all(jobs).then(function () { done(); }).catch(function (err) {
      console.warn('[platformer-svg]', err);
      done();
    });
  }

  function groundKey(theme) {
    var k = 'svg_ground_' + (theme || 'grass');
    return k;
  }

  function platKey(theme) {
    return 'svg_plat_' + (theme || 'grass');
  }

  function bgKey(theme) {
    return 'svg_bg_' + (theme || 'grass');
  }

  function resolveKey(scene, key, fallback) {
    if (scene.textures.exists(key)) return key;
    return fallback;
  }

  function buildParallax(scene, theme, worldW, groundTop) {
    var bk = resolveKey(scene, bgKey(theme), 'sky');
    var far = scene.add.tileSprite(0, 0, worldW + 400, 540, bk)
      .setOrigin(0, 0).setScrollFactor(0.15).setDepth(-25);
    var mid = scene.add.tileSprite(0, 0, worldW + 400, 540, bk)
      .setOrigin(0, 0).setScrollFactor(0.35).setAlpha(0.55).setDepth(-20);
    return { objects: [far, mid], drift: [{ obj: far, dx: 0.06 }] };
  }

  function placeDecor(scene, theme, items, groundTop) {
    var placed = [];
    (items || []).forEach(function (d) {
      var key = resolveKey(scene, 'svg_deco_' + d.kind, null);
      if (!key) return;
      var img = scene.add.image(d.x, groundTop + (d.y || 0), key);
      img.setDisplaySize(d.w || 72, d.h || 72);
      img.setScrollFactor(d.sf != null ? d.sf : 0.85);
      img.setDepth(d.depth != null ? d.depth : -6);
      if (d.flip) img.setFlipX(true);
      if (d.tint) img.setTint(d.tint);
      placed.push(img);
    });
    return placed;
  }

  global.PlatformerSvg = {
    loadAll: loadAll,
    groundKey: groundKey,
    platKey: platKey,
    bgKey: bgKey,
    resolveKey: resolveKey,
    buildParallax: buildParallax,
    placeDecor: placeDecor,
    SS: SS
  };
})(window);
