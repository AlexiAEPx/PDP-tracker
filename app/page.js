"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { supabase } from "../lib/supabase";

const PRECIO = 4.93;          // Desde junio 2025
const PRECIO_ANTERIOR = 3.25;  // 2023, 2024 y enero–mayo 2025

// Devuelve el precio/lectura para un año histórico.
// 2025 es año de transición (ene–may 3,25 / jun–dic 4,93);
// como el histórico solo tiene totales anuales, se aplica 4,93 por defecto.
function precioParaAnio(anio) {
  if (anio <= 2024) return PRECIO_ANTERIOR;
  return PRECIO;
}

const RADS = [
  { id: "espinosa", nombre: "Alexis Espinosa Pizarro", corto: "Espinosa", apodo: "Alexis", color: "#c4956a", bg: "linear-gradient(135deg, #c4956a, #d4a97a)" },
  { id: "fernandez", nombre: "José Mª Fernández Peña", corto: "Fernández", apodo: "Chema", color: "#6a9ec4", bg: "linear-gradient(135deg, #6a9ec4, #7ab0d4)" },
  { id: "vazquez", nombre: "Jorge Vázquez Alfageme", corto: "Vázquez", apodo: "Jorge", color: "#8bc49a", bg: "linear-gradient(135deg, #8bc49a, #9bd4aa)" },
  { id: "aguilar", nombre: "Natalia Aguilar Pérez", corto: "Aguilar", apodo: "Natalia", color: "#c47a9e", bg: "linear-gradient(135deg, #c47a9e, #d48aae)" },
];

const eur = (n) => n.toLocaleString("es-ES", { style: "currency", currency: "EUR" });

// ── Seed: ensure 2024 historical data exists ──
async function ensureHistorico2024() {
  const records = [
    { id: '2024-espinosa', anio: 2024, radiologist_id: 'espinosa', nombre: 'Alexis Espinosa Pizarro', apodo: 'Alexis', color: '#c4956a', lecturas: 7186 },
    { id: '2024-fernandez', anio: 2024, radiologist_id: 'fernandez', nombre: 'José Mª Fernández Peña', apodo: 'Chema', color: '#6a9ec4', lecturas: 1892 },
    { id: '2024-aguilar', anio: 2024, radiologist_id: 'aguilar', nombre: 'Natalia Aguilar Pérez', apodo: 'Natalia', color: '#c47a9e', lecturas: 2189 },
    { id: '2024-cartier', anio: 2024, radiologist_id: 'cartier', nombre: 'Germaine Cartier Velázquez', apodo: 'Germaine', color: '#9a7ec4', lecturas: 1 },
    { id: '2024-vazquez', anio: 2024, radiologist_id: 'vazquez', nombre: 'Jorge Vázquez Alfageme', apodo: 'Jorge', color: '#8bc49a', lecturas: 1554 },
  ];
  const { error } = await supabase.from('historico').upsert(records, { onConflict: 'id' });
  if (error) console.error('ensureHistorico2024:', error);
}

// ── Supabase helpers ──
async function fetchRegistros() {
  const { data, error } = await supabase.from("registros").select("*").order("ts", { ascending: true });
  if (error) { console.error("fetchRegistros:", error); return []; }
  return data || [];
}

async function fetchConfig() {
  const { data, error } = await supabase.from("config").select("*").eq("key", "app_state").single();
  if (error) { console.error("fetchConfig:", error); return { pendientes: 0 }; }
  return data?.value || { pendientes: 0 };
}

async function fetchHistorico() {
  const { data, error } = await supabase.from("historico").select("*").order("lecturas", { ascending: false });
  if (error) { console.error("fetchHistorico:", error); return []; }
  return data || [];
}

async function upsertRegistro(reg) {
  const { error } = await supabase.from("registros").upsert(reg, { onConflict: "id" });
  if (error) console.error("upsertRegistro:", error);
  return !error;
}

async function deleteRegistro(id) {
  const { error } = await supabase.from("registros").delete().eq("id", id);
  if (error) console.error("deleteRegistro:", error);
  return !error;
}

async function updateConfig(value) {
  const { error } = await supabase.from("config").upsert({ key: "app_state", value }, { onConflict: "key" });
  if (error) console.error("updateConfig:", error);
  return !error;
}

// ── Theme Switcher ──
function ThemeSwitcher({ themePreference, setThemePreference }) {
  const modes = [
    { id: "light", icon: "☀️" },
    { id: "auto", icon: "◐" },
    { id: "dark", icon: "🌙" },
  ];

  return (
    <div style={{ display: "flex", gap: 2, background: "var(--bg-elevated)", borderRadius: 8, padding: 2, border: "1px solid var(--border-default)" }}>
      {modes.map((m) => (
        <button
          key={m.id}
          onClick={() => setThemePreference(m.id)}
          style={{
            padding: "4px 8px",
            borderRadius: 6,
            border: "none",
            background: themePreference === m.id ? "var(--bg-card)" : "transparent",
            cursor: "pointer",
            fontSize: 12,
            lineHeight: 1,
            boxShadow: themePreference === m.id ? "0 1px 3px rgba(0,0,0,0.15)" : "none",
            transition: "background 0.2s, box-shadow 0.2s",
          }}
        >
          {m.icon}
        </button>
      ))}
    </div>
  );
}

