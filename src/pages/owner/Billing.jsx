import { useState, useEffect, useCallback } from "react";
import Layout from "../../components/Layout";

// ─── API CONFIG ───────────────────────────────────────────────────────────────
const BASE_URL = "http://localhost:8080";

const api = {
  initiatePayment: async (planType, customerPhone = null, customerCountry = null) => {
    const res = await fetch(`${BASE_URL}/api/billing/initiate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ planType, customerPhone, customerCountry }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || "Failed to initiate payment");
    }
    return res.json();
  },

  getPaymentStatus: async (transactionId) => {
    const res = await fetch(`${BASE_URL}/api/billing/status/${transactionId}`, {
      credentials: "include",
    });
    if (!res.ok) throw new Error("Failed to fetch payment status");
    return res.json();
  },

  cancelPayment: async (transactionId) => {
    await fetch(`${BASE_URL}/api/billing/cancel/${transactionId}`, {
      method: "POST",
      credentials: "include",
    });
  },

  getBillingHistory: async () => {
    const res = await fetch(`${BASE_URL}/api/billing/history`, {
      credentials: "include",
    });
    if (!res.ok) throw new Error("Failed to fetch billing history");
    return res.json();
  },

  getMyPlan: async () => {
    const res = await fetch(`${BASE_URL}/api/billing/my-plan`, {
      credentials: "include",
    });
    if (!res.ok) throw new Error("Failed to fetch plan");
    return res.json();
  },
};

// ─── PLAN DEFINITIONS ─────────────────────────────────────────────────────────
const PLANS = [
  {
    key: "TRIAL",
    label: "Trial",
    order: 0,
    price: 0,
    currency: "XOF",
    duration: "14 days",
    users: 5,
    paid: false,
    features: ["5 users included", "14-day access", "Basic support", "1 Odoo instance"],
  },
  {
    key: "PREMIUM",
    label: "Premium",
    order: 1,
    price: 15000,
    currency: "XOF",
    duration: "30 days",
    users: 25,
    paid: true,
    features: ["25 users included", "30-day access", "Priority support", "3 Odoo instances", "Custom domain"],
  },
  {
    key: "ENTERPRISE",
    label: "Enterprise",
    order: 2,
    price: 35000,
    currency: "XOF",
    duration: "30 days",
    users: 50,
    paid: true,
    features: ["50 users included", "30-day access", "Dedicated support", "Unlimited instances", "Custom domain", "SLA guarantee"],
  },
];

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const fmt = (n) => new Intl.NumberFormat("fr-FR").format(n);

const statusMeta = {
  SUCCESS:          { label: "Paid",         color: "#22c55e", bg: "rgba(34,197,94,0.12)" },
  PENDING:          { label: "Pending",       color: "#f59e0b", bg: "rgba(245,158,11,0.12)" },
  FAILED:           { label: "Failed",        color: "#ef4444", bg: "rgba(239,68,68,0.12)" },
  CANCELLED:        { label: "Cancelled",     color: "#6b7280", bg: "rgba(107,114,128,0.12)" },
  WAITING_CUSTOMER: { label: "Awaiting you",  color: "#818cf8", bg: "rgba(129,140,248,0.12)" },
};

const planMeta = { TRIAL: "Trial", PREMIUM: "Premium", ENTERPRISE: "Enterprise" };

// Plan icon SVGs
const PlanIcons = {
  TRIAL: (color) => (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M9 2L11.09 7.26L17 7.27L12.54 10.74L14.18 16L9 12.77L3.82 16L5.46 10.74L1 7.27L6.91 7.26L9 2Z"
        stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  PREMIUM: (color) => (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M3 14l3-8 3 4 3-6 3 10" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M2 14h14" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),
  ENTERPRISE: (color) => (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <rect x="2" y="8" width="14" height="8" rx="1" stroke={color} strokeWidth="1.5"/>
      <path d="M5 8V6a4 4 0 018 0v2" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
      <circle cx="9" cy="12" r="1.5" fill={color}/>
    </svg>
  ),
};

// ─── SUB-COMPONENTS ───────────────────────────────────────────────────────────

function StatusBadge({ status }) {
  const m = statusMeta[status] || { label: status, color: "#6b7280", bg: "rgba(107,114,128,0.12)" };
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "3px 10px", borderRadius: 999, fontSize: 11, fontWeight: 600,
      color: m.color, background: m.bg, letterSpacing: "0.03em", whiteSpace: "nowrap",
    }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: m.color, flexShrink: 0 }} />
      {m.label}
    </span>
  );
}

function Spinner({ size = 44 }) {
  return (
    <div style={{ width: size, height: size, margin: "0 auto" }}>
      <svg viewBox="0 0 44 44" style={{ animation: "billing-spin 0.9s linear infinite", width: size, height: size }}>
        <circle cx="22" cy="22" r="18" fill="none" stroke="var(--odoo-border, #2a2d3e)" strokeWidth="3" />
        <circle cx="22" cy="22" r="18" fill="none" stroke="var(--odoo-accent, #6366f1)" strokeWidth="3"
          strokeDasharray="60 56" strokeLinecap="round" />
      </svg>
    </div>
  );
}

function PlanCard({ plan, currentPlan, currentPlanOrder, onSelect, loading, isMobile }) {
  const isCurrent   = currentPlan === plan.key;
  const isProcessing = loading === plan.key;
  const isUpgrade   = plan.paid && plan.order > currentPlanOrder;
  const isDowngrade = plan.paid && plan.order < currentPlanOrder;
  const canUpgrade  = isUpgrade;
  const Icon        = PlanIcons[plan.key] || PlanIcons.TRIAL;

  return (
    <div
      style={{
        position: "relative",
        background: isCurrent ? "rgba(99,102,241,0.07)" : "var(--card, #1c1f2e)",
        border: isCurrent ? "1.5px solid rgba(99,102,241,0.45)" : "1.5px solid var(--border, #2a2d3e)",
        borderRadius: 14,
        padding: isMobile ? "20px 18px" : "24px 22px",
        display: "flex", flexDirection: "column", gap: 18,
        boxShadow: isCurrent ? "0 0 0 3px rgba(99,102,241,0.1)" : "none",
        transition: "box-shadow 0.2s, transform 0.2s, border-color 0.2s",
        opacity: isDowngrade ? 0.55 : 1,
      }}
      onMouseEnter={e => {
        if (!isCurrent && !isDowngrade) {
          e.currentTarget.style.transform = "translateY(-2px)";
          e.currentTarget.style.boxShadow = "0 8px 28px rgba(0,0,0,0.25)";
        }
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = "";
        e.currentTarget.style.boxShadow = isCurrent ? "0 0 0 3px rgba(99,102,241,0.1)" : "none";
      }}
    >
      {isCurrent && (
        <div style={{
          position: "absolute", top: -11, left: 18,
          background: "var(--accent, #6366f1)", color: "#fff", fontSize: 10,
          fontWeight: 700, padding: "2px 10px", borderRadius: 999, letterSpacing: "0.08em",
        }}>CURRENT PLAN</div>
      )}

      {/* Header row */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10, flexShrink: 0,
          background: isCurrent ? "rgba(99,102,241,0.18)" : "var(--bg-elevated, #222538)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          {Icon(isCurrent ? "#818cf8" : "#9aa0b4")}
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted, #555b7a)", letterSpacing: "0.09em", textTransform: "uppercase" }}>
            {plan.label}
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginTop: 2 }}>
            {plan.paid ? (
              <>
                <span style={{ fontSize: 22, fontWeight: 800, color: "var(--text, #eef0f6)", fontFamily: "'DM Mono', monospace" }}>
                  {fmt(plan.price)}
                </span>
                <span style={{ fontSize: 11, color: "var(--muted, #555b7a)", fontWeight: 500 }}>
                  {plan.currency}/{plan.duration}
                </span>
              </>
            ) : (
              <span style={{ fontSize: 22, fontWeight: 800, color: "var(--text, #eef0f6)", fontFamily: "'DM Mono', monospace" }}>
                Free
              </span>
            )}
          </div>
        </div>
      </div>

      <div style={{ fontSize: 12, color: "var(--muted, #555b7a)" }}>
        Up to <strong style={{ color: "var(--text-secondary, #9aa0b4)" }}>{plan.users}</strong> users included
      </div>

      {/* Features */}
      <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
        {plan.features.map(f => (
          <li key={f} style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 13, color: "var(--text-secondary, #9aa0b4)" }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
              <circle cx="7" cy="7" r="7" fill={isCurrent ? "rgba(99,102,241,0.18)" : "rgba(34,197,94,0.15)"} />
              <path d="M4 7l2 2 4-4" stroke={isCurrent ? "#818cf8" : "#22c55e"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {f}
          </li>
        ))}
      </ul>

      {/* CTA */}
      {isDowngrade ? (
        <div style={{
          fontSize: 12, color: "var(--muted, #555b7a)", textAlign: "center",
          padding: "10px 0", borderTop: "1px solid var(--border, #2a2d3e)",
        }}>
          To downgrade, contact support
        </div>
      ) : (
        <button
          disabled={!canUpgrade || isProcessing || isCurrent}
          onClick={() => canUpgrade && onSelect(plan.key)}
          style={{
            width: "100%", padding: "11px 0", borderRadius: 9, border: "none",
            fontSize: 13, fontWeight: 700, letterSpacing: "0.02em",
            cursor: canUpgrade ? "pointer" : "not-allowed",
            background: isCurrent
              ? "rgba(99,102,241,0.12)"
              : canUpgrade
                ? "var(--accent, #6366f1)"
                : "var(--border, #2a2d3e)",
            color: isCurrent
              ? "var(--accent, #6366f1)"
              : canUpgrade ? "#fff" : "var(--muted, #555b7a)",
            opacity: isProcessing ? 0.7 : 1,
            transition: "opacity 0.15s, background 0.15s",
          }}
        >
          {isProcessing
            ? "Processing…"
            : isCurrent
              ? "✓ Current plan"
              : !plan.paid
                ? "Free plan"
                : `Upgrade to ${plan.label}`}
        </button>
      )}
    </div>
  );
}

// Desktop history row
function HistoryRow({ tx, isLast }) {
  return (
    <div style={{
      display: "grid", gridTemplateColumns: "1fr 120px 130px 100px",
      gap: 12, padding: "14px 20px",
      borderBottom: isLast ? "none" : "1px solid var(--border, #2a2d3e)",
      alignItems: "center", fontSize: 13,
    }}>
      <div>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "var(--muted, #555b7a)", marginBottom: 3, letterSpacing: "0.04em" }}>
          {tx.transactionId}
        </div>
        <div style={{ color: "var(--text, #eef0f6)", fontWeight: 600 }}>
          {planMeta[tx.planType] || tx.planType}
        </div>
      </div>
      <div style={{ color: "var(--text, #eef0f6)", fontWeight: 700, fontFamily: "'DM Mono', monospace" }}>
        {fmt(tx.amount)}{" "}
        <span style={{ fontWeight: 400, color: "var(--muted, #555b7a)", fontSize: 10 }}>{tx.currency}</span>
      </div>
      <div style={{ color: "var(--muted, #555b7a)", fontSize: 12 }}>
        {new Date(tx.createdAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })}
      </div>
      <div><StatusBadge status={tx.status} /></div>
    </div>
  );
}

// Mobile history card
function HistoryCard({ tx, isLast }) {
  return (
    <div style={{
      padding: "14px 16px",
      borderBottom: isLast ? "none" : "1px solid var(--border, #2a2d3e)",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
        <div style={{ color: "var(--text, #eef0f6)", fontWeight: 600, fontSize: 13 }}>
          {planMeta[tx.planType] || tx.planType}
        </div>
        <StatusBadge status={tx.status} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "var(--muted, #555b7a)", letterSpacing: "0.03em" }}>
          {tx.transactionId}
        </div>
        <div style={{ color: "var(--text, #eef0f6)", fontWeight: 700, fontFamily: "'DM Mono', monospace", fontSize: 13 }}>
          {fmt(tx.amount)}{" "}
          <span style={{ fontWeight: 400, color: "var(--muted, #555b7a)", fontSize: 10 }}>{tx.currency}</span>
        </div>
      </div>
      <div style={{ color: "var(--muted, #555b7a)", fontSize: 11 }}>
        {new Date(tx.createdAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })}
      </div>
    </div>
  );
}

function PaymentModal({ plan, onClose, onSuccess }) {
  const [phase, setPhase] = useState("confirm");
  const [transactionId, setTransactionId] = useState(null);
  const [error, setError] = useState(null);

  const startPayment = async () => {
    setPhase("paying");
    setError(null);
    try {
      const data = await api.initiatePayment(plan.key);
      setTransactionId(data.transactionId);

      if (window.CinetPaySeamless) {
        window.CinetPaySeamless.open({
          paymentToken: data.paymentToken,
          onClose: () => {
            api.cancelPayment(data.transactionId).catch(() => {});
            setPhase("confirm");
          },
          onError: (err) => {
            console.error("CinetPay error:", err);
            setError("An error occurred in the payment popup.");
            setPhase("error");
          },
        });
      }

      setPhase("polling");
      pollStatus(data.transactionId);
    } catch (e) {
      setError(e.message);
      setPhase("error");
    }
  };

  const pollStatus = useCallback(async (txId) => {
    const MAX_ATTEMPTS = 40;
    let attempts = 0;
    const tick = async () => {
      if (attempts >= MAX_ATTEMPTS) {
        setError("Payment confirmation timed out. Check your billing history for the final status.");
        setPhase("error");
        return;
      }
      attempts++;
      try {
        const data = await api.getPaymentStatus(txId);
        if (data.status === "SUCCESS") {
          setPhase("done");
          onSuccess && onSuccess();
        } else if (data.status === "FAILED" || data.status === "CANCELLED") {
          setError(data.message || "Payment was not completed.");
          setPhase("error");
        } else {
          setTimeout(tick, 3000);
        }
      } catch {
        setTimeout(tick, 3000);
      }
    };
    setTimeout(tick, 3000);
  }, [onSuccess]);

  return (
    <div
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.62)", backdropFilter: "blur(8px)",
        display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: 16,
      }}
      onClick={e => e.target === e.currentTarget && phase !== "polling" && onClose()}
    >
      <div style={{
        background: "var(--card, #1c1f2e)", borderRadius: 18, padding: "32px 28px",
        width: "100%", maxWidth: 420,
        border: "1px solid var(--border, #2a2d3e)",
        boxShadow: "0 28px 72px rgba(0,0,0,0.45)",
        animation: "billing-slideUp 0.22s ease",
      }}>

        {/* CONFIRM */}
        {phase === "confirm" && (
          <>
            <div style={{ marginBottom: 22 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "var(--accent, #6366f1)", letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 8 }}>
                Confirm upgrade
              </div>
              <h2 style={{ fontSize: 20, fontWeight: 800, color: "var(--text, #eef0f6)", margin: 0 }}>
                {plan.label} Plan
              </h2>
            </div>
            <div style={{ background: "var(--surface, #161820)", borderRadius: 10, padding: "14px 18px", marginBottom: 22 }}>
              {[
                ["Plan", plan.label],
                ["Amount", `${fmt(plan.price)} ${plan.currency}`],
                ["Duration", plan.duration],
                ["Users", `Up to ${plan.users}`],
              ].map(([k, v], i, arr) => (
                <div key={k} style={{
                  display: "flex", justifyContent: "space-between", padding: "8px 0", fontSize: 13,
                  borderBottom: i < arr.length - 1 ? "1px solid var(--border, #2a2d3e)" : "none",
                }}>
                  <span style={{ color: "var(--muted, #555b7a)" }}>{k}</span>
                  <span style={{ color: "var(--text, #eef0f6)", fontWeight: 600 }}>{v}</span>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={onClose} style={{ flex: 1, padding: "11px 0", borderRadius: 9, border: "1.5px solid var(--border, #2a2d3e)", background: "transparent", color: "var(--muted, #555b7a)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                Cancel
              </button>
              <button onClick={startPayment} style={{ flex: 2, padding: "11px 0", borderRadius: 9, border: "none", background: "var(--accent, #6366f1)", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                Pay {fmt(plan.price)} {plan.currency}
              </button>
            </div>
          </>
        )}

        {/* PAYING / POLLING */}
        {(phase === "paying" || phase === "polling") && (
          <div style={{ textAlign: "center", padding: "16px 0" }}>
            <div style={{ marginBottom: 22 }}><Spinner /></div>
            <div style={{ fontSize: 17, fontWeight: 700, color: "var(--text, #eef0f6)", marginBottom: 8 }}>
              {phase === "paying" ? "Opening payment…" : "Confirming payment…"}
            </div>
            <div style={{ fontSize: 13, color: "var(--muted, #555b7a)", lineHeight: 1.7 }}>
              {phase === "paying"
                ? "The CinetPay payment window is opening."
                : "Waiting for CinetPay confirmation. Do not close this window."}
            </div>
            {phase === "polling" && transactionId && (
              <div style={{ marginTop: 14, fontFamily: "'DM Mono', monospace", fontSize: 10, color: "var(--muted, #555b7a)", background: "var(--surface, #161820)", borderRadius: 8, padding: "6px 12px", display: "inline-block", letterSpacing: "0.04em" }}>
                {transactionId}
              </div>
            )}
          </div>
        )}

        {/* SUCCESS */}
        {phase === "done" && (
          <div style={{ textAlign: "center", padding: "8px 0" }}>
            <div style={{ width: 54, height: 54, borderRadius: "50%", background: "rgba(34,197,94,0.12)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 18px" }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M5 12l5 5L20 7" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h3 style={{ fontSize: 19, fontWeight: 800, color: "var(--text, #eef0f6)", margin: "0 0 8px" }}>Payment successful</h3>
            <p style={{ fontSize: 13, color: "var(--muted, #555b7a)", margin: "0 0 22px", lineHeight: 1.6 }}>
              Your <strong style={{ color: "var(--text-secondary, #9aa0b4)" }}>{plan.label}</strong> subscription is now active.
            </p>
            <button onClick={onClose} style={{ width: "100%", padding: "11px 0", borderRadius: 9, border: "none", background: "var(--accent, #6366f1)", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
              Done
            </button>
          </div>
        )}

        {/* ERROR */}
        {phase === "error" && (
          <div style={{ textAlign: "center", padding: "8px 0" }}>
            <div style={{ width: 54, height: 54, borderRadius: "50%", background: "rgba(239,68,68,0.1)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 18px" }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path d="M12 8v4M12 16h.01" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round"/>
                <circle cx="12" cy="12" r="10" stroke="#ef4444" strokeWidth="2"/>
              </svg>
            </div>
            <h3 style={{ fontSize: 19, fontWeight: 800, color: "var(--text, #eef0f6)", margin: "0 0 8px" }}>Payment failed</h3>
            <p style={{ fontSize: 13, color: "var(--muted, #555b7a)", margin: "0 0 22px", lineHeight: 1.6 }}>{error}</p>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={onClose} style={{ flex: 1, padding: "11px 0", borderRadius: 9, border: "1.5px solid var(--border, #2a2d3e)", background: "transparent", color: "var(--muted, #555b7a)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                Close
              </button>
              <button onClick={() => { setPhase("confirm"); setError(null); }} style={{ flex: 2, padding: "11px 0", borderRadius: 9, border: "none", background: "var(--accent, #6366f1)", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                Try again
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── MAIN PAGE ─────────────────────────────────────────────────────────────────
export default function BillingPage() {
  const [subscription, setSubscription] = useState(null);
  const [history, setHistory]           = useState([]);
  const [loadingSub, setLoadingSub]     = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [initiatingPlan, setInitiatingPlan] = useState(null);
  const [tab, setTab]         = useState("plans");
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const fetchAll = useCallback(async () => {
    setLoadingSub(true);
    setLoadingHistory(true);
    try {
      const sub = await api.getMyPlan();
      setSubscription(sub);
    } catch { /* silent */ }
    finally { setLoadingSub(false); }
    try {
      const hist = await api.getBillingHistory();
      setHistory(hist);
    } catch { /* silent */ }
    finally { setLoadingHistory(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleSelectPlan = (planKey) => {
    const plan = PLANS.find(p => p.key === planKey);
    setSelectedPlan(plan);
  };

  const handlePaymentSuccess = () => {
    setSelectedPlan(null);
    fetchAll();
  };

  const currentPlan      = subscription?.planType   || "TRIAL";
  const currentPlanOrder = subscription?.planOrder  ?? 0;
  const subStatus        = subscription?.status     || null;
  const daysRemaining    = subscription?.daysRemaining ?? null;
  const isActive         = subscription?.active     ?? false;
  const subEndDate       = subscription?.endDate
    ? new Date(subscription.endDate).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })
    : null;

  return (
    <Layout>
      <style>{`
        @keyframes billing-spin    { to { transform: rotate(360deg); } }
        @keyframes billing-slideUp { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes billing-fadeIn  { from { opacity: 0; } to { opacity: 1; } }

        .billing-page { animation: billing-fadeIn 0.3s ease; }

        /* Responsive history: show table on desktop, cards on mobile */
        .billing-history-desktop { display: grid; }
        .billing-history-mobile  { display: none; }
        @media (max-width: 639px) {
          .billing-history-desktop { display: none !important; }
          .billing-history-header  { display: none !important; }
          .billing-history-mobile  { display: block !important; }
        }
      `}</style>

      <div className="billing-page">

        {/* ── Page header ── */}
        <div className="page-header" style={{ marginBottom: isMobile ? 20 : 28 }}>
          <div style={{
            fontSize: 10, fontWeight: 700, color: "var(--accent, #6366f1)",
            letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 8,
          }}>
            Account
          </div>
          <h1 style={{ fontSize: isMobile ? 20 : 26, fontWeight: 800, letterSpacing: "-0.02em", marginBottom: 4 }}>
            Billing &amp; Subscription
          </h1>
          <p style={{ fontSize: 13, color: "var(--text-muted, #555b7a)" }}>
            Manage your plan, view payment history, and upgrade your workspace.
          </p>
        </div>

        {/* ── Current subscription banner ── */}
        {!loadingSub && subscription && (
          <div style={{
            background: "var(--bg-elevated, #222538)",
            border: `1px solid ${isActive ? "var(--border, #2a2d3e)" : "rgba(239,68,68,0.3)"}`,
            borderRadius: 12, padding: isMobile ? "14px 16px" : "16px 22px",
            marginBottom: isMobile ? 20 : 28,
            display: "flex", alignItems: "center", justifyContent: "space-between",
            flexWrap: "wrap", gap: 12,
          }}>
            {/* Left: plan info */}
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 9, flexShrink: 0,
                background: "rgba(99,102,241,0.15)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
                  <path d="M2 6h14M2 6v9a1 1 0 001 1h12a1 1 0 001-1V6M2 6l2-3h10l2 3" stroke="#818cf8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div>
                <div style={{ fontSize: 11, color: "var(--text-muted, #555b7a)", marginBottom: 3 }}>Current plan</div>
                <div style={{
                  fontSize: 15, fontWeight: 700, color: "var(--text, #eef0f6)",
                  display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap",
                }}>
                  {subscription.planLabel || planMeta[currentPlan] || currentPlan}
                  <StatusBadge status={isActive ? "SUCCESS" : (subStatus || "FAILED")} />
                </div>
              </div>
            </div>

            {/* Right: expiry + days remaining */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: isMobile ? "flex-start" : "flex-end", gap: 4 }}>
              {subEndDate && (
                <div style={{ fontSize: 12, color: "var(--text-muted, #555b7a)" }}>
                  Expires on{" "}
                  <strong style={{ color: "var(--text-secondary, #9aa0b4)" }}>{subEndDate}</strong>
                </div>
              )}
              {daysRemaining !== null && (
                <div style={{
                  fontSize: 12, fontWeight: 700,
                  color: daysRemaining <= 3 ? "#ef4444" : daysRemaining <= 7 ? "#f59e0b" : "#22c55e",
                }}>
                  {daysRemaining === 0
                    ? "Expires today"
                    : `${daysRemaining} day${daysRemaining !== 1 ? "s" : ""} remaining`}
                </div>
              )}
              {!isActive && subStatus === "EXPIRED" && (
                <div style={{ fontSize: 11, color: "#ef4444", fontWeight: 600 }}>
                  ⚠ Subscription expired — upgrade to regain access
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Tabs ── */}
        <div style={{
          display: "flex", gap: 4, marginBottom: isMobile ? 18 : 24,
          background: "var(--bg-elevated, #222538)",
          border: "1px solid var(--border, #2a2d3e)",
          borderRadius: 10, padding: 4, width: "fit-content",
        }}>
          {[["plans", "Plans"], ["history", "Payment History"]].map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              style={{
                padding: isMobile ? "7px 14px" : "8px 18px",
                borderRadius: 7, border: "none", fontSize: 12, fontWeight: 600,
                cursor: "pointer", transition: "all 0.15s",
                background: tab === key ? "var(--card, #1c1f2e)" : "transparent",
                color: tab === key ? "var(--text, #eef0f6)" : "var(--text-muted, #555b7a)",
                boxShadow: tab === key ? "0 1px 4px rgba(0,0,0,0.25)" : "none",
                whiteSpace: "nowrap",
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* ── Plans tab ── */}
        {tab === "plans" && (
          <div style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fit, minmax(260px, 1fr))",
            gap: isMobile ? 14 : 18,
          }}>
            {PLANS.map(plan => (
              <PlanCard
                key={plan.key}
                plan={plan}
                currentPlan={currentPlan}
                currentPlanOrder={currentPlanOrder}
                onSelect={handleSelectPlan}
                loading={initiatingPlan}
                isMobile={isMobile}
              />
            ))}
          </div>
        )}

        {/* ── History tab ── */}
        {tab === "history" && (
          <div style={{
            background: "var(--card, #1c1f2e)",
            border: "1px solid var(--border, #2a2d3e)",
            borderRadius: 14, overflow: "hidden",
          }}>
            {/* Desktop header */}
            <div className="billing-history-header" style={{
              display: "grid", gridTemplateColumns: "1fr 120px 130px 100px",
              gap: 12, padding: "11px 20px",
              background: "var(--bg-elevated, #222538)",
              borderBottom: "1px solid var(--border, #2a2d3e)",
              fontSize: 10, fontWeight: 700, color: "var(--text-muted, #555b7a)",
              letterSpacing: "0.08em", textTransform: "uppercase",
            }}>
              <span>Transaction</span>
              <span>Amount</span>
              <span>Date</span>
              <span>Status</span>
            </div>

            {loadingHistory ? (
              <div style={{ padding: 48, textAlign: "center" }}>
                <Spinner />
              </div>
            ) : history.length === 0 ? (
              <div style={{ padding: "48px 24px", textAlign: "center" }}>
                <div style={{ fontSize: 28, marginBottom: 12 }}>🧾</div>
                <div style={{ fontSize: 14, color: "var(--text, #eef0f6)", fontWeight: 600, marginBottom: 4 }}>No transactions yet</div>
                <div style={{ fontSize: 12, color: "var(--text-muted, #555b7a)" }}>
                  Your payment history will appear here after your first payment.
                </div>
              </div>
            ) : (
              history.map((tx, i) => {
                const isLast = i === history.length - 1;
                return (
                  <div key={tx.transactionId || i}>
                    {/* Desktop */}
                    <div className="billing-history-desktop">
                      <HistoryRow tx={tx} isLast={isLast} />
                    </div>
                    {/* Mobile */}
                    <div className="billing-history-mobile">
                      <HistoryCard tx={tx} isLast={isLast} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* ── Payment modal ── */}
      {selectedPlan && (
        <PaymentModal
          plan={selectedPlan}
          onClose={() => setSelectedPlan(null)}
          onSuccess={handlePaymentSuccess}
        />
      )}
    </Layout>
  );
}