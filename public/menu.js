import { protectPage, logout } from "./auth/auth.js";

protectPage();

document.getElementById("btn-nhanbiet").onclick = () => {
  window.location.href = "/lessons/lesson.html?type=nhan_biet";
};

document.getElementById("btn-tuduy").onclick = () => {
  window.location.href = "/lessons/lesson.html?type=tu_duy";
};

document.getElementById("btn-logout").onclick = logout;