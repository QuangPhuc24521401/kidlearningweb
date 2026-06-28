/* ═══════════════════════════════════════════════════
   SORT-PROGRESS.JS
═══════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  var SUBJECT_KEY = 'game_sort';

  function topicKey(levelId) { return 'Phân loại ' + levelId; }

  function levelsList() {
    return (global.SortLevels && global.SortLevels.LEVELS) || [];
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

  function isLevelUnlocked(levelId) {
    var levels = levelsList();
    var idx = levelIndexById(levelId);
    if (idx <= 0) return true;
    var prevId = levels[idx - 1] ? levels[idx - 1].id : levelId;
    return (getLevelProgress(prevId).completedRuns || 0) >= 1;
  }

  function saveLevelResult(level, opts) {
    opts = opts || {};
    var all = readAll();
    var subj = all[SUBJECT_KEY] || { topics: {} };
    if (!subj.topics) subj.topics = {};
    var key = topicKey(level.id);
    var entry = subj.topics[key] || { total: 0, bestRun: 0, completedRuns: 0, totalStars: 0, lastSessionAt: 0 };
    var total = typeof opts.total === 'number' ? opts.total : (level.gates || 1);
    var stars = typeof opts.stars === 'number' ? opts.stars : 0;
    entry.total = Math.max(entry.total || 0, total);
    entry.bestRun = Math.max(entry.bestRun || 0, stars);
    entry.lastSessionAt = Date.now();
    if (stars > 0) entry.totalStars = (entry.totalStars || 0) + stars;
    if (opts.finished) {
      entry.completedRuns = (entry.completedRuns || 0) + 1;
      entry.bestRun = Math.max(entry.bestRun, stars);
    }
    subj.topics[key] = entry;
    all[SUBJECT_KEY] = subj;
    writeAll(all);
    try {
      if (typeof firebase !== 'undefined' && firebase.apps && firebase.apps.length > 0) {
        var user = firebase.auth && firebase.auth().currentUser;
        if (user && firebase.firestore && typeof KidProgressSync !== 'undefined' && KidProgressSync.pushToCloud) {
          KidProgressSync.pushToCloud(user.uid, all);
        }
      }
    } catch (e) {}
    try {
      if (opts.finished && typeof global.syncAchievementsAfterGameSave === 'function') {
        global.syncAchievementsAfterGameSave('sort');
      }
    } catch (e) {}
    return entry;
  }

  global.SortProgress = {
    SUBJECT_KEY: SUBJECT_KEY,
    getLevelProgress: getLevelProgress,
    isLevelUnlocked: isLevelUnlocked,
    saveLevelResult: saveLevelResult
  };
})(window);
