# Sửa lỗi 404 `/api/mentor-chat`

## Nguyên nhân (đã kiểm tra)

Site `kidlearningweb.vercel.app` trả **200** cho `mentor.html` nhưng **404** cho `/api/tts-google` và `/api/mentor-chat` → Vercel **không deploy Functions**.

Thường do **Root Directory = `public`** trong project settings (chỉ upload static, bỏ qua thư mục `api/` ở ngoài).

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
