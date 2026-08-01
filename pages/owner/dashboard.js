import { parse } from "cookie";
import { verify } from "jsonwebtoken";
import prisma from "../../lib/prisma";
import { useState } from "react";

export default function OwnerDashboard({ properties: initialProperties }) {
  const [properties, setProperties] = useState(initialProperties || []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [newProp, setNewProp] = useState({ title: "", description: "", address: "", rent: "" });
  const [editingId, setEditingId] = useState(null);
  const [editFields, setEditFields] = useState({ title: "", description: "", address: "", rent: "" });

  async function refreshProperties() {
    const res = await fetch("/api/properties");
    if (res.ok) {
      const data = await res.json();
      setProperties(data);
    }
  }

  async function createProperty(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/properties", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...newProp })
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Failed to create");
      setNewProp({ title: "", description: "", address: "", rent: "" });
      await refreshProperties();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function startEdit(p) {
    setEditingId(p.id);
    setEditFields({ title: p.title, description: p.description, address: p.address, rent: String(p.rent) });
  }

  async function saveEdit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/properties", {
        method: "PUT",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editingId, ...editFields })
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Failed to update");
      setEditingId(null);
      await refreshProperties();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function deleteProperty(id) {
    if (!confirm("Delete this property?")) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/properties", {
        method: "DELETE",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id })
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Failed to delete");
      await refreshProperties();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ padding: 20 }}>
      <h1>HowardBuilds — Owner Dashboard</h1>
      <p>Welcome, owner. Add and manage properties here.</p>

      <section style={{ marginBottom: 20 }}>
        <h2>Create property</h2>
        <form onSubmit={createProperty}>
          <div>
            <input placeholder="Title" value={newProp.title} onChange={(e) => setNewProp({ ...newProp, title: e.target.value })} />
          </div>
          <div>
            <input placeholder="Address" value={newProp.address} onChange={(e) => setNewProp({ ...newProp, address: e.target.value })} />
          </div>
          <div>
            <input placeholder="Rent" value={newProp.rent} onChange={(e) => setNewProp({ ...newProp, rent: e.target.value })} />
          </div>
          <div>
            <textarea placeholder="Description" value={newProp.description} onChange={(e) => setNewProp({ ...newProp, description: e.target.value })} />
          </div>
          <div>
            <button type="submit" disabled={loading}>Create</button>
          </div>
        </form>
      </section>

      <section>
        <h2>Your properties</h2>
        {error && <p style={{ color: "red" }}>{error}</p>}
        <ul>
          {properties.map((p) => (
            <li key={p.id} style={{ marginBottom: 12, border: "1px solid #eee", padding: 8 }}>
              {editingId === p.id ? (
                <form onSubmit={saveEdit}>
                  <div>
                    <input value={editFields.title} onChange={(e) => setEditFields({ ...editFields, title: e.target.value })} />
                  </div>
                  <div>
                    <input value={editFields.address} onChange={(e) => setEditFields({ ...editFields, address: e.target.value })} />
                  </div>
                  <div>
                    <input value={editFields.rent} onChange={(e) => setEditFields({ ...editFields, rent: e.target.value })} />
                  </div>
                  <div>
                    <textarea value={editFields.description} onChange={(e) => setEditFields({ ...editFields, description: e.target.value })} />
                  </div>
                  <div>
                    <button type="submit" disabled={loading}>Save</button>
                    <button type="button" onClick={() => setEditingId(null)}>Cancel</button>
                  </div>
                </form>
              ) : (
                <div>
                  <strong>{p.title}</strong> — ${p.rent}
                  <div><small>{p.address}</small></div>
                  <p>{p.description}</p>
                  <div>
                    <button onClick={() => startEdit(p)}>Edit</button>
                    <button onClick={() => deleteProperty(p.id)}>Delete</button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>

      <p>(This dashboard now includes create, edit and delete actions that call the /api/properties endpoints.)</p>
    </main>
  );
}

export async function getServerSideProps({ req, res }) {
  const cookies = req.headers.cookie ? parse(req.headers.cookie) : {};
  const token = cookies["hb_token"];
  if (!token) {
    return { redirect: { destination: "/owner/login", permanent: false } };
  }
  try {
    const payload = verify(token, process.env.JWT_SECRET || "dev-secret");
    if (!payload || payload.role !== "owner" || payload.email !== process.env.OWNER_EMAIL) {
      return { redirect: { destination: "/owner/login", permanent: false } };
    }
  } catch (err) {
    return { redirect: { destination: "/owner/login", permanent: false } };
  }

  const properties = await prisma.property.findMany({ orderBy: { createdAt: "desc" } });
  return { props: { properties } };
}
