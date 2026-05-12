// Vercel Serverless Function — TTS proxy (Google → Edge fallback)
//
// • Nếu có ENV GOOGLE_TTS_API_KEY → gọi Google Cloud TTS (Neural2/Wavenet).
// • Nếu không / Google fail (vd. thẻ bị khoá, 403) → tự động chuyển sang
//   Microsoft Edge TTS (miễn phí, không cần key, neural vi-VN: HoaiMy / NamMinh).
//
// URL: POST /api/tts-google  body: { text, voice? }
// Trả về:    { audioContent: "<base64 MP3>", engine: "google" | "edge" }
//
// Tên endpoint giữ nguyên "tts-google" để khỏi đổi client; client không cần biết
// engine nào đang được dùng — chỉ cần audio.

import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";

/* Map tên giọng Google → giọng Edge tương đương (nam/nữ).
   Edge chỉ có 2 giọng neural vi-VN nên gom đôi:
     A (female)  → HoaiMy
     D (male)    → NamMinh */
const VOICE_MAP_GOOGLE_TO_EDGE = {
  "vi-VN-Neural2-A":  "vi-VN-HoaiMyNeural",
  "vi-VN-Neural2-D":  "vi-VN-NamMinhNeural",
  "vi-VN-Wavenet-A":  "vi-VN-HoaiMyNeural",
  "vi-VN-Wavenet-D":  "vi-VN-NamMinhNeural",
  "vi-VN-HoaiMyNeural":  "vi-VN-HoaiMyNeural",
  "vi-VN-NamMinhNeural": "vi-VN-NamMinhNeural",
};

async function synthGoogle(apiKey, text, voice) {
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
    throw new Error(
      "Google " + r.status + " — " + (data?.error?.message || "no audioContent")
    );
  }
  return data.audioContent; // base64
}

function synthEdge(text, voice) {
  return new Promise(async (resolve, reject) => {
    try {
      const tts = new MsEdgeTTS();
      await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
      const { audioStream } = tts.toStream(text, { rate: "-5%", pitch: "+2%" });
      const chunks = [];
      audioStream.on("data",  (c) => chunks.push(c));
      audioStream.on("error", (e) => reject(e));
      audioStream.on("end",   () => {
        try { tts.close(); } catch (_) {}
        const buf = Buffer.concat(chunks);
        if (!buf.length) return reject(new Error("Edge TTS trả audio rỗng"));
        resolve(buf.toString("base64"));
      });
    } catch (err) {
      reject(err);
    }
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
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

  const apiKey = process.env.GOOGLE_TTS_API_KEY || "";

  // ─── Ưu tiên Google nếu có key (và không bị tắt rõ ràng) ───
  if (apiKey && process.env.TTS_FORCE_EDGE !== "1") {
    try {
      const b64 = await synthGoogle(apiKey, text, voice);
      res.setHeader("Cache-Control", "public, max-age=0, s-maxage=86400");
      res.status(200).json({ audioContent: b64, engine: "google" });
      return;
    } catch (err) {
      console.warn("[TTS] Google fail → fallback Edge:", err.message || err);
      // ↓ rơi xuống Edge bên dưới
    }
  }

  // ─── Edge TTS (mặc định khi không có Google) ───
  const voiceEdge = VOICE_MAP_GOOGLE_TO_EDGE[voice] || "vi-VN-HoaiMyNeural";
  try {
    const b64 = await synthEdge(text, voiceEdge);
    res.setHeader("Cache-Control", "public, max-age=0, s-maxage=86400");
    res.status(200).json({ audioContent: b64, engine: "edge" });
  } catch (err) {
    console.error("[TTS] Edge fail:", err);
    res.status(500).json({ error: "TTS lỗi: " + (err.message || String(err)) });
  }
}
