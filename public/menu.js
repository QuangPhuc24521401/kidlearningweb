// menu.js
function goLesson(type){
  playPop();
  window.location.href = 'lessons/' + type + '/index.html';
}
function handleLogout(){
  playPop();
  try{
    firebase.auth().signOut().then(()=>{ window.location.href='auth/login.html'; });
  }
  catch(e){ window.location.href='auth/login.html'; }
}

(function(){
  var revealed = false;
  function reveal(){ if(!revealed){ revealed = true; document.documentElement.style.visibility=''; } }

  try{
    if(firebase.apps.length>0 && firebase.app().options.apiKey && !firebase.app().options.apiKey.includes('YOUR_')){
      firebase.auth().onAuthStateChanged(function(user){
        if(!user) window.location.href='auth/login.html';
        else reveal();
      });
    } else {
      reveal();
    }
  }catch(e){ reveal(); }

  setTimeout(reveal, 4000);
})();
