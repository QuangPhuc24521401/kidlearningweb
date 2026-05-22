// Vercel Serverless — proxy OpenAI cho Cô giáo AI (key chỉ trên server)
//
// POST /api/mentor-chat  body: { message: string }
// Trả về: { reply: string } hoặc { error, configured: false }

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

const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
const MAX_USER_CHARS = 500;

export default async function handler(req, res) {
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

  const message = (body && typeof body.message === "string" ? body.message : "").trim().slice(0, MAX_USER_CHARS);
  if (!message) {
    res.status(400).json({ error: "Thiếu message" });
    return;
  }

  const apiKey = process.env.OPENAI_API_KEY || "";
  if (!apiKey) {
    res.status(503).json({
      error: "Chưa cấu hình OPENAI_API_KEY trên server",
      configured: false
    });
    return;
  }

  try {
    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + apiKey
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 220,
        temperature: 0.7,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: message }
        ]
      })
    });

    const data = await r.json().catch(() => ({}));

    if (!r.ok) {
      const errMsg =
        data?.error?.message ||
        data?.error?.code ||
        "OpenAI HTTP " + r.status;
      console.error("[mentor-chat]", errMsg);
      res.status(502).json({ error: errMsg, configured: true });
      return;
    }

    const reply = (data.choices?.[0]?.message?.content || "").trim();
    if (!reply) {
      res.status(502).json({ error: "OpenAI trả về rỗng", configured: true });
      return;
    }

    res.setHeader("Cache-Control", "no-store");
    res.status(200).json({ reply, model: MODEL });
  } catch (err) {
    console.error("[mentor-chat]", err);
    res.status(500).json({
      error: err.message || String(err),
      configured: true
    });
  }
}
