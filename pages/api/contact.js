import prisma from "../../lib/prisma";
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

// Simple in-memory rate limiter. This lives in the module/global scope so it
// persists across lambda warm instances while the process runs. It's not
// perfect for scaled deployments (multiple instances) but provides basic
// protection against spam/abuse in most small deployments.
if (!global.contactRateLimit) global.contactRateLimit = new Map();
const rateLimitMap = global.contactRateLimit;
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 5; // max 5 submissions per window per IP

function getIp(req) {
  // Try common headers, fallback to socket remote address
  const forwarded = req.headers["x-forwarded-for"] || req.headers["X-Forwarded-For"];
  if (forwarded) return String(forwarded).split(",")[0].trim();
  return req.socket && req.socket.remoteAddress ? req.socket.remoteAddress : "unknown";
}

function isRateLimited(ip) {
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW_MS;
  const timestamps = (rateLimitMap.get(ip) || []).filter((t) => t > windowStart);
  if (timestamps.length >= RATE_LIMIT_MAX) {
    // keep timestamps as-is (we don't add this request)
    rateLimitMap.set(ip, timestamps);
    return { limited: true, retryAfter: Math.ceil((timestamps[0] + RATE_LIMIT_WINDOW_MS - now) / 1000) };
  }
  // add this request
  timestamps.push(now);
  rateLimitMap.set(ip, timestamps);
  return { limited: false };
}

function validateEmail(email) {
  if (typeof email !== "string") return false;
  const e = email.trim();
  if (e.length === 0 || e.length > 254) return false;
  // simple RFC-ish check
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(e);
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const ip = getIp(req);
  const rl = isRateLimited(ip);
  if (rl.limited) {
    res.setHeader("Retry-After", String(rl.retryAfter || 60));
    return res.status(429).json({ error: "Too many requests, please try again later" });
  }

  const { name, email, message } = req.body || {};

  // Basic validation & sanitization
  const cleanName = typeof name === "string" ? name.trim() : "";
  const cleanEmail = typeof email === "string" ? email.trim() : "";
  const cleanMessage = typeof message === "string" ? message.trim() : "";

  if (!validateEmail(cleanEmail)) {
    return res.status(400).json({ error: "Invalid email address" });
  }

  if (!cleanMessage) {
    return res.status(400).json({ error: "Message is required" });
  }

  if (cleanName.length > 100) return res.status(400).json({ error: "Name is too long" });
  if (cleanMessage.length > 2000) return res.status(400).json({ error: "Message is too long" });

  try {
    // persist the message
    const contact = await prisma.contact.create({
      data: { name: cleanName || null, email: cleanEmail, message: cleanMessage }
    });

    const owner = process.env.OWNER_EMAIL;
    const from = process.env.FROM_EMAIL || owner;

    // send notification email; don't fail the request permanently on send error
    try {
      await transporter.sendMail({
        from,
        to: owner,
        subject: `HowardBuilds contact: ${cleanName || cleanEmail}`,
        text: `Name: ${cleanName || "(not provided)"}\nEmail: ${cleanEmail}\nIP: ${ip}\n\nMessage:\n${cleanMessage}`
      });
    } catch (mailErr) {
      console.error("Failed to send contact notification email:", mailErr);
      // We continue — the contact is persisted and the owner can still view it.
    }

    return res.json({ ok: true, id: contact.id });
  } catch (err) {
    console.error("contact error:", err);
    return res.status(500).json({ error: "Server error" });
  }
}
