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

export function AdminPanel() {
  const [playerName, setPlayerName] = useState("");
  const [playerInfo, setPlayerInfo] = useState<PlayerInfo | null>(null);
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("USDT");
  const [network, setNetwork] = useState("TRC20");
  const [txHash, setTxHash] = useState("");
  const [adminName, setAdminName] = useState("");
  const [result, setResult] = useState<DepositResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const searchPlayer = useCallback(async () => {
    if (!playerName.trim()) return;
    setError(null);
    try {
      const res = await fetch(`/api/admin/player/${encodeURIComponent(playerName.trim())}`);
      if (res.ok) {
        setPlayerInfo(await res.json());
      }
    } catch {
      setError("Error searching player");
    }
  }, [playerName]);

  const confirmDeposit = useCallback(async () => {
    setError(null);
    setResult(null);

    if (!playerName.trim() || !amount || !txHash.trim() || !adminName.trim()) {
      setError("All fields are required");
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError("Invalid amount");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/admin/deposits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerName: playerName.trim(),
          amount: numAmount,
          currency,
          network,
          txHash: txHash.trim(),
          adminName: adminName.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Error confirming deposit");
        return;
      }

      setResult(data.deposit);
      setAmount("");
      setTxHash("");
      searchPlayer();
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }, [playerName, amount, currency, network, txHash, adminName, searchPlayer]);

  return (
    <div className="admin-panel">
      <header className="admin-header">
        <h1>⚙️ Harvest Valley — Admin</h1>
      </header>

      <section className="admin-section">
        <h2>Buscar Jugador</h2>
        <div className="admin-row">
          <input
            type="text"
            placeholder="Nombre del jugador..."
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && searchPlayer()}
          />
          <button onClick={searchPlayer}>Buscar</button>
        </div>
        {playerInfo && (
          <div className="admin-player-info">
            <div><strong>Jugador:</strong> {playerName}</div>
            <div><strong>Total depositado:</strong> ${playerInfo.totalDeposited.toFixed(2)}</div>
            <div><strong>Depósitos:</strong> {playerInfo.depositCount}</div>
          </div>
        )}
      </section>

      <section className="admin-section">
        <h2>Confirmar Depósito</h2>
        <div className="admin-form">
          <div className="admin-field">
            <label>Jugador</label>
            <input type="text" value={playerName} onChange={(e) => setPlayerName(e.target.value)} />
          </div>
          <div className="admin-field">
            <label>Cantidad</label>
            <input type="number" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div className="admin-field">
            <label>Moneda</label>
            <input type="text" value={currency} onChange={(e) => setCurrency(e.target.value)} />
          </div>
          <div className="admin-field">
            <label>Red</label>
            <input type="text" value={network} onChange={(e) => setNetwork(e.target.value)} />
          </div>
          <div className="admin-field">
            <label>TX Hash</label>
            <input type="text" value={txHash} onChange={(e) => setTxHash(e.target.value)} placeholder="0x..." />
          </div>
          <div className="admin-field">
            <label>Admin</label>
            <input type="text" value={adminName} onChange={(e) => setAdminName(e.target.value)} />
          </div>
          <button
            className="admin-confirm-btn"
            onClick={confirmDeposit}
            disabled={loading}
          >
            {loading ? "Procesando..." : "Confirmar Depósito"}
          </button>
        </div>
      </section>

      {error && <div className="admin-error">{error}</div>}
      {result && (
        <div className="admin-success">
          <h3>✅ Depósito Confirmado</h3>
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
