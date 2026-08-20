import { useEffect, useState, useCallback } from "react";
import { useAffiliateStore } from "../../../store/affiliateStore";
import { useAuthStore } from "../../../store/authStore";
import { PanelShell, StatCell, PanelSection } from "./PanelShell";
import { useT } from "../../../store/languageStore";

export function AffiliatePanel() {
  const t = useT();
  const user = useAuthStore((s) => s.user);
  const dashboard = useAffiliateStore((s) => s.dashboard);
  const loading = useAffiliateStore((s) => s.loading);
  const referralLink = useAffiliateStore((s) => s.referralLink);
  const tree = useAffiliateStore((s) => s.tree);
  const error = useAffiliateStore((s) => s.error);
  const loadDashboard = useAffiliateStore((s) => s.loadDashboard);
  const loadLink = useAffiliateStore((s) => s.loadLink);
  const loadTree = useAffiliateStore((s) => s.loadTree);
  const registerReferral = useAffiliateStore((s) => s.registerReferral);

  const [refCode, setRefCode] = useState("");
  const [regResult, setRegResult] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!user) return;
    loadDashboard();
    loadLink();
    loadTree(2);
  }, [user, loadDashboard, loadLink, loadTree]);

  const handleCopy = useCallback(() => {
    if (!referralLink) return;
    navigator.clipboard.writeText(referralLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [referralLink]);

  const handleRegister = useCallback(async () => {
    if (!refCode.trim()) return;
    setRegResult(null);
    const result = await registerReferral(refCode.trim());
    if (result.ok) {
      setRegResult(t("affiliate.register_success"));
      setRefCode("");
      loadDashboard();
    } else {
      const key = `affiliate.error.${result.error}`;
      const translated = t(key);
      setRegResult(translated === key ? (result.error ?? "unknown") : translated);
    }
  }, [refCode, registerReferral, t, loadDashboard]);

  if (!user) {
    return (
      <PanelShell icon="🔗" title={t("affiliate.title")}>
        <p style={{ color: "#999", padding: 16 }}>{t("affiliate.login_required")}</p>
      </PanelShell>
    );
  }

  return (
    <PanelShell icon="🔗" title={t("affiliate.title")} subtitle={t("affiliate.subtitle")}>
      {loading && !dashboard && (
        <div className="aff-loading">{t("affiliate.loading")}</div>
      )}

      {error && !dashboard && (
        <div className="aff-loading">{error}</div>
      )}

      {dashboard && (
        <>
          <PanelSection icon="🔑" title={t("affiliate.your_code")}>
            <div className="aff-code-box">
              <div className="aff-code">{dashboard.player.code}</div>
              {referralLink && (
                <div className="aff-link-row">
                  <input className="aff-link-input" readOnly value={referralLink} />
                  <button className="aff-copy-btn" onClick={handleCopy}>
                    {copied ? "✓" : "📋"}
                  </button>
                </div>
              )}
            </div>
          </PanelSection>

          {!dashboard.player.referredBy && (
            <PanelSection icon="📝" title={t("affiliate.register_referral")}>
              <div className="aff-register">
                <input
                  className="aff-input"
                  placeholder={t("affiliate.code_placeholder")}
                  value={refCode}
                  onChange={(e) => setRefCode(e.target.value.toUpperCase())}
                />
                <button className="aff-btn" onClick={handleRegister} disabled={!refCode.trim()}>
                  {t("affiliate.register_btn")}
                </button>
                {regResult && <div className="aff-reg-result">{regResult}</div>}
              </div>
            </PanelSection>
          )}

          <PanelSection icon="📊" title={t("affiliate.stats")}>
            <div className="aff-stats-grid">
              <StatCell icon="👥" label={t("affiliate.direct_referrals")} value={dashboard.directReferrals} />
              <StatCell icon="🌐" label={t("affiliate.total_network")} value={dashboard.networkCount} />
              <StatCell icon="⏳" label={t("affiliate.pending")} value={`$${dashboard.pendingCommissions.toFixed(2)}`} />
              <StatCell icon="✅" label={t("affiliate.available")} value={`$${dashboard.availableCommissions.toFixed(2)}`} />
              <StatCell icon="💰" label={t("affiliate.total_earned")} value={`$${dashboard.totalEarned.toFixed(2)}`} />
            </div>
          </PanelSection>

          {dashboard.levelStats.length > 0 && (
            <PanelSection icon="📈" title={t("affiliate.by_level")}>
              <table className="aff-table">
                <thead>
                  <tr>
                    <th>{t("affiliate.level")}</th>
                    <th>{t("affiliate.users")}</th>
                    <th>{t("affiliate.profit")}</th>
                    <th>{t("affiliate.commission")}</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboard.levelStats.map((ls) => (
                    <tr key={ls.affiliate_level}>
                      <td>L{ls.affiliate_level}</td>
                      <td>{ls.user_count}</td>
                      <td>${ls.total_profit.toFixed(2)}</td>
                      <td className="aff-highlight">${ls.total_commission.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </PanelSection>
          )}

          {tree.length > 0 && (
            <PanelSection icon="🌳" title={t("affiliate.tree")}>
              <div className="aff-tree">
                <div className="aff-tree-node aff-tree-you">
                  {t("affiliate.you")} ({dashboard.player.code})
                </div>
                {tree.map((child) => (
                  <TreeNode key={child.player_name} node={child} depth={0} />
                ))}
              </div>
            </PanelSection>
          )}

          {dashboard.recentCommissions.length > 0 && (
            <PanelSection icon="📜" title={t("affiliate.history")}>
              <div className="aff-history">
                {dashboard.recentCommissions.map((c) => (
                  <div key={c.id} className="aff-history-item">
                    <div className="aff-history-main">
                      <span className="aff-history-user">#{c.source_user_id.slice(0, 8)}</span>
                      <span className="aff-history-level">L{c.affiliate_level}</span>
                      <span className="aff-history-amount">+${c.commission_amount.toFixed(2)}</span>
                    </div>
                    <div className="aff-history-meta">
                      <span>{t(`affiliate.status.${c.status}`)}</span>
                      <span>{new Date(c.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </PanelSection>
          )}
        </>
      )}

      {!loading && !dashboard && !error && (
        <div className="aff-loading">{t("affiliate.loading")}</div>
      )}
    </PanelShell>
  );
}

function TreeNode({ node, depth }: { node: { player_name: string; affiliate_code: string; status: string; children?: any[] }; depth: number }) {
  const [expanded, setExpanded] = useState(depth < 1);
  const hasChildren = node.children && node.children.length > 0;

  return (
    <div className="aff-tree-branch" style={{ marginLeft: 20 }}>
      <div
        className={`aff-tree-node ${hasChildren ? "aff-tree-expandable" : ""}`}
        onClick={() => hasChildren && setExpanded(!expanded)}
      >
        {hasChildren && <span className="aff-tree-arrow">{expanded ? "▼" : "▶"}</span>}
        <span className="aff-tree-name">#{node.player_name.slice(0, 8)}</span>
        <span className="aff-tree-code">{node.affiliate_code}</span>
      </div>
      {expanded && hasChildren && node.children!.map((child: any) => (
        <TreeNode key={child.player_name} node={child} depth={depth + 1} />
      ))}
    </div>
  );
}