// ── Mini Line Chart (integrated, matches MiniBars height) ──
function MiniLineChart({ subs }) {
  if (!subs || subs.length < 2) return null;

  const W = 220, H = 160;
  const pad = { top: 16, right: 14, bottom: 18, left: 10 };
  const cw = W - pad.left - pad.right;
  const ch = H - pad.top - pad.bottom;

  let maxVal = 0;
  RADS.forEach((r) => {
    let cumul = 0;
    subs.forEach((s) => { cumul += (s.lecturas[r.id] || 0); if (cumul > maxVal) maxVal = cumul; });
  });
  if (maxVal === 0) return null;
  const yMax = Math.ceil(maxVal * 1.15);

  const xStep = cw / (subs.length - 1);
  const getX = (i) => pad.left + i * xStep;
  const getY = (v) => pad.top + ch - (v / yMax) * ch;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "100%", display: "block" }}>
      {/* Baseline */}
      <line x1={pad.left} y1={pad.top + ch} x2={W - pad.right} y2={pad.top + ch} strokeWidth="0.5" style={{ stroke: "var(--chart-baseline)" }} />
      {/* Lines + dots for each rad */}
      {RADS.map((r) => {
        let cumul = 0;
        const points = subs.map((s, i) => { cumul += (s.lecturas[r.id] || 0); return { x: getX(i), y: getY(cumul), v: cumul }; });
        if (points.every((p) => p.v === 0)) return null;
        const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
        return (
          <g key={r.id}>
            <path d={linePath} fill="none" stroke={r.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            {points.map((p, i) => p.v > 0 && (
              <g key={i}>
                <circle cx={p.x} cy={p.y} r="3" stroke={r.color} strokeWidth="1.5" style={{ fill: "var(--chart-dot)" }} />
                <text x={p.x} y={p.y - 5} textAnchor="middle" fontSize="7" fontWeight="700" fill={r.color}>{p.v}</text>
              </g>
            ))}
          </g>
        );
      })}
      {/* Sub-period labels at bottom */}
      {subs.map((s, i) => (
        <text key={s.id} x={getX(i)} y={H - 3} textAnchor="middle" fontSize="7" fontWeight="600" style={{ fill: "var(--chart-label)" }}>{s.periodo}</text>
      ))}
    </svg>
  );
}

// ── Mini bars ──
function MiniBars({ lecturas, maxVal }) {
  const barH = 150;
  const getH = (v) => (v / (maxVal || 1)) * barH * 0.92;
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: barH + 18, padding: "0 4px" }}>
      {RADS.map((r) => {
        const v = lecturas[r.id] || 0;
        return (
          <div key={r.id} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            {v > 0 && <span style={{ fontSize: 9, fontWeight: 700, color: "var(--bar-label)", marginBottom: 1 }}>{v}</span>}
            <div style={{ width: 28, height: Math.max(getH(v), 2), background: r.color, borderRadius: "3px 3px 0 0" }} />
          </div>
        );
      })}
    </div>
  );
}

// ── Year Cumulative Mini Line Chart (by month) ──
function YearMiniLineChart({ meses }) {
  if (!meses || meses.length < 2) return null;

  const W = 220, H = 160;
  const pad = { top: 16, right: 14, bottom: 18, left: 10 };
  const cw = W - pad.left - pad.right;
  const ch = H - pad.top - pad.bottom;

  const cumul = {};
  RADS.forEach((r) => { cumul[r.id] = 0; });

  const points = meses.map((m) => {
    RADS.forEach((r) => { cumul[r.id] += (m.lecturas[r.id] || 0); });
    return { label: m.mes.replace(/\s*\d{4}$/, "").substring(0, 3), values: { ...cumul } };
  });

  let maxVal = 0;
  points.forEach((p) => {
    RADS.forEach((r) => { if (p.values[r.id] > maxVal) maxVal = p.values[r.id]; });
  });
  if (maxVal === 0) return null;
  const yMax = Math.ceil(maxVal * 1.15);

  const xStep = cw / (points.length - 1);
  const getX = (i) => pad.left + i * xStep;
  const getY = (v) => pad.top + ch - (v / yMax) * ch;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "100%", display: "block" }}>
      <line x1={pad.left} y1={pad.top + ch} x2={W - pad.right} y2={pad.top + ch} strokeWidth="0.5" style={{ stroke: "var(--chart-baseline)" }} />
      {RADS.map((r) => {
        const pts = points.map((p, i) => ({ x: getX(i), y: getY(p.values[r.id]), v: p.values[r.id] }));
        if (pts.every((p) => p.v === 0)) return null;
        const linePath = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
        return (
          <g key={r.id}>
            <path d={linePath} fill="none" stroke={r.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            {pts.map((p, i) => p.v > 0 && (
              <g key={i}>
                <circle cx={p.x} cy={p.y} r="3" stroke={r.color} strokeWidth="1.5" style={{ fill: "var(--chart-dot)" }} />
                <text x={p.x} y={p.y - 5} textAnchor="middle" fontSize="7" fontWeight="700" fill={r.color}>{p.v}</text>
              </g>
            ))}
          </g>
        );
      })}
      {points.map((p, i) => (
        <text key={i} x={getX(i)} y={H - 3} textAnchor="middle" fontSize="7" fontWeight="600" style={{ fill: "var(--chart-label)" }}>{p.label}</text>
      ))}
    </svg>
  );
}

