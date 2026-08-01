import prisma from "../../lib/prisma";
import nodemailer from "nodemailer";
import redis from "../../lib/redis";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Rate limit config
const RATE_LIMIT_WINDOW_SEC = Number(process.env.RATE_LIMIT_WINDOW_SEC || 60); // seconds
const RATE_LIMIT_MAX = Number(process.env.RATE_LIMIT_MAX || 5); // max requests per window

function getIp(req) {
  const forwarded = req.headers["x-forwarded-for"] || req.headers["X-Forwarded-For"];
  if (forwarded) return String(forwarded).split(",")[0].trim();
  return req.socket && req.socket.remoteAddress ? req.socket.remoteAddress : "unknown";
}

function validateEmail(email) {
  if (typeof email !== "string") return false;
  const e = email.trim();
  if (e.length === 0 || e.length > 254) return false;
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(e);
}

async function checkRateLimitRedis(ip) {
  if (!redis) return { limited: false, usedRedis: false };
  const key = `contact:rl:${ip}`;
  try {
    const current = await redis.incr(key);
    if (current === 1) {
      // first increment, set expiry
      await redis.expire(key, RATE_LIMIT_WINDOW_SEC);
    }
    if (current > RATE_LIMIT_MAX) {
      const ttl = await redis.ttl(key);
      return { limited: true, retryAfter: ttl > 0 ? ttl : RATE_LIMIT_WINDOW_SEC, usedRedis: true };
    }
    return { limited: false, usedRedis: true };
  } catch (err) {
    console.error("Redis rate-limit check failed:", err);
    return { limited: false, usedRedis: false };
  }
}

// In-memory fallback (process-local)
if (!global._contactInMemory) global._contactInMemory = new Map();
const inMemoryMap = global._contactInMemory;
const RATE_LIMIT_WINDOW_MS = RATE_LIMIT_WINDOW_SEC * 1000;

function checkRateLimitMemory(ip) {
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW_MS;
  const timestamps = (inMemoryMap.get(ip) || []).filter((t) => t > windowStart);
  if (timestamps.length >= RATE_LIMIT_MAX) {
    return { limited: true, retryAfter: Math.ceil((timestamps[0] + RATE_LIMIT_WINDOW_MS - now) / 1000) };
  }
  timestamps.push(now);
  inMemoryMap.set(ip, timestamps);
  return { limited: false };
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const ip = getIp(req);

  // Prefer Redis; fallback to memory if Redis unavailable.
  const rlRedis = await checkRateLimitRedis(ip);
  let rl = rlRedis.usedRedis ? rlRedis : checkRateLimitMemory(ip);

  if (rl.limited) {
    res.setHeader("Retry-After", String(rl.retryAfter || RATE_LIMIT_WINDOW_SEC));
    return res.status(429).json({ error: "Too many requests, please try again later" });
  }

  const { name, email, message } = req.body || {};
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
    const contact = await prisma.contact.create({
      data: { name: cleanName || null, email: cleanEmail, message: cleanMessage },
    });

    const owner = process.env.OWNER_EMAIL;
    const from = process.env.FROM_EMAIL || owner;

    try {
      await transporter.sendMail({
        from,
        to: owner,
        subject: `HowardBuilds contact: ${cleanName || cleanEmail}`,
        text: `Name: ${cleanName || "(not provided)"}\nEmail: ${cleanEmail}\nIP: ${ip}\n\nMessage:\n${cleanMessage}`,
      });
    } catch (mailErr) {
      console.error("Failed to send contact email:", mailErr);
      // persist-only fallback: do not return error to client
    }

    return res.json({ ok: true, id: contact.id });
  } catch (err) {
    console.error("contact error:", err);
    return res.status(500).json({ error: "Server error" });
  }
}
