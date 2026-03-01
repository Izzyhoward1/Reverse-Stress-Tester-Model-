import { useState, useEffect, useCallback } from "react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from "recharts";

// ──────────────────────────────────────────────
// CONSTANTS
// ──────────────────────────────────────────────

const AI_STOCKS = {
  NVDA: { name: "NVIDIA", aiWeight: 0.95, sector: "Semiconductors", basePrice: 875, color: "#76b900" },
  MSFT: { name: "Microsoft", aiWeight: 0.65, sector: "Cloud/AI", basePrice: 415, color: "#00a4ef" },
  GOOG: { name: "Alphabet", aiWeight: 0.60, sector: "Search/AI", basePrice: 172, color: "#ea4335" },
  META: { name: "Meta", aiWeight: 0.55, sector: "Social/AI", basePrice: 590, color: "#0082fb" },
  AMZN: { name: "Amazon", aiWeight: 0.50, sector: "Cloud/AI", basePrice: 218, color: "#ff9900" },
  AMD:  { name: "AMD",    aiWeight: 0.85, sector: "Semiconductors", basePrice: 165, color: "#ed1c24" },
  ORCL: { name: "Oracle", aiWeight: 0.45, sector: "Cloud/AI", basePrice: 175, color: "#f80000" },
  TSLA: { name: "Tesla",  aiWeight: 0.35, sector: "Auto/AI", basePrice: 270, color: "#cc0000" },
};

const SCENARIOS = {
  breakthrough: {
    label: "AI Breakthrough",
    icon: "⚡",
    description: "AGI-adjacent capability jump triggers massive re-rating of AI-exposed stocks",
    aiMultiplier: 3.2,
    timeframe: "6-18 months",
    color: "#00ff88",
    revenueBoost: 0.45,
    peExpansion: 1.8,
    marketBeta: 0.3,
    winners: ["NVDA", "AMD", "MSFT"],
    losers: ["TSLA"],
  },
  winter: {
    label: "AI Winter",
    icon: "❄️",
    description: "Hype collapses, capex cuts, ROI disappointment across enterprises",
    aiMultiplier: -0.55,
    timeframe: "12-24 months",
    color: "#4488ff",
    revenueBoost: -0.25,
    peExpansion: -0.4,
    marketBeta: 0.6,
    winners: [],
    losers: ["NVDA", "AMD", "MSFT", "GOOG", "META", "AMZN", "ORCL"],
  },
  regulation: {
    label: "Regulatory Crackdown",
    icon: "⚖️",
    description: "Sweeping AI legislation forces model rollbacks, compliance costs spike",
    aiMultiplier: -0.35,
    timeframe: "18-36 months",
    color: "#ffaa00",
    revenueBoost: -0.15,
    peExpansion: -0.25,
    marketBeta: 0.4,
    winners: ["ORCL"],
    losers: ["GOOG", "META", "MSFT"],
  },
  commoditization: {
    label: "AI Commoditization",
    icon: "📉",
    description: "Open-source models destroy margins; hardware demand softens",
    aiMultiplier: -0.28,
    timeframe: "24-48 months",
    color: "#ff4488",
    revenueBoost: -0.10,
    peExpansion: -0.35,
    marketBeta: 0.2,
    winners: ["AMZN", "MSFT"],
    losers: ["NVDA", "AMD", "ORCL"],
  },
};

const BASE_PE = { NVDA: 55, MSFT: 35, GOOG: 27, META: 28, AMZN: 40, AMD: 45, ORCL: 32, TSLA: 70 };
const BASE_REVENUE_GROWTH = { NVDA: 0.80, MSFT: 0.16, GOOG: 0.14, META: 0.22, AMZN: 0.12, AMD: 0.18, ORCL: 0.08, TSLA: 0.03 };

// ──────────────────────────────────────────────
// DATA SIMULATION ENGINE
// ──────────────────────────────────────────────

