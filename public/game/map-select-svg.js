/* ═══════════════════════════════════════════════════
   MAP-SELECT-SVG.JS — SVG sắc nét cho bản đồ chọn màn
═══════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  var BASE = 'game/svg/map/';
  var SS = 2;
  var THEMES = ['grass', 'jungle', 'valley', 'desert', 'cave', 'inferno', 'city', 'heaven'];

  function fetchSvg(file) {
    return fetch(BASE + file + '.svg').then(function (r) {
      if (!r.ok) throw new Error('Missing ' + file);
      return r.text();
    });
  }

  function rasterSvg(svgText, outW, outH) {
    return new Promise(function (resolve, reject) {
      var canvas = document.createElement('canvas');
      canvas.width = outW * SS;
      canvas.height = outH * SS;
      var ctx = canvas.getContext('2d');
      var img = new Image();
      var blob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' });
      var url = URL.createObjectURL(blob);
      img.onload = function () {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(url);
        resolve(canvas);
      };
      img.onerror = function () { URL.revokeObjectURL(url); reject(new Error('SVG raster fail')); };
      img.src = url;
    });
  }

  function addTex(scene, key, canvas) {
    if (scene.textures.exists(key)) scene.textures.remove(key);
    scene.textures.addCanvas(key, canvas);
  }

  function loadOne(scene, key, file, w, h) {
    return fetchSvg(file).then(function (svg) {
      return rasterSvg(svg, w, h).then(function (c) { addTex(scene, key, c); });
    });
  }

  /** Chỉ nạp asset cho màn bản đồ kho báu — không ảnh hưởng gameplay */
  function loadMapAssets(scene, done) {
    var jobs = [
      loadOne(scene, 'map_ocean', 'ocean', 960, 540),
      loadOne(scene, 'map_compass', 'compass', 72, 72),
      loadOne(scene, 'map_treasure', 'treasure', 96, 96),
      loadOne(scene, 'map_boat', 'boat', 64, 64)
    ];
    THEMES.forEach(function (t) {
      jobs.push(loadOne(scene, 'map_island_' + t, 'island-' + t, 140, 140));
    });
    Promise.all(jobs).then(function () { done(); }).catch(function (e) {
      console.warn('[map-select-svg]', e);
      done();
    });
  }

  function islandKey(theme) {
    return 'map_island_' + (theme || 'grass');
  }

  function has(scene, key) {
    return scene.textures.exists(key);
  }

  global.MapSelectSvg = {
    loadMapAssets: loadMapAssets,
    islandKey: islandKey,
    has: has
  };
})(window);
