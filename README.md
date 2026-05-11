# 🎓 Kid Learning Web

Ứng dụng học tập web dành cho **trẻ mầm non** — vui chơi qua các bài học tương tác, trợ giảng AI, thi đấu trực tuyến cùng bạn bè và hệ thống huy hiệu / sao thưởng.

> Đồ án — Single Page Application (no build) chạy hoàn toàn trên trình duyệt + Firebase backend.

---

## 📚 Tính năng chính

| Trang | Đường dẫn | Mô tả |
|-------|-----------|-------|
| 🏠 Trang chủ | `index.html` | Menu các môn học, hiển thị tiến độ & badge gắn vào từng môn. |
| 🎒 Bài học | `lessons/<môn>/index.html` → `lessons/lesson.html` | 6 môn: Nhận biết, Tư duy, Âm nhạc, Ghép hình, Mỹ thuật, Ngôn ngữ. Mỗi môn chia **chủ đề (topic)** mở khoá tuần tự, có sao thưởng và phát giọng đọc TTS. |
| 🏆 Tiến độ & huy hiệu | `progress.html` | Tổng sao, streak ngày, các huy hiệu (study streak, top score, arena champion, …). |
| 🏟️ Đấu trường | `arena.html` | **Nhiều người** cùng một phiên có thời hạn → ai điểm cao nhất nhận điểm vinh dự + huy hiệu. |
| ⚔️ PvP 1v1 | `pvp.html` | Tạo phòng / nhập mã / quick match — đúng và nhanh hơn thắng. |
| 👩‍🏫 Cô giáo AI | `mentor.html` | Trợ giảng giọng nói (FPT.AI TTS + Web Speech fallback), có thể gọi video Jitsi với giáo viên thật. |
| 🧑‍🏫 Dashboard giáo viên | `mentor-teacher.html` | Quản lý lớp, mở cuộc gọi với học sinh. |
| 🔐 Auth | `auth/login.html`, `auth/register.html`, `auth/forgot.html` | Đăng ký / đăng nhập / quên mật khẩu qua Firebase Auth. |

---

## 🛠️ Tech stack

