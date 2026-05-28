/**
 * PROGRESS-SYNC.JS — Đồng bộ tiến độ học localStorage ↔ Firestore
 *
 * Collection: learning_progress/{uid}
 *   • progress     — object theo môn → topics → { total, bestRun, completedRuns, totalStars, … }
 *   • achievements — map id → timestamp (do achievements.js ghi)
 *
 * Chiến lược merge: lấy MAX từng chỉ số giữa cloud và local (không ghi đè thấp hơn).
 *
 * API (window.KidProgressSync):
 *   readLocal / writeLocal / mergeTopicProgress
 *   pullFromCloud(uid) → Promise<{ progress, achievements, userData }>
 *   pushToCloud(uid, progress)
 *
 * Lưu ý: menu.js tự gọi KidProgressSync.pullFromCloud(uid) sau khi đăng nhập.
 */
(function(global){
  'use strict';

  function readLocal(){
    try{ return JSON.parse(localStorage.getItem('learning_progress') || '{}') || {}; }
    catch(e){ return {}; }
  }

  function writeLocal(data){
    try{ localStorage.setItem('learning_progress', JSON.stringify(data || {})); }catch(e){}
  }

  function mergeTopicProgress(cloud, local){
    var merged = {};
    var subjects = new Set(Object.keys(cloud || {}).concat(Object.keys(local || {})));
    subjects.forEach(function(sub){
      var c = (cloud && cloud[sub]) || {};
      var l = (local && local[sub]) || {};
      var cTop = c.topics || {};
      var lTop = l.topics || {};
      var mTop = {};
      var topicNames = new Set(Object.keys(cTop).concat(Object.keys(lTop)));
      topicNames.forEach(function(tn){
        var ct = cTop[tn] || {};
        var lt = lTop[tn] || {};
        mTop[tn] = {
          total:         Math.max(ct.total         || 0, lt.total         || 0),
          bestRun:       Math.max(ct.bestRun       || 0, lt.bestRun       || 0),
          completedRuns: Math.max(ct.completedRuns || 0, lt.completedRuns || 0),
          totalStars:    Math.max(ct.totalStars    || 0, lt.totalStars    || 0),
          lastSessionAt: Math.max(ct.lastSessionAt || 0, lt.lastSessionAt || 0)
        };
      });
      merged[sub] = { topics: mTop };
    });
    return merged;
  }

  function pushToCloud(uid, progress){
    return new Promise(function(resolve){
      try{
        if(!uid || typeof firebase === 'undefined' || !firebase.firestore){
          resolve();
          return;
        }
        firebase.firestore()
          .collection('learning_progress')
          .doc(uid)
          .set({
            progress: progress || {},
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
          }, { merge: true })
          .then(function(){ resolve(); })
          .catch(function(err){
            console.warn('[progress-sync] push', err);
            resolve();
          });
      }catch(e){
        resolve();
      }
    });
  }

  /**
   * Tải Firestore, gộp với local (MAX từng chỉ số), lưu local và đẩy lại cloud.
   * @returns {Promise<{progress: object, achievements: object|null, userData: object|null}>}
   */
  function pullFromCloud(uid){
    return new Promise(function(resolve){
      try{
        if(!uid || typeof firebase === 'undefined' || !firebase.firestore){
          resolve({ progress: readLocal(), achievements: null, userData: null });
          return;
        }
        var db = firebase.firestore();
        Promise.all([
          db.collection('learning_progress').doc(uid).get(),
          db.collection('users').doc(uid).get()
        ])
          .then(function(results){
            var snap = results[0];
            var userSnap = results[1];
            var userData = (userSnap && userSnap.exists) ? (userSnap.data() || {}) : null;
            var doc = (snap && snap.exists) ? (snap.data() || {}) : {};
            var achievements = doc.achievements || null;
            var cloud = doc.progress;
            var local = readLocal();
            var merged = local;

            if(cloud && typeof cloud === 'object'){
              merged = mergeTopicProgress(cloud, local);
              writeLocal(merged);
            }

            pushToCloud(uid, merged).then(function(){
              resolve({ progress: merged, achievements: achievements, userData: userData });
            });
          })
          .catch(function(err){
            console.warn('[progress-sync] pull', err);
            resolve({ progress: readLocal(), achievements: null, userData: null });
          });
      }catch(e){
        resolve({ progress: readLocal(), achievements: null, userData: null });
      }
    });
  }

  global.KidProgressSync = {
    readLocal: readLocal,
    writeLocal: writeLocal,
    mergeTopicProgress: mergeTopicProgress,
    pullFromCloud: pullFromCloud,
    pushToCloud: pushToCloud
  };
})(window);
