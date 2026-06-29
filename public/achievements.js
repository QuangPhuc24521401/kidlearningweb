/* ═══════════════════════════════════════════════════
   ACHIEVEMENTS.JS — Huy hiệu & chuỗi ngày học

   Lưu local: localStorage key "learning_achievements"
   Đồng bộ cloud: field achievements.* trong learning_progress/{uid}

   API công khai (window.*):
   • readAchievements()              — đọc state hiện tại
   • renderAchievementsPanel()       — vẽ lưới huy hiệu (progress.html)
   • syncAchievementsAfterLessonSave() — gọi sau mỗi câu trả lời đúng (lesson.js)
   • mergeAchievementsFromCloud()    — gộp sau khi pull Firestore
   • flushAchievementsToCloud()      — đẩy unlocked lên Firestore
   • recordArenaWin(honorPoints)     — cập nhật huy hiệu đấu trường
   • resetAchievementStorage()       — xoá local (khi resetProgress)
═══════════════════════════════════════════════════ */
(function(){
  var STORAGE_KEY = "learning_achievements";
  var SUBJECTS = ["nhan_biet","tu_duy","am_nhac","ghep_hinh","my_thuat","ngon_ngu"];

  /** Danh sách huy hiệu — id dùng trong isEligible() và Firestore. */
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
    { id: "streak_7",       icon: "🌈", title: "Tuần vàng",      desc: "Học 7 ngày liên tiếp" },
    { id: "arena_champion", icon: "🏟️", title: "Bá chủ sàn đấu", desc: "Thắng một phiên đấu trường trực tuyến" },
    { id: "arena_legend",   icon: "👑", title: "Huyền thoại sàn", desc: "Thắng đấu trường 5 lần" },
    { id: "maze_first",     icon: "🧩", title: "Thoát mê cung",   desc: "Hoàn thành mê cung màn đầu tiên" },
    { id: "maze_master",    icon: "🗺️", title: "Bậc thầy mê cung", desc: "Hoàn thành tất cả màn mê cung" },
    { id: "digger_first",   icon: "⛏️", title: "Thợ đào vàng",    desc: "Hoàn thành màn đào vàng đầu tiên" },
    { id: "digger_master",  icon: "👑", title: "Vua mỏ vàng",     desc: "Hoàn thành tất cả màn đào vàng" },
    { id: "memory_first",   icon: "🃏", title: "Trí nhớ siêu phàm", desc: "Hoàn thành màn ghép cặp đầu tiên" },
    { id: "memory_master",  icon: "🧠", title: "Bậc thầy trí nhớ",  desc: "Hoàn thành tất cả màn ghép cặp" },
    { id: "sort_first",     icon: "📦", title: "Nhà phân loại",    desc: "Hoàn thành màn phân loại đầu tiên" },
    { id: "sort_master",    icon: "🏷️", title: "Siêu sắp xếp",     desc: "Hoàn thành tất cả màn phân loại" },
    { id: "spot_first",     icon: "🔍", title: "Mắt tinh tường",   desc: "Hoàn thành màn tìm khác biệt đầu tiên" },
    { id: "spot_master",    icon: "👁️", title: "Thám tử nhí",      desc: "Hoàn thành tất cả màn tìm khác biệt" },
    { id: "game_runner",    icon: "🍄", title: "Phiêu lưu gia",   desc: "Hoàn thành màn platformer đầu tiên" }
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
    ['game', 'game_maze', 'game_digger', 'game_memory', 'game_sort', 'game_spot'].forEach(function(sub){
      var entry = progress[sub];
      if(!entry || !entry.topics) return;
      Object.values(entry.topics).forEach(function(t){
        total += (t.totalStars || 0);
      });
    });
    return total;
  }

  function gameCompletedCount(progress, subjectKey){
    var entry = progress[subjectKey];
    if(!entry || !entry.topics) return 0;
    return Object.values(entry.topics).filter(function(t){
      return (t.completedRuns || 0) >= 1;
    }).length;
  }

  function mazeLevelCount(){
    return (window.MazeLevels && window.MazeLevels.LEVELS) ? window.MazeLevels.LEVELS.length : 6;
  }

  function diggerLevelCount(){
    return (window.DiggerLevels && window.DiggerLevels.LEVELS) ? window.DiggerLevels.LEVELS.length : 6;
  }

  function memoryLevelCount(){
    return (window.MemoryLevels && window.MemoryLevels.LEVELS) ? window.MemoryLevels.LEVELS.length : 5;
  }

  function sortLevelCount(){
    return (window.SortLevels && window.SortLevels.LEVELS) ? window.SortLevels.LEVELS.length : 5;
  }

  function spotLevelCount(){
    return (window.SpotLevels && window.SpotLevels.LEVELS) ? window.SpotLevels.LEVELS.length : 5;
  }

  function subjectsDoneCount(progress){
    var n = 0;
    SUBJECTS.forEach(function(s){
      if(isSubjectComplete(progress, s)) n++;
    });
    return n;
  }

  /** Kiểm tra đủ điều kiện mở khoá huy hiệu theo id. */
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
      case "maze_first": return gameCompletedCount(progress, "game_maze") >= 1;
      case "maze_master": return gameCompletedCount(progress, "game_maze") >= mazeLevelCount();
      case "digger_first": return gameCompletedCount(progress, "game_digger") >= 1;
      case "digger_master": return gameCompletedCount(progress, "game_digger") >= diggerLevelCount();
      case "memory_first": return gameCompletedCount(progress, "game_memory") >= 1;
      case "memory_master": return gameCompletedCount(progress, "game_memory") >= memoryLevelCount();
      case "sort_first": return gameCompletedCount(progress, "game_sort") >= 1;
      case "sort_master": return gameCompletedCount(progress, "game_sort") >= sortLevelCount();
      case "spot_first": return gameCompletedCount(progress, "game_spot") >= 1;
      case "spot_master": return gameCompletedCount(progress, "game_spot") >= spotLevelCount();
      case "game_runner": return gameCompletedCount(progress, "game") >= 1;
      default: return false;
    }
  }

  /** Cập nhật chuỗi ngày học (gọi sau mỗi lần trả lời đúng). */
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

  /** Quét ACHIEVEMENT_DEFS, mở khoá badge mới, hiện toast nếu !opts.silent. */
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

  /** Màu & icon cho huy hiệu sinh động (medal CSS + emoji). */
  var BADGE_THEMES = {
    first_step:       { from: "#fbbf24", to: "#f97316", ring: "#fde68a", icon: "🎯" },
    master_nhan_biet: { from: "#f472b6", to: "#db2777", ring: "#fbcfe8", icon: "👀" },
    master_tu_duy:    { from: "#818cf8", to: "#4f46e5", ring: "#c7d2fe", icon: "🧠" },
    master_am_nhac:   { from: "#fb923c", to: "#ea580c", ring: "#fed7aa", icon: "🎵" },
    master_ghep_hinh: { from: "#a78bfa", to: "#7c3aed", ring: "#ddd6fe", icon: "🧩" },
    master_my_thuat:  { from: "#e879f9", to: "#c026d3", ring: "#f5d0fe", icon: "🎨" },
    master_ngon_ngu:  { from: "#38bdf8", to: "#0284c7", ring: "#bae6fd", icon: "📚" },
    super_kid:        { from: "#fde047", to: "#eab308", ring: "#fef9c3", icon: "🏆" },
    stars_25:         { from: "#fcd34d", to: "#f59e0b", ring: "#fef3c7", icon: "⭐" },
    stars_75:         { from: "#fbbf24", to: "#d97706", ring: "#fde68a", icon: "🌟" },
    stars_150:        { from: "#fde68a", to: "#a855f7", ring: "#f3e8ff", icon: "✨" },
    streak_3:         { from: "#fb923c", to: "#ef4444", ring: "#fecaca", icon: "🔥" },
    streak_7:         { from: "#34d399", to: "#6366f1", ring: "#a7f3d0", icon: "🌈" },
    arena_champion:   { from: "#f87171", to: "#b91c1c", ring: "#fecaca", icon: "🏟️" },
    arena_legend:     { from: "#fbbf24", to: "#9333ea", ring: "#fde68a", icon: "👑" },
    maze_first:       { from: "#2dd4bf", to: "#0d9488", ring: "#99f6e4", icon: "🌀" },
    maze_master:      { from: "#14b8a6", to: "#115e59", ring: "#5eead4", icon: "🗺️" },
    digger_first:     { from: "#fbbf24", to: "#b45309", ring: "#fde68a", icon: "⛏️" },
    digger_master:    { from: "#eab308", to: "#854d0e", ring: "#fef08a", icon: "💎" },
    memory_first:     { from: "#c084fc", to: "#7e22ce", ring: "#e9d5ff", icon: "🃏" },
    memory_master:    { from: "#a855f7", to: "#581c87", ring: "#d8b4fe", icon: "🧠" },
    sort_first:       { from: "#4ade80", to: "#16a34a", ring: "#bbf7d0", icon: "📦" },
    sort_master:      { from: "#22c55e", to: "#14532d", ring: "#86efac", icon: "🏷️" },
    spot_first:       { from: "#22d3ee", to: "#0891b2", ring: "#a5f3fc", icon: "🔍" },
    spot_master:      { from: "#06b6d4", to: "#164e63", ring: "#67e8f9", icon: "👁️" },
    game_runner:      { from: "#ef4444", to: "#7f1d1d", ring: "#fecaca", icon: "🍄" }
  };

  function badgeTheme(def){
    return BADGE_THEMES[def.id] || { from: "#94a3b8", to: "#64748b", ring: "#e2e8f0", icon: def.icon || "🏅" };
  }

  function renderAchievementBadge(def, unlocked){
    var theme = badgeTheme(def);
    var cls = "ach-medal" + (unlocked ? " is-unlocked" : " is-locked");
    var icon = unlocked ? (theme.icon || def.icon) : "🔒";
    return (
      '<div class="' + cls + '" style="--medal-from:' + theme.from + ';--medal-to:' + theme.to + ';--medal-ring:' + theme.ring + '">' +
        '<svg class="ach-medal-shape" viewBox="0 0 72 80" aria-hidden="true">' +
          '<defs>' +
            '<linearGradient id="ach-grad-' + def.id + '" x1="0" y1="0" x2="0.9" y2="1">' +
              '<stop offset="0%" stop-color="' + theme.from + '"/>' +
              '<stop offset="100%" stop-color="' + theme.to + '"/>' +
            '</linearGradient>' +
            '<filter id="ach-glow-' + def.id + '"><feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="' + theme.to + '" flood-opacity=".35"/></filter>' +
          '</defs>' +
          '<path class="ach-medal-ribbon ach-medal-ribbon--l" d="M18 52 L8 78 L24 66 Z"/>' +
          '<path class="ach-medal-ribbon ach-medal-ribbon--r" d="M54 52 L64 78 L48 66 Z"/>' +
          '<circle class="ach-medal-disc" cx="36" cy="34" r="28" fill="url(#ach-grad-' + def.id + ')" filter="url(#ach-glow-' + def.id + ')"/>' +
          '<circle class="ach-medal-disc-inner" cx="36" cy="34" r="22" fill="rgba(255,255,255,.22)"/>' +
          '<circle class="ach-medal-ring" cx="36" cy="34" r="28" fill="none" stroke="' + theme.ring + '" stroke-width="3" opacity=".85"/>' +
        '</svg>' +
        '<span class="ach-medal-icon" aria-hidden="true">' + icon + '</span>' +
        (unlocked ? '<span class="ach-medal-spark" aria-hidden="true">✦</span>' : '') +
      '</div>'
    );
  }

  function showAchievementToast(def){
    var t = document.createElement("div");
    t.className = "ach-toast";
    t.setAttribute("role", "status");
    t.innerHTML =
      '<div class="ach-toast-inner">' +
        renderAchievementBadge(def, true) +
        "<div class=\"ach-toast-text\">" +
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

    var total = window.ACHIEVEMENT_DEFS.length;
    var unlocked = 0;
    window.ACHIEVEMENT_DEFS.forEach(function(def){
      if(state.unlocked[def.id]) unlocked++;
    });

    var countEl = document.getElementById("progBadgeCount");
    var totalEl = document.getElementById("progBadgeTotal");
    if(countEl) countEl.textContent = String(unlocked);
    if(totalEl) totalEl.textContent = String(total);

    var fillEl = document.getElementById("achProgressFill");
    var labelEl = document.getElementById("achProgressLabel");
    var pct = total ? Math.round(unlocked / total * 100) : 0;
    if(fillEl) fillEl.style.width = pct + "%";
    if(labelEl) labelEl.textContent = unlocked + " / " + total + " huy hiệu";

    var html = window.ACHIEVEMENT_DEFS.map(function(def){
      var got = !!state.unlocked[def.id];
      return (
        '<div class="ach-card' + (got ? " is-unlocked" : " is-locked") + '" title="' + escapeAttr(def.desc) + '">' +
          renderAchievementBadge(def, got) +
          '<span class="ach-card-title">' + escapeAttr(def.title) + "</span>" +
          '<span class="ach-card-desc">' + escapeAttr(def.desc) + "</span>" +
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

  function recordArenaWin(honorPoints){
    honorPoints = typeof honorPoints === "number" ? honorPoints : 15;
    var n = (parseInt(localStorage.getItem("arena_wins_total") || "0", 10) || 0) + 1;
    localStorage.setItem("arena_wins_total", String(n));
    var honor = (parseInt(localStorage.getItem("arena_honor") || "0", 10) || 0) + honorPoints;
    localStorage.setItem("arena_honor", String(honor));

    var state = readAchievements();
    var toasts = [];
    window.ACHIEVEMENT_DEFS.forEach(function(def){
      if(def.id === "arena_champion" && n >= 1 && !state.unlocked.arena_champion){
        state.unlocked.arena_champion = Date.now();
        toasts.push(def);
      }
      if(def.id === "arena_legend" && n >= 5 && !state.unlocked.arena_legend){
        state.unlocked.arena_legend = Date.now();
        toasts.push(def);
      }
    });
    writeAchievements(state);
    toasts.forEach(showAchievementToast);
    flushAchievementsToCloud();
    return { wins: n, honor: honor };
  }

  function syncAchievementsAfterGameSave(){
    var progress = readProgress();
    recordStudyDay();
    unlockEligibleBadges(progress, { silent: false });
    flushAchievementsToCloud();
  }

  window.readAchievements = readAchievements;
  window.recordStudyDay = recordStudyDay;
  window.renderAchievementsPanel = renderAchievementsPanel;
  window.renderAchievementBadge = renderAchievementBadge;
  window.mergeAchievementsFromCloud = mergeAchievementsFromCloud;
  window.flushAchievementsToCloud = flushAchievementsToCloud;
  window.syncAchievementsAfterLessonSave = syncAchievementsAfterLessonSave;
  window.syncAchievementsAfterGameSave = syncAchievementsAfterGameSave;
  window.recomputeAchievementsAfterCloudMerge = recomputeAchievementsAfterCloudMerge;
  window.resetAchievementStorage = resetAchievementStorage;
  window.recordArenaWin = recordArenaWin;
})();
