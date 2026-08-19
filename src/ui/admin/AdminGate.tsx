import { useState, type ReactNode } from "react";

const ADMIN_KEY = "hv2026";

export function AdminGate({ children }: { children: ReactNode }) {
  const [input, setInput] = useState("");
  const [authed, setAuthed] = useState(() => {
    try { return sessionStorage.getItem("hv_admin") === "1"; } catch { return false; }
  });
  const [error, setError] = useState(false);

  if (authed) return <>{children}</>;

  const handle = () => {
    if (input === ADMIN_KEY) {
      try { sessionStorage.setItem("hv_admin", "1"); } catch {}
      setAuthed(true);
    } else {
      setError(true);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "#111811",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "'Nunito', sans-serif",
    }}>
      <div style={{
        background: "rgba(76,175,80,0.06)",
        border: "1px solid rgba(76,175,80,0.2)",
        borderRadius: 14,
        padding: 32,
        textAlign: "center",
        width: 320,
      }}>
        <h2 style={{ color: "#c9e8c9", fontFamily: "'Fredoka', sans-serif", marginTop: 0 }}>
          ⚙️ Admin
        </h2>
        <input
          type="password"
          placeholder="Contraseña..."
          value={input}
          onChange={(e) => { setInput(e.target.value); setError(false); }}
          onKeyDown={(e) => e.key === "Enter" && handle()}
          style={{
            width: "100%",
            padding: "10px 12px",
            border: `1.5px solid ${error ? "#f44336" : "rgba(76,175,80,0.3)"}`,
            borderRadius: 10,
            background: "rgba(76,175,80,0.08)",
            color: "#e0f0e0",
            fontSize: 14,
            fontFamily: "inherit",
            outline: "none",
            boxSizing: "border-box",
            marginBottom: 12,
          }}
        />
        {error && <div style={{ color: "#f44336", fontSize: 13, marginBottom: 8 }}>Contraseña incorrecta</div>}
        <button
          onClick={handle}
          style={{
            width: "100%",
            padding: 10,
            border: "none",
            borderRadius: 10,
            background: "linear-gradient(135deg, #4caf50, #66bb6a)",
            color: "#fff",
            fontSize: 14,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Entrar
        </button>
      </div>
    </div>
  );
}
