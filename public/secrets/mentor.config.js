/**
 * API Cô giáo AI.
 * - Trên Vercel (kidlearningweb.vercel.app): để trống → gọi /api/mentor-chat cùng domain.
 * - Local / Firebase Hosting: trỏ sang Vercel Functions (bên dưới).
 */
window.__MENTOR_CHAT_URL__ = window.__MENTOR_CHAT_URL__ || 'https://kidlearningweb.vercel.app/api/mentor-chat';
