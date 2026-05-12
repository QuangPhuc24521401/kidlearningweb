// Vercel Serverless Function — proxy Google Cloud TTS
// Đọc key từ ENV GOOGLE_TTS_API_KEY để không lộ trên client.
// URL: POST /api/tts-google  body: { text, voice? }
// Trả về: { audioContent: '<base64 MP3>' }

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const apiKey = process.env.GOOGLE_TTS_API_KEY || "";
  if (!apiKey) {
    res.status(500).json({ error: "Server chưa cấu hình GOOGLE_TTS_API_KEY" });
    return;
  }

  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch (_) { body = {}; }
  }
  const text  = (body && typeof body.text  === "string" ? body.text  : "").slice(0, 2000);
  const voice = (body && typeof body.voice === "string" ? body.voice : "vi-VN-Neural2-A");

  if (!text.trim()) {
    res.status(400).json({ error: "Thiếu text" });
    return;
  }

  try {
    const r = await fetch(
      "https://texttospeech.googleapis.com/v1/text:synthesize?key=" + encodeURIComponent(apiKey),
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input: { text },
          voice: { languageCode: "vi-VN", name: voice },
          audioConfig: { audioEncoding: "MP3", speakingRate: 0.95, pitch: 1.0 }
        })
      }
    );

    const data = await r.json();
    if (!r.ok || !data.audioContent) {
      res.status(r.status || 500).json({
        error: data.error?.message || "Google TTS lỗi",
        details: data
      });
      return;
    }

    // Cache nhẹ ở edge 1 ngày (text giống nhau sẽ trả audio nhanh hơn).
    res.setHeader("Cache-Control", "public, max-age=0, s-maxage=86400");
    res.status(200).json({ audioContent: data.audioContent });
  } catch (err) {
    res.status(500).json({ error: "Fetch lỗi: " + (err.message || String(err)) });
  }
}
