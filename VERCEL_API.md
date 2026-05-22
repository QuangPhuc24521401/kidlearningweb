# Sửa lỗi 404 `/api/mentor-chat`

## Nguyên nhân

Vercel đang deploy **chỉ thư mục `public`** (static), **không** build thư mục `api/` → mọi request `/api/*` trả **404**.

## Cách sửa trên Vercel Dashboard

1. Vào project **kidlearningweb** trên [vercel.com](https://vercel.com).
2. **Settings → General → Root Directory**
3. Để **trống** hoặc `.` (KHÔNG đặt `public`).
4. **Save** → **Deployments → Redeploy** (bỏ chọn “Use existing Build Cache”).
5. Sau deploy, mở tab **Functions** — phải thấy `api/mentor-chat`, `api/tts-google`, …

## Kiểm tra

Trình duyệt hoặc curl:

```
GET https://kidlearningweb.vercel.app/api/mentor-chat
```

Kết quả đúng: JSON `{"ok":true,"configured":true,...}` (status **200**), không phải 404.

## Mở app

- Dùng link **https://kidlearningweb.vercel.app/mentor.html**
- Nếu dùng **Firebase Hosting** (`firebaseapp.com`), sửa `public/secrets/mentor.config.js`:

```js
window.__MENTOR_CHAT_URL__ = 'https://kidlearningweb.vercel.app/api/mentor-chat';
```

(rồi deploy lại Firebase static)

## Biến môi trường

**Settings → Environment Variables:**

| Tên | Bắt buộc |
|-----|----------|
| `OPENAI_API_KEY` | Có |

Sau khi thêm/sửa → **Redeploy**.