// ── Month card ──
function MesCard({ mes, maxVal, onEdit, onDelete, delCfm, setDelCfm, isDark }) {
  const [open, setOpen] = useState(false);
  const hasSubs = mes.subs?.length > 0;
  const mesTotal = RADS.reduce((s, r) => s + (mes.lecturas[r.id] || 0), 0);
  const ra = isDark ? "25" : "12";
  const rba = isDark ? "35" : "20";

  return (
    <div style={{ borderRadius: 12, border: "1px solid var(--border-default)", overflow: "hidden", background: "var(--bg-card)", transition: "background-color 0.3s, border-color 0.3s" }}>
      <div style={{ padding: "12px 12px 0", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: "var(--text-secondary)" }}>{mes.mes}</div>
          <div style={{ fontSize: 10, color: "var(--text-placeholder)" }}>{mes.fechas}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
          <div style={{ textAlign: "right", marginRight: 4 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: "var(--text-heading)" }}>{mesTotal} lect.</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-label)" }}>{eur(mesTotal * PRECIO)}</div>
          </div>
          <button style={S.actBtn} onClick={() => onEdit(mes)}>✎</button>
          {delCfm === mes.id ? (
            <>
              <button style={S.cfmY} onClick={() => onDelete(mes.id)}>Sí</button>
              <button style={S.cfmN} onClick={() => setDelCfm(null)}>No</button>
            </>
          ) : (
            <button style={S.actBtn} onClick={() => setDelCfm(mes.id)}>✕</button>
          )}
        </div>
      </div>

      <div style={{ padding: "8px 12px 12px" }}>
        <div style={{ display: "flex", alignItems: "flex-end", background: "var(--bg-elevated)", borderRadius: 8, padding: "10px 8px 6px", marginBottom: 8, gap: 0, transition: "background-color 0.3s" }}>
          <div style={{ flexShrink: 0 }}>
            <MiniBars lecturas={mes.lecturas} maxVal={maxVal} />
          </div>
          {hasSubs && mes.subs.length >= 2 && (
            <div style={{ flex: 1, minWidth: 0, height: 150, marginLeft: 6, borderLeft: "1px solid var(--border-default)", paddingLeft: 6 }}>
              <MiniLineChart subs={mes.subs} />
            </div>
          )}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {RADS.map((r) => {
            const l = mes.lecturas[r.id] || 0;
            if (!l) return null;
            const pct = mesTotal > 0 ? ((l / mesTotal) * 100).toFixed(0) : 0;
            return (
              <div key={r.id} style={{ background: `${r.color}${ra}`, borderLeft: `3px solid ${r.color}`, borderRadius: "0 6px 6px 0", padding: "5px 8px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 2 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: r.color }}>{r.apodo}</span>
                  <span style={{ fontSize: 11, color: "var(--text-label)" }}>{l}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)" }}>{eur(l * PRECIO)}</span>
                  <span style={{ fontSize: 10, color: r.color, fontWeight: 700, background: `${r.color}${rba}`, padding: "1px 5px", borderRadius: 4 }}>{pct}%</span>
                </div>
              </div>
            );
          })}
        </div>
        {hasSubs && (
          <button onClick={() => setOpen(!open)} style={{ marginTop: 8, background: "none", border: "1px solid var(--border-default)", borderRadius: 6, padding: "4px 10px", fontSize: 11, color: "var(--text-placeholder)", cursor: "pointer", fontWeight: 600, fontFamily: "inherit", display: "flex", alignItems: "center", gap: 4, width: "100%" }}>
            <span style={{ transition: "transform 0.2s", transform: open ? "rotate(90deg)" : "rotate(0)", display: "inline-block", fontSize: 10 }}>▶</span>
            {open ? "Ocultar" : "Ver"} {mes.subs.length} subperiodo{mes.subs.length > 1 ? "s" : ""}
          </button>
        )}
      </div>

      {hasSubs && open && (
        <div style={{ borderTop: "1px solid var(--border-subtle)" }}>
          {mes.subs.map((sub) => {
            const subTotal = RADS.reduce((s, r) => s + (sub.lecturas[r.id] || 0), 0);
            return (
              <div key={sub.id} style={{ padding: "8px 12px 8px 20px", borderBottom: "1px solid var(--border-subtle)", background: "var(--bg-sub)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5, flexWrap: "wrap", gap: 4 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 4, minWidth: 0 }}>
                    <span style={{ fontSize: 12, color: "var(--text-dim)" }}>↳</span>
                    <span style={{ fontWeight: 600, fontSize: 12, color: "var(--text-muted)" }}>{sub.periodo}</span>
                    <span style={{ fontSize: 9, color: "var(--text-ghost)" }}>{sub.fechas}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-label)" }}>{subTotal} · {eur(subTotal * PRECIO)}</span>
                    <button style={{ ...S.actBtn, fontSize: 10, padding: "2px 5px" }} onClick={() => onEdit(sub)}>✎</button>
                    {delCfm === sub.id ? (
                      <>
                        <button style={{ ...S.cfmY, padding: "2px 5px", fontSize: 10 }} onClick={() => onDelete(sub.id)}>Sí</button>
                        <button style={{ ...S.cfmN, padding: "2px 5px", fontSize: 10 }} onClick={() => setDelCfm(null)}>No</button>
                      </>
                    ) : (
                      <button style={{ ...S.actBtn, fontSize: 10, padding: "2px 5px" }} onClick={() => setDelCfm(sub.id)}>✕</button>
                    )}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {RADS.map((r) => {
                    const l = sub.lecturas[r.id] || 0;
                    if (!l) return null;
                    return (
                      <span key={r.id} style={{ fontSize: 10, background: `${r.color}${ra}`, borderLeft: `2px solid ${r.color}`, padding: "2px 6px", borderRadius: "0 4px 4px 0", color: "var(--text-muted)", display: "flex", gap: 3, alignItems: "center" }}>
                        <strong style={{ color: r.color }}>{r.apodo}</strong> {l} · {eur(l * PRECIO)}
                      </span>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Historical Year ──
function HistYear({ year, data, isDark }) {
  const [open, setOpen] = useState(false);
  if (!data.length) return null;
  const total = data.reduce((s, r) => s + r.lecturas, 0);
  const maxLect = data[0]?.lecturas || 1;
  const ra = isDark ? "25" : "12";
  const rba = isDark ? "35" : "20";

  return (
    <div style={{ borderRadius: 12, border: "1px solid var(--border-card)", overflow: "hidden", background: "var(--hist-bg)", marginBottom: 8, transition: "background-color 0.3s, border-color 0.3s" }}>
      <button onClick={() => setOpen(!open)} style={{ width: "100%", background: "none", border: "none", padding: "12px 12px", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", fontFamily: "inherit", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
          <span style={{ transition: "transform 0.2s", transform: open ? "rotate(90deg)" : "rotate(0)", display: "inline-block", fontSize: 10, color: "var(--text-placeholder)" }}>▶</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text-label)" }}>📁 {year}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
          <span style={{ fontSize: 9, background: "var(--badge-bg)", color: "var(--badge-color)", padding: "2px 6px", borderRadius: 10, fontWeight: 600, transition: "background-color 0.3s, color 0.3s" }}>{eur(precioParaAnio(year))}/lect.</span>
          <span style={{ fontSize: 11, color: "var(--text-placeholder)", fontWeight: 600 }}>{total.toLocaleString("es-ES")}</span>
          <span style={{ fontSize: 13, fontWeight: 800, color: "var(--text-label)" }}>{eur(total * precioParaAnio(year))}</span>
        </div>
      </button>
      {open && (
        <div style={{ borderTop: "1px solid var(--border-card)", padding: "10px 12px" }}>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 6, justifyContent: "center", marginBottom: 14, padding: "6px 0" }}>
            {data.map((r) => {
              const h = (r.lecturas / maxLect) * 110;
              return (
                <div key={r.id} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1, flex: 1, maxWidth: 60 }}>
                  <span style={{ fontSize: 9, fontWeight: 700, color: "var(--text-label)" }}>{r.lecturas.toLocaleString("es-ES")}</span>
                  <div style={{ width: "100%", height: Math.max(h, 3), background: r.color, borderRadius: "4px 4px 0 0" }} />
                  <span style={{ fontSize: 9, color: "var(--text-placeholder)", fontWeight: 600, marginTop: 2 }}>{r.apodo}</span>
                </div>
              );
            })}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {data.map((r) => {
              const pct = ((r.lecturas / total) * 100).toFixed(0);
              return (
                <div key={r.id} style={{ background: `${r.color}${ra}`, borderLeft: `3px solid ${r.color}`, borderRadius: "0 6px 6px 0", padding: "5px 8px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 2 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 5, minWidth: 0 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: r.color }}>{r.apodo}</span>
                    <span style={{ fontSize: 10, color: "var(--text-faint)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.nombre}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                    <span style={{ fontSize: 11, color: "var(--text-label)" }}>{r.lecturas.toLocaleString("es-ES")}</span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)" }}>{eur(r.lecturas * precioParaAnio(year))}</span>
                    <span style={{ fontSize: 10, color: r.color, fontWeight: 700, background: `${r.color}${rba}`, padding: "1px 5px", borderRadius: 4 }}>{pct}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Year Summary Card (bars + cumulative chart, like MesCard) ──
function YearSummaryCard({ meses, tots, totalG, isDark }) {
  if (!meses || meses.length === 0) return null;
  const maxBarVal = Math.max(...tots.map((t) => t.total), 1);
  const yearLecturas = Object.fromEntries(tots.map((t) => [t.id, t.total]));
  const hasManyMonths = meses.length >= 2;
  const ra = isDark ? "25" : "12";
  const rba = isDark ? "35" : "20";

  return (
    <div style={{ borderRadius: 12, border: "1px solid var(--border-default)", overflow: "hidden", background: "var(--bg-card)", marginBottom: 20, transition: "background-color 0.3s, border-color 0.3s" }}>
      <div style={{ padding: "12px 12px 0", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: "var(--text-secondary)" }}>2026</div>
          <div style={{ fontSize: 10, color: "var(--text-placeholder)" }}>Evolución acumulada</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: "var(--text-heading)" }}>{totalG} lect.</div>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-label)" }}>{eur(totalG * PRECIO)}</div>
        </div>
      </div>

      <div style={{ padding: "8px 12px 12px" }}>
        <div style={{ display: "flex", alignItems: "flex-end", background: "var(--bg-elevated)", borderRadius: 8, padding: "10px 8px 6px", marginBottom: 8, gap: 0, transition: "background-color 0.3s" }}>
          <div style={{ flexShrink: 0 }}>
            <MiniBars lecturas={yearLecturas} maxVal={maxBarVal} />
          </div>
          {hasManyMonths && (
            <div style={{ flex: 1, minWidth: 0, height: 150, marginLeft: 6, borderLeft: "1px solid var(--border-default)", paddingLeft: 6 }}>
              <YearMiniLineChart meses={meses} />
            </div>
          )}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {tots.map((r) => {
            if (!r.total) return null;
            const pct = totalG > 0 ? ((r.total / totalG) * 100).toFixed(0) : 0;
            return (
              <div key={r.id} style={{ background: `${r.color}${ra}`, borderLeft: `3px solid ${r.color}`, borderRadius: "0 6px 6px 0", padding: "5px 8px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 2 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: r.color }}>{r.apodo}</span>
                  <span style={{ fontSize: 11, color: "var(--text-label)" }}>{r.total}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)" }}>{eur(r.bruto)}</span>
                  <span style={{ fontSize: 10, color: r.color, fontWeight: 700, background: `${r.color}${rba}`, padding: "1px 5px", borderRadius: 4 }}>{pct}%</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Collapsible Current Year (wraps YearSummaryCard + month cards) ──
function CollapsibleCurrentYear({ meses, tots, totalG, isDark, globalMax, openForm, onDelete, delCfm, setDelCfm }) {
  const [open, setOpen] = useState(false);

  return (
    <div style={{ borderRadius: 12, border: "1px solid var(--border-card)", overflow: "hidden", background: "var(--bg-card)", marginBottom: 8, transition: "background-color 0.3s, border-color 0.3s" }}>
      <button onClick={() => setOpen(!open)} style={{ width: "100%", background: "none", border: "none", padding: "12px 12px", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", fontFamily: "inherit", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
          <span style={{ transition: "transform 0.2s", transform: open ? "rotate(90deg)" : "rotate(0)", display: "inline-block", fontSize: 10, color: "var(--text-placeholder)" }}>▶</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text-label)" }}>📁 2026</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
          <span style={{ fontSize: 9, background: "var(--badge-bg)", color: "var(--badge-color)", padding: "2px 6px", borderRadius: 10, fontWeight: 600, transition: "background-color 0.3s, color 0.3s" }}>{eur(PRECIO)}/lect.</span>
          <span style={{ fontSize: 11, color: "var(--text-placeholder)", fontWeight: 600 }}>{totalG.toLocaleString("es-ES")}</span>
          <span style={{ fontSize: 13, fontWeight: 800, color: "var(--text-label)" }}>{eur(totalG * PRECIO)}</span>
        </div>
      </button>
      {open && (
        <div style={{ borderTop: "1px solid var(--border-card)", padding: "10px 12px" }}>
          <YearSummaryCard meses={meses} tots={tots} totalG={totalG} isDark={isDark} />
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: "1px" }}>Registros mensuales</span>
              <button style={{ background: "#c4956a", color: "#fff", border: "none", borderRadius: 7, padding: "6px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer" }} onClick={() => openForm()}>+ Añadir</button>
            </div>
            {meses.length === 0 ? (
              <div style={{ textAlign: "center", padding: "30px 16px", background: "var(--bg-card)", borderRadius: 10, border: "1px dashed var(--border-strong)" }}><p style={{ color: "var(--text-placeholder)", fontSize: 13, margin: 0 }}>Sin registros.</p></div>
            ) : (
              <div className="month-grid">
                {meses.map((mes) => (
                  <MesCard key={mes.id} mes={mes} maxVal={globalMax} onEdit={openForm} onDelete={onDelete} delCfm={delCfm} setDelCfm={setDelCfm} isDark={isDark} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── AI Expandable Field ──
function AiField() {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const fileRef = useRef(null);

  const handleImage = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setImage(ev.target.result);
      setImagePreview(URL.createObjectURL(file));
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImage(null);
    setImagePreview(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handlePaste = useCallback((e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type.startsWith("image/")) {
        e.preventDefault();
        const file = item.getAsFile();
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
          setImage(ev.target.result);
          setImagePreview(URL.createObjectURL(file));
        };
        reader.readAsDataURL(file);
        return;
      }
    }
  }, []);

  const analyze = async () => {
    if (!text.trim() && !image) return;
    setLoading(true);
    setResult("");
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text.trim() || null, image: image || null }),
      });
      const data = await res.json();
      if (res.ok) setResult(data.result);
      else setResult("Error: " + (data.error || "Error desconocido"));
    } catch (err) {
      setResult("Error de conexión: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const clear = () => {
    setText("");
    removeImage();
    setResult("");
  };

  return (
    <div style={{ marginBottom: 14 }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: "100%",
          background: "linear-gradient(135deg, #667eea, #764ba2)",
          border: "none",
          borderRadius: open ? "10px 10px 0 0" : 10,
          padding: "10px 14px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          cursor: "pointer",
          transition: "border-radius 0.2s",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 16 }}>🤖</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: "#fff", letterSpacing: "0.5px" }}>
            Asistente IA
          </span>
          <span style={{ fontSize: 9, color: "rgba(255,255,255,0.6)", fontWeight: 500 }}>
            Sonnet 4.6
          </span>
        </div>
        <span style={{
          color: "rgba(255,255,255,0.8)",
          fontSize: 10,
          transition: "transform 0.2s",
          transform: open ? "rotate(180deg)" : "rotate(0)",
          display: "inline-block",
        }}>▼</span>
      </button>

      {open && (
        <div style={{
          border: "1px solid var(--ai-border)",
          borderTop: "none",
          borderRadius: "0 0 10px 10px",
          background: "var(--bg-card)",
          padding: 14,
          transition: "background-color 0.3s, border-color 0.3s",
        }}>
          <textarea
            placeholder="Pega aquí texto o imagen con datos de mamografías, totales, pendientes..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            onPaste={handlePaste}
            style={{
              width: "100%",
              minHeight: 70,
              padding: "8px 10px",
              border: "1px solid var(--ai-border)",
              borderRadius: 8,
              fontSize: 13,
              fontFamily: "inherit",
              resize: "vertical",
              outline: "none",
              boxSizing: "border-box",
              color: "var(--text-secondary)",
              background: "var(--bg-input)",
              transition: "background-color 0.3s, border-color 0.3s, color 0.3s",
            }}
          />

          {/* Image upload */}
          <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <label style={{
              fontSize: 11,
              color: "var(--ai-color)",
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 4,
              padding: "4px 10px",
              border: "1px dashed var(--ai-attach-border)",
              borderRadius: 6,
              background: "var(--ai-attach-bg)",
              transition: "background-color 0.3s, border-color 0.3s",
            }}>
              📷 Adjuntar imagen
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                onChange={handleImage}
                style={{ display: "none" }}
              />
            </label>
            {imagePreview && (
              <div style={{ position: "relative", display: "inline-block" }}>
                <img
                  src={imagePreview}
                  alt="preview"
                  style={{ height: 40, borderRadius: 4, border: "1px solid var(--ai-border)" }}
                />
                <button
                  onClick={removeImage}
                  style={{
                    position: "absolute",
                    top: -6,
                    right: -6,
                    width: 16,
                    height: 16,
                    borderRadius: "50%",
                    background: "#e74c3c",
                    color: "#fff",
                    border: "none",
                    fontSize: 9,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    lineHeight: 1,
                  }}
                >✕</button>
              </div>
            )}
          </div>

          {/* Actions */}
          <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
            <button
              onClick={analyze}
              disabled={loading || (!text.trim() && !image)}
              style={{
                flex: 1,
                padding: "8px 12px",
                border: "none",
                borderRadius: 7,
                background: loading || (!text.trim() && !image) ? "var(--text-ghost)" : "linear-gradient(135deg, #667eea, #764ba2)",
                color: "#fff",
                fontSize: 12,
                fontWeight: 700,
                cursor: loading || (!text.trim() && !image) ? "default" : "pointer",
                fontFamily: "inherit",
              }}
            >
              {loading ? "Analizando…" : "Analizar con IA"}
            </button>
            {(text || image || result) && (
              <button
                onClick={clear}
                style={{
                  padding: "8px 12px",
                  border: "1px solid var(--border-strong)",
                  borderRadius: 7,
                  background: "var(--bg-card)",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  color: "var(--text-label)",
                  fontFamily: "inherit",
                  transition: "background-color 0.3s, border-color 0.3s",
                }}
              >Limpiar</button>
            )}
          </div>

          {/* Result */}
          {result && (
            <div style={{
              marginTop: 12,
              background: "var(--ai-bg)",
              border: "1px solid var(--ai-border)",
              borderRadius: 8,
              padding: "10px 12px",
              transition: "background-color 0.3s, border-color 0.3s",
            }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "var(--ai-color)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Resultado del análisis
              </div>
              <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5, whiteSpace: "pre-wrap" }}>
                {result}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main App ──
export default function Home() {
  const [regs, setRegs] = useState([]);
  const [hist, setHist] = useState([]);
  const [appSt, setAppSt] = useState({ pendientes: 0 });
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ mes: "", tipo: "mes", periodo: "", fechas: "", lecturas: {} });
  const [editId, setEditId] = useState(null);
  const [delCfm, setDelCfm] = useState(null);
  const [status, setStatus] = useState("");
  const [editPend, setEditPend] = useState(false);
  const [pendIn, setPendIn] = useState("");

  // ── Theme management ──
  const [themePreference, setThemePreference] = useState("auto");
  const [resolvedTheme, setResolvedTheme] = useState("light");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("pdp-theme") || "auto";
      setThemePreference(saved);
    } catch (e) {}
  }, []);

  useEffect(() => {
    const resolve = () => {
      if (themePreference === "auto") {
        return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
      }
      return themePreference;
    };

    const resolved = resolve();
    setResolvedTheme(resolved);
    document.documentElement.setAttribute("data-theme", resolved);
    try { localStorage.setItem("pdp-theme", themePreference); } catch (e) {}

    if (themePreference === "auto") {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      const handler = () => {
        const r = mq.matches ? "dark" : "light";
        setResolvedTheme(r);
        document.documentElement.setAttribute("data-theme", r);
      };
      mq.addEventListener("change", handler);
      return () => mq.removeEventListener("change", handler);
    }
  }, [themePreference]);

  const isDark = resolvedTheme === "dark";

  // Load data from Supabase (ensure 2024 seed first)
  useEffect(() => {
    (async () => {
      await ensureHistorico2024();
      const [r, c, h] = await Promise.all([fetchRegistros(), fetchConfig(), fetchHistorico()]);
      setRegs(r);
      setAppSt(c);
      setHist(h);
      setLoading(false);
    })();
  }, []);

  const flash = (msg) => { setStatus(msg); setTimeout(() => setStatus(""), 2000); };

  const updPend = async (val) => {
    const n = Math.max(0, parseInt(val) || 0);
    const ns = { ...appSt, pendientes: n };
    setAppSt(ns);
    setEditPend(false);
    const ok = await updateConfig(ns);
    flash(ok ? "✓ Actualizado" : "⚠ Error");
  };

  const openForm = (reg = null) => {
    if (reg) {
      setForm({ mes: reg.mes, tipo: reg.tipo, periodo: reg.periodo || "", fechas: reg.fechas || "", lecturas: { ...reg.lecturas } });
      setEditId(reg.id);
    } else {
      setForm({ mes: "", tipo: "mes", periodo: "", fechas: "", lecturas: RADS.reduce((a, r) => ({ ...a, [r.id]: "" }), {}) });
      setEditId(null);
    }
    setShowForm(true);
  };

  const saveReg = async () => {
    if (!form.mes.trim()) return;
    const entry = {
      id: editId || Date.now().toString(),
      mes: form.mes.trim(),
      tipo: form.tipo,
      periodo: form.tipo === "sub" ? form.periodo.trim() : "",
      fechas: form.fechas.trim(),
      lecturas: Object.fromEntries(Object.entries(form.lecturas).map(([k, v]) => [k, parseInt(v) || 0])),
      ts: new Date().toISOString(),
    };
    const ok = await upsertRegistro(entry);
    if (ok) {
      if (editId) setRegs(regs.map((r) => (r.id === editId ? entry : r)));
      else setRegs([...regs, entry]);
      flash("✓ Guardado");
    } else flash("⚠ Error al guardar");
    setShowForm(false);
    setEditId(null);
  };

  const delReg = async (id) => {
    const ok = await deleteRegistro(id);
    if (ok) { setRegs(regs.filter((r) => r.id !== id)); flash("✓ Eliminado"); }
    else flash("⚠ Error");
    setDelCfm(null);
  };

  const meses = useMemo(() => {
    const mm = {}; const ord = [];
    regs.filter((r) => r.tipo === "mes").forEach((r) => { mm[r.mes] = { ...r, subs: [] }; ord.push(r.mes); });
    regs.filter((r) => r.tipo === "sub").forEach((r) => { if (mm[r.mes]) mm[r.mes].subs.push(r); });
    Object.values(mm).forEach((m) => m.subs.sort((a, b) => (a.ts || "").localeCompare(b.ts || "")));
    return ord.map((m) => mm[m]);
  }, [regs]);

  const globalMax = useMemo(() => {
    let m = 0;
    regs.forEach((r) => { RADS.forEach((rad) => { if ((r.lecturas?.[rad.id] || 0) > m) m = r.lecturas[rad.id]; }); });
    return m || 1;
  }, [regs]);

  const fullRegs = regs.filter((r) => r.tipo === "mes");
  const tots = RADS.map((rad) => { const t = fullRegs.reduce((s, reg) => s + (reg.lecturas?.[rad.id] || 0), 0); return { ...rad, total: t, bruto: t * PRECIO }; });
  const totalG = tots.reduce((s, r) => s + r.total, 0);

  const histByYear = useMemo(() => {
    const years = {};
    hist.forEach((r) => {
      if (!years[r.anio]) years[r.anio] = [];
      years[r.anio].push(r);
    });
    return Object.entries(years)
      .sort(([a], [b]) => Number(b) - Number(a))
      .map(([year, data]) => ({ year: Number(year), data: data.sort((a, b) => b.lecturas - a.lecturas) }));
  }, [hist]);

  const lastEdit = useMemo(() => {
    if (!regs.length) return null;
    const latest = regs.reduce((max, r) => (r.ts && r.ts > (max || "")) ? r.ts : max, null);
    if (!latest) return null;
    const d = new Date(latest);
    return d.toLocaleString("es-ES", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  }, [regs]);

  // ── Pending section colors ──
  const pendingColors = isDark
    ? {
        ok: { bg: "linear-gradient(135deg, #0a1a0a, #0a180a)", border: "#1a3a1a" },
        warn: { bg: "linear-gradient(135deg, #1a1800, #1a1500)", border: "#3a3000" },
        alert: { bg: "linear-gradient(135deg, #1a0808, #1a0a0a)", border: "#3a1515" },
      }
    : {
        ok: { bg: "linear-gradient(135deg, #e8f5e9, #f1f8e9)", border: "#c8e6c9" },
        warn: { bg: "linear-gradient(135deg, #fff8e1, #fff3e0)", border: "#ffe0b2" },
        alert: { bg: "linear-gradient(135deg, #fce4ec, #ffebee)", border: "#ffcdd2" },
      };

  const pendStyle = appSt.pendientes === 0 ? pendingColors.ok : appSt.pendientes <= 10 ? pendingColors.warn : pendingColors.alert;

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "var(--bg-page)" }}>
      <p style={{ color: "var(--text-faint)", fontSize: 14 }}>Cargando…</p>
    </div>
  );

  return (
    <div className="app-container" style={S.container}>
      {/* LAST UPDATE TIMESTAMP */}
      {lastEdit && (
        <p style={{ fontSize: 10, color: "var(--text-ghost)", margin: "0 0 6px", textAlign: "center", letterSpacing: "0.3px" }}>
          Última actualización: {lastEdit}
        </p>
      )}

      {/* AI FIELD */}
      <AiField />

      {/* HEADER */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 14 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0, letterSpacing: "-0.5px", color: "var(--text-primary)" }}>PDP Tracker</h1>
          <p style={{ fontSize: 11, color: "var(--text-label)", margin: "3px 0 0", letterSpacing: "0.5px", textTransform: "uppercase" }}>Control de lecturas · Dr. Espinosa</p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
          <ThemeSwitcher themePreference={themePreference} setThemePreference={setThemePreference} />
          {status && <span style={S.statusBadge}>{status}</span>}
          <span style={{ fontSize: 11, background: "var(--badge-bg)", color: "var(--badge-color)", padding: "3px 8px", borderRadius: 16, fontWeight: 600, transition: "background-color 0.3s, color 0.3s" }}>{eur(PRECIO)}/lect.</span>
        </div>
      </div>

      {/* PENDING */}
      <div style={{
        background: pendStyle.bg,
        borderRadius: 10, padding: "10px 12px", marginBottom: 14, display: "flex", justifyContent: "space-between", alignItems: "center",
        border: `1px solid ${pendStyle.border}`,
        transition: "background 0.3s, border-color 0.3s",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 16 }}>{appSt.pendientes === 0 ? "✅" : appSt.pendientes <= 10 ? "📋" : "🔥"}</span>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-secondary)" }}>Pendientes</div>
            {editPend ? (
              <div style={{ display: "flex", gap: 4, marginTop: 2, alignItems: "center" }}>
                <input style={{ width: 50, padding: "2px 5px", border: "1px solid var(--border-strong)", borderRadius: 4, fontSize: 12, fontFamily: "inherit", outline: "none", background: "var(--bg-input)", color: "var(--text-primary)" }}
                  type="number" min="0" autoFocus value={pendIn} onChange={(e) => setPendIn(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") updPend(pendIn); if (e.key === "Escape") setEditPend(false); }} />
                <button style={{ padding: "2px 6px", borderRadius: 4, border: "none", background: "var(--btn-primary-bg)", color: "var(--btn-primary-color)", fontSize: 10, fontWeight: 600, cursor: "pointer" }} onClick={() => updPend(pendIn)}>OK</button>
              </div>
            ) : (
              <div style={{ fontSize: 10, color: "var(--text-muted)" }}>{appSt.pendientes === 0 ? "Bandeja a cero 🧘" : `${appSt.pendientes} en cola`}</div>
            )}
          </div>
        </div>
        {!editPend && (
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 22, fontWeight: 800, color: appSt.pendientes === 0 ? "#4caf50" : appSt.pendientes <= 10 ? "#ff9800" : "#e53935" }}>{appSt.pendientes}</span>
            <button style={{ padding: "3px 6px", borderRadius: 4, border: "1px solid var(--border-strong)", background: "var(--bg-card)", fontSize: 9, cursor: "pointer", color: "var(--text-label)", fontWeight: 600, transition: "background-color 0.3s, border-color 0.3s" }}
              onClick={() => { setPendIn(String(appSt.pendientes)); setEditPend(true); }}>Editar</button>
          </div>
        )}
      </div>

      {/* ALL YEARS – collapsed by default */}
      <div style={{ marginBottom: 20 }}>
        <CollapsibleCurrentYear meses={meses} tots={tots} totalG={totalG} isDark={isDark} globalMax={globalMax} openForm={openForm} onDelete={delReg} delCfm={delCfm} setDelCfm={setDelCfm} />
        {histByYear.map(({ year, data }) => (
          <HistYear key={year} year={year} data={data} isDark={isDark} />
        ))}
      </div>

      {/* Legend */}
      <div style={{ display: "flex", gap: 10, justifyContent: "center", marginBottom: 14, flexWrap: "wrap" }}>
        {RADS.map((r) => (
          <span key={r.id} style={{ fontSize: 10, display: "flex", alignItems: "center", gap: 3, color: "var(--text-faint)" }}>
            <span style={{ width: 7, height: 7, borderRadius: 2, background: r.color, display: "inline-block" }} />{r.apodo}
          </span>
        ))}
      </div>

      {/* MODAL */}
      {showForm && (
        <div style={S.overlay} onClick={() => setShowForm(false)}>
          <div style={{ ...S.modal, padding: 16 }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 16px", color: "var(--text-primary)" }}>{editId ? "Editar" : "Nuevo registro"}</h3>
            <div style={S.fg}>
              <label style={S.lbl}>Tipo</label>
              <div style={{ display: "flex", gap: 6 }}>
                {[["mes", "Mes"], ["sub", "Subperiodo"]].map(([v, l]) => (
                  <button key={v} onClick={() => setForm({ ...form, tipo: v })}
                    style={{ flex: 1, padding: 7, borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: "pointer", border: form.tipo === v ? "2px solid var(--btn-primary-bg)" : "1px solid var(--border-strong)", background: form.tipo === v ? "var(--btn-primary-bg)" : "var(--bg-card)", color: form.tipo === v ? "var(--btn-primary-color)" : "var(--text-label)", fontFamily: "inherit", transition: "background-color 0.2s, border-color 0.2s, color 0.2s" }}>{l}</button>
                ))}
              </div>
            </div>
            <div style={S.fg}>
              <label style={S.lbl}>Mes</label>
              <input style={S.inp} placeholder="Ej: Marzo 2026" value={form.mes} onChange={(e) => setForm({ ...form, mes: e.target.value })} />
            </div>
            {form.tipo === "sub" && (
              <div style={S.fg}>
                <label style={S.lbl}>Subperiodo</label>
                <input style={S.inp} placeholder="Ej: 16–20 Feb" value={form.periodo} onChange={(e) => setForm({ ...form, periodo: e.target.value })} />
              </div>
            )}
            <div style={S.fg}>
              <label style={S.lbl}>Fechas</label>
              <input style={S.inp} placeholder="Ej: 01/02–28/02" value={form.fechas} onChange={(e) => setForm({ ...form, fechas: e.target.value })} />
            </div>
            {RADS.map((rad) => (
              <div key={rad.id} style={S.fg}>
                <label style={{ ...S.lbl, display: "flex", alignItems: "center", gap: 5 }}>
                  <span style={{ width: 7, height: 7, borderRadius: "50%", background: rad.color, display: "inline-block" }} />{rad.apodo}
                </label>
                <div style={{ position: "relative" }}>
                  <input style={S.inp} type="number" min="0" placeholder="Nº lecturas" value={form.lecturas[rad.id] || ""}
                    onChange={(e) => setForm({ ...form, lecturas: { ...form.lecturas, [rad.id]: e.target.value } })} />
                  {parseInt(form.lecturas[rad.id]) > 0 && <span style={{ position: "absolute", right: 10, top: 9, fontSize: 11, color: "#c4956a", fontWeight: 600 }}>→ {eur(parseInt(form.lecturas[rad.id]) * PRECIO)}</span>}
                </div>
              </div>
            ))}
            <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
              <button style={S.canBtn} onClick={() => setShowForm(false)}>Cancelar</button>
              <button style={S.savBtn} onClick={saveReg}>{editId ? "Actualizar" : "Guardar"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const S = {
  container: { fontFamily: "'DM Sans','Nunito','Helvetica Neue',sans-serif", padding: "16px 12px 36px", background: "var(--bg-page)", minHeight: "100vh", color: "var(--text-primary)", boxSizing: "border-box", transition: "background-color 0.3s, color 0.3s" },
  statusBadge: { fontSize: 11, color: "var(--status-color)", fontWeight: 600, padding: "2px 6px", background: "var(--status-bg)", borderRadius: 10 },
  secTitle: { fontSize: 12, fontWeight: 700, color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: "1px", margin: 0 },
  addBtn: { background: "#c4956a", color: "#fff", border: "none", borderRadius: 7, padding: "6px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer" },
  empty: { textAlign: "center", padding: "30px 16px", background: "var(--bg-card)", borderRadius: 10, border: "1px dashed var(--border-strong)" },
  actBtn: { background: "none", border: "1px solid var(--border-default)", borderRadius: 4, padding: "3px 7px", cursor: "pointer", fontSize: 12, color: "var(--text-placeholder)" },
  cfmY: { background: "#e74c3c", color: "#fff", border: "none", borderRadius: 4, padding: "3px 7px", fontSize: 10, fontWeight: 600, cursor: "pointer" },
  cfmN: { background: "var(--border-default)", color: "var(--text-muted)", border: "none", borderRadius: 4, padding: "3px 7px", fontSize: 10, cursor: "pointer" },
  overlay: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "var(--overlay)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 12 },
  modal: { background: "var(--bg-card)", borderRadius: 14, padding: 20, width: "100%", maxWidth: 400, maxHeight: "90vh", overflowY: "auto", boxSizing: "border-box" },
  fg: { marginBottom: 12 },
  lbl: { display: "block", fontSize: 11, fontWeight: 600, color: "var(--text-label)", marginBottom: 3, textTransform: "uppercase", letterSpacing: "0.5px" },
  inp: { width: "100%", padding: "8px 10px", border: "1px solid var(--border-strong)", borderRadius: 7, fontSize: 14, outline: "none", boxSizing: "border-box", fontFamily: "inherit", background: "var(--bg-input)", color: "var(--text-primary)", transition: "background-color 0.3s, border-color 0.3s, color 0.3s" },
  canBtn: { flex: 1, padding: 9, border: "1px solid var(--border-strong)", borderRadius: 7, background: "var(--bg-card)", fontSize: 13, fontWeight: 600, cursor: "pointer", color: "var(--text-muted)", fontFamily: "inherit", transition: "background-color 0.3s, border-color 0.3s" },
  savBtn: { flex: 1, padding: 9, border: "none", borderRadius: 7, background: "var(--btn-primary-bg)", color: "var(--btn-primary-color)", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", transition: "background-color 0.3s, color 0.3s" },
};
