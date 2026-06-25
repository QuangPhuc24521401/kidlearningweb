/* ═══════════════════════════════════════════════════
   DIGGER-ASSETS.JS — Vẽ sprite đào vàng (canvas)
═══════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  function roundRect(ctx, x, y, w, h, r) {
    if (ctx.roundRect) {
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, r);
      return;
    }
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function drawGoldNugget(ctx, s, variant) {
    var c = variant === 'l' ? '#ffb300' : variant === 'm' ? '#ffc107' : '#ffd54a';
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.moveTo(s * 0.2, s * 0.55);
    ctx.lineTo(s * 0.35, s * 0.2);
    ctx.lineTo(s * 0.65, s * 0.18);
    ctx.lineTo(s * 0.82, s * 0.45);
    ctx.lineTo(s * 0.7, s * 0.78);
    ctx.lineTo(s * 0.3, s * 0.8);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.beginPath();
    ctx.ellipse(s * 0.42, s * 0.38, s * 0.12, s * 0.08, -0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#e65100';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  function drawRock(ctx, s) {
    ctx.fillStyle = '#546e7a';
    ctx.beginPath();
    ctx.moveTo(s * 0.12, s * 0.7);
    ctx.lineTo(s * 0.28, s * 0.25);
    ctx.lineTo(s * 0.62, s * 0.2);
    ctx.lineTo(s * 0.88, s * 0.55);
    ctx.lineTo(s * 0.72, s * 0.82);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#90a4ae';
    ctx.beginPath();
    ctx.moveTo(s * 0.3, s * 0.65);
    ctx.lineTo(s * 0.42, s * 0.38);
    ctx.lineTo(s * 0.58, s * 0.42);
    ctx.closePath();
    ctx.fill();
  }

  function drawDiamond(ctx, s) {
    ctx.fillStyle = '#4fc3f7';
    ctx.beginPath();
    ctx.moveTo(s * 0.5, s * 0.1);
    ctx.lineTo(s * 0.78, s * 0.42);
    ctx.lineTo(s * 0.5, s * 0.88);
    ctx.lineTo(s * 0.22, s * 0.42);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.65)';
    ctx.fillRect(s * 0.46, s * 0.22, s * 0.04, s * 0.35);
    ctx.strokeStyle = '#0288d1';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  function drawHook(ctx, s) {
    ctx.strokeStyle = '#546e7a';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(s * 0.5, s * 0.05);
    ctx.lineTo(s * 0.5, s * 0.55);
    ctx.stroke();
    ctx.fillStyle = '#78909c';
    ctx.beginPath();
    ctx.arc(s * 0.5, s * 0.68, s * 0.18, Math.PI * 0.15, Math.PI * 0.85);
    ctx.lineTo(s * 0.62, s * 0.78);
    ctx.arc(s * 0.5, s * 0.68, s * 0.22, Math.PI * 0.85, Math.PI * 0.15, true);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#b0bec5';
    ctx.beginPath();
    ctx.arc(s * 0.5, s * 0.68, s * 0.1, Math.PI * 0.2, Math.PI * 0.8);
    ctx.stroke();
  }

  function drawMiner(ctx, s, x, y) {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = '#5d4037';
    roundRect(ctx, s * 0.28, s * 0.42, s * 0.44, s * 0.38, 8);
    ctx.fill();
    ctx.fillStyle = '#ffcc80';
    ctx.beginPath();
    ctx.arc(s * 0.5, s * 0.32, s * 0.16, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f9a825';
    roundRect(ctx, s * 0.22, s * 0.14, s * 0.56, s * 0.14, 6);
    ctx.fill();
    roundRect(ctx, s * 0.34, s * 0.06, s * 0.32, s * 0.1, 4);
    ctx.fill();
    ctx.fillStyle = '#37474f';
    ctx.fillRect(s * 0.18, s * 0.26, s * 0.12, s * 0.04);
    ctx.fillRect(s * 0.7, s * 0.26, s * 0.12, s * 0.04);
    ctx.restore();
  }

  function drawBag(ctx, s, x, y, fillRatio) {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = '#8d6e63';
    roundRect(ctx, s * 0.15, s * 0.35, s * 0.7, s * 0.55, 10);
    ctx.fill();
    ctx.fillStyle = '#a1887f';
    roundRect(ctx, s * 0.22, s * 0.42, s * 0.56, s * 0.42, 8);
    ctx.fill();
    ctx.fillStyle = '#ffd54a';
    var h = s * 0.38 * Math.max(0, Math.min(1, fillRatio));
    roundRect(ctx, s * 0.24, s * 0.8 - h, s * 0.52, h, 6);
    ctx.fill();
    ctx.strokeStyle = '#5d4037';
    ctx.lineWidth = 2;
    roundRect(ctx, s * 0.15, s * 0.35, s * 0.7, s * 0.55, 10);
    ctx.stroke();
    ctx.restore();
  }

  function drawSkyGround(ctx, w, h, groundY) {
    var grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#87ceeb');
    grad.addColorStop(groundY / h, '#b3e5fc');
    grad.addColorStop(groundY / h, '#8d6e63');
    grad.addColorStop((groundY + 8) / h, '#6d4c41');
    grad.addColorStop(1, '#3e2723');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = '#5d4037';
    ctx.fillRect(0, groundY, w, 10);
    ctx.fillStyle = '#4caf50';
    ctx.fillRect(0, groundY - 4, w, 8);

    ctx.fillStyle = 'rgba(0,0,0,0.08)';
    for (var i = 0; i < w; i += 48) {
      ctx.fillRect(i, groundY + 14, 24, 3);
    }
  }

  function drawItem(ctx, item) {
    var s = item.radius * 2.2;
    ctx.save();
    ctx.translate(item.x, item.y);
    if (item.type === 'rock') drawRock(ctx, s);
    else if (item.type === 'diamond') drawDiamond(ctx, s);
    else if (item.type === 'gold_l') drawGoldNugget(ctx, s, 'l');
    else if (item.type === 'gold_m') drawGoldNugget(ctx, s, 'm');
    else drawGoldNugget(ctx, s, 's');
    ctx.restore();
  }

  global.DiggerAssets = {
    drawSkyGround: drawSkyGround,
    drawMiner: drawMiner,
    drawHook: drawHook,
    drawItem: drawItem,
    drawBag: drawBag
  };
})(window);
