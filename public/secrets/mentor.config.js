/**
 * Cấu hình API Cô giáo AI (tuỳ chọn).
 *
 * Mặc định: POST /api/mentor-chat (cùng domain Vercel).
 *
 * Nếu host HTML ở chỗ khác (Firebase static), đặt URL đầy đủ tới Vercel:
 * window.__MENTOR_CHAT_URL__ = 'https://ten-app.vercel.app/api/mentor-chat';
 */
window.__MENTOR_CHAT_URL__ = '';
