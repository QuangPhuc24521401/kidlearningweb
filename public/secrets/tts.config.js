/* ═══════════════════════════════════════════════════════════
 *  GOOGLE CLOUD TTS — Cấu hình giọng đọc Tiếng Việt
 * ═══════════════════════════════════════════════════════════
 *
 * Có hai cách để có giọng Google Neural2 (không cần nhập key trong UI):
 *
 * 1) PRODUCTION (Vercel) — KHUYẾN NGHỊ:
 *    Đặt biến môi trường GOOGLE_TTS_API_KEY trong Vercel Dashboard.
 *    File /api/tts-config.js sẽ tự động bật cờ proxy → client không cần key.
 *    Key luôn nằm trên server, không xuất hiện trong browser.
 *
 * 2) LOCAL / STATIC HOSTING — dán key vào dòng dưới (NHỚ giới hạn HTTP referrer
 *    cho key trong Google Cloud Console để tránh lạm dụng):
 *
 *      window.__GOOGLE_TTS_API_KEY__ = 'AIza...';
 *
 * Nếu không cấu hình gì, app dùng Web Speech API của trình duyệt (miễn phí,
 * chất lượng tốt nhất trên Microsoft Edge / Windows 11).
 *
 * ═══════════════════════════════════════════════════════════ */

window.__GOOGLE_TTS_API_KEY__   = window.__GOOGLE_TTS_API_KEY__   || '';
window.__GOOGLE_TTS_VOICE__     = window.__GOOGLE_TTS_VOICE__     || 'vi-VN-Neural2-A';
window.__GOOGLE_TTS_USE_PROXY__ = (typeof window.__GOOGLE_TTS_USE_PROXY__ === 'boolean')
  ? window.__GOOGLE_TTS_USE_PROXY__
  : false;
