/**
 * Đấu trường trực tuyến — nhiều người, một phiên có thời hạn, bảng điểm realtime.
 * Firestore: arena_sessions/live (một doc cố định)
 *
 * Rules (ví dụ):
 * match /arena_sessions/{docId} {
 *   allow read: if request.auth != null;
 *   allow create, update, delete: if request.auth != null;
 * }
 */
(function(){
  var SUBJECTS = ['nhan_biet','tu_duy','am_nhac','ghep_hinh','my_thuat','ngon_ngu'];
  var ROUND_MS = 16000;
  var ARENA_DURATION_MS = 4 * 60 * 1000;
  var COOLDOWN_AFTER_MS = 8000;

  var arenaRef = null;
  var unsub = null;
  var tickTimer = null;
  var resolveTimer = null;
  var lastData = null;

  function $(id){ return document.getElementById(id); }

  function cloneQuestion(q){
    return {
      question: q.question,
      answers: q.answers.slice(),
      correctAnswer: q.correctAnswer,
      topic: q.topic || ''
    };
  }

  function pickRandomQuestion(){
    var pool = [];
    SUBJECTS.forEach(function(k){
      (window.LESSON_DATA[k] || []).forEach(function(q){
        pool.push(cloneQuestion(q));
      });
    });
    if(!pool.length) return null;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  function displayName(){
    return (localStorage.getItem('userDisplayName') || '').trim() || 'Bé học sinh';
  }

  function deepCloneParticipants(p){
    var o = {};
    Object.keys(p || {}).forEach(function(uid){
      o[uid] = Object.assign({}, p[uid]);
    });
    return o;
  }

  function stopTimers(){
    if(tickTimer){ clearInterval(tickTimer); tickTimer = null; }
    if(resolveTimer){ clearInterval(resolveTimer); resolveTimer = null; }
  }

  function ensureArenaRef(){
    if(!arenaRef && firebase.firestore){
      arenaRef = firebase.firestore().collection('arena_sessions').doc('live');
    }
    return arenaRef;
  }

  function createInitialSession(){
    var ref = ensureArenaRef();
    if(!ref) return;
    var now = Date.now();
    var nq = pickRandomQuestion();
    if(!nq) return;
    ref.set({
      sessionKey: 's_' + now,
      status: 'active',
      startedAt: now,
      endsAt: now + ARENA_DURATION_MS,
      currentRound: 1,
      question: nq,
      roundDeadline: now + ROUND_MS,
      roundStartedAt: now,
      picks: {},
      participants: {},
      winnerUid: null,
      winnerName: null,
      winnerScore: 0,
      honorReward: 15,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }).catch(function(e){ console.warn('[arena] create', e); });
  }

  function maybeSpawnNextSession(d){
    if(!d || d.status !== 'finished') return;
    if(Date.now() < (d.endsAt || 0) + COOLDOWN_AFTER_MS) return;
    var ref = ensureArenaRef();
    firebase.firestore().runTransaction(function(tx){
      return tx.get(ref).then(function(doc){
        if(!doc.exists) return;
        var x = doc.data();
        if(x.status !== 'finished') return;
        if(Date.now() < (x.endsAt || 0) + COOLDOWN_AFTER_MS) return;
        var now = Date.now();
        var nq = pickRandomQuestion();
        if(!nq) return;
        tx.set(ref, {
          sessionKey: 's_' + now,
          status: 'active',
          startedAt: now,
          endsAt: now + ARENA_DURATION_MS,
          currentRound: 1,
          question: nq,
          roundDeadline: now + ROUND_MS,
          roundStartedAt: now,
          picks: {},
          participants: {},
          winnerUid: null,
          winnerName: null,
          winnerScore: 0,
          honorReward: 15,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      });
    }).catch(function(e){ console.warn('[arena] spawn', e); });
  }

  function joinArena(){
    var user = firebase.auth().currentUser;
    var ref = ensureArenaRef();
    if(!user || !ref) return;
    var uid = user.uid;
    ref.get().then(function(snap){
      var d = snap.exists ? snap.data() : {};
      var parts = d.participants || {};
      if(parts[uid]){
        return ref.update({
          ['participants.' + uid + '.displayName']: displayName()
        }).catch(function(e){ console.warn('[arena] join', e); });
      }
      var up = {};
      up['participants.' + uid] = {
        displayName: displayName(),
        score: 0,
        tieTime: 0,
        joinedAt: Date.now()
      };
      return ref.set(up, { merge: true }).catch(function(e){ console.warn('[arena] join', e); });
    }).catch(function(e){ console.warn('[arena] join get', e); });
  }

  function submitPick(answer){
    var user = firebase.auth().currentUser;
    var ref = ensureArenaRef();
    if(!user || !ref || !lastData) return;
    if(lastData.status !== 'active' || !lastData.question) return;
    var picks = lastData.picks || {};
    if(picks[user.uid]) return;
    var btns = document.querySelectorAll('#arenaAnswers .pvp-ans');
    for(var i = 0; i < btns.length; i++) btns[i].disabled = true;
    var t = Date.now();
    var up = {};
    up['picks.' + user.uid] = { a: answer, t: t };
    ref.update(up).catch(function(e){ console.warn('[arena] pick', e); });
  }

  function pickWinner(participants){
    var uids = Object.keys(participants || {});
    if(!uids.length) return { uid: null, name: null, score: 0 };
    var bestUid = null;
    var bestScore = -1;
    var bestTie = Infinity;
    uids.forEach(function(uid){
      var p = participants[uid];
      var s = p.score || 0;
      var tt = p.tieTime || 0;
      if(s > bestScore || (s === bestScore && tt < bestTie)){
        bestScore = s;
        bestTie = tt;
        bestUid = uid;
      }
    });
    var name = bestUid ? (participants[bestUid].displayName || 'Bé') : null;
    return { uid: bestUid, name: name, score: bestScore };
  }

  function attemptResolve(){
    var ref = ensureArenaRef();
    if(!ref || !lastData || lastData.status !== 'active') return;
    firebase.firestore().runTransaction(function(tx){
      return tx.get(ref).then(function(doc){
        if(!doc.exists) return;
        var x = doc.data();
        if(x.status !== 'active' || !x.question) return;
        var pks = x.picks || {};
        var k2 = Object.keys(pks);
        var dl = x.roundDeadline || 0;
        var now = Date.now();
        var tout = now > dl + 500;
        var sessionShouldEnd = now >= (x.endsAt || 0);
        if(k2.length === 0 && !tout && !sessionShouldEnd) return;

        var correct = x.question.correctAnswer;
        var rs = x.roundStartedAt || (dl - ROUND_MS);
        var parts = deepCloneParticipants(x.participants || {});

        k2.forEach(function(uid){
          var pk = pks[uid];
          if(!pk || !parts[uid]) return;
          if(pk.a === correct){
            parts[uid].score = (parts[uid].score || 0) + 1;
            var reaction = (typeof pk.t === 'number' ? pk.t : now) - rs;
            parts[uid].tieTime = (parts[uid].tieTime || 0) + Math.max(0, reaction);
          }
        });

        var timeLeft = (x.endsAt || 0) - now;
        var nextOver = sessionShouldEnd || timeLeft < 4000;

        if(nextOver){
          var w = pickWinner(parts);
          tx.update(ref, {
            status: 'finished',
            picks: {},
            participants: parts,
            question: null,
            winnerUid: w.uid,
            winnerName: w.name,
            winnerScore: w.score,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
          });
          return;
        }

        var nq = pickRandomQuestion();
        if(!nq){
          var w2 = pickWinner(parts);
          tx.update(ref, {
            status: 'finished',
            picks: {},
            participants: parts,
            question: null,
            winnerUid: w2.uid,
            winnerName: w2.name,
            winnerScore: w2.score,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
          });
          return;
        }

        var rd = Math.min(ROUND_MS, Math.max(9000, timeLeft - 2500));
        tx.update(ref, {
          picks: {},
          participants: parts,
          question: nq,
          currentRound: (x.currentRound || 1) + 1,
          roundDeadline: now + rd,
          roundStartedAt: now,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      });
    }).catch(function(e){ console.warn('[arena] tx', e); });
  }

  function tryClaimReward(d){
    if(!d || d.status !== 'finished' || !d.sessionKey) return;
    var sk = d.sessionKey;
    var user = firebase.auth().currentUser;
    if(!user) return;
    var rewardKey = 'arena_reward_done_' + sk;
    if(localStorage.getItem(rewardKey)) return;
    if(user.uid !== d.winnerUid) return;
    localStorage.setItem(rewardKey, '1');
    var honor = d.honorReward || 15;
    if(typeof window.recordArenaWin === 'function'){
      var r = window.recordArenaWin(honor);
      var ht = $('arenaHonorTotal');
      if(ht && r && typeof r.honor !== 'undefined') ht.textContent = String(r.honor);
      var banner = $('arenaRewardBanner');
      if(banner){
        banner.classList.remove('arena-hidden');
        banner.innerHTML = '🏆 Chúc mừng! Bé <strong>đứng nhất bảng</strong> phiên này! +' + honor + ' điểm vinh dự. Tổng vinh dự: <strong>' + (r && r.honor ? r.honor : '') + '</strong> — vào « Tiến độ & huy hiệu » xem cúp.';
      }
    }
  }

  function renderUI(d){
    lastData = d;
    if(!d){
      $('arenaPhase').textContent = 'Đang kết nối...';
      return;
    }

    var user = firebase.auth().currentUser;
    var uid = user && user.uid;
    var ends = d.endsAt || 0;
    var rem = Math.max(0, ends - Date.now());
    var mm = Math.floor(rem / 60000);
    var ss = Math.floor((rem % 60000) / 1000);
    $('arenaCountdown').textContent = d.status === 'active'
      ? (mm + ':' + (ss < 10 ? '0' : '') + ss)
      : '—';

    $('arenaPhase').textContent =
      d.status === 'active' ? 'Phiên đang diễn ra — trả lời đúng càng nhiều vòng càng tốt!' :
      d.status === 'finished' ? 'Phiên đã tổng kết' : '';

    var parts = d.participants || {};
    var rows = Object.keys(parts).map(function(id){
      return { uid: id, p: parts[id] };
    }).sort(function(a,b){
      var ds = (b.p.score||0) - (a.p.score||0);
      if(ds !== 0) return ds;
      return (a.p.tieTime||0) - (b.p.tieTime||0);
    });

    var tb = $('arenaLeaderboard');
    if(tb){
      if(!rows.length){
        tb.innerHTML = '<tr><td colspan="3" style="text-align:center;color:#64748b">Chưa có ai — bấm « Vào sàn »!</td></tr>';
      } else {
        tb.innerHTML = rows.map(function(r, idx){
          var medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : (idx + 1);
          var me = r.uid === uid ? ' is-me' : '';
          return '<tr class="' + me + '"><td>' + medal + '</td><td>' + escapeHtml(r.p.displayName || 'Bé') + '</td><td><strong>' + (r.p.score||0) + '</strong></td></tr>';
        }).join('');
      }
    }

    $('arenaPicksCount').textContent = d.status === 'active' && d.question
      ? 'Đã chọn: ' + Object.keys(d.picks||{}).length + '/' + Object.keys(parts).length
      : '';

    if(d.status === 'finished'){
      $('arenaQuestion').textContent = 'Kết thúc phiên';
      $('arenaQMeta').textContent = d.winnerName
        ? ('🥇 Nhất bảng: ' + d.winnerName + ' — ' + (d.winnerScore||0) + ' điểm')
        : 'Chưa có người chơi trong phiên này.';
      $('arenaAnswers').innerHTML = '';
      $('arenaPodium').classList.remove('arena-hidden');
      var pod = $('arenaPodiumInner');
      if(pod){
        if(d.winnerUid && rows.length){
          pod.innerHTML =
            '<div class="arena-podium-win">🏆 ' + escapeHtml(d.winnerName||'') + '</div>' +
            '<p class="arena-podium-sub">Phần thưởng: điểm vinh dự + huy hiệu (nếu là lần đầu thắng).</p>';
        } else {
          pod.innerHTML = '<p class="arena-podium-sub">Phiên sau sẽ mở sau vài giây...</p>';
        }
      }
      tryClaimReward(d);
      maybeSpawnNextSession(d);
      return;
    }

    $('arenaPodium').classList.add('arena-hidden');
    $('arenaRewardBanner').classList.add('arena-hidden');

    var q = d.question;
    if(!q){
      $('arenaQuestion').textContent = '...';
      return;
    }
    $('arenaQMeta').textContent = '🏷️ ' + (q.topic||'Kiến thức') + ' · Vòng ' + (d.currentRound||1);
    $('arenaQuestion').textContent = q.question;

    var picks = d.picks || {};
    var myPick = uid && picks[uid];
    var inner = $('arenaAnswers');
    inner.innerHTML = '';
    q.answers.forEach(function(ans){
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'pvp-ans';
      btn.textContent = ans;
      if(myPick && myPick.a === ans) btn.classList.add('is-picked');
      btn.disabled = !!myPick;
      btn.onclick = function(){ submitPick(ans); };
      inner.appendChild(btn);
    });
  }

  function escapeHtml(s){
    return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');
  }

  function startListen(){
    var ref = ensureArenaRef();
    if(!ref) return;
    if(unsub){ unsub(); unsub = null; }
    stopTimers();
    unsub = ref.onSnapshot(function(snap){
      if(!snap.exists){
        createInitialSession();
        renderUI(null);
        return;
      }
      var d = snap.data();
      renderUI(d);
    }, function(err){
      console.warn('[arena]', err);
      $('arenaPhase').textContent = 'Lỗi: ' + (err.message||err);
    });

    tickTimer = setInterval(function(){
      if(lastData && lastData.status === 'active'){
        renderUI(lastData);
      }
    }, 1000);

    resolveTimer = setInterval(function(){
      if(lastData && lastData.status === 'active' && lastData.question){
        attemptResolve();
      }
      if(lastData && lastData.status === 'finished'){
        maybeSpawnNextSession(lastData);
      }
    }, 900);
  }

  window.arenaEnter = function(){
    var user = firebase.auth().currentUser;
    if(!user){ return; }
    var ref = ensureArenaRef();
    if(!ref) return;
    ref.get().then(function(snap){
      if(!snap.exists){
        createInitialSession();
        setTimeout(function(){ joinArena(); startListen(); }, 600);
        return;
      }
      joinArena();
      startListen();
    }).catch(function(){
      createInitialSession();
    });
  };

  window.arenaLeavePage = function(){
    if(unsub){ unsub(); unsub = null; }
    stopTimers();
    lastData = null;
  };

  function refreshArenaHonor(){
    var el = $('arenaHonorTotal');
    if(el) el.textContent = String(parseInt(localStorage.getItem('arena_honor')||'0',10)||0);
  }
  document.addEventListener('DOMContentLoaded', refreshArenaHonor);
  /* Expose cho SPA router để cập nhật điểm vinh dự khi mount lại arena view. */
  window.arenaRefreshHonor = refreshArenaHonor;
})();
