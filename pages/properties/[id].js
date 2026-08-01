import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import Link from "next/link";

export default function PropertyDetail() {
  const router = useRouter();
  const { id } = router.query;
  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [message, setMessage] = useState("");
  const [applying, setApplying] = useState(false);
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (!id) return;
    let mounted = true;
    setLoading(true);
    fetch("/api/properties")
      .then((r) => r.json())
      .then((list) => {
        if (!mounted) return;
        const p = list.find((x) => String(x.id) === String(id));
        if (!p) setError("Property not found");
        else setProperty(p);
      })
      .catch(() => setError("Failed to load property"))
      .finally(() => mounted && setLoading(false));
    return () => (mounted = false);
  }, [id]);

  async function submitApplication(e) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setApplying(true);
    try {
      const res = await fetch("/api/apply", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ propertyId: Number(id), message })
      });
      const j = await res.json();
      if (!res.ok) {
        if (res.status === 403) {
          setError("You must be signed up and logged in as a tenant to apply. Please sign up or log in.");
        } else {
          setError(j.error || "Failed to submit application");
        }
      } else {
        setSuccess("Application submitted — the owner will be able to review it in the dashboard.");
        setMessage("");
      }
    } catch (err) {
      setError(err.message || "Network error");
    } finally {
      setApplying(false);
    }
  }

  if (loading) return <main style={{ padding: 20 }}>Loading property...</main>;
  if (error) return (
    <main style={{ padding: 20 }}>
      <p style={{ color: "red" }}>{error}</p>
      <p><Link href="/">Back to listings</Link></p>
    </main>
  );

  return (
    <main style={{ padding: 20 }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>{property.title}</h1>
        <Link href="/">Back to listings</Link>
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 20, marginTop: 18 }}>
        <div style={{ background: "#fff", padding: 20, borderRadius: 8, border: "1px solid #eee" }}>
          <div style={{ height: 260, background: "#e9e9e9", borderRadius: 8, marginBottom: 12 }} />
          <p style={{ fontSize: 18, fontWeight: 600 }}>${property.rent}</p>
          <p style={{ color: "#555" }}>{property.address}</p>
          <section style={{ marginTop: 12 }}>
            <h3>About this property</h3>
            <p style={{ whiteSpace: "pre-wrap" }}>{property.description}</p>
          </section>
        </div>

        <aside style={{ background: "#fafafa", padding: 16, borderRadius: 8, border: "1px solid #eee" }}>
          <h3 style={{ marginTop: 0 }}>Apply</h3>
          <p style={{ fontSize: 14, color: "#333" }}>${property.rent} • {property.address}</p>

          {success && <p style={{ color: "green" }}>{success}</p>}
          {error && <p style={{ color: "red" }}>{error}</p>}

          <form onSubmit={submitApplication}>
            <div style={{ marginBottom: 8 }}>
              <label style={{ display: "block", fontSize: 13, marginBottom: 6 }}>Message to owner (optional)</label>
              <textarea rows={5} value={message} onChange={(e) => setMessage(e.target.value)} style={{ width: "100%" }} />
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button type="submit" disabled={applying} style={{ padding: "8px 12px" }}>Apply</button>
              <Link href="/tenant/signup"><button type="button" style={{ padding: "8px 12px" }}>Sign up</button></Link>
              <Link href="/tenant/login"><button type="button" style={{ padding: "8px 12px" }}>Log in</button></Link>
            </div>
          </form>

          <div style={{ marginTop: 14 }}>
            <small style={{ color: "#666" }}>You must be signed up as a tenant to submit an application. After applying, the owner can review applications in the owner dashboard.</small>
          </div>
        </aside>
      </div>
    </main>
  );
}