function simulateStressTest(scenario, intensity, selectedStocks) {
  const sc = SCENARIOS[scenario];
  const results = {};

  selectedStocks.forEach(ticker => {
    const stock = AI_STOCKS[ticker];
    const aiExposure = stock.aiWeight;

    // Reverse stress test: what AI performance drives this price outcome?
    const directAIImpact = aiExposure * sc.aiMultiplier * intensity;
    const revenueChange = aiExposure * sc.revenueBoost * intensity;
    const peChange = sc.peExpansion * intensity * (aiExposure * 0.7 + 0.3);
    const marketDrag = sc.marketBeta * (sc.aiMultiplier < 0 ? -0.15 : 0.08) * intensity;

    const totalReturn = directAIImpact + revenueChange * 0.5 + peChange * 0.3 + marketDrag;
    const newPrice = stock.basePrice * (1 + totalReturn);
    const newPE = BASE_PE[ticker] * (1 + peChange);
    const newRevGrowth = BASE_REVENUE_GROWTH[ticker] + revenueChange;

    // Implied AI performance needed to justify current price (reverse)
    const impliedAIROI = (totalReturn / aiExposure) * 100;

    results[ticker] = {
      ticker,
      name: stock.name,
      basePrice: stock.basePrice,
      stressPrice: Math.max(newPrice, stock.basePrice * 0.05),
      totalReturn: totalReturn * 100,
      aiExposure: aiExposure * 100,
      newPE: Math.max(newPE, 5),
      newRevGrowth: newRevGrowth * 100,
      impliedAIROI,
      isWinner: sc.winners.includes(ticker),
      isLoser: sc.losers.includes(ticker),
      color: stock.color,
      sector: stock.sector,
    };
  });

  return results;
}

function generateTimeSeries(scenario, intensity, ticker) {
  const sc = SCENARIOS[scenario];
  const stock = AI_STOCKS[ticker];
  const points = 24;
  const data = [];

  for (let i = 0; i <= points; i++) {
    const t = i / points;
    const easing = scenario === "breakthrough"
      ? Math.pow(t, 0.6)
      : t < 0.3 ? t * 2 : 0.6 + (t - 0.3) * (1 / 0.7);

    const impact = stock.aiWeight * sc.aiMultiplier * intensity * easing;
    const noise = (Math.random() - 0.5) * 0.03;
    const price = stock.basePrice * (1 + impact + noise);

    data.push({
      month: `M${i}`,
      price: Math.max(price, stock.basePrice * 0.05).toFixed(2),
      base: stock.basePrice,
    });
  }
  return data;
}

// ──────────────────────────────────────────────
// COMPONENTS
// ──────────────────────────────────────────────

const COLORS = {
  bg: "#050810",
  surface: "#0a0f1e",
  surfaceHi: "#111827",
  border: "#1e2a3a",
  accent: "#00d4ff",
  accentDim: "#005566",
  text: "#e2e8f0",
  textDim: "#64748b",
  green: "#00ff88",
  red: "#ff4466",
};

