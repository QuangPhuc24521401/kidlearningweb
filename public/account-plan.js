/* ═══════════════════════════════════════════════════
   ACCOUNT-PLAN.JS — Gói Basic / Pro
═══════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  var PLAN_KEY = 'userPlan';

  function readCached() {
    try { return localStorage.getItem(PLAN_KEY) || 'basic'; } catch (e) { return 'basic'; }
  }

  function writeCached(plan) {
    try { localStorage.setItem(PLAN_KEY, plan === 'pro' ? 'pro' : 'basic'); } catch (e) {}
  }

  function isTeacher() {
    try { return localStorage.getItem('userRole') === 'teacher'; } catch (e) { return false; }
  }

  function isPro() {
    if (isTeacher()) return true;
    return readCached() === 'pro';
  }

  function getPlan() {
    return isPro() ? 'pro' : 'basic';
  }

  function syncFromUserDoc(data) {
    data = data || {};
    var plan = data.plan === 'pro' ? 'pro' : 'basic';
    if (data.role === 'teacher') plan = 'pro';
    writeCached(plan);
    return plan;
  }

  function pullFromCloud() {
    return new Promise(function (resolve) {
      if (typeof firebase === 'undefined' || !firebase.auth || !firebase.firestore) {
        resolve(getPlan());
        return;
      }
      var user = firebase.auth().currentUser;
      if (!user) { resolve(getPlan()); return; }
      firebase.firestore().collection('users').doc(user.uid).get()
        .then(function (snap) {
          var data = snap && snap.exists ? snap.data() : {};
          resolve(syncFromUserDoc(data));
        })
        .catch(function () { resolve(getPlan()); });
    });
  }

  function upgradeToPro() {
    return new Promise(function (resolve, reject) {
      if (typeof firebase === 'undefined' || !firebase.auth || !firebase.firestore) {
        reject(new Error('Chưa kết nối tài khoản.'));
        return;
      }
      var user = firebase.auth().currentUser;
      if (!user) { reject(new Error('Bạn cần đăng nhập trước.')); return; }
      firebase.firestore().collection('users').doc(user.uid).set({
        plan: 'pro',
        proSince: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true })
        .then(function () {
          writeCached('pro');
          resolve('pro');
        })
        .catch(reject);
    });
  }

  global.KidAccountPlan = {
    isPro: isPro,
    getPlan: getPlan,
    syncFromUserDoc: syncFromUserDoc,
    pullFromCloud: pullFromCloud,
    upgradeToPro: upgradeToPro
  };
})(window);
