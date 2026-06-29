// Vercel Serverless — Cô giáo AI (Gemini khi còn quota → trả lời local tiếng Việt khi hết)

import { localMentorReply } from "../../lib/mentor-fallback.js";

const SYSTEM_PROMPT = `Bạn là Cô Mai, giáo viên mầm non vui vẻ, dịu dàng và yêu trẻ em.
Bạn đang nói chuyện với bé 3-6 tuổi đang học app Kid Learning.
Quy tắc BẮT BUỘC:
- CHỈ trả lời bằng tiếng Việt (có dấu). Không dùng tiếng Nhật, Anh, Hàn, Trung hay ngôn ngữ khác.
- Không dùng chữ Hiragana, Katakana, Kanji, Hangul.
- Trả lời ngắn gọn, dễ hiểu (tối đa 3 câu ngắn)
- Dùng ngôn ngữ đơn giản, vui tươi, có thể dùng emoji vừa phải
- Khen ngợi và khuyến khích bé thường xuyên
- Nếu bé hỏi về hình dạng, màu sắc, số đếm thì giải thích bằng ví dụ gần gũi
- Không nội dung bạo lực, người lớn, chính trị; nếu không phù hợp tuổi thì nhẹ nhàng chuyển sang chủ đề học vui
- Kết thúc bằng một câu hỏi nhỏ hoặc lời khen
- Xưng "cô", gọi bé là "con"`;

const MODEL_PREFER = [
  "gemini-2.5-flash-lite",
  "gemini-2.5-flash",
  "gemini-2.0-flash-lite-001",
  "gemini-2.0-flash-lite",
  "gemini-flash-latest"
];

const MAX_MODEL_TRIES = 1;
const GEMINI_CALL_TIMEOUT_MS = 12000;
const HANDLER_BUDGET_MS = 13000;

const MODEL_SKIP = new Set([
  "gemini-2.0-flash",
  "gemini-2.0-flash-exp",
  "gemini-1.5-flash",
  "gemini-1.5-flash-8b",
  "gemini-1.5-pro"
]);

const MAX_USER_CHARS = 500;

let cachedModelList = null;
let cachedModelListAt = 0;
const MODEL_CACHE_MS = 10 * 60 * 1000;

function getGeminiKey() {
  return process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY || "";
}

function normalizeModelName(name) {
  return String(name || "").replace(/^models\//, "").trim();
}

function isQuotaOrRateError(msg) {
  const m = String(msg || "").toLowerCase();
  return (
    m.includes("quota") ||
    m.includes("rate") ||
    m.includes("limit") ||
    m.includes("429") ||
    m.includes("resource_exhausted") ||
    m.includes("exceeded")
  );
}

function isModelGoneError(msg) {
  const m = String(msg || "").toLowerCase();
  return m.includes("not found") || m.includes("404") || m.includes("is not supported");
}

function parseRetryAfterSec(msg) {
  const m = String(msg || "").match(/retry in ([\d.]+)s/i);
  if (m) return Math.min(300, Math.max(5, Math.ceil(parseFloat(m[1]))));
  return 120;
}

function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function isVietnameseReply(text) {
  const t = String(text || "").trim();
  if (!t) return false;
  if (/[\u3040-\u309F\u30A0-\u30FF\u31F0-\u31FF]/.test(t)) return false;
  if (/[\uAC00-\uD7AF]/.test(t)) return false;
  const letters = t.match(/\p{L}/gu) || [];
  if (!letters.length) return true;
  const viLatin = letters.filter((ch) => /[A-Za-zÀ-ỹà-ỹĂăÂâĐđÊêÔôƠơƯư]/.test(ch)).length;
  return viLatin / letters.length >= 0.55;
}

async function fetchLiveModels(apiKey) {
  if (cachedModelList && Date.now() - cachedModelListAt < MODEL_CACHE_MS) {
    return cachedModelList;
  }
  try {
    const r = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models?key=" +
        encodeURIComponent(apiKey)
    );
    const data = await r.json();
    if (!r.ok) throw new Error(data?.error?.message || "list models failed");

    const names = (data.models || [])
      .filter((m) =>
        (m.supportedGenerationMethods || []).includes("generateContent")
      )
      .map((m) => normalizeModelName(m.name))
      .filter((n) => /^gemini/i.test(n) && !MODEL_SKIP.has(n))
      .filter((n) => !/image|embed|tts|vision-only/i.test(n));

    const sorted = [];
    for (const p of MODEL_PREFER) {
      if (names.includes(p)) sorted.push(p);
    }
    for (const n of names) {
      if (!sorted.includes(n)) sorted.push(n);
    }

    cachedModelList = sorted.length ? sorted : [...MODEL_PREFER];
    cachedModelListAt = Date.now();
    return cachedModelList;
  } catch (e) {
    console.warn("[mentor-chat] list models:", e.message);
    return [...MODEL_PREFER];
  }
}

