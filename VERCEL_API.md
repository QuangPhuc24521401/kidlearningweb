# Cô giáo AI — API `/api/mentor-chat`

Dùng **Google Gemini** (miễn phí qua [Google AI Studio](https://aistudio.google.com/apikey)), không dùng OpenAI trả phí.

## Cấu hình Vercel

| Biến | Bắt buộc | Ghi chú |
|------|----------|---------|
| `GEMINI_API_KEY` | Có | Key `AIza...` từ AI Studio |
| `GEMINI_MODEL` | Không | Không bắt buộc. Server tự lấy model còn sống (`gemini-2.5-flash-lite`, …). **Không** dùng `gemini-1.5-flash` (đã tắt). Khi hết quota vẫn trả lời tiếng Việt offline. |

**Root Directory:** để trống (không đặt `public`).

Sau khi thêm/sửa biến → **Redeploy**.

## Kiểm tra

```
GET https://kidlearningweb.vercel.app/api/mentor-chat
```

Đúng: `{"ok":true,"configured":true,"provider":"gemini",...}`

## Lỗi 404 `/api/*`

Vercel chỉ deploy static → xem mục Root Directory ở README / commit trước.

## Firebase Hosting

Sửa `public/secrets/mentor.config.js`:

```js
window.__MENTOR_CHAT_URL__ = 'https://kidlearningweb.vercel.app/api/mentor-chat';
```
