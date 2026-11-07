import crypto from "node:crypto";
export const config = { api: { bodyParser: false } };

function readRaw(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", c => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}
function validSignature(raw, header) {
  const secret = process.env.META_APP_SECRET;
  if (!secret || !header || !header.startsWith("sha256=")) return false;
  const expected = "sha256=" + crypto.createHmac("sha256", secret).update(raw).digest("hex");
  const a = Buffer.from(header), b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
async function askAI(text) {
  const base = process.env.AI_API_URL || "https://ai.dnuz.top/api/gemini?q=";
  const r = await fetch(base + encodeURIComponent(text), { signal: AbortSignal.timeout(25000) });
  if (!r.ok) throw new Error("AI API HTTP " + r.status);
  const data = await r.json();
  const answer = data?.result ?? data?.response ?? data?.answer ?? data?.message;
  if (typeof answer === "string" && answer.trim()) return answer.trim().slice(0, 4000);
  throw new Error("AI API response has no result/response/answer/message field");
}
async function sendText(to, body) {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const version = process.env.GRAPH_API_VERSION || "v26.0";
  if (!token || !phoneId) throw new Error("Missing WhatsApp credentials");
  const r = await fetch(`https://graph.facebook.com/${version}/${phoneId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp", recipient_type: "individual", to,
      type: "text", text: { preview_url: false, body }
    }),
    signal: AbortSignal.timeout(20000)
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data?.error?.message || `WhatsApp HTTP ${r.status}`);
  return data;
}
export default async function handler(req, res) {
  if (req.method === "GET") {
    const q = req.query || {};
    if (q["hub.mode"] === "subscribe" &&
        q["hub.verify_token"] === process.env.WHATSAPP_VERIFY_TOKEN &&
        process.env.WHATSAPP_VERIFY_TOKEN && q["hub.challenge"]) {
      return res.status(200).send(q["hub.challenge"]);
    }
    return res.status(403).send("Webhook verification failed");
  }
  if (req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).send("Method Not Allowed");
  }
  try {
    const raw = await readRaw(req);
    if (!validSignature(raw, req.headers["x-hub-signature-256"])) {
      console.error("Signature check failed. Check META_APP_SECRET.");
      return res.status(401).send("Invalid signature");
    }
    const payload = JSON.parse(raw.toString("utf8"));
    if (payload.object === "whatsapp_business_account") {
      for (const entry of payload.entry || []) {
        for (const change of entry.changes || []) {
          for (const msg of change.value?.messages || []) {
            if (msg.type !== "text" || !msg.text?.body || !msg.from) continue;
            try {
              const reply = await askAI(msg.text.body.trim());
              await sendText(msg.from, reply);
              console.log("AI reply sent", msg.id);
            } catch (e) {
              console.error("Reply error:", e.message);
              try {
                await sendText(msg.from, "සමාවෙන්න, දැන් AI සේවාවට සම්බන්ධ වෙන්න බැහැ. ටිකකින් නැවත උත්සාහ කරන්න.");
              } catch (sendError) { console.error("Fallback failed:", sendError.message); }
            }
          }
        }
      }
    }
    return res.status(200).send("EVENT_RECEIVED");
  } catch (e) {
    console.error("Webhook error:", e.message);
    return res.status(400).send("Invalid webhook request");
  }
}
