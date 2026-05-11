/**
 * Huy hiệu thành tích — lưu localStorage (learning_achievements), đồng bộ Firestore qua learning_progress.
 */
(function(){
  var STORAGE_KEY = "learning_achievements";
  var SUBJECTS = ["nhan_biet","tu_duy","am_nhac","ghep_hinh","my_thuat","ngon_ngu"];

  window.ACHIEVEMENT_DEFS = [
    { id: "first_step",     icon: "🎯", title: "Bước đầu",       desc: "Hoàn thành một bài học đầu tiên" },
    { id: "master_nhan_biet", icon: "👀", title: "Bậc thầy nhận biết", desc: "Xong tất cả bài trong môn Nhận biết" },
    { id: "master_tu_duy",    icon: "🧠", title: "Trạm tư duy",    desc: "Xong tất cả bài trong môn Tư duy" },
    { id: "master_am_nhac",   icon: "🎵", title: "Nhạc sĩ nhí",    desc: "Xong tất cả bài trong môn Âm nhạc" },
    { id: "master_ghep_hinh", icon: "🧩", title: "Xếp hình siêu tốc", desc: "Xong tất cả bài trong môn Ghép hình" },
    { id: "master_my_thuat",  icon: "🎨", title: "Họa sĩ nhí",     desc: "Xong tất cả bài trong môn Mỹ thuật" },
    { id: "master_ngon_ngu",  icon: "📚", title: "Vệ tinh từ vựng", desc: "Xong tất cả bài trong môn Ngôn ngữ" },
    { id: "super_kid",      icon: "🏆", title: "Siêu sao",       desc: "Hoàn thành cả 6 môn học" },
    { id: "stars_25",       icon: "⭐", title: "Tập sự sao",     desc: "Tích luỹ 25 sao" },
    { id: "stars_75",       icon: "🌟", title: "Vệ tinh sáng",   desc: "Tích luỹ 75 sao" },
    { id: "stars_150",      icon: "✨", title: "Dải ngân hà",    desc: "Tích luỹ 150 sao" },
    { id: "streak_3",       icon: "🔥", title: "Lửa học tập",    desc: "Học 3 ngày liên tiếp" },
    { id: "streak_7",       icon: "🌈", title: "Tuần vàng",      desc: "Học 7 ngày liên tiếp" }
  ];

  function _pad2(n){ return (n < 10 ? "0" : "") + n; }

  function _todayKey(){
    var d = new Date();
    return d.getFullYear() + "-" + _pad2(d.getMonth() + 1) + "-" + _pad2(d.getDate());
  }

  function _yesterdayKey(){
    var d = new Date();
    d.setDate(d.getDate() - 1);
    return d.getFullYear() + "-" + _pad2(d.getMonth() + 1) + "-" + _pad2(d.getDate());
  }

  function readAchievements(){
    try{
      var raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}") || {};
      if(!raw.unlocked || typeof raw.unlocked !== "object") raw.unlocked = {};
      if(typeof raw.streak !== "number") raw.streak = 0;
      if(typeof raw.lastStudyDay !== "string") raw.lastStudyDay = "";
      return raw;
    }catch(e){
      return { unlocked: {}, streak: 0, lastStudyDay: "" };
    }
  }

  function writeAchievements(state){
    try{
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }catch(e){}
  }

  function readProgress(){
    try{ return JSON.parse(localStorage.getItem("learning_progress") || "{}") || {}; }
    catch(e){ return {}; }
  }

  function isSubjectComplete(progress, sub){
    var entry = progress[sub];
    if(!entry || !entry.topics || typeof entry.topics !== "object") return false;
    var topics = Object.values(entry.topics);
    if(!topics.length) return false;
    return topics.every(function(t){ return (t.completedRuns || 0) >= 1; });
  }

  function hasAnyTopicDone(progress){
    for(var i = 0; i < SUBJECTS.length; i++){
      var entry = progress[SUBJECTS[i]];
      if(!entry || !entry.topics) continue;
      var topics = Object.values(entry.topics);
      for(var j = 0; j < topics.length; j++){
        if((topics[j].completedRuns || 0) >= 1) return true;
      }
    }
    return false;
  }

  function computeTotalStars(progress){
    var total = 0;
    SUBJECTS.forEach(function(sub){
      var entry = progress[sub];
      if(!entry) return;
      if(entry.topics){
        Object.values(entry.topics).forEach(function(t){
          total += (t.totalStars || 0);
        });
      } else if(entry.totalStars){
        total += entry.totalStars;
      }
    });
    return total;
  }

  function subjectsDoneCount(progress){
    var n = 0;
    SUBJECTS.forEach(function(s){
      if(isSubjectComplete(progress, s)) n++;
    });
    return n;
  }

  function isEligible(id, progress, achState){
    var stars = computeTotalStars(progress);
    var doneN = subjectsDoneCount(progress);
    switch(id){
      case "first_step": return hasAnyTopicDone(progress);
      case "master_nhan_biet": return isSubjectComplete(progress, "nhan_biet");
      case "master_tu_duy":    return isSubjectComplete(progress, "tu_duy");
      case "master_am_nhac":   return isSubjectComplete(progress, "am_nhac");
      case "master_ghep_hinh": return isSubjectComplete(progress, "ghep_hinh");
      case "master_my_thuat":  return isSubjectComplete(progress, "my_thuat");
      case "master_ngon_ngu":  return isSubjectComplete(progress, "ngon_ngu");
      case "super_kid": return doneN >= 6;
      case "stars_25":  return stars >= 25;
      case "stars_75":  return stars >= 75;
      case "stars_150": return stars >= 150;
      case "streak_3":  return (achState.streak || 0) >= 3;
      case "streak_7":  return (achState.streak || 0) >= 7;
      default: return false;
    }
  }

  function recordStudyDay(){
    var today = _todayKey();
    var state = readAchievements();
    if(state.lastStudyDay === today) return state;
    var yest = _yesterdayKey();
    if(state.lastStudyDay === yest){
      state.streak = (state.streak || 0) + 1;
    } else if(!state.lastStudyDay){
      state.streak = 1;
    } else {
      state.streak = 1;
    }
    state.lastStudyDay = today;
    writeAchievements(state);
    return state;
  }

  function unlockEligibleBadges(progress, opts){
    opts = opts || {};
    var state = readAchievements();
    var newly = [];
    window.ACHIEVEMENT_DEFS.forEach(function(def){
      if(state.unlocked[def.id]) return;
      if(isEligible(def.id, progress, state)){
        state.unlocked[def.id] = Date.now();
        newly.push(def);
      }
    });
    if(newly.length) writeAchievements(state);
    if(!opts.silent && newly.length){
      newly.forEach(showAchievementToast);
    }
    return newly;
  }

  function recomputeAchievementsAfterCloudMerge(){
    var progress = readProgress();
    unlockEligibleBadges(progress, { silent: true });
  }

  function toMs(v){
    if(typeof v === "number" && !isNaN(v)) return v;
    if(v && typeof v.toMillis === "function") return v.toMillis();
    return 0;
  }

  function mergeAchievementsFromCloud(cloud){
    if(!cloud || typeof cloud !== "object") return;
    var local = readAchievements();
    var changed = false;
    Object.keys(cloud).forEach(function(id){
      var ts = toMs(cloud[id]);
      if(!ts) return;
      var prev = toMs(local.unlocked[id]);
      if(!prev || ts > prev){
        local.unlocked[id] = ts;
        changed = true;
      }
    });
    if(changed) writeAchievements(local);
  }

  function flushAchievementsToCloud(){
    try{
      if(typeof firebase === "undefined" || !firebase.firestore) return;
      var user = firebase.auth && firebase.auth().currentUser;
      if(!user) return;
      var state = readAchievements();
      var update = { updatedAt: firebase.firestore.FieldValue.serverTimestamp() };
      Object.keys(state.unlocked).forEach(function(id){
        update["achievements." + id] = state.unlocked[id];
      });
      firebase.firestore()
        .collection("learning_progress")
        .doc(user.uid)
        .set(update, { merge: true })
        .catch(function(err){ console.warn("[achievements] flush", err); });
    }catch(e){}
  }

  function escapeAttr(s){
    return String(s || "").replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;");
  }

  function showAchievementToast(def){
    var t = document.createElement("div");
    t.className = "ach-toast";
    t.setAttribute("role", "status");
    t.innerHTML =
      '<div class="ach-toast-inner">' +
        '<span class="ach-toast-icon">' + def.icon + "</span>" +
        "<div>" +
          '<div class="ach-toast-kicker">Huy hiệu mới!</div>' +
          '<div class="ach-toast-title">' + escapeAttr(def.title) + "</div>" +
          '<div class="ach-toast-desc">' + escapeAttr(def.desc) + "</div>" +
        "</div>" +
      "</div>";
    document.body.appendChild(t);
    requestAnimationFrame(function(){
      t.classList.add("is-visible");
    });
    setTimeout(function(){
      t.classList.remove("is-visible");
      setTimeout(function(){ if(t.parentNode) t.parentNode.removeChild(t); }, 380);
    }, 3800);
  }

  function renderAchievementsPanel(){
    var panel = document.getElementById("achievementsPanel");
    var grid = document.getElementById("achievementsGrid");
    var streakEl = document.getElementById("achStreak");
    if(!panel || !grid) return;
    var state = readAchievements();
    if(streakEl) streakEl.textContent = String(state.streak || 0);

    var html = window.ACHIEVEMENT_DEFS.map(function(def){
      var got = !!state.unlocked[def.id];
      return (
        '<div class="ach-card' + (got ? " is-unlocked" : " is-locked") + '" title="' + escapeAttr(def.desc) + '">' +
          '<span class="ach-emoji">' + (got ? def.icon : "❔") + "</span>" +
          '<span class="ach-card-title">' + escapeAttr(def.title) + "</span>" +
        "</div>"
      );
    }).join("");
    grid.innerHTML = html;
    panel.hidden = false;
  }

  function syncAchievementsAfterLessonSave(){
    recordStudyDay();
    var progress = readProgress();
    unlockEligibleBadges(progress, { silent: false });
  }

  function resetAchievementStorage(){
    try{ localStorage.removeItem(STORAGE_KEY); }catch(e){}
  }

  window.readAchievements = readAchievements;
  window.recordStudyDay = recordStudyDay;
  window.renderAchievementsPanel = renderAchievementsPanel;
  window.mergeAchievementsFromCloud = mergeAchievementsFromCloud;
  window.flushAchievementsToCloud = flushAchievementsToCloud;
  window.syncAchievementsAfterLessonSave = syncAchievementsAfterLessonSave;
  window.recomputeAchievementsAfterCloudMerge = recomputeAchievementsAfterCloudMerge;
  window.resetAchievementStorage = resetAchievementStorage;
})();
