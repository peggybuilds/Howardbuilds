import prisma from "../../lib/prisma";
import { parseTokenCookie, verifyToken } from "../../lib/auth";

export default async function handler(req, res) {
  const method = req.method;

  if (method === "GET") {
    // require owner
    const token = parseTokenCookie(req);
    const payload = verifyToken(token, process.env.JWT_SECRET);
    if (!payload || payload.role !== "owner" || payload.email !== process.env.OWNER_EMAIL) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const apps = await prisma.application.findMany({ orderBy: { createdAt: "desc" }, include: { tenant: true, property: true } });
    return res.json(apps);
  }

  if (method === "DELETE") {
    // require owner
    const token = parseTokenCookie(req);
    const payload = verifyToken(token, process.env.JWT_SECRET);
    if (!payload || payload.role !== "owner" || payload.email !== process.env.OWNER_EMAIL) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const { id } = req.body;
    if (!id) return res.status(400).json({ error: "Missing id" });
    await prisma.application.delete({ where: { id: Number(id) } });
    return res.json({ ok: true });
  }

  res.status(405).end();
}