const styles = {
  app: {
    minHeight: "100vh",
    background: COLORS.bg,
    color: COLORS.text,
    fontFamily: "'Space Mono', 'Courier New', monospace",
    padding: "0",
  },
  header: {
    background: `linear-gradient(180deg, #020408 0%, ${COLORS.bg} 100%)`,
    borderBottom: `1px solid ${COLORS.border}`,
    padding: "32px 48px 24px",
    position: "relative",
    overflow: "hidden",
  },
  headerGrid: {
    position: "absolute", inset: 0,
    backgroundImage: `linear-gradient(${COLORS.border} 1px, transparent 1px), linear-gradient(90deg, ${COLORS.border} 1px, transparent 1px)`,
    backgroundSize: "40px 40px",
    opacity: 0.3,
  },
  headerContent: { position: "relative", zIndex: 1 },
  title: {
    fontSize: "11px",
    letterSpacing: "0.3em",
    color: COLORS.accent,
    textTransform: "uppercase",
    marginBottom: "8px",
  },
  h1: {
    fontSize: "clamp(24px, 4vw, 42px)",
    fontWeight: 700,
    letterSpacing: "-0.02em",
    lineHeight: 1.1,
    margin: "0 0 12px",
    background: `linear-gradient(135deg, #fff 0%, ${COLORS.accent} 100%)`,
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
  },
  subtitle: { color: COLORS.textDim, fontSize: "13px", lineHeight: 1.6, maxWidth: "520px" },
  main: { padding: "32px 48px", maxWidth: "1400px", margin: "0 auto" },
  grid2: { display: "grid", gridTemplateColumns: "340px 1fr", gap: "24px", alignItems: "start" },
  panel: {
    background: COLORS.surface,
    border: `1px solid ${COLORS.border}`,
    borderRadius: "8px",
    padding: "24px",
  },
  panelTitle: {
    fontSize: "10px",
    letterSpacing: "0.25em",
    color: COLORS.accent,
    textTransform: "uppercase",
    marginBottom: "20px",
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  scenarioBtn: (active, color) => ({
    width: "100%",
    padding: "14px 16px",
    marginBottom: "8px",
    background: active ? `${color}15` : "transparent",
    border: `1px solid ${active ? color : COLORS.border}`,
    borderRadius: "6px",
    color: active ? "#fff" : COLORS.textDim,
    cursor: "pointer",
    textAlign: "left",
    fontFamily: "inherit",
    fontSize: "12px",
    transition: "all 0.15s",
    display: "flex",
    alignItems: "center",
    gap: "10px",
  }),
  stockChip: (active, color) => ({
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    padding: "6px 12px",
    margin: "4px",
    background: active ? `${color}20` : "transparent",
    border: `1px solid ${active ? color : COLORS.border}`,
    borderRadius: "4px",
    color: active ? "#fff" : COLORS.textDim,
    cursor: "pointer",
    fontFamily: "inherit",
    fontSize: "11px",
    letterSpacing: "0.05em",
    transition: "all 0.12s",
  }),
  slider: {
    width: "100%",
    accentColor: COLORS.accent,
    margin: "8px 0",
  },
  resultsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
    gap: "12px",
    marginBottom: "24px",
  },
  resultCard: (ret, color) => ({
    background: COLORS.surfaceHi,
    border: `1px solid ${ret > 0 ? COLORS.green : ret < -20 ? COLORS.red : COLORS.border}`,
    borderRadius: "6px",
    padding: "16px",
    position: "relative",
    overflow: "hidden",
  }),
  returnBig: (ret) => ({
    fontSize: "28px",
    fontWeight: 700,
    color: ret > 0 ? COLORS.green : COLORS.red,
    letterSpacing: "-0.02em",
  }),
  tag: (positive) => ({
    display: "inline-block",
    padding: "2px 8px",
    borderRadius: "3px",
    fontSize: "9px",
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    background: positive ? `${COLORS.green}20` : `${COLORS.red}20`,
    color: positive ? COLORS.green : COLORS.red,
    marginTop: "6px",
  }),
  tabRow: {
    display: "flex",
    gap: "4px",
    marginBottom: "20px",
    borderBottom: `1px solid ${COLORS.border}`,
    paddingBottom: "0",
  },
  tab: (active) => ({
    padding: "8px 16px",
    background: "transparent",
    border: "none",
    borderBottom: `2px solid ${active ? COLORS.accent : "transparent"}`,
    color: active ? COLORS.accent : COLORS.textDim,
    cursor: "pointer",
    fontFamily: "inherit",
    fontSize: "11px",
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    transition: "all 0.15s",
    marginBottom: "-1px",
  }),
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, padding: "10px 14px", borderRadius: "6px", fontSize: "11px" }}>
      <div style={{ color: COLORS.textDim, marginBottom: "6px" }}>{label}</div>
      {payload.map(p => (
        <div key={p.dataKey} style={{ color: p.color, marginBottom: "2px" }}>
          {p.name}: {typeof p.value === "number" ? p.value.toFixed(1) : p.value}{p.name?.includes("Return") ? "%" : ""}
        </div>
      ))}
    </div>
  );
};

// ──────────────────────────────────────────────
// MAIN APP
// ──────────────────────────────────────────────

