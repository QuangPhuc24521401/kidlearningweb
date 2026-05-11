/**
 * PvP — phòng realtime Firestore, cùng câu hỏi, trả lời đúng và nhanh hơn +1 điểm.
 *
 * Firestore (Console → Rules), thêm ví dụ:
 * match /pvp_rooms/{roomId} {
 *   allow read: if request.auth != null;
 *   allow create: if request.auth != null && request.resource.data.hostId == request.auth.uid;
 *   allow update, delete: if request.auth != null
 *     && (request.auth.uid == resource.data.hostId || request.auth.uid == resource.data.guestId);
 * }
 */
(function(){
  var SUBJECTS = ['nhan_biet','tu_duy','am_nhac','ghep_hinh','my_thuat','ngon_ngu'];
  var SUBJECT_LABELS = {
    all: 'Tất cả môn',
    nhan_biet: 'Nhận biết',
    tu_duy: 'Tư duy',
    am_nhac: 'Âm nhạc',
    ghep_hinh: 'Ghép hình',
    my_thuat: 'Mỹ thuật',
    ngon_ngu: 'Ngôn ngữ'
  };

  var ROUND_MS = 22000;
  var TARGET_SCORE = 5;
  var roomRef = null;
  var unsub = null;
  var resolveTimer = null;
  var myPickThisRound = false;
  var selectedSubject = 'all';
  var lastRoomData = null;

  function $(id){ return document.getElementById(id); }

  function genCode(){
    var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    var s = '';
    for(var i = 0; i < 6; i++){
      s += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return s;
  }

  function cloneQuestion(q){
    return {
      question: q.question,
      answers: q.answers.slice(),
      correctAnswer: q.correctAnswer,
      topic: q.topic || ''
    };
  }

  function pickRandomQuestion(subjectKey){
    var pool = [];
    if(subjectKey === 'all'){
      SUBJECTS.forEach(function(k){
        (window.LESSON_DATA[k] || []).forEach(function(q){
          pool.push(cloneQuestion(q));
        });
      });
    } else {
      (window.LESSON_DATA[subjectKey] || []).forEach(function(q){
        pool.push(cloneQuestion(q));
      });
    }
    if(!pool.length) return null;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  function displayName(){
    return (localStorage.getItem('userDisplayName') || '').trim() || 'Bé học sinh';
  }

  function showLobby(){ $('arena').classList.add('pvp-hidden'); $('lobby').classList.remove('pvp-hidden'); }
  function showArena(){ $('lobby').classList.add('pvp-hidden'); $('arena').classList.remove('pvp-hidden'); }

  function stopListen(){
    if(unsub){ unsub(); unsub = null; }
    if(resolveTimer){ clearInterval(resolveTimer); resolveTimer = null; }
    roomRef = null;
    lastRoomData = null;
    myPickThisRound = false;
  }

  function setStatus(t){ var el = $('pvpStatus'); if(el) el.textContent = t || ''; }

  function renderSubjectChips(){
    var host = $('pvpSubjectChips');
    if(!host) return;
    var keys = ['all'].concat(SUBJECTS);
    host.innerHTML = keys.map(function(k){
      var on = k === selectedSubject ? ' is-on' : '';
      return '<button type="button" class="pvp-chip' + on + '" data-subject="' + k + '">' + (SUBJECT_LABELS[k] || k) + '</button>';
    }).join('');
    host.querySelectorAll('.pvp-chip').forEach(function(btn){
      btn.onclick = function(){
        selectedSubject = btn.getAttribute('data-subject') || 'all';
        renderSubjectChips();
      };
    });
  }

  function bindRoomSnapshot(){
    if(!roomRef) return;
    unsub = roomRef.onSnapshot(function(snap){
      if(!snap.exists){
        setStatus('Phòng đã đóng.');
        stopListen();
        showLobby();
        return;
      }
      var d = snap.data();
      lastRoomData = d;
      applyRoomState(d);
    }, function(err){
      console.warn('[pvp]', err);
      setStatus('Lỗi kết nối: ' + (err.message || err));
    });
  }

  function applyRoomState(d){
    var uid = firebase.auth().currentUser && firebase.auth().currentUser.uid;
    if(!uid) return;

    if(d.status !== 'playing'){
      if(resolveTimer){
        clearInterval(resolveTimer);
        resolveTimer = null;
      }
    }

    $('pvpCodeShow').textContent = d.code || '';

    if(d.status === 'waiting'){
      showLobby();
      $('lobbyMain').classList.add('pvp-hidden');
      $('lobbyWaiting').classList.remove('pvp-hidden');
      var hintEl = $('pvpWaitHint');
      if(d.hostId === uid){
        if(d.guestId){
          $('pvpWaitMsg').textContent = (d.guestName || 'Bạn') + ' đã vào phòng!';
          if(hintEl){
            hintEl.hidden = false;
            hintEl.textContent = 'Chủ phòng bấm nút « Bắt đầu đấu » bên dưới để mở trận (không tự chạy).';
          }
          $('pvpBtnStart').classList.remove('pvp-hidden');
        } else {
          $('pvpWaitMsg').textContent = 'Đang chờ người chơi thứ hai...';
          if(hintEl){
            hintEl.hidden = false;
            hintEl.textContent = 'Gửi mã ' + (d.code || '') + ' cho bạn. Trên máy hoặc tài khoản khác: mở trang PvP → nhập mã → « Vào phòng ». Khi có đủ hai người sẽ xuất hiện nút « Bắt đầu đấu » — chỉ chủ phòng mới bấm được.';
          }
          $('pvpBtnStart').classList.add('pvp-hidden');
        }
      } else {
        $('pvpWaitMsg').textContent = 'Bạn đã vào phòng. Đang chờ chủ phòng...';
        if(hintEl){
          hintEl.hidden = false;
          hintEl.textContent = 'Đợi chủ phòng bấm « Bắt đầu đấu » — nút đó chỉ hiện trên máy của chủ phòng.';
        }
        $('pvpBtnStart').classList.add('pvp-hidden');
      }
      return;
    }

    if(d.status === 'playing'){
      showArena();
      renderScoreboard(d, uid);
      renderQuestion(d, uid);
      tryResolveIfNeeded(d);
      return;
    }

    if(d.status === 'finished'){
      showArena();
      renderScoreboard(d, uid);
      $('pvpAnswers').innerHTML = '';
      $('pvpQuestion').textContent = 'Trận đấu kết thúc!';
      $('pvpQMeta').textContent = '';
      var ban = $('pvpResultBanner');
      ban.classList.remove('pvp-hidden');
      if(d.winnerId === uid){
        ban.className = 'pvp-result-banner win';
        ban.textContent = '🎉 Bé thắng rồi! Giỏi lắm!';
      } else if(d.winnerId){
        ban.className = 'pvp-result-banner lose';
        ban.textContent = '🌟 Bạn ' + (d.winnerName || '') + ' thắng rồi! Lần sau cố gắng nhé!';
      } else {
        ban.className = 'pvp-result-banner draw';
        ban.textContent = 'Hòa nhau rồi!';
      }
      setStatus('');
      return;
    }
  }

  function renderScoreboard(d, myUid){
    var hId = d.hostId;
    var gId = d.guestId;
    var scores = d.scores || {};
    var sH = scores[hId] || 0;
    var sG = scores[gId] || 0;
    $('pvpNameA').textContent = d.hostName || 'Chủ phòng';
    $('pvpNameB').textContent = d.guestName || 'Khách';
    $('pvpScoreA').textContent = sH;
    $('pvpScoreB').textContent = sG;
    $('pvpPillA').classList.toggle('is-me', myUid === hId);
    $('pvpPillB').classList.toggle('is-me', myUid === gId);
    $('pvpPillA').classList.toggle('is-lead', sH > sG);
    $('pvpPillB').classList.toggle('is-lead', sG > sH);
  }

  function renderQuestion(d, myUid){
    $('pvpResultBanner').classList.add('pvp-hidden');
    var q = d.question;
    if(!q){
      $('pvpQuestion').textContent = 'Đang tải câu hỏi...';
      return;
    }
    $('pvpQMeta').textContent = (q.topic ? '🏷️ ' + q.topic + ' · ' : '') + 'Vòng ' + (d.currentRound || 1) + ' — ai đúng và nhanh hơn được 1 điểm';
    $('pvpQuestion').textContent = q.question;

    var picks = d.picks || {};
    myPickThisRound = !!(picks[myUid]);

    var inner = $('pvpAnswers');
    inner.innerHTML = '';
    q.answers.forEach(function(ans){
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'pvp-ans';
      btn.textContent = ans;
      if(picks[myUid] && picks[myUid].a === ans) btn.classList.add('is-picked');
      btn.disabled = myPickThisRound;
      btn.onclick = function(){ submitPick(ans); };
      inner.appendChild(btn);
    });

    var opp = d.hostId === myUid ? d.guestId : d.hostId;
    if(opp && picks[opp]){
      setStatus('Đối thủ đã chọn...');
    } else if(myPickThisRound){
      setStatus('Đã gửi đáp án — chờ đối thủ hoặc hết giờ vòng này.');
    } else {
      setStatus('Chọn đáp án đúng nhanh nhất có thể!');
    }
  }

  function submitPick(answer){
    if(!roomRef || myPickThisRound) return;
    var uid = firebase.auth().currentUser.uid;
    var t = Date.now();
    var btns = document.querySelectorAll('#pvpAnswers .pvp-ans');
    for(var i = 0; i < btns.length; i++) btns[i].disabled = true;
    var up = {};
    up['picks.' + uid] = { a: answer, t: t };
    roomRef.update(up).catch(function(e){ console.warn('[pvp] pick', e); });
  }

  function tryResolveIfNeeded(d){
    if(d.status !== 'playing' || !d.question) return;
    if(resolveTimer) return;
    resolveTimer = setInterval(function(){
      if(!roomRef || !lastRoomData) return;
      attemptResolve(lastRoomData);
    }, 800);
  }

  function attemptResolve(d){
    if(!roomRef || d.status !== 'playing') return;
    var deadline = d.roundDeadline || 0;
    var picks = d.picks || {};
    var keys = Object.keys(picks);
    var timedOut = Date.now() > deadline + 400;
    if(keys.length < 2 && !timedOut) return;

    var db = firebase.firestore();
    db.runTransaction(function(tx){
      return tx.get(roomRef).then(function(doc){
        if(!doc.exists) return;
        var x = doc.data();
        if(x.status !== 'playing' || !x.question) return;
        var pks = x.picks || {};
        var k2 = Object.keys(pks);
        var dl = x.roundDeadline || 0;
        var tout = Date.now() > dl + 400;
        if(k2.length < 2 && !tout) return;

        var correct = x.question.correctAnswer;
        var winner = null;
        var bestT = Infinity;
        k2.forEach(function(uid){
          var o = pks[uid];
          if(o && o.a === correct && typeof o.t === 'number' && o.t < bestT){
            bestT = o.t;
            winner = uid;
          }
        });

        var scores = Object.assign({}, x.scores || {});
        if(winner){
          scores[winner] = (scores[winner] || 0) + 1;
        }
        var target = x.targetScore || TARGET_SCORE;
        var winnerId = null;
        var winnerName = null;
        if(winner && (scores[winner] || 0) >= target){
          winnerId = winner;
          winnerName = (winner === x.hostId) ? x.hostName : x.guestName;
        }

        var updates = { picks: {}, scores: scores };
        if(winnerId){
          updates.status = 'finished';
          updates.winnerId = winnerId;
          updates.winnerName = winnerName || '';
          updates.question = null;
          tx.update(roomRef, updates);
          return;
        }

        var sub = x.subject || 'all';
        var nq = pickRandomQuestion(sub);
        if(!nq){
          updates.status = 'finished';
          updates.winnerId = x.hostId;
          updates.winnerName = x.hostName;
          updates.question = null;
          tx.update(roomRef, updates);
          return;
        }
        updates.currentRound = (x.currentRound || 1) + 1;
        updates.question = nq;
        updates.roundDeadline = Date.now() + ROUND_MS;
        tx.update(roomRef, updates);
      });
    }).catch(function(e){ console.warn('[pvp] resolve', e); });
  }

  window.pvpCreateRoom = function(){
    var user = firebase.auth().currentUser;
    if(!user) return;
    var code = genCode();
    var ref = firebase.firestore().collection('pvp_rooms').doc(code);
    ref.set({
      code: code,
      hostId: user.uid,
      hostName: displayName(),
      guestId: null,
      guestName: null,
      subject: selectedSubject,
      status: 'waiting',
      targetScore: TARGET_SCORE,
      currentRound: 0,
      question: null,
      picks: {},
      scores: {},
      roundDeadline: 0,
      winnerId: null,
      winnerName: null,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    }).then(function(){
      stopListen();
      roomRef = ref;
      bindRoomSnapshot();
    }).catch(function(e){
      alert('Không tạo được phòng: ' + (e.message || e));
    });
  };

  window.pvpJoinRoom = function(){
    var code = ($('pvpCodeInput').value || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if(code.length < 4){
      alert('Nhập mã phòng (4–6 ký tự).');
      return;
    }
    var user = firebase.auth().currentUser;
    if(!user) return;
    var ref = firebase.firestore().collection('pvp_rooms').doc(code);
    ref.get().then(function(snap){
      if(!snap.exists){
        alert('Không có phòng với mã này.');
        return;
      }
      var d = snap.data();
      if(d.status !== 'waiting'){
        alert('Phòng không còn chờ hoặc đã đầy.');
        return;
      }
      if(d.hostId === user.uid){
        stopListen();
        roomRef = ref;
        bindRoomSnapshot();
        return;
      }
      if(d.guestId && d.guestId !== user.uid){
        alert('Phòng đã có đủ hai người.');
        return;
      }
      return ref.update({
        guestId: user.uid,
        guestName: displayName()
      }).then(function(){
        stopListen();
        roomRef = ref;
        bindRoomSnapshot();
      });
    }).catch(function(e){
      alert('Lỗi: ' + (e.message || e));
    });
  };

  window.pvpQuickMatch = function(){
    var user = firebase.auth().currentUser;
    if(!user) return;
    setStatus('Đang tìm phòng...');
    firebase.firestore().collection('pvp_rooms')
      .where('status', '==', 'waiting')
      .limit(25)
      .get()
      .then(function(snap){
        var found = null;
        snap.forEach(function(doc){
          if(found) return;
          var d = doc.data();
          if(!d.guestId && d.hostId !== user.uid){
            found = doc.ref;
          }
        });
        if(!found){
          setStatus('Chưa có phòng chờ — hãy tạo phòng mới.');
          return;
        }
        return found.get().then(function(s){
          var d = s.data();
          if(d.guestId || d.hostId === user.uid || d.status !== 'waiting'){
            setStatus('Phòng vừa đầy, thử lại.');
            return;
          }
          return found.update({
            guestId: user.uid,
            guestName: displayName()
          }).then(function(){
            stopListen();
            roomRef = found;
            bindRoomSnapshot();
            setStatus('');
          });
        });
      }).catch(function(e){
        console.warn('[pvp] quick', e);
        setStatus('Tìm phòng lỗi — thử Tạo phòng.');
      });
  };

  window.pvpStartMatch = function(){
    if(!roomRef || !lastRoomData) return;
    var d = lastRoomData;
    var user = firebase.auth().currentUser;
    if(!user || d.hostId !== user.uid) return;
    if(!d.guestId){
      alert('Chưa có người chơi thứ hai.');
      return;
    }
    var nq = pickRandomQuestion(d.subject || 'all');
    if(!nq){
      alert('Không lấy được câu hỏi.');
      return;
    }
    roomRef.update({
      status: 'playing',
      currentRound: 1,
      question: nq,
      picks: {},
      scores: (function(){
        var o = {};
        o[d.hostId] = 0;
        o[d.guestId] = 0;
        return o;
      })(),
      roundDeadline: Date.now() + ROUND_MS
    }).catch(function(e){
      alert('Không bắt đầu được: ' + (e.message || e));
    });
  };

  window.pvpLeaveRoom = function(){
    if(!roomRef || !firebase.auth().currentUser) return;
    var uid = firebase.auth().currentUser.uid;
    var ref = roomRef;
    ref.get().then(function(snap){
      if(!snap.exists){ stopListen(); showLobby(); $('lobbyMain').classList.remove('pvp-hidden'); $('lobbyWaiting').classList.add('pvp-hidden'); return; }
      var d = snap.data();
      if(d.status === 'finished'){
        ref.delete().catch(function(){});
      } else if(d.hostId === uid){
        ref.delete().catch(function(){});
      } else if(d.guestId === uid){
        if(d.status === 'playing'){
          ref.update({
            guestId: null,
            guestName: null,
            status: 'waiting',
            question: null,
            picks: {},
            scores: {},
            currentRound: 0,
            roundDeadline: 0
          }).catch(function(){});
        } else {
          ref.update({
            guestId: null,
            guestName: null,
            status: 'waiting',
            question: null,
            picks: {},
            scores: {},
            currentRound: 0
          }).catch(function(){});
        }
      }
      stopListen();
      showLobby();
      $('lobbyMain').classList.remove('pvp-hidden');
      $('lobbyWaiting').classList.add('pvp-hidden');
    });
  };

  document.addEventListener('DOMContentLoaded', function(){
    renderSubjectChips();
  });
})();
