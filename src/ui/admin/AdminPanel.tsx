import { useState, useCallback } from "react";

interface DepositResult {
  id: number;
  playerName: string;
  amount: number;
  currency: string;
  network: string;
  txHash: string;
  confirmedBy: string;
  confirmedAt: string;
}

interface PlayerInfo {
  totalDeposited: number;
  depositCount: number;
}

interface RecentDeposit {
  id: number;
  playerName: string;
  amount: number;
  currency: string;
  network: string;
  txHash: string;
  confirmedBy: string;
  confirmedAt: string;
}

interface AffiliateRecord {
  player_name: string;
  affiliate_code: string;
  referred_by: string | null;
  status: string;
  direct_count: number;
  total_earned: number;
  created_at: string;
}

interface CommissionRecord {
  id: string;
  beneficiary_user_id: string;
  source_user_id: string;
  affiliate_level: number;
  commission_rate: number;
  eligible_profit: number;
  commission_amount: number;
  status: string;
  created_at: string;
  beneficiary_code: string;
  source_code: string;
}

type AdminTab = "deposits" | "affiliates";

function getAuthHeaders(): Record<string, string> {
  try {
    const token = sessionStorage.getItem("hv_admin_token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
}

export function AdminPanel() {
  const [activeTab, setActiveTab] = useState<AdminTab>("deposits");
  const [playerName, setPlayerName] = useState("");
  const [playerInfo, setPlayerInfo] = useState<PlayerInfo | null>(null);
  const [amount, setAmount] = useState("");
  const [currency] = useState("USDT");
  const [network] = useState("BEP20");
  const [txHash, setTxHash] = useState("");
  const [adminName, setAdminName] = useState("");
  const [result, setResult] = useState<DepositResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [recentDeposits, setRecentDeposits] = useState<RecentDeposit[]>([]);

  // Affiliate admin state
  const [affiliates, setAffiliates] = useState<AffiliateRecord[]>([]);
  const [commissions, setCommissions] = useState<CommissionRecord[]>([]);
  const [affSearch, setAffSearch] = useState("");
  const [affLoading, setAffLoading] = useState(false);

  const loadAffiliates = useCallback(async () => {
    setAffLoading(true);
    try {
      const res = await fetch("/api/affiliate/admin/list?limit=50", { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setAffiliates(data.affiliates || []);
      }
    } catch { /* ignore */ }
    setAffLoading(false);
  }, []);

  const loadCommissions = useCallback(async () => {
    try {
      const res = await fetch("/api/affiliate/admin/commissions?limit=50", { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setCommissions(data.commissions || []);
      }
    } catch { /* ignore */ }
  }, []);

  const searchPlayer = useCallback(async () => {
    if (!playerName.trim()) return;
    setError(null);
    try {
      const res = await fetch(`/api/admin/player/${encodeURIComponent(playerName.trim())}`, {
        headers: getAuthHeaders(),
      });
      if (res.status === 401) { setError("Sesión expirada, recarga la página"); return; }
      if (res.ok) {
        setPlayerInfo(await res.json());
      }
    } catch {
      setError("Error al buscar jugador");
    }
  }, [playerName]);

  const loadRecent = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/deposits?limit=20", {
        headers: getAuthHeaders(),
      });
      if (res.status === 401) { setError("Sesión expirada, recarga la página"); return; }
      if (res.ok) {
        const data = await res.json();
        setRecentDeposits(data.deposits || []);
      }
    } catch {}
  }, []);

  const confirmDeposit = useCallback(async () => {
    setError(null);
    setResult(null);

    if (!playerName.trim() || !amount) {
      setError("Jugador y cantidad son requeridos");
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError("Cantidad inválida");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/admin/deposits", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({
          playerName: playerName.trim(),
          amount: numAmount,
          currency,
          network,
          txHash: txHash.trim() || undefined,
          adminName: adminName.trim() || "admin",
        }),
      });

      if (res.status === 401) { setError("Sesión expirada, recarga la página"); return; }

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Error al confirmar depósito");
        return;
      }

      setResult(data.deposit);
      setAmount("");
      setTxHash("");
      searchPlayer();
      loadRecent();
    } catch {
      setError("Error de red");
    } finally {
      setLoading(false);
    }
  }, [playerName, amount, currency, network, txHash, adminName, searchPlayer, loadRecent]);

  return (
    <div className="admin-panel">
      <header className="admin-header">
        <h1>⚙️ Harvest Valley — Admin</h1>
      </header>

      <div className="admin-tabs">
        <button className={`admin-tab ${activeTab === "deposits" ? "active" : ""}`} onClick={() => setActiveTab("deposits")}>💰 Depósitos</button>
        <button className={`admin-tab ${activeTab === "affiliates" ? "active" : ""}`} onClick={() => { setActiveTab("affiliates"); loadAffiliates(); loadCommissions(); }}>🔗 Afiliados</button>
      </div>

      {activeTab === "deposits" && (
        <>
          <section className="admin-section">
            <h2>Añadir Saldo</h2>
            <button className="admin-refresh" onClick={loadRecent}>Recargar historial</button>
            <div className="admin-form">
          <div className="admin-field">
            <label>Jugador *</label>
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="Nombre del jugador..."
            />
          </div>
          <div className="admin-field">
            <label>Cantidad (USDT) *</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
            />
          </div>
          <div className="admin-field">
            <label>TX Hash (opcional)</label>
            <input
              type="text"
              value={txHash}
              onChange={(e) => setTxHash(e.target.value)}
              placeholder="Si se deja vacío se auto-genera"
            />
          </div>
          <div className="admin-field">
            <label>Tu nombre (admin)</label>
            <input
              type="text"
              value={adminName}
              onChange={(e) => setAdminName(e.target.value)}
              placeholder="admin"
            />
          </div>
          <button
            className="admin-confirm-btn"
            onClick={confirmDeposit}
            disabled={loading}
          >
            {loading ? "Procesando..." : "Añadir Saldo"}
          </button>
        </div>
      </section>

      {playerInfo && (
        <section className="admin-section">
          <h2>Info del Jugador</h2>
          <div className="admin-player-info">
            <div><strong>Jugador:</strong> {playerName}</div>
            <div><strong>Total depositado:</strong> ${playerInfo.totalDeposited.toFixed(2)}</div>
            <div><strong>Depósitos:</strong> {playerInfo.depositCount}</div>
          </div>
        </section>
      )}

      {error && <div className="admin-error">{error}</div>}
      {result && (
        <div className="admin-success">
          <h3>✅ Saldo Añadido</h3>
          <div><strong>Jugador:</strong> {result.playerName}</div>
          <div><strong>Monto:</strong> ${result.amount.toFixed(2)} {result.currency}</div>
          <div><strong>Red:</strong> {result.network}</div>
          <div><strong>TX:</strong> {result.txHash}</div>
          <div><strong>Confirmado por:</strong> {result.confirmedBy}</div>
          <div><strong>Fecha:</strong> {result.confirmedAt}</div>
        </div>
      )}

      {recentDeposits.length > 0 && (
        <section className="admin-section">
          <h2>Últimos Depósitos</h2>
          <div className="admin-deposits-list">
            {recentDeposits.map((d) => (
              <div key={d.id} className="admin-deposit-item">
                <div className="admin-deposit-main">
                  <strong>{d.playerName}</strong>
                  <span className="admin-deposit-amount">${d.amount.toFixed(2)}</span>
                </div>
                <div className="admin-deposit-meta">
                  <span>{d.network}</span>
                  <span>{d.confirmedAt}</span>
                  <span>por {d.confirmedBy}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
        </>
      )}

      {activeTab === "affiliates" && (
        <>
          <section className="admin-section">
            <h2>Afiliados Registrados</h2>
            <button className="admin-refresh" onClick={() => { loadAffiliates(); loadCommissions(); }}>Recargar</button>
            {affLoading && <p style={{ color: "#999" }}>Cargando...</p>}
            {!affLoading && affiliates.length === 0 && <p style={{ color: "#999" }}>No hay afiliados registrados.</p>}
            <div className="admin-deposits-list">
              {affiliates
                .filter((a) => !affSearch || a.player_name.toLowerCase().includes(affSearch.toLowerCase()) || a.affiliate_code.toLowerCase().includes(affSearch.toLowerCase()))
                .map((a) => (
                <div key={a.player_name} className="admin-deposit-item">
                  <div className="admin-deposit-main">
                    <strong>{a.player_name}</strong>
                    <span style={{ fontFamily: "monospace", color: "#c9a8ff" }}>{a.affiliate_code}</span>
                    <span className="admin-deposit-amount">${(a.total_earned || 0).toFixed(2)}</span>
                  </div>
                  <div className="admin-deposit-meta">
                    <span>{a.status}</span>
                    <span>{a.direct_count} referidos</span>
                    <span>{a.referred_by ? `↓ ${a.referred_by}` : "sin patrocinador"}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="admin-section">
            <h2>Últimas Comisiones</h2>
            {commissions.length === 0 && <p style={{ color: "#999" }}>No hay comisiones registradas.</p>}
            <div className="admin-deposits-list">
              {commissions.map((c) => (
                <div key={c.id} className="admin-deposit-item">
                  <div className="admin-deposit-main">
                    <strong>{c.beneficiary_user_id}</strong>
                    <span style={{ color: "#7060a0", fontSize: 12 }}>← {c.source_user_id}</span>
                    <span className="admin-deposit-amount">+${c.commission_amount.toFixed(2)}</span>
                  </div>
                  <div className="admin-deposit-meta">
                    <span>L{c.affiliate_level}</span>
                    <span>{(c.commission_rate * 100).toFixed(3)}%</span>
                    <span>${c.eligible_profit.toFixed(2)} profit</span>
                    <span>{c.status}</span>
                    <span>{c.created_at}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </>
      )}

      {error && <div className="admin-error">{error}</div>}
      {result && activeTab === "deposits" && (
        <div className="admin-success">
          <h3>✅ Saldo Añadido</h3>
          <div><strong>Jugador:</strong> {result.playerName}</div>
          <div><strong>Monto:</strong> ${result.amount.toFixed(2)} {result.currency}</div>
          <div><strong>Red:</strong> {result.network}</div>
          <div><strong>TX:</strong> {result.txHash}</div>
          <div><strong>Confirmado por:</strong> {result.confirmedBy}</div>
          <div><strong>Fecha:</strong> {result.confirmedAt}</div>
        </div>
      )}
    </div>
  );
}
