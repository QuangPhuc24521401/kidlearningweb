// menu.js
function goLesson(type){
  playPop();
  window.location.href = 'lessons/lesson.html?type=' + type;
}
function handleLogout(){
  playPop();
  try{ firebase.auth().signOut().then(()=>{ window.location.href='auth/login.html'; }); }
  catch(e){ window.location.href='auth/login.html'; }
}

// Kiểm tra đăng nhập chỉ khi Firebase được cấu hình thật
try{
  if(firebase.apps.length>0 && firebase.app().options.apiKey && !firebase.app().options.apiKey.includes('YOUR_')){
    firebase.auth().onAuthStateChanged(user=>{
      if(!user) window.location.href='auth/login.html';
    });
  }
}catch(e){}
