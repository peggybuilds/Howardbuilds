import prisma from "../../lib/prisma";
import sgMail from "@sendgrid/mail";

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const { name, email, message } = req.body;
  if (!email || !message) return res.status(400).json({ error: "Missing email or message" });

  try {
    // persist to DB
    const contact = await prisma.contact.create({
      data: { name: name || null, email, message }
    });

    // notify owner
    const owner = process.env.OWNER_EMAIL;
    const from = process.env.FROM_EMAIL || owner;
    await sgMail.send({
      to: owner,
      from,
      subject: `HowardBuilds contact: ${name || email}`,
      text: `Name: ${name || "(not provided)"}\nEmail: ${email}\n\nMessage:\n${message}`
    });

    return res.json({ ok: true, id: contact.id });
  } catch (err) {
    console.error("contact error:", err);
    return res.status(500).json({ error: "Server error" });
  }
}
