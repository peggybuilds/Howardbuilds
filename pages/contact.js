import { useState } from "react";
import Link from "next/link";

export default function Contact({ ownerEmail, ownerPhone }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setStatus("");
    setLoading(true);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, message })
      });
      const j = await res.json();
      if (!res.ok) {
        setStatus(j.error || "Failed to send message");
      } else {
        setStatus("Message sent — thank you!");
        setName("");
        setEmail("");
        setMessage("");
      }
    } catch (err) {
      setStatus("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ padding: 20 }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>Contact — HowardBuilds</h1>
        <nav>
          <Link href="/">Home</Link>
        </nav>
      </header>

      <section style={{ marginTop: 20, maxWidth: 700 }}>
        <p>If you have questions about a listing or want to reach the owner, use the form below. Messages are delivered to the owner and stored for review.</p>

        <form onSubmit={submit}>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: "block", marginBottom: 6 }}>Your name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} style={{ width: "100%" }} />
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={{ display: "block", marginBottom: 6 }}>Your email</label>
            <input value={email} onChange={(e) => setEmail(e.target.value)} style={{ width: "100%" }} />
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={{ display: "block", marginBottom: 6 }}>Message</label>
            <textarea rows={6} value={message} onChange={(e) => setMessage(e.target.value)} style={{ width: "100%" }} />
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button type="submit" disabled={loading} style={{ padding: "8px 12px" }}>{loading ? "Sending..." : "Send message"}</button>
            <button
              type="button"
              onClick={() => {
                if (navigator.clipboard) navigator.clipboard.writeText(ownerEmail || "");
                setStatus("Owner email copied to clipboard");
              }}
            >
              Copy owner email
            </button>
            <button
              type="button"
              onClick={() => {
                if (navigator.clipboard) navigator.clipboard.writeText(ownerPhone || "");
                setStatus("Owner phone copied to clipboard");
              }}
            >
              Copy owner phone
            </button>
          </div>
        </form>

        {status && <p style={{ marginTop: 12 }}>{status}</p>}

        <div style={{ marginTop: 20, color: "#666" }}>
          <div><strong>Owner email:</strong> <a href={`mailto:${ownerEmail}`}>{ownerEmail}</a></div>
          <div style={{ marginTop: 6 }}><strong>Phone:</strong> <a href={`tel:${ownerPhone}`}>{ownerPhone}</a></div>
        </div>
      </section>
    </main>
  );
}

export async function getServerSideProps() {
  const ownerEmail = process.env.OWNER_EMAIL || "peggyannhoward@howardbuilds.us";
  const ownerPhone = process.env.OWNER_PHONE || "+1 407-972-4912";
  return { props: { ownerEmail, ownerPhone } };
}
