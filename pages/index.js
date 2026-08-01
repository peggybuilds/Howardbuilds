import { useEffect, useState } from "react";
import Link from "next/link";

export default function Home() {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    fetch("/api/properties")
      .then((r) => r.json())
      .then((data) => {
        if (!mounted) return;
        setProperties(data || []);
      })
      .catch(() => setProperties([]))
      .finally(() => mounted && setLoading(false));
    return () => (mounted = false);
  }, []);

  const hero = properties[0];
  const others = properties.slice(1, 7);

  return (
    <main style={{ fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial", padding: 20 }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h1 style={{ margin: 0 }}>HowardBuilds</h1>
        <nav>
          <Link href="/tenant/signup" style={{ marginRight: 12 }}>Tenant signup</Link>
          <Link href="/tenant/login" style={{ marginRight: 12 }}>Tenant login</Link>
          <Link href="/owner/login">Owner</Link>
        </nav>
      </header>

      <section style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 20, marginBottom: 32 }}>
        <div style={{ background: "#fafafa", padding: 20, borderRadius: 8 }}>
          {loading ? (
            <div>Loading properties...</div>
          ) : hero ? (
            <div>
              <div style={{ display: "flex", gap: 16 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ background: "#ddd", height: 260, borderRadius: 8, display: "flex", alignItems: "flex-end", padding: 16, color: "#111" }}>
                    <div>
                      <h2 style={{ margin: 0 }}>{hero.title}</h2>
                      <p style={{ margin: 6 }}>{hero.address}</p>
                      <p style={{ margin: 6, fontWeight: "600" }}>${hero.rent}</p>
                    </div>
                  </div>
                </div>
                <div style={{ width: 220 }}>
                  <div style={{ fontSize: 14, color: "#555", marginBottom: 8 }}>Quick actions</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <Link href="/tenant/signup"><button style={{ padding: "8px 12px" }}>Share tenant signup</button></Link>
                    <Link href="/owner/login"><button style={{ padding: "8px 12px" }}>Owner dashboard</button></Link>
                    <Link href="/tenant/login"><button style={{ padding: "8px 12px" }}>Tenant login</button></Link>
                  </div>
                </div>
              </div>

              <div style={{ marginTop: 18 }}>
                <h3>About this listing</h3>
                <p style={{ color: "#333" }}>{hero.description}</p>
              </div>
            </div>
          ) : (
            <div>
              <h2>No properties yet</h2>
              <p>Owner: log in to add properties.</p>
            </div>
          )}
        </div>

        <aside style={{ background: "#fff", padding: 16, borderRadius: 8, border: "1px solid #eee" }}>
          <h3 style={{ marginTop: 0 }}>Featured</h3>
          {loading ? (
            <div>Loading...</div>
          ) : others.length === 0 ? (
            <div>No featured listings</div>
          ) : (
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {others.map((p) => (
                <li key={p.id} style={{ padding: "8px 0", borderBottom: "1px solid #f1f1f1" }}>
                  <div style={{ fontWeight: 600 }}>{p.title}</div>
                  <div style={{ fontSize: 13, color: "#666" }}>${p.rent} • {p.address}</div>
                </li>
              ))}
            </ul>
          )}
        </aside>
      </section>

      <section>
        <h2>Browse listings</h2>
        {loading ? (
          <div>Loading...</div>
        ) : properties.length === 0 ? (
          <div>No properties available</div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
            {properties.map((p) => (
              <article key={p.id} style={{ border: "1px solid #eee", borderRadius: 8, padding: 12, background: "#fff" }}>
                <div style={{ height: 120, background: "#e9e9e9", borderRadius: 6, marginBottom: 8 }} />
                <h3 style={{ margin: "6px 0" }}>{p.title}</h3>
                <div style={{ color: "#666", fontSize: 13 }}>{p.address}</div>
                <div style={{ marginTop: 8, fontWeight: 700 }}>${p.rent}</div>
                <p style={{ marginTop: 8, color: "#444", fontSize: 14 }}>{p.description?.slice(0, 120)}{p.description?.length > 120 ? "..." : ""}</p>
                <div style={{ marginTop: 10 }}>
                  <Link href={`/properties/${p.id}`}><button style={{ padding: "8px 10px" }}>View details</button></Link>
                  <button style={{ marginLeft: 8, padding: "8px 10px" }} onClick={async () => {
                    // open tenant signup in new tab for quick apply flow
                    window.open('/tenant/signup', '_blank');
                  }}>Apply</button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <footer style={{ marginTop: 36, color: '#666' }}>
        <small>HowardBuilds — Rental property</small>
      </footer>
    </main>
  );
}