- **Frontend**: HTML/CSS/JS thuần (no bundler, no framework), thiết kế *liquid glass* + topbar điều hướng + dropdown avatar mobile.
- **Backend**: [Firebase](https://firebase.google.com/) — Auth (Email/Password), Firestore (tiến độ, đấu trường, PvP), Hosting.
- **TTS giọng Tiếng Việt**: [FPT.AI TTS v5](https://fpt.ai/tts) (fallback Web Speech API).
- **Gọi video**: Jitsi Meet (iframe).
- **Deploy serverless**: Vercel (rewrite `/secrets/tts.config.js` → `/api/tts-config` để giấu API key TTS).

---

## 📁 Cấu trúc thư mục

```
kid-learning-git/
├── README.md                       ← bạn đang ở đây
└── kidlearningweb/
    ├── package.json                ← firebase dependency
    ├── firestore.rules             ← rules mẫu (users, learning_progress, arena_sessions, pvp_rooms)
    ├── vercel.json                 ← rewrite cho TTS API key
    ├── api/
    │   └── tts-config.js           ← Vercel serverless: trả API key TTS từ ENV
    └── public/                     ← static site root
        ├── index.html              ← trang chủ
        ├── arena.html              ← đấu trường nhiều người
        ├── pvp.html                ← PvP 1v1
        ├── progress.html           ← tiến độ + huy hiệu
        ├── mentor.html             ← Cô giáo AI / Jitsi
        ├── mentor-teacher.html     ← dashboard giáo viên
        ├── firebase.js             ← khởi tạo Firebase
        ├── shared.js               ← TTS, music, theme, settings modal
        ├── shared.css              ← biến + base + dark mode
        ├── menu.js / menu.css      ← topbar, user dropdown, progress badges
        ├── achievements.js         ← huy hiệu + arena win + study streak
        ├── arena.js / arena.css    ← logic đấu trường
        ├── pvp.js   / pvp.css      ← logic PvP
        ├── auth/                   ← login / register / forgot
        ├── secrets/                ← tts.config.js (stub local, prod dùng /api)
        └── lessons/
            ├── lesson.html         ← khung câu hỏi
            ├── lesson.js / .css
            ├── data/lessons-data.js← bộ câu hỏi 6 môn
            └── <môn>/index.html    ← menu chủ đề riêng từng môn
```

---

## 🚀 Chạy local

> Project là static site, **không cần build**.

```bash
# 1. Cài Firebase SDK nếu chỉnh code (tuỳ chọn — public dùng CDN)
cd kidlearningweb
npm install

# 2. Chạy server tĩnh (chọn 1 cách)
npx serve public
# hoặc
python -m http.server 8080 --directory public
# hoặc dùng "Live Server" trong VS Code
```

Mở trình duyệt `http://localhost:5173` (hoặc cổng tương ứng).

---

## 🔥 Cấu hình Firebase

### 1. Tạo project + bật Auth & Firestore

1. Vào [Firebase Console](https://console.firebase.google.com) → tạo project (vd `kidlearningweb`).
2. **Authentication** → bật **Email/Password**.
3. **Firestore Database** → tạo database production hoặc test mode.

### 2. Cập nhật `firebase.js`

Mở `kidlearningweb/public/firebase.js`, dán **firebaseConfig** từ *Project settings → Your apps*.

### 3. Deploy Firestore Rules

Mở **Firestore → Rules**, dán nội dung từ `kidlearningweb/firestore.rules` (đã có sẵn cho `users`, `learning_progress`, `arena_sessions`, `pvp_rooms`) rồi **Publish**.

---

## 🔊 Cấu hình TTS (giọng Tiếng Việt)

App ưu tiên dùng **FPT.AI TTS** (giọng tự nhiên), fallback Web Speech API nếu chưa có key.

### Local
- Bấm nút ⚙️ (Cài đặt) → nhập key vào ô FPT.AI → lưu. Key lưu `localStorage` máy bạn.

### Production (Vercel)
- Trong Vercel Dashboard → Environment Variables thêm:
  - `FPT_TTS_API_KEY` = key thực
  - `FPT_TTS_VOICE` = `lannhi` (hoặc `linhsan`, `minhquang`, `giahuy`, …)
- File `secrets/tts.config.js` đang là stub; URL production sẽ rewrite về `/api/tts-config` (xem `vercel.json`).

---

## 🏟️ Đấu trường & ⚔️ PvP

### Đấu trường (`arena.html`)
- Một document Firestore cố định `arena_sessions/live`.
- Phiên dài **4 phút**, vòng câu hỏi 16s, có cooldown 8s rồi tự sinh phiên mới.
- Người **điểm cao nhất** (hoà thì ai gửi nhanh hơn) nhận **điểm vinh dự** + badge `arena_champion` (lần đầu) / `arena_legend` (≥5 lần).

### PvP 1v1 (`pvp.html`)
- Tạo phòng → gửi **mã 6 ký tự**, hoặc « Vào phòng chờ (nhanh) » để tự match.
- Đủ 2 người, **chủ phòng** bấm « Bắt đầu đấu » → trận chính thức.
- Ai đạt **5 điểm** trước thắng.

---

## 🎯 Hệ thống huy hiệu

Tự động unlock dựa trên dữ liệu trong `localStorage` (đồng bộ Firestore khi đăng nhập):

- `first_star`, `ten_stars`, `fifty_stars` — sao tích lũy
- `topic_complete`, `subject_complete` — học xong chủ đề / môn
- `streak_3`, `streak_7` — học liên tục
- `arena_champion`, `arena_legend` — đứng nhất đấu trường

Xem `achievements.js` để xem định nghĩa và mở rộng thêm.

---

## 📱 Mobile

- Topbar trên màn nhỏ: logo + menu links (chip cuộn ngang) + avatar.
- Các nút **🎵 Nhạc / ⚙️ Cài đặt / 🚪 Đăng xuất** được gộp vào **dropdown khi bấm avatar** để màn hình đỡ chật.
- Đấu trường / PvP / bài học đều thu gọn padding, font dùng `clamp()` để vừa các màn 360–480px.

---

## 🧰 Phím tắt khi dev

| Hành động | Cách làm |
|-----------|----------|
| Hard refresh khi đổi CSS/JS | `Ctrl + Shift + R` |
| Xem permission error | DevTools (F12) → tab Console |
| Đổi giọng TTS nhanh | ⚙️ → chọn chip giọng |
| Reset toàn bộ tiến độ | Trang Tiến độ → nút « Xoá tiến độ » |

---

## 📌 Lưu ý

- **Không commit** API key Firebase nhạy cảm hay FPT.AI key vào git (đã có `.gitignore` cho `secrets/`).
- Một số tính năng (đồng bộ tiến độ, đấu trường, PvP) yêu cầu **đăng nhập** + **Firestore Rules đã publish**.
- Project gắn nhãn cho **trẻ em**: hạn chế text dài, ưu tiên emoji + giọng đọc + hiệu ứng hoạt hình.

---

## 📄 Giấy phép

ISC — dùng cho mục đích học tập / đồ án.
