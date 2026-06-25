/* ═══════════════════════════════════════════════════
   GAME-QUIZ-UI.JS — Overlay câu hỏi dùng chung (platformer + mê cung)
═══════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  function safeSpeak(text) {
    try { if (typeof global.speak === 'function') global.speak(text); } catch (e) {}
  }
  function stopSpeak() {
    try { if (global.speechSynthesis) global.speechSynthesis.cancel(); } catch (e) {}
  }

  var GameQuizUI = {
    el: null, meta: null, q: null, ans: null, fb: null, busy: false,
    init: function () {
      this.el = document.getElementById('gameQuiz');
      this.meta = document.getElementById('gameQuizMeta');
      this.q = document.getElementById('gameQuizQuestion');
      this.ans = document.getElementById('gameQuizAnswers');
      this.fb = document.getElementById('gameQuizFeedback');
    },
    show: function (question, handlers) {
      if (!this.el) this.init();
      var self = this;
      var Sfx = (global.GameAssets && global.GameAssets.Sfx) || {};
      this.busy = false;
      this.meta.textContent = question.topic || 'Câu hỏi';
      this.q.textContent = question.question || '';
      this.fb.textContent = '';
      this.fb.className = 'game-quiz-feedback';
      this.ans.innerHTML = '';

      (question.options || []).forEach(function (opt) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'game-quiz-ans';
        b.textContent = opt;
        b.addEventListener('click', function () { self._choose(b, opt, question, handlers, Sfx); });
        self.ans.appendChild(b);
      });

      this.el.hidden = false;
      safeSpeak(question.voiceText || question.question);
    },
    _buttons: function () {
      return Array.prototype.slice.call(this.ans.querySelectorAll('.game-quiz-ans'));
    },
    _choose: function (btn, opt, question, handlers, Sfx) {
      if (this.busy) return;
      this.busy = true;
      var self = this;
      var buttons = this._buttons();
      buttons.forEach(function (b) { b.disabled = true; });

      if (opt === question.correct) {
        btn.classList.add('is-correct');
        this.fb.textContent = 'Đúng rồi! 🎉';
        this.fb.className = 'game-quiz-feedback ok';
        if (Sfx.correct) Sfx.correct();
        stopSpeak();
        setTimeout(function () {
          self.hide();
          if (handlers.onCorrect) handlers.onCorrect();
        }, 850);
      } else {
        btn.classList.add('is-wrong');
        this.fb.textContent = 'Chưa đúng, thử lại nhé!';
        this.fb.className = 'game-quiz-feedback no';
        if (Sfx.wrong) Sfx.wrong();
        stopSpeak();
        var alive = handlers.onWrong ? handlers.onWrong() : true;
        if (!alive) {
          setTimeout(function () { self.hide(); }, 700);
        } else {
          setTimeout(function () {
            self.busy = false;
            buttons.forEach(function (b) {
              b.disabled = false;
              b.classList.remove('is-wrong', 'is-correct');
            });
            self.fb.textContent = '';
            self.fb.className = 'game-quiz-feedback';
          }, 850);
        }
      }
    },
    hide: function () {
      if (this.el) this.el.hidden = true;
      if (this.ans) this.ans.innerHTML = '';
      this.busy = false;
    }
  };

  global.GameQuizUI = GameQuizUI;
})(window);
