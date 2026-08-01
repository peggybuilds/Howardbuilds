import { useState } from "react";
import Link from "next/link";

export default function Contact({ ownerEmail }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState("");

  function submit(e) {
    e.preventDefault();
    // Build a mailto: link so the user's email client opens with the message prefilled.
    const subject = encodeURIComponent(`Inquiry from HowardBuilds website: ${name || email}`);
    const body = encodeURIComponent(`Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}`);
    const mailto = `mailto:${ownerEmail}?subject=${subject}&body=${body}`;
    window.location.href = mailto;
    setStatus("Opening your email client...");
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
        <p>If you have questions about a listing or want to reach the owner, use the form below. This will open your email client so you can send the message directly.</p>

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
            <button type="submit" style={{ padding: "8px 12px" }}>Send via email</button>
            <button type="button" onClick={() => { navigator.clipboard && navigator.clipboard.writeText(ownerEmail); setStatus("Owner email copied to clipboard"); }}>Copy owner email</button>
          </div>
        </form>

        {status && <p style={{ marginTop: 12 }}>{status}</p>}

        <div style={{ marginTop: 20, color: "#666" }}>
          <strong>Owner email:</strong> {ownerEmail}
        </div>
      </section>
    </main>
  );
}

export async function getServerSideProps() {
  const ownerEmail = process.env.OWNER_EMAIL || "";
  return { props: { ownerEmail } };
}
