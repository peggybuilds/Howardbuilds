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

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const { name, email, message } = req.body;
  if (!email || !message) return res.status(400).json({ error: "Missing email or message" });

  try {
    const contact = await prisma.contact.create({
      data: { name: name || null, email, message }
    });

    const owner = process.env.OWNER_EMAIL;
    const from = process.env.FROM_EMAIL || owner;

    await transporter.sendMail({
      from,
      to: owner,
      subject: `HowardBuilds contact: ${name || email}`,
      text: `Name: ${name || "(not provided)"}\nEmail: ${email}\n\nMessage:\n${message}`
    });

    return res.json({ ok: true, id: contact.id });
  } catch (err) {
    console.error("contact error:", err);
    return res.status(500).json({ error: "Server error" });
  }
}