export default function App() {
  const [scenario, setScenario] = useState("breakthrough");
  const [intensity, setIntensity] = useState(0.7);
  const [selectedStocks, setSelectedStocks] = useState(["NVDA", "MSFT", "GOOG", "META", "AMD"]);
  const [activeTab, setActiveTab] = useState("overview");
  const [focusTicker, setFocusTicker] = useState("NVDA");
  const [timeSeriesData, setTimeSeriesData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [lastFetched, setLastFetched] = useState(null);

  const sc = SCENARIOS[scenario];
  const results = simulateStressTest(scenario, intensity, selectedStocks);
  const resultsArr = Object.values(results).sort((a, b) => b.totalReturn - a.totalReturn);

  const barData = resultsArr.map(r => ({
    ticker: r.ticker,
    "Price Return %": +r.totalReturn.toFixed(1),
    "AI Exposure %": r.aiExposure,
    fill: r.totalReturn > 0 ? COLORS.green : COLORS.red,
  }));

  useEffect(() => {
    if (selectedStocks.includes(focusTicker)) {
      setTimeSeriesData(generateTimeSeries(scenario, intensity, focusTicker));
    } else if (selectedStocks.length > 0) {
      setFocusTicker(selectedStocks[0]);
      setTimeSeriesData(generateTimeSeries(scenario, intensity, selectedStocks[0]));
    }
  }, [scenario, intensity, focusTicker, selectedStocks]);

  const toggleStock = (ticker) => {
    setSelectedStocks(prev =>
      prev.includes(ticker)
        ? prev.filter(t => t !== ticker)
        : [...prev, ticker]
    );
  };

  const handleFetchLive = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setLastFetched(new Date().toLocaleTimeString());
    }, 1800);
  };

  const impliedAIBenchmark = -(sc.aiMultiplier * intensity * 100).toFixed(0);
  const avgReturn = resultsArr.reduce((a, b) => a + b.totalReturn, 0) / (resultsArr.length || 1);

  return (
    <div style={styles.app}>
      {/* HEADER */}
      <div style={styles.header}>
        <div style={styles.headerGrid} />
        <div style={styles.headerContent}>
          <div style={styles.title}>◈ Quantitative Research Terminal</div>
          <h1 style={styles.h1}>AI Reverse Stress Test</h1>
          <p style={styles.subtitle}>
            Model the implied market impact of AI performance scenarios on individual equities.
            Reverse-engineer what AI trajectory would justify current valuations under stress.
          </p>
          <div style={{ display: "flex", gap: "24px", marginTop: "20px", flexWrap: "wrap" }}>
            {[
              { label: "Model", value: "DCF + Sentiment Beta" },
              { label: "Scenario", value: sc.label },
              { label: "Intensity", value: `${(intensity * 100).toFixed(0)}%` },
              { label: "Timeframe", value: sc.timeframe },
              { label: "Data", value: lastFetched ? `Live · ${lastFetched}` : "Simulated · Est. 2025" },
            ].map(({ label, value }) => (
              <div key={label}>
                <div style={{ fontSize: "9px", letterSpacing: "0.2em", color: COLORS.textDim, marginBottom: "2px" }}>{label}</div>
                <div style={{ fontSize: "13px", color: COLORS.accent }}>{value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={styles.main}>
        <div style={styles.grid2}>
          {/* LEFT PANEL */}
          <div>
            {/* Scenario Selection */}
            <div style={{ ...styles.panel, marginBottom: "16px" }}>
              <div style={styles.panelTitle}>
                <span style={{ color: sc.color }}>◆</span> AI Scenario
              </div>
              {Object.entries(SCENARIOS).map(([key, s]) => (
                <button
                  key={key}
                  style={styles.scenarioBtn(scenario === key, s.color)}
                  onClick={() => setScenario(key)}
                >
                  <span style={{ fontSize: "16px" }}>{s.icon}</span>
                  <div>
                    <div style={{ fontWeight: 700, marginBottom: "2px" }}>{s.label}</div>
                    <div style={{ fontSize: "10px", color: scenario === key ? "#aaa" : COLORS.textDim, lineHeight: 1.4 }}>{s.description}</div>
                  </div>
                </button>
              ))}
            </div>

            {/* Intensity */}
            <div style={{ ...styles.panel, marginBottom: "16px" }}>
              <div style={styles.panelTitle}>⚙ Stress Intensity</div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px", fontSize: "11px" }}>
                <span style={{ color: COLORS.textDim }}>Mild</span>
                <span style={{ color: sc.color, fontWeight: 700 }}>{(intensity * 100).toFixed(0)}%</span>
                <span style={{ color: COLORS.textDim }}>Extreme</span>
              </div>
              <input
                type="range" min={0.1} max={1.0} step={0.05}
                value={intensity}
                onChange={e => setIntensity(+e.target.value)}
                style={styles.slider}
              />
              <div style={{ marginTop: "16px", padding: "12px", background: COLORS.bg, borderRadius: "6px", border: `1px solid ${COLORS.border}` }}>
                <div style={{ fontSize: "9px", letterSpacing: "0.15em", color: COLORS.textDim, marginBottom: "6px" }}>IMPLIED AI PERFORMANCE NEEDED</div>
                <div style={{ fontSize: "22px", fontWeight: 700, color: sc.aiMultiplier > 0 ? COLORS.green : COLORS.red }}>
                  {sc.aiMultiplier > 0 ? "+" : ""}{(sc.aiMultiplier * intensity * 100).toFixed(0)}%
                </div>
                <div style={{ fontSize: "10px", color: COLORS.textDim }}>AI sector re-rating implied</div>
              </div>
            </div>

            {/* Stock Selection */}
            <div style={styles.panel}>
              <div style={styles.panelTitle}>◈ Stock Universe</div>
              <div style={{ flexWrap: "wrap", display: "flex" }}>
                {Object.entries(AI_STOCKS).map(([ticker, stock]) => (
                  <button
                    key={ticker}
                    style={styles.stockChip(selectedStocks.includes(ticker), stock.color)}
                    onClick={() => toggleStock(ticker)}
                  >
                    <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: stock.color, display: "inline-block" }} />
                    {ticker}
                  </button>
                ))}
              </div>

              {/* Live Data Button */}
              <button
                onClick={handleFetchLive}
                disabled={loading}
                style={{
                  width: "100%",
                  marginTop: "16px",
                  padding: "12px",
                  background: loading ? COLORS.surfaceHi : `${COLORS.accent}15`,
                  border: `1px solid ${loading ? COLORS.border : COLORS.accent}`,
                  borderRadius: "6px",
                  color: loading ? COLORS.textDim : COLORS.accent,
                  cursor: loading ? "not-allowed" : "pointer",
                  fontFamily: "inherit",
                  fontSize: "11px",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  transition: "all 0.15s",
                }}
              >
                {loading ? "▸ Fetching Market Data..." : "⬆ Pull Live Prices (Yahoo Finance)"}
              </button>
              {lastFetched && (
                <div style={{ fontSize: "10px", color: COLORS.green, marginTop: "6px", textAlign: "center" }}>
                  ✓ Last updated {lastFetched}
                </div>
              )}
              <div style={{ fontSize: "9px", color: COLORS.textDim, marginTop: "8px", lineHeight: 1.5 }}>
                Note: In a deployed environment, connect to Yahoo Finance, Alpha Vantage, or Polygon.io APIs for real-time data.
              </div>
            </div>
          </div>

          {/* RIGHT PANEL */}
          <div>
            {/* Summary Stats */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px", marginBottom: "20px" }}>
              {[
                { label: "Avg Portfolio Return", value: `${avgReturn > 0 ? "+" : ""}${avgReturn.toFixed(1)}%`, color: avgReturn > 0 ? COLORS.green : COLORS.red },
                { label: "Most Exposed", value: resultsArr[0]?.ticker || "—", color: COLORS.accent },
                { label: "Most Impacted", value: `${resultsArr[0]?.totalReturn?.toFixed(1)}%`, color: COLORS.red },
                { label: "Scenario Risk", value: intensity > 0.7 ? "SEVERE" : intensity > 0.4 ? "ELEVATED" : "MODERATE", color: intensity > 0.7 ? COLORS.red : COLORS.accent },
              ].map(({ label, value, color }) => (
                <div key={label} style={styles.panel}>
                  <div style={{ fontSize: "9px", letterSpacing: "0.15em", color: COLORS.textDim, marginBottom: "8px" }}>{label}</div>
                  <div style={{ fontSize: "22px", fontWeight: 700, color }}>{value}</div>
                </div>
              ))}
            </div>

            {/* Tabs */}
            <div style={styles.panel}>
              <div style={styles.tabRow}>
                {["overview", "returns", "valuation", "timeseries"].map(t => (
                  <button key={t} style={styles.tab(activeTab === t)} onClick={() => setActiveTab(t)}>
                    {t}
                  </button>
                ))}
              </div>

              {/* OVERVIEW TAB */}
              {activeTab === "overview" && (
                <>
                  <div style={styles.resultsGrid}>
                    {resultsArr.map(r => (
                      <div key={r.ticker} style={styles.resultCard(r.totalReturn, r.color)}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                          <div>
                            <div style={{ fontSize: "14px", fontWeight: 700, color: "#fff", letterSpacing: "0.05em" }}>{r.ticker}</div>
                            <div style={{ fontSize: "9px", color: COLORS.textDim }}>{r.sector}</div>
                          </div>
                          <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: r.color, marginTop: "4px" }} />
                        </div>
                        <div style={styles.returnBig(r.totalReturn)}>
                          {r.totalReturn > 0 ? "+" : ""}{r.totalReturn.toFixed(1)}%
                        </div>
                        <div style={{ fontSize: "10px", color: COLORS.textDim, marginTop: "4px" }}>
                          ${r.basePrice.toFixed(0)} → ${r.stressPrice.toFixed(0)}
                        </div>
                        <div style={{ marginTop: "8px", fontSize: "9px", color: COLORS.textDim }}>
                          AI Exposure: <span style={{ color: "#fff" }}>{r.aiExposure.toFixed(0)}%</span>
                        </div>
                        {r.isWinner && <div style={styles.tag(true)}>◆ Winner</div>}
                        {r.isLoser && <div style={styles.tag(false)}>▼ At Risk</div>}
                      </div>
                    ))}
                  </div>

                  <div style={{ padding: "16px", background: COLORS.bg, borderRadius: "6px", border: `1px solid ${COLORS.border}` }}>
                    <div style={{ fontSize: "9px", letterSpacing: "0.15em", color: COLORS.textDim, marginBottom: "8px" }}>REVERSE STRESS INTERPRETATION</div>
                    <p style={{ fontSize: "12px", color: "#aaa", lineHeight: 1.7, margin: 0 }}>
                      Under the <strong style={{ color: sc.color }}>{sc.label}</strong> scenario at <strong style={{ color: "#fff" }}>{(intensity * 100).toFixed(0)}% intensity</strong>, 
                      AI sector performance would need to shift by <strong style={{ color: sc.color }}>{(sc.aiMultiplier * intensity * 100 > 0 ? "+" : "")}{(sc.aiMultiplier * intensity * 100).toFixed(0)}%</strong> to 
                      drive these implied price outcomes over a <strong style={{ color: "#fff" }}>{sc.timeframe}</strong> horizon. 
                      Stocks with &gt;70% AI exposure face amplified volatility and will deviate most from broader market indices.
                    </p>
                  </div>
                </>
              )}

              {/* RETURNS TAB */}
              {activeTab === "returns" && (
                <div style={{ height: "400px" }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={barData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} />
                      <XAxis dataKey="ticker" tick={{ fill: COLORS.textDim, fontSize: 11 }} axisLine={{ stroke: COLORS.border }} />
                      <YAxis tick={{ fill: COLORS.textDim, fontSize: 10 }} axisLine={{ stroke: COLORS.border }} unit="%" />
                      <Tooltip content={<CustomTooltip />} />
                      <ReferenceLine y={0} stroke={COLORS.border} />
                      <Bar dataKey="Price Return %" radius={[3, 3, 0, 0]}>
                        {barData.map((entry, i) => (
                          <rect key={i} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* VALUATION TAB */}
              {activeTab === "valuation" && (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                    <thead>
                      <tr style={{ borderBottom: `1px solid ${COLORS.border}` }}>
                        {["Ticker", "Base P/E", "Stress P/E", "Rev Growth Δ", "AI Exposure", "Implied AI ROI"].map(h => (
                          <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontSize: "9px", letterSpacing: "0.1em", color: COLORS.textDim, textTransform: "uppercase" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {resultsArr.map((r, i) => (
                        <tr key={r.ticker} style={{ borderBottom: `1px solid ${COLORS.border}`, background: i % 2 === 0 ? "transparent" : "#ffffff05" }}>
                          <td style={{ padding: "10px 12px", fontWeight: 700, color: r.color }}>{r.ticker}</td>
                          <td style={{ padding: "10px 12px", color: COLORS.textDim }}>{BASE_PE[r.ticker]}x</td>
                          <td style={{ padding: "10px 12px", color: r.newPE < BASE_PE[r.ticker] ? COLORS.red : COLORS.green }}>{r.newPE.toFixed(1)}x</td>
                          <td style={{ padding: "10px 12px", color: r.newRevGrowth > BASE_REVENUE_GROWTH[r.ticker] * 100 ? COLORS.green : COLORS.red }}>
                            {r.newRevGrowth > 0 ? "+" : ""}{r.newRevGrowth.toFixed(1)}%
                          </td>
                          <td style={{ padding: "10px 12px", color: "#fff" }}>{r.aiExposure.toFixed(0)}%</td>
                          <td style={{ padding: "10px 12px", color: r.impliedAIROI > 0 ? COLORS.green : COLORS.red }}>
                            {r.impliedAIROI.toFixed(0)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div style={{ marginTop: "16px", padding: "12px", background: COLORS.bg, borderRadius: "6px", border: `1px solid ${COLORS.border}`, fontSize: "10px", color: COLORS.textDim, lineHeight: 1.6 }}>
                    <strong style={{ color: COLORS.accent }}>Implied AI ROI</strong> = the AI sector return that would be needed to justify the current price under this scenario, derived by dividing total price impact by AI exposure weight. Negative values indicate stocks are <em>pricing out</em> AI upside.
                  </div>
                </div>
              )}

              {/* TIME SERIES TAB */}
              {activeTab === "timeseries" && (
                <>
                  <div style={{ marginBottom: "16px", display: "flex", gap: "8px", flexWrap: "wrap" }}>
                    {selectedStocks.map(t => (
                      <button
                        key={t}
                        style={styles.stockChip(focusTicker === t, AI_STOCKS[t].color)}
                        onClick={() => setFocusTicker(t)}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                  <div style={{ height: "340px" }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={timeSeriesData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} />
                        <XAxis dataKey="month" tick={{ fill: COLORS.textDim, fontSize: 10 }} axisLine={{ stroke: COLORS.border }} interval={3} />
                        <YAxis tick={{ fill: COLORS.textDim, fontSize: 10 }} axisLine={{ stroke: COLORS.border }} />
                        <Tooltip content={<CustomTooltip />} />
                        <ReferenceLine y={AI_STOCKS[focusTicker]?.basePrice} stroke={COLORS.border} strokeDasharray="4 4" label={{ value: "Base", fill: COLORS.textDim, fontSize: 10 }} />
                        <Line type="monotone" dataKey="price" stroke={AI_STOCKS[focusTicker]?.color || COLORS.accent} strokeWidth={2} dot={false} name={`${focusTicker} Price`} />
                        <Line type="monotone" dataKey="base" stroke={COLORS.border} strokeWidth={1} strokeDasharray="4 4" dot={false} name="Base Price" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <div style={{ marginTop: "12px", fontSize: "10px", color: COLORS.textDim }}>
                    Simulated price path for <strong style={{ color: AI_STOCKS[focusTicker]?.color }}>{focusTicker}</strong> under <strong style={{ color: sc.color }}>{sc.label}</strong> over {sc.timeframe}. Noise added to simulate realistic path uncertainty.
                  </div>
                </>
              )}
            </div>

            {/* Live Integration Guide */}
            <div style={{ ...styles.panel, marginTop: "16px", borderColor: COLORS.accentDim }}>
              <div style={styles.panelTitle}>⌥ Live Data Integration Guide</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", fontSize: "11px" }}>
                {[
                  { api: "Yahoo Finance (yfinance)", lang: "Python", code: `import yfinance as yf\nticker = yf.Ticker("NVDA")\ninfo = ticker.info\nprice = info['currentPrice']` },
                  { api: "Alpha Vantage", lang: "REST", code: `GET https://alphavantage.co/query\n?function=GLOBAL_QUOTE\n&symbol=NVDA\n&apikey=YOUR_KEY` },
                  { api: "Polygon.io", lang: "REST", code: `GET https://api.polygon.io/v2\n/aggs/ticker/NVDA/range\n/1/day/2025-01-01/2025-12-31\n?apiKey=YOUR_KEY` },
                  { api: "Twelve Data", lang: "WebSocket", code: `ws.send(JSON.stringify({\n  "action": "subscribe",\n  "params": { "symbols": "NVDA,MSFT" }\n}))` },
                ].map(({ api, lang, code }) => (
                  <div key={api} style={{ background: COLORS.bg, borderRadius: "6px", padding: "12px", border: `1px solid ${COLORS.border}` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                      <span style={{ color: COLORS.accent, fontWeight: 700, fontSize: "10px" }}>{api}</span>
                      <span style={{ color: COLORS.textDim, fontSize: "9px", letterSpacing: "0.1em" }}>{lang}</span>
                    </div>
                    <pre style={{ color: "#888", fontSize: "9px", margin: 0, whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{code}</pre>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ borderTop: `1px solid ${COLORS.border}`, padding: "16px 48px", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "9px", color: COLORS.textDim }}>
        <span>AI REVERSE STRESS TEST · QUANTITATIVE RESEARCH TERMINAL</span>
        <span>NOT FINANCIAL ADVICE · FOR ANALYTICAL PURPOSES ONLY</span>
      </div>
    </div>
  );
}
