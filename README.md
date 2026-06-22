# Kid Learning Web

Website học tập dành cho trẻ mầm non: bài học tương tác, theo dõi tiến độ và huy hiệu, đấu trường nhiều người, đối kháng 1v1 và trợ giảng AI (Cô Mai). Ứng dụng chạy trên trình duyệt (HTML, CSS, JavaScript thuần, không build), đồng bộ dữ liệu qua Firebase (Auth + Firestore) và triển khai tĩnh trên Vercel.

Repository: [github.com/QuangPhuc24521401/kidlearningweb](https://github.com/QuangPhuc24521401/kidlearningweb)

Demo: [kidlearningweb.vercel.app](https://kidlearningweb.vercel.app)

---

## Tóm tắt

Kid Learning Web là đồ án web giáo dục sớm, giao diện thân thiện với trẻ em và phụ huynh. Phụ huynh/ học sinh đăng nhập, chọn môn học, làm bài theo chủ đề, nhận sao thưởng và huy hiệu. Giọng đọc hỗ trợ đọc câu hỏi và phản hồi (Google Cloud TTS hoặc giọng trình duyệt). Trang Cô giáo AI cho phép hỏi đáp bằng tiếng Việt; khi hết quota Gemini, hệ thống vẫn trả lời bằng câu mẫu offline.

Hệ thống có **dashboard giáo viên** (`mentor-teacher.html`) để xem danh sách học sinh theo **mã lớp** (`classRoom`), tiến độ học (`learning_progress/{uid}`) và lịch sử hỏi Cô AI (mentor history).

---

## Tính năng chính

| Trang | Đường dẫn | Mô tả |
|-------|-----------|-------|
| Trang chủ | `index.html` | Menu sáu môn học, tiến độ và huy hiệu theo từng môn |
| Bài học | `lessons/<môn>/index.html` | 6 môn: Nhận biết, Tư duy, Âm nhạc, Ghép hình, Mỹ thuật, Ngôn ngữ; quiz + TTS; dữ liệu lấy từ `lessons/data/lessons-data.js` |
| Tiến độ | `progress.html` | Tổng sao, streak, danh sách huy hiệu |
| Đấu trường | `arena.html` | Nhiều người trong một phiên có thời hạn, xếp hạng theo điểm |
| PvP | `pvp.html` | Tạo phòng, nhập mã hoặc ghép nhanh; đúng và nhanh hơn thắng |
| Cô giáo AI | `mentor.html` | Hỏi đáp qua API Gemini, mic và gõ chữ, TTS tiếng Việt |
| Giáo viên | `mentor-teacher.html` | Thống kê lớp, tiến độ học, lịch sử hỏi Cô AI |
| Hồ sơ học sinh | `profile.html` | Hộp thoại hồ sơ nhỏ gọn; sửa tên bằng popup; đổi/nhập mã lớp để đồng bộ với giáo viên |
| Đăng nhập/Đăng ký/Quên MK | `auth/login.html`, `auth/register.html`, `auth/forgot.html` | Firebase Auth (email/mật khẩu) + **bắt buộc xác thực email** |
| Setup học sinh | `auth/student-setup.html` | Onboarding sau lần đăng nhập đầu: nickname + avatar + (nếu cần) mã lớp |

---

## Công nghệ

- **Frontend:** HTML, CSS, JavaScript; topbar điều hướng, giao diện sáng/tối, responsive mobile
- **Router:** mini SPA (`spa.js` + `spa.css`) chuyển tab index/progress/pvp/profile không reload
- **Backend:** Firebase Auth, Firestore (người dùng, mã lớp, tiến độ, arena, PvP)
- **TTS:** Google Cloud Text-to-Speech (proxy `/api/tts-google`) hoặc Web Speech API
- **AI mentor:** Google Gemini qua `/api/mentor-chat` (Vercel serverless)
- **Hosting:** Vercel (static từ `public/`, API trong `api/`)

---

## Cấu trúc thư mục

```
kidlearningweb/
├── README.md
├── package.json
├── firestore.rules
├── firestore.indexes.json
├── vercel.json
├── VERCEL_API.md          (hướng dẫn API Cô giáo AI)
├── api/
│   ├── tts-config.js
│   ├── tts-google.js
│   ├── mentor-config.js
│   └── mentor-chat/index.js
└── public/
    ├── index.html
    ├── progress.html, arena.html, pvp.html
    ├── mentor.html, mentor-teacher.html
    ├── firebase.js, shared.js, shared.css
    ├── menu.js, menu.css, achievements.js
    ├── spa.js, spa.css
    ├── class-sync.js, progress-sync.js
    ├── auth/
    ├── secrets/           (cấu hình local; production dùng biến môi trường)
    └── lessons/
        ├── lesson.js, lesson.css
        ├── data/lessons-data.js
        └── <môn>/index.html
```

---

## Chạy trên máy local

Không cần bước build.

```bash
cd kidlearningweb
npm install
npx serve public
```

Hoặc: `python -m http.server 8080 --directory public`, hoặc extension Live Server trong VS Code.

Để test API mentor/TTS giống production (serverless functions):

```bash
npx vercel dev
```

---

## Cấu hình Firebase

1. Tạo project trên [Firebase Console](https://console.firebase.google.com).
2. Bật **Authentication** (Email/Password) và **Firestore**.
3. Dán `firebaseConfig` vào `public/firebase.js`.
4. Publish rules từ `firestore.rules`.
5. (Tuỳ chọn) Deploy indexes từ `firestore.indexes.json` nếu bạn dùng Firebase CLI.

### Collections Firestore đang dùng

- `users/{uid}`: hồ sơ (role, classRoom, displayName, avatar, studentProfileComplete…)
- `classrooms/{classRoom}`: registry lớp (teacherUid, teacherName, studentUids…)
- `learning_progress/{uid}`: tiến độ + `mentorHistory[]`
- `arena_sessions/{docId}`: đấu trường
- `pvp_rooms/{roomId}`: PvP

Đồng bộ tiến độ / lớp / đấu trường / PvP cần đăng nhập và rules đã publish.

---

## Giọng đọc (TTS)

| Engine | Ghi chú |
|--------|---------|
| Google Cloud TTS | Chất lượng cao; key đặt trên Vercel (`GOOGLE_TTS_API_KEY`), gọi qua `/api/tts-google` |
| Web Speech API | Miễn phí, dùng khi không có key Google; Edge/Windows có giọng tiếng Việt tự nhiên |

Local (không khuyến nghị production): `public/secrets/tts.config.js` với `window.__GOOGLE_TTS_API_KEY__`.

Production: Vercel Environment Variables `GOOGLE_TTS_API_KEY`, tùy chọn `GOOGLE_TTS_VOICE` (ví dụ `vi-VN-Neural2-A`).

---

## Cô giáo AI (Gemini)

- Endpoint: `POST /api/mentor-chat`
- Biến Vercel: `GEMINI_API_KEY` (bắt buộc); `GEMINI_MODEL` (tùy chọn, server tự chọn model còn hỗ trợ nếu bỏ trống)
- **Root Directory trên Vercel:** để trống (không đặt `public`), nếu không API trả 404
- Hết quota: server và client vẫn trả lời tiếng Việt bằng câu mẫu

Chi tiết: xem `VERCEL_API.md`.

Nếu host Firebase tách domain, gắn URL API trong `public/secrets/mentor.config.js`:

```js
window.__MENTOR_CHAT_URL__ = 'https://kidlearningweb.vercel.app/api/mentor-chat';
```

---

## Đấu trường và PvP (tóm tắt)

**Đấu trường:** phiên live trên Firestore, thời gian giới hạn, người điểm cao nhất nhận điểm vinh dự và huy hiệu arena.

**PvP:** phòng 6 ký tự hoặc ghép nhanh; chủ phòng bắt đầu; ai đạt 5 điểm trước thắng.

---

## Huy hiệu

Tự động mở theo sao, chủ đề/môn hoàn thành, streak học tập và thành tích đấu trường. Logic trong `achievements.js`.

---

## Triển khai Vercel

1. Kết nối repository GitHub/GitLab.
2. Root Directory: để trống (repo này đã đặt `vercel.json` ở root).
3. Thêm biến môi trường: `GEMINI_API_KEY`, `GOOGLE_TTS_API_KEY` (nếu dùng TTS Google).
4. Redeploy sau mỗi lần đổi biến hoặc code API.

---

## Lưu ý bảo mật

- Không commit API key vào git; thư mục `secrets/` dùng cho phát triển local.
- Hạn chế Google API key theo referrer và chỉ bật Cloud Text-to-Speech API.
- Nội dung hướng tới trẻ em: câu ngắn, giọng đọc và phản hồi bằng tiếng Việt.

---

## Giấy phép

ISC — dùng cho mục đích học tập và đồ án.

---

Chúng em đã biết làm web và hiểu hệ thống web hoạt động như thế nào.
