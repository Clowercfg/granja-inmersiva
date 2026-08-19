import { useState, type ReactNode } from "react";

const TOKEN_KEY = "hv_admin_token";

async function login(password: string): Promise<string | null> {
  try {
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.token || null;
  } catch {
    return null;
  }
}

function getStoredToken(): string | null {
  try {
    const token = sessionStorage.getItem(TOKEN_KEY);
    if (!token) return null;
    const ts = parseInt(token.slice(0, 13), 10);
    if (isNaN(ts) || Date.now() - ts > 8 * 60 * 60 * 1000) {
      sessionStorage.removeItem(TOKEN_KEY);
      return null;
    }
    return token;
  } catch {
    return null;
  }
}

function storeToken(token: string) {
  try { sessionStorage.setItem(TOKEN_KEY, token); } catch {}
}

export function AdminGate({ children }: { children: ReactNode }) {
  const [input, setInput] = useState("");
  const [token, setToken] = useState<string | null>(getStoredToken);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [attempts, setAttempts] = useState(0);

  const handle = async () => {
    if (!input.trim()) return;
    setLoading(true);
    setError(false);
    const result = await login(input);
    setLoading(false);
    if (result) {
      storeToken(result);
      setToken(result);
      setAttempts(0);
    } else {
      setError(true);
      setAttempts(a => a + 1);
    }
  };

  if (token) return <>{children}</>;

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
          disabled={loading}
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
        {error && <div style={{ color: "#f44336", fontSize: 13, marginBottom: 8 }}>
          {attempts >= 5 ? "Demasiados intentos. Espera." : "Contraseña incorrecta"}
        </div>}
        <button
          onClick={handle}
          disabled={loading || attempts >= 5}
          style={{
            width: "100%",
            padding: 10,
            border: "none",
            borderRadius: 10,
            background: "linear-gradient(135deg, #4caf50, #66bb6a)",
            color: "#fff",
            fontSize: 14,
            fontWeight: 700,
            cursor: loading || attempts >= 5 ? "not-allowed" : "pointer",
            opacity: loading || attempts >= 5 ? 0.6 : 1,
          }}
        >
          {loading ? "Verificando..." : "Entrar"}
        </button>
      </div>
    </div>
  );
}
