/* ═══════════════════════════════════════════════════
   GAME-PROGRESS.JS — Lưu tiến độ game & mở khoá màn

   Dùng chung kho learning_progress với bài học (KidProgressSync).
   Namespace môn: 'game'. Mỗi màn là 1 "topic": "Màn {id}".

   learning_progress['game'].topics['Màn 1'] = {
     total, bestRun, completedRuns, totalStars, lastSessionAt
   }

   Export: window.GameProgress = {
     getLevelProgress, isLevelUnlocked, highestUnlocked, saveLevelResult
   }
═══════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  var SUBJECT_KEY = 'game';

  function topicKey(levelId) { return 'Màn ' + levelId; }

  function levelsList() {
    return (global.GameLevels && global.GameLevels.LEVELS) || [];
  }

  function levelIndexById(levelId) {
    var levels = levelsList();
    for (var i = 0; i < levels.length; i++) {
      if (levels[i].id === levelId) return i;
    }
    return -1;
  }

  function readAll() {
    try { return JSON.parse(localStorage.getItem('learning_progress') || '{}') || {}; }
    catch (e) { return {}; }
  }
  function writeAll(all) {
    try { localStorage.setItem('learning_progress', JSON.stringify(all || {})); } catch (e) {}
  }

  function getLevelProgress(levelId) {
    var all = readAll();
    var subj = all[SUBJECT_KEY] || { topics: {} };
    var t = (subj.topics || {})[topicKey(levelId)];
    return t || { total: 0, bestRun: 0, completedRuns: 0, totalStars: 0, lastSessionAt: 0 };
  }

  /* Màn đầu luôn mở; màn kế mở khi màn trước đã hoàn thành ít nhất 1 lần. */
  function isLevelUnlocked(levelId) {
    var levels = levelsList();
    var idx = levelIndexById(levelId);
    if (idx <= 0) return true;
    var prevId = levels[idx - 1] ? levels[idx - 1].id : levelId;
    var prev = getLevelProgress(prevId);
    return (prev.completedRuns || 0) >= 1;
  }

  function highestUnlocked() {
    var levels = levelsList();
    var top = levels.length ? levels[0].id : 1;
    for (var i = 0; i < levels.length; i++) {
      if (isLevelUnlocked(levels[i].id)) top = levels[i].id;
      else break;
    }
    return top;
  }

  /**
   * Lưu kết quả 1 lượt chơi.
   * @param {object} level  - object màn từ GameLevels.LEVELS
   * @param {object} opts   - { stars, finished, total }
   */
  function saveLevelResult(level, opts) {
    opts = opts || {};
    var all = readAll();
    var subj = all[SUBJECT_KEY] || { topics: {} };
    if (!subj.topics) subj.topics = {};
    var key = topicKey(level.id);
    var entry = subj.topics[key] || { total: 0, bestRun: 0, completedRuns: 0, totalStars: 0, lastSessionAt: 0 };

    var total = typeof opts.total === 'number' ? opts.total : (level.gates || 0);
    var stars = typeof opts.stars === 'number' ? opts.stars : 0;

    entry.total = Math.max(entry.total || 0, total);
    entry.bestRun = Math.max(entry.bestRun || 0, stars);
    entry.lastSessionAt = Date.now();
    if (stars > 0) entry.totalStars = (entry.totalStars || 0) + stars;
    if (opts.finished) {
      entry.completedRuns = (entry.completedRuns || 0) + 1;
      entry.bestRun = Math.max(entry.bestRun, total);
    }

    subj.topics[key] = entry;
    all[SUBJECT_KEY] = subj;
    writeAll(all);

    // Đồng bộ Firestore (cùng pattern lesson.js saveProgress)
    try {
      if (typeof firebase !== 'undefined' && firebase.apps && firebase.apps.length > 0) {
        var user = firebase.auth && firebase.auth().currentUser;
        if (user && firebase.firestore) {
          if (typeof KidProgressSync !== 'undefined' && KidProgressSync.pushToCloud) {
            KidProgressSync.pushToCloud(user.uid, all);
          } else {
            firebase.firestore().collection('learning_progress').doc(user.uid)
              .set({ progress: all, updatedAt: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true })
              .catch(function (err) { console.warn('[game-progress] firestore', err); });
          }
        }
      }
    } catch (e) { console.warn('[game-progress] save', e); }

    // Huy hiệu (nếu có hệ thống achievements)
    try {
      if (opts.finished && typeof global.checkAchievements === 'function') {
        global.checkAchievements();
      }
    } catch (e) {}

    return entry;
  }

  global.GameProgress = {
    SUBJECT_KEY: SUBJECT_KEY,
    getLevelProgress: getLevelProgress,
    isLevelUnlocked: isLevelUnlocked,
    highestUnlocked: highestUnlocked,
    saveLevelResult: saveLevelResult
  };
})(window);
