# Kid Learning Web

## Danh sách thành viên

| STT | MSSV | Họ và tên | Tỉ lệ đóng góp |
|-----|------|-----------|----------------|
| 1 | 24521608 | Nguyễn Quang Thắng | 100% |
| 2 | 24521401 | Trần Quang Phúc | 100% |

---

Website học tập dành cho trẻ mầm non và tiểu học: bài học tương tác, trò chơi học tập, theo dõi tiến độ, cộng đồng lớp học, đối kháng và trợ giảng AI. Ứng dụng chạy trên trình duyệt (HTML, CSS, JavaScript thuần, không build), đồng bộ dữ liệu qua Firebase (Auth + Firestore) và triển khai tĩnh trên Vercel.

Repository: [github.com/QuangPhuc24521401/kidlearningweb](https://github.com/QuangPhuc24521401/kidlearningweb)

Demo: [kidlearningweb.vercel.app](https://kidlearningweb.vercel.app)

**Video dự án (Google Drive):** [LTUDW — thư mục video](https://drive.google.com/drive/folders/1ai1-7LJ7ZTkjiW4BNurX_w9LaZ6Q-IUw?usp=drive_link)

| Video | Nội dung |
|-------|----------|
| Video khảo sát | Khảo sát người dùng — thư mục `vid khao sat nguoi dung` |
| Video giới thiệu tính năng | Giới thiệu các tính năng hệ thống — thư mục `vid tinh nang` |

---

## Tóm tắt

Kid Learning Web là nền tảng web giáo dục sớm, thiết kế giao diện thân thiện với trẻ em và phụ huynh. Hệ thống hỗ trợ ba vai trò chính:

- **Phụ huynh / học sinh:** học bài theo môn, chơi game, tích lũy sao và huy hiệu, tham gia cộng đồng lớp, kết bạn, nhắn tin và hỏi Cô giáo AI.
- **Giáo viên:** quản lý lớp theo mã lớp, theo dõi tiến độ học sinh, xem lịch sử hỏi AI và tạo game tùy chỉnh cho lớp.
- **Quản trị kỹ thuật:** cấu hình Firebase, Firestore rules, biến môi trường Vercel cho TTS và Gemini.

Giọng đọc hỗ trợ đọc câu hỏi và phản hồi (Google Cloud TTS hoặc Web Speech API). Trang Cô giáo AI kết nối Google Gemini qua API serverless; khi API bận hoặc hết quota, hệ thống vẫn trả lời bằng câu mẫu tiếng Việt thông minh.

---

## Bảng trang và chức năng

| Trang | Đường dẫn | Mô tả |
|-------|-----------|-------|
| Trang chủ | `index.html` | Menu sáu môn học, tiến độ và huy hiệu theo từng môn |
| Bài học | `lessons/<môn>/index.html` | Sáu môn: Nhận biết, Tư duy, Âm nhạc, Ghép hình, Mỹ thuật, Ngôn ngữ; quiz + TTS |
| Tiến độ | `progress.html` | Tổng sao, streak, danh sách huy hiệu |
| Game | `game.html` | Sáu mini game học tập (Phaser); giới hạn lượt chơi theo gói |
| Cộng đồng | `social.html` | Bảng tin, khám phá, tìm bạn, kết bạn, nhắn tin riêng |
| Đấu trường | `arena.html` | Nhiều người trong một phiên có thời hạn, xếp hạng theo điểm |
| PvP | `pvp.html` | Tạo phòng, nhập mã hoặc ghép nhanh; đúng và nhanh hơn thắng |
| Cô giáo AI | `mentor.html` | Hỏi đáp qua Gemini, mic và gõ chữ, TTS tiếng Việt, giới hạn theo gói |
| Giáo viên | `mentor-teacher.html` | Thống kê lớp, tiến độ, lịch sử AI, tạo và xuất bản game |
| Hồ sơ | `profile.html` | Thông tin cá nhân, avatar, mã lớp, xem hồ sơ người khác (`?uid=`) |
| Gói Pro | `pro.html` | So sánh Basic / Pro, giới hạn game và Cô giáo AI |
| Đăng nhập / Đăng ký | `auth/login.html`, `auth/register.html`, `auth/forgot.html` | Firebase Auth (email/mật khẩu), xác thực email |
| Setup học sinh | `auth/student-setup.html` | Onboarding: nickname, avatar, mã lớp |

---

## Gói tài khoản Basic và Pro

Hệ thống phân quyền theo gói, đồng bộ trên Firestore (`users/{uid}.plan`) và cache local (`account-plan.js`).

| Hạng mục | Basic | Pro |
|----------|-------|-----|
| Lượt chơi mỗi game | 3 lượt / game | Không giới hạn |
| Cô giáo AI | 5 câu / ngày | Không giới hạn |
| Bài học, tiến độ, cộng đồng, PvP | Đầy đủ | Đầy đủ |
| Giáo viên | Tự động Pro | — |

Logic giới hạn:

- **Game:** `play-limits.js` — đếm lượt theo từng game (`platformer`, `maze`, `digger`, `memory`, `sort`, `spot`), đồng bộ `gamePlayCounts` lên Firestore.
- **Cô giáo AI:** `mentor-limits.js` — đếm câu hỏi theo ngày (`mentorDaily`), đồng bộ Firestore, hiển thị thanh tiến độ và modal khi hết lượt.

---

## Trò chơi học tập

Trang `game.html` tích hợp Phaser 3 với sáu mini game:

| Game | Mã | Mô tả ngắn |
|------|-----|------------|
| Phiêu lưu Platformer | `platformer` | Platform 2D, vượt chướng ngại |
| Mê cung 2D | `maze` | Tìm đường trong mê cung |
| Đào vàng | `digger` | Đào và thu thập |
| Ghép cặp trí nhớ | `memory` | Lật thẻ ghép cặp |
| Phân loại thông minh | `sort` | Phân loại đối tượng |
| Tìm khác biệt | `spot` | Tìm điểm khác biệt |

Tiến độ từng game lưu local và đồng bộ qua `learning_progress/{uid}`. Giáo viên có thể tạo game bổ sung (xem mục Dashboard giáo viên).

---

## Cộng đồng lớp học

Trang `social.html` là trung tâm tương tác xã hội, gồm năm tab:

### Bảng tin

- Đăng bài văn bản (tối đa 500 ký tự), like, bình luận.
- Lọc feed: **cùng lớp**, **đang theo dõi**, **toàn bộ**.
- Chia sẻ thành tích (sao tích lũy) lên bảng tin.
- Avatar tác giả lưu kèm bài đăng và cập nhật live từ hồ sơ.

### Khám phá

- Tin nổi bật (ưu tiên lượt thích và bài thành tích).
- Bảng xếp hạng sao trong lớp (`getClassLeaderboard`).

### Tìm bạn

- Hiển thị gợi ý bạn cùng lớp khi mở tab.
- Tìm theo tên hoặc mã lớp trong phạm vi lớp đã đăng ký.

### Bạn bè

- Gửi / nhận / chấp nhận / từ chối lời mời kết bạn.
- Gợi ý bạn cùng lớp từ registry `classrooms/{mã}` và query `users` theo `classRoom`.
- Theo dõi (follow) người dùng khác.

### Tin nhắn

- Chat 1-1 giữa hai người đã kết bạn.
- Khung chat cố định, cuộn nội bộ; hỗ trợ mobile (master-detail).
- Deep link: `social.html?tab=chat&uid={uid}`.

**Điều kiện hoạt động:** người dùng phải lưu mã lớp ở Hồ sơ; hệ thống tự đồng bộ `classRoom` lên Firestore khi vào Cộng đồng (`syncMySocialProfile`). Firestore rules phải được publish (xem mục Firebase).

---

## Hồ sơ người dùng

Trang `profile.html` hỗ trợ dashboard nhiều panel:

- **Tổng quan:** thống kê sao, huy hiệu, lối tắt.
- **Học tập:** chi tiết tiến độ từng môn.
- **Lớp học:** nhập / đổi mã lớp, xác minh qua registry `classrooms/{mã}`.
- **Gói Pro, Cài đặt, Tài khoản:** chỉ hiển thị với hồ sơ của chính mình.

**Xem hồ sơ người khác:** truy cập `profile.html?uid={firebaseUid}` từ bảng tin, tìm bạn hoặc chat. SPA (`spa.js`) hỗ trợ chuyển `?uid=` trên cùng route profile mà không reload trang. Hồ sơ người khác hiển thị nút Kết bạn, Theo dõi và Nhắn tin.

Avatar học sinh: emoji hoặc ảnh (base64 JPEG), lưu Firestore (`studentAvatar*`) và localStorage.

---

## Cô giáo AI (Gemini)

Giao diện dashboard (`mentor.html`, `mentor.css`):

- Hero, thanh lượt hỏi hôm nay, badge gói Basic / Pro.
- Nhập câu hỏi hoặc dùng micro (Web Speech API).
- Animation trạng thái Cô Mai (SVG), bong bóng chat, TTS tiếng Việt.
- Lịch sử hỏi đáp lưu local và Firestore (`mentorHistory`).

**API:**

- Endpoint: `POST /api/mentor-chat`
- Biến Vercel: `GEMINI_API_KEY` (bắt buộc); `GEMINI_MODEL` (tùy chọn)
- Timeout client 90 giây; retry khi mạng chậm.
- Fallback: `mentor-fallback.js` — câu trả lời mẫu theo từ khóa tiếng Việt khi Gemini không phản hồi.

**Giới hạn:** Basic 5 câu / ngày; Pro không giới hạn. Đếm lượt ngay khi bắt đầu gửi câu hỏi; đồng bộ `users/{uid}.mentorDaily`.

Chi tiết triển khai API: xem `VERCEL_API.md`.

Cấu hình URL API khi host tách domain:

```js
window.__MENTOR_CHAT_URL__ = 'https://kidlearningweb.vercel.app/api/mentor-chat';
```

(File mẫu: `public/secrets/mentor.config.js`)

---

## Dashboard giáo viên

Trang `mentor-teacher.html` dành riêng role `teacher`:

| Tab | Chức năng |
|-----|-----------|
| Tổng quan | Thống kê lớp, số học sinh |
| Tiến độ học | Danh sách học sinh, sao, huy hiệu từ `learning_progress` |
| Lịch sử AI | Câu hỏi học sinh gửi cho Cô giáo AI |
| Tạo game | Soạn câu hỏi JSON, chọn theme, xuất bản game cho lớp |

Module `teacher-games.js` lưu game vào `teacher_games/{gameId}` với `classRoom`, `teacherUid`, cờ `published`. Học sinh cùng lớp đọc game đã xuất bản qua `game.html`.

Đồng bộ danh sách học sinh: query `users` theo `classRoom` và registry `classrooms/{mã}.studentUids` (`class-sync.js`).

---

## Công nghệ

| Thành phần | Chi tiết |
|------------|----------|
| Frontend | HTML, CSS, JavaScript thuần; responsive mobile |
| Router | Mini SPA (`spa.js`): index, progress, pvp, profile, pro — chuyển tab không reload |
| Auth | Firebase Authentication (email / mật khẩu, xác thực email) |
| Database | Cloud Firestore — users, lớp, tiến độ, cộng đồng, chat, game |
| Game engine | Phaser 3 (CDN) |
| TTS | Google Cloud TTS (`/api/tts-google`) hoặc Web Speech API |
| AI | Google Gemini (`/api/mentor-chat`, Vercel serverless) |
| Hosting | Vercel — static từ `public/`, API trong `api/` |

---

## Cấu trúc thư mục

```
kidlearningweb/
├── README.md
├── package.json
├── firestore.rules
├── firestore.indexes.json
├── vercel.json
├── VERCEL_API.md
├── api/
│   ├── tts-config.js
│   ├── tts-google.js
│   ├── mentor-config.js
│   └── mentor-chat/index.js
└── public/
    ├── index.html, progress.html, arena.html, pvp.html
    ├── game.html, game.css, game-hub.js
    ├── game/                    (canvas, levels, progress từng game)
    ├── social.html, social.js, social.css, social-sync.js
    ├── mentor.html, mentor.js, mentor.css
    ├── mentor-limits.js, mentor-fallback.js
    ├── mentor-teacher.html, teacher-games.js
    ├── profile.html, pro.html, pro.js, pro.css
    ├── messages.html, messages.js   (redirect / legacy)
    ├── firebase.js, shared.js, shared.css
    ├── menu.js, menu.css, achievements.js
    ├── spa.js, spa.css
    ├── class-sync.js, progress-sync.js
    ├── account-plan.js, play-limits.js
    ├── auth/
    ├── secrets/               (cấu hình local; production dùng env Vercel)
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

Để test API mentor / TTS giống production:

```bash
npx vercel dev
```

---

## Cấu hình Firebase

1. Tạo project trên [Firebase Console](https://console.firebase.google.com).
2. Bật **Authentication** (Email/Password) và **Firestore**.
3. Dán `firebaseConfig` vào `public/firebase.js`.
4. **Publish rules** từ `firestore.rules` (bắt buộc cho Cộng đồng, kết bạn, chat).
5. Deploy indexes từ `firestore.indexes.json` (khuyến nghị):

```bash
cd kidlearningweb
npx firebase-tools login
npm run deploy:rules
```

### Collections Firestore

| Collection | Mục đích |
|------------|----------|
| `users/{uid}` | Hồ sơ: role, classRoom, displayName, avatar, plan, mentorDaily, gamePlayCounts |
| `classrooms/{classRoom}` | Registry lớp: teacherUid, teacherName, studentUids |
| `learning_progress/{uid}` | Tiến độ bài học, game, mentorHistory |
| `posts/{postId}` | Bài đăng cộng đồng (+ subcollection `comments`) |
| `follows/{uid}/following/{targetId}` | Theo dõi người dùng |
| `friend_requests/{fromUid__toUid}` | Lời mời kết bạn (doc ID cố định) |
| `friends/{uid}/list/{friendUid}` | Danh sách bạn bè |
| `chats/{chatId}/messages/{msgId}` | Tin nhắn 1-1 (chatId = hai uid sort nối bằng `__`) |
| `teacher_games/{gameId}` | Game giáo viên tạo cho lớp |
| `arena_sessions/{docId}` | Phiên đấu trường |
| `pvp_rooms/{roomId}` | Phòng PvP |

### Quy tắc truy cập (tóm tắt)

- User đọc / ghi doc của chính mình.
- Học sinh đọc hồ sơ **cùng lớp** (`sameClassAs`) hoặc qua registry lớp (`classmateViaRegistry`).
- Bạn bè đọc hồ sơ nhau sau khi đã kết bạn (`isFriendWith`).
- Bài đăng: mọi user đăng nhập đọc; chỉ tác giả tạo / xóa; like cập nhật chung.
- Chat: chỉ participant; tạo chat yêu cầu đã là bạn bè (`areFriends`).
- Giáo viên đọc tiến độ học sinh cùng lớp.

---

## Giọng đọc (TTS)

| Engine | Ghi chú |
|--------|---------|
| Google Cloud TTS | Chất lượng cao; key trên Vercel (`GOOGLE_TTS_API_KEY`), gọi qua `/api/tts-google` |
| Web Speech API | Miễn phí; Edge / Windows có giọng tiếng Việt tự nhiên |

Local: `public/secrets/tts.config.js` với `window.__GOOGLE_TTS_API_KEY__`.

Production: Vercel Environment Variables `GOOGLE_TTS_API_KEY`, tùy chọn `GOOGLE_TTS_VOICE` (ví dụ `vi-VN-Neural2-A`).

---

## Đấu trường và PvP

**Đấu trường:** phiên live trên Firestore, thời gian giới hạn; người điểm cao nhất nhận điểm vinh dự và huy hiệu arena.

**PvP:** phòng 6 ký tự hoặc ghép nhanh; chủ phòng bắt đầu; ai đạt 5 điểm trước thắng.

---

## Huy hiệu

Tự động mở theo sao, chủ đề / môn hoàn thành, streak học tập và thành tích đấu trường. Logic trong `achievements.js`.

---

## Triển khai Vercel

1. Kết nối repository GitHub / GitLab.
2. Root Directory: để trống (repo đặt `vercel.json` ở root).
3. Biến môi trường: `GEMINI_API_KEY`, `GOOGLE_TTS_API_KEY` (nếu dùng TTS Google).
4. Redeploy sau mỗi lần đổi biến hoặc code API.
5. Publish Firestore rules trên Firebase Console sau mỗi lần cập nhật `firestore.rules`.

---

## Lưu ý bảo mật

- Không commit API key vào git; thư mục `secrets/` dùng cho phát triển local.
- Hạn chế Google API key theo referrer; chỉ bật Cloud Text-to-Speech API.
- Avatar ảnh chỉ chấp nhận data URL JPEG base64 (giới hạn kích thước).
- Nội dung hướng tới trẻ em: câu ngắn, phản hồi tiếng Việt, giới hạn độ dài tin nhắn / bài đăng.

---

## Giấy phép

ISC — dùng cho mục đích học tập và đồ án.

---

Chúng em đã biết làm web và hiểu hệ thống web hoạt động như thế nào.
