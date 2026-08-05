// auth/auth.js
function isFirebaseReady(){
  try{ return firebase.apps.length>0 && firebase.app().options.apiKey && !firebase.app().options.apiKey.includes('YOUR_'); }
  catch(e){ return false; }
}

function goToPage(url){ window.location.href = url; }

function handleLogin(){
  if(!isFirebaseReady()){ window.location.href='../index.html'; return; }
  const email=document.getElementById('email')?.value.trim();
  const password=document.getElementById('password')?.value;
  if(!email||!password){ showAuthError('Vui lòng điền đầy đủ thông tin!'); return; }
  firebase.auth().signInWithEmailAndPassword(email,password)
    .then(()=>{ window.location.href='../index.html'; })
    .catch(err=>{ showAuthError(friendlyError(err.code)); });
}

function handleRegister(){
  if(!isFirebaseReady()){ window.location.href='../index.html'; return; }
  const email=document.getElementById('email')?.value.trim();
  const password=document.getElementById('password')?.value;
  if(!email||!password){ showAuthError('Vui lòng điền đầy đủ thông tin!'); return; }
  firebase.auth().createUserWithEmailAndPassword(email,password)
    .then(()=>{ window.location.href='../index.html'; })
    .catch(err=>{ showAuthError(friendlyError(err.code)); });
}

function handleForgot(){
  if(!isFirebaseReady()){ showAuthSuccess('(Demo) Đã gửi email đặt lại!'); return; }
  const email=document.getElementById('email')?.value.trim();
  if(!email){ showAuthError('Vui lòng nhập email!'); return; }
  firebase.auth().sendPasswordResetEmail(email)
    .then(()=>{ showAuthSuccess('📧 Đã gửi email đặt lại mật khẩu!'); })
    .catch(err=>{ showAuthError(friendlyError(err.code)); });
}

function showAuthError(msg){
  const el=document.getElementById('authMsg'); if(!el) return;
  el.textContent=msg; el.className='auth-msg error'; el.style.display='block';
}
function showAuthSuccess(msg){
  const el=document.getElementById('authMsg'); if(!el) return;
  el.textContent=msg; el.className='auth-msg success'; el.style.display='block';
}
function friendlyError(code){
  const map={'auth/user-not-found':'Không tìm thấy tài khoản.','auth/wrong-password':'Mật khẩu không đúng!','auth/email-already-in-use':'Email đã được đăng ký rồi.','auth/invalid-email':'Email không hợp lệ.','auth/weak-password':'Mật khẩu phải có ít nhất 6 ký tự.','auth/too-many-requests':'Quá nhiều lần thử. Thử lại sau.'};
  return map[code]||'Đã có lỗi xảy ra, thử lại nhé!';
}

// Auto-redirect chỉ khi Firebase thật
if(isFirebaseReady()){
  firebase.auth().onAuthStateChanged(user=>{
    const isAuthPage=window.location.pathname.includes('/auth/');
    if(user&&isAuthPage) window.location.href='../index.html';
    if(!user&&!isAuthPage) window.location.href='auth/login.html';
  });
}
