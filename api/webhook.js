import crypto from "node:crypto";

export const config = {
  api: { bodyParser: false }
};

const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN;
const APP_SECRET = process.env.META_APP_SECRET;

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", chunk => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

function validMetaSignature(rawBody, signatureHeader) {
  if (!APP_SECRET) return true; 
  if (!signatureHeader || !signatureHeader.startsWith("sha256=")) return false;

  const expected = "sha256=" + crypto
    .createHmac("sha256", APP_SECRET)
    .update(rawBody)
    .digest("hex");

  const receivedBuffer = Buffer.from(signatureHeader);
  const expectedBuffer = Buffer.from(expected);

  return receivedBuffer.length === expectedBuffer.length &&
    crypto.timingSafeEqual(receivedBuffer, expectedBuffer);
}

export default async function handler(req, res) {
  if (req.method === "GET") {
    const mode = req.query?.["hub.mode"];
    const token = req.query?.["hub.verify_token"];
    const challenge = req.query?.["hub.challenge"];

    if (mode === "subscribe" && VERIFY_TOKEN && token === VERIFY_TOKEN && challenge) {
      return res.status(200).send(challenge);
    }

    return res.status(403).send("Webhook verification failed");
  }

  if (req.method === "POST") {
    try {
      const rawBody = await readRawBody(req);

      if (!validMetaSignature(rawBody, req.headers["x-hub-signature-256"])) {
        return res.status(401).send("Invalid Meta signature");
      }

      const payload = JSON.parse(rawBody.toString("utf8"));

      
      if (payload.object === "whatsapp_business_account") {
        for (const entry of payload.entry || []) {
          for (const change of entry.changes || []) {
            const value = change.value || {};
            for (const message of value.messages || []) {
              console.log("Incoming WhatsApp message:", JSON.stringify({
                from: message.from,
                id: message.id,
                type: message.type,
                timestamp: message.timestamp,
                text: message.text?.body || null
              }));
            }
          }
        }
      }

      return res.status(200).send("EVENT_RECEIVED");
    } catch (error) {
      console.error("Webhook error:", error.message);
      return res.status(400).send("Invalid webhook payload");
    }
  }

  res.setHeader("Allow", "GET, POST");
  return res.status(405).send("Method Not Allowed");
}
