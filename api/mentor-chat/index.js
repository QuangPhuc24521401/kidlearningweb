// Vercel Serverless — Cô giáo AI qua Google Gemini (gói miễn phí Google AI Studio)

const SYSTEM_PROMPT = `Bạn là Cô Mai, giáo viên mầm non vui vẻ, dịu dàng và yêu trẻ em.
Bạn đang nói chuyện với bé 3-6 tuổi đang học app Kid Learning.
Quy tắc:
- Trả lời ngắn gọn, dễ hiểu (tối đa 3 câu ngắn)
- Dùng ngôn ngữ đơn giản, vui tươi, có thể dùng emoji vừa phải
- Khen ngợi và khuyến khích bé thường xuyên
- Nếu bé hỏi về hình dạng, màu sắc, số đếm thì giải thích bằng ví dụ gần gũi
- Không nội dung bạo lực, người lớn, chính trị; nếu không phù hợp tuổi thì nhẹ nhàng chuyển sang chủ đề học vui
- Kết thúc bằng một câu hỏi nhỏ hoặc lời khen
- Xưng "cô", gọi bé là "con"`;

/** Model free tier ổn định hơn gemini-2.0-flash (hay báo quota 0). */
const MODEL_FALLBACKS = [
  "gemini-1.5-flash",
  "gemini-1.5-flash-8b",
  "gemini-2.0-flash-lite"
];

const MAX_USER_CHARS = 500;

function getGeminiKey() {
  return process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY || "";
}

function getModelList() {
  const custom = (process.env.GEMINI_MODEL || "").trim();
  if (custom) {
    return custom
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [...MODEL_FALLBACKS];
}

function isQuotaOrRateError(msg) {
  const m = String(msg || "").toLowerCase();
  return (
    m.includes("quota") ||
    m.includes("rate") ||
    m.includes("limit") ||
    m.includes("429") ||
    m.includes("resource_exhausted")
  );
}

function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

async function askGemini(apiKey, message, model) {
  const url =
    "https://generativelanguage.googleapis.com/v1beta/models/" +
    encodeURIComponent(model) +
    ":generateContent?key=" +
    encodeURIComponent(apiKey);

  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{ role: "user", parts: [{ text: message }] }],
      generationConfig: {
        maxOutputTokens: 280,
        temperature: 0.75
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
  const models = getModelList();
  let lastErr = null;

  for (const model of models) {
    try {
      const reply = await askGemini(apiKey, message, model);
      return { reply, model };
    } catch (err) {
      lastErr = err;
      if (!isQuotaOrRateError(err.message)) throw err;
      console.warn("[mentor-chat] quota/rate on", model, "→ try next");
    }
  }

  throw lastErr || new Error("Gemini hết hạn mức miễn phí");
}

export default async function handler(req, res) {
  setCors(res);

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  const apiKey = getGeminiKey();
  const models = getModelList();

  if (req.method === "GET") {
    res.status(200).json({
      ok: true,
      configured: !!apiKey,
      provider: "gemini",
      model: models[0],
      models,
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
    res.status(503).json({
      error: "Chưa cấu hình GEMINI_API_KEY (aistudio.google.com/apikey)",
      configured: false,
      provider: "gemini"
    });
    return;
  }

  try {
    const { reply, model } = await askGeminiWithFallback(apiKey, message);
    res.setHeader("Cache-Control", "no-store");
    res.status(200).json({ reply, provider: "gemini", model });
  } catch (err) {
    const msg = err.message || String(err);
    console.error("[mentor-chat]", msg);
    const status = isQuotaOrRateError(msg) ? 429 : 502;
    res.status(status).json({
      error: msg,
      configured: true,
      provider: "gemini",
      rateLimited: isQuotaOrRateError(msg)
    });
  }
}