async function getModelList(apiKey) {
  const custom = (process.env.GEMINI_MODEL || "")
    .split(",")
    .map((s) => normalizeModelName(s))
    .filter((n) => n && !MODEL_SKIP.has(n));

  const live = apiKey ? await fetchLiveModels(apiKey) : [...MODEL_PREFER];
  const out = [];
  const seen = new Set();
  for (const m of [...custom, ...live, ...MODEL_PREFER]) {
    if (!m || seen.has(m) || MODEL_SKIP.has(m)) continue;
    seen.add(m);
    out.push(m);
  }
  return out.length ? out : [...MODEL_PREFER];
}

/** Danh sách model gọn cho POST — tránh timeout Vercel (15s). */
function getFastModelList() {
  const custom = (process.env.GEMINI_MODEL || "")
    .split(",")
    .map((s) => normalizeModelName(s))
    .filter((n) => n && !MODEL_SKIP.has(n));

  const out = [];
  const seen = new Set();
  for (const m of [...custom, ...MODEL_PREFER]) {
    if (!m || seen.has(m) || MODEL_SKIP.has(m)) continue;
    seen.add(m);
    out.push(m);
    if (out.length >= 2) break;
  }
  return out.length ? out : MODEL_PREFER.slice(0, 2);
}

function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

async function askGemini(apiKey, message, model, extraSystemNote) {
  const systemText = extraSystemNote
    ? SYSTEM_PROMPT + "\n\n" + extraSystemNote
    : SYSTEM_PROMPT;

  const url =
    "https://generativelanguage.googleapis.com/v1beta/models/" +
    encodeURIComponent(model) +
    ":generateContent?key=" +
    encodeURIComponent(apiKey);

  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal: AbortSignal.timeout(GEMINI_CALL_TIMEOUT_MS),
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemText }] },
      contents: [{ role: "user", parts: [{ text: message }] }],
      generationConfig: {
        maxOutputTokens: 200,
        temperature: 0.55
      }
    })
  });

  const data = await r.json().catch(() => ({}));

  if (!r.ok) {
    const errMsg =
      data?.error?.message ||
      data?.error?.status ||
      "Gemini HTTP " + r.status;
    throw new Error(errMsg);
  }

  const parts = data?.candidates?.[0]?.content?.parts;
  const reply = (parts || [])
    .map((p) => (typeof p.text === "string" ? p.text : ""))
    .join("")
    .trim();

  if (!reply) throw new Error("Gemini trả về rỗng");
  return reply;
}

async function askGeminiWithFallback(apiKey, message) {
  const deadline = Date.now() + HANDLER_BUDGET_MS;
  const models = getFastModelList();
  const model = models[0] || MODEL_PREFER[0];
  let lastErr = null;

  try {
    let reply = await askGemini(apiKey, message, model);
    if (!isVietnameseReply(reply)) {
      return { reply: localMentorReply(message), model, provider: "local", sanitized: true, geminiUnavailable: true };
    }
    return { reply, model, provider: "gemini" };
  } catch (err) {
    lastErr = err;
    console.warn("[mentor-chat] gemini fail:", model, err.message);
  }

  if (models[1] && Date.now() < deadline) {
    try {
      let reply = await askGemini(apiKey, message, models[1]);
      if (isVietnameseReply(reply)) {
        return { reply, model: models[1], provider: "gemini" };
      }
    } catch (err) {
      lastErr = err;
    }
  }

  return {
    reply: localMentorReply(message),
    model,
    provider: "local",
    geminiUnavailable: true,
    quotaHit: lastErr && isQuotaOrRateError(lastErr.message),
    lastError: lastErr ? lastErr.message : ""
  };
}

export default async function handler(req, res) {
  setCors(res);

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  const apiKey = getGeminiKey();

  if (req.method === "GET") {
    const models = apiKey ? await getModelList(apiKey) : [...MODEL_PREFER];
    res.status(200).json({
      ok: true,
      configured: !!apiKey,
      provider: "gemini",
      model: models[0],
      models,
      skippedModels: [...MODEL_SKIP],
      note: "gemini-1.5 đã tắt — dùng 2.5-flash. Khi hết quota vẫn trả lời local tiếng Việt.",
      freeTier: true
    });
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      body = {};
    }
  }

  const message = (body && typeof body.message === "string" ? body.message : "")
    .trim()
    .slice(0, MAX_USER_CHARS);

  if (!message) {
    res.status(400).json({ error: "Thiếu message" });
    return;
  }

  if (!apiKey) {
    res.status(200).json({
      reply: localMentorReply(message),
      provider: "local",
      configured: false,
      geminiUnavailable: true
    });
    return;
  }

  try {
    const result = await askGeminiWithFallback(apiKey, message);
    res.setHeader("Cache-Control", "no-store");
    res.status(200).json({
      reply: result.reply,
      provider: result.provider || "gemini",
      model: result.model,
      sanitized: !!result.sanitized,
      geminiUnavailable: !!result.geminiUnavailable,
      localMode: result.provider === "local",
      retryAfterSec: result.quotaHit ? parseRetryAfterSec(result.lastError || "") : 0
    });
  } catch (err) {
    const msg = err.message || String(err);
    console.error("[mentor-chat]", msg);
    res.status(200).json({
      reply: localMentorReply(message),
      provider: "local",
      configured: true,
      geminiUnavailable: true,
      localMode: true,
      error: msg
    });
  }
}
