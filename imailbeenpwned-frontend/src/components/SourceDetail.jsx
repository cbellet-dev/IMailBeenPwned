import { useState } from "react";
import { SOURCE_META } from "../utils/constants";
import { StatusBadge } from "./StatusBadge";
import { DataRow } from "./DataRow";
import { Tag } from "./Tag";

export function SourceDetail({ source, onShowDetail }) {
  const [open, setOpen] = useState(false);
  const m = SOURCE_META[source.id];
  if (!m) return null;
  
  return (
    <div style={{ border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-lg)", overflow: "hidden" }}>
      <div onClick={() => setOpen(o => !o)}
        style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", cursor: "pointer", background: "var(--color-background-primary)", userSelect: "none" }}>
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: m.dot, flexShrink: 0 }} />
        <span style={{ fontWeight: 500, fontSize: 14, flex: 1 }}>{source.name}</span>
        <StatusBadge status={source.status} />
        <span style={{ fontSize: 12, color: "var(--color-text-tertiary)", marginLeft: 2 }}>{open ? "▲" : "▼"}</span>
      </div>

      {open && (
        <div style={{ padding: "12px 16px 16px", background: "var(--color-background-secondary)", borderTop: "0.5px solid var(--color-border-tertiary)" }}>
          <p style={{ fontSize: 12, color: "var(--color-text-tertiary)", margin: "0 0 14px", fontStyle: "italic" }}>{source.meta}</p>

          <div style={{ marginBottom: "12px" }}>
            {source.id === "github" && source.githubProfile && (
              <div style={{ background: "var(--color-background-primary)", borderRadius: "var(--border-radius-md)", padding: "12px", border: "0.5px solid var(--color-border-tertiary)", display: "flex", gap: 15, alignItems: "center" }}>
                <img src={source.githubProfile.avatar_url} style={{ width: 50, height: 50, borderRadius: "50%" }} alt="Avatar" />
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 600, fontSize: 14, margin: 0 }}>{source.githubProfile.login}</p>
                  <p style={{ fontSize: 11, color: "var(--color-text-tertiary)", margin: 0 }}>{source.githubProfile.name || "Sin nombre"}</p>
                </div>
                <button onClick={() => onShowDetail(source)} style={{ fontSize: 11, padding: "4px 8px" }}>Ver Informe ↗</button>
              </div>
            )}

            {source.id === "social" && source.platforms?.length > 0 && (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {source.platforms.map(p => {
                   const isHit = p.includes("(via Name)") || source.status === "hit";
                   return <Tag key={p} text={p} success={isHit} />;
                })}
              </div>
            )}

            {source.id === "leakcheck" && source.status === "hit" && (
              <button onClick={() => onShowDetail(source)} style={{ fontSize: 11, padding: "6px 12px", width: "100%" }}>Analizar Filtraciones en Detalle ↗</button>
            )}
          </div>

          <div style={{ opacity: source.id === "github" || (source.id === "leakcheck" && source.status === "hit") ? 0.3 : 1 }}>
            {source.id === "leakcheck" && source.breaches?.length > 0 && (
               <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {source.breaches.map((b, i) => (
                    <DataRow key={i} label="Base de datos" value={b.name} bad />
                  ))}
               </div>
            )}

            {source.id === "domain" && source.domainInfo && (
               <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <DataRow label="Desechable" value={source.domainInfo.disposable ? "Sí" : "No"} bad={source.domainInfo.disposable} />
                  <DataRow label="Registros MX" value={source.domainInfo.mx ? "Detectados" : "No detectados"} good={!!source.domainInfo.mx} />
                  <DataRow label="SPF" value={source.domainInfo.spf ? "Configurado" : "Ausente"} good={!!source.domainInfo.spf} bad={!source.domainInfo.spf} />
                  <DataRow label="DMARC" value={source.domainInfo.dmarc ? "Configurado" : "Ausente"} good={!!source.domainInfo.dmarc} bad={!source.domainInfo.dmarc} />
               </div>
            )}

            {source.reputation && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <DataRow label="Reputación" value={{
                  "high": "Alta", "medium": "Media", "low": "Baja", "none": "Sin datos"
                }[source.reputation.score] ?? "Sin datos"} />
                <DataRow label="Sospechoso" value={source.reputation.suspicious ? "Sí" : "No"} bad={source.reputation.suspicious} />
                <DataRow label="Blacklisted" value={source.reputation.blacklisted ? "Sí" : "No"} bad={source.reputation.blacklisted} />
              </div>
            )}
          </div>

          {source.status === "clean" && (source.breaches?.length === 0 || !source.breaches) && (
            <p style={{ fontSize: 13, color: "var(--color-text-success)", margin: 0 }}>Sin coincidencias.</p>
          )}
        </div>
      )}
    </div>
  );
}
