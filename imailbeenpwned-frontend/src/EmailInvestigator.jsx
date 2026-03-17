import { useState, useEffect } from "react";
import { callApi } from "./api/client";
import { STEPS, SOURCE_META, riskLabel } from "./utils/constants";
import { Card } from "./components/Card";
import { SectionLabel } from "./components/SectionLabel";
import { Tag } from "./components/Tag";
import { SourcePill } from "./components/SourcePill";
import { DataRow } from "./components/DataRow";
import { SourceDetail } from "./components/SourceDetail";
import { Modal } from "./components/Modal";
import { RiskMeter } from "./components/RiskMeter";

export default function IMailBeenPwned() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");
  const [detailModal, setDetailModal] = useState({ open: false, source: null });

  const investigate = async () => {
    if (!email.includes("@") || !email.includes(".")) { setError("Introduce un email válido"); return; }
    setError(""); setLoading(true); setData(null); setStep(0);
    const iv = setInterval(() => setStep(s => Math.min(s + 1, STEPS.length - 1)), 600);
    const result = await callApi(email);
    clearInterval(iv);
    setLoading(false);
    setData(result);
  };

  const generateReport = () => {
    if (!data) return "";
    let report = `REPORTE DE INTELIGENCIA OSINT - IMailBeenPwned\n`;
    report += `==========================================\n`;
    report += `Objetivo: ${data.email}\n`;
    report += `Riesgo Global: ${data.globalRiskScore}/100 [${riskLabel(data.globalRiskScore)}]\n`;
    report += `Fecha: ${new Date().toLocaleString()}\n\n`;

    if (data.aiAssessment) {
      report += `Veredicto IA:\n${data.aiAssessment}\n\n`;
    }
    
    report += `RESUMEN DE COINCIDENCIAS:\n`;
    report += `------------------------\n`;
    data.sources.forEach(s => {
      report += `- ${s.name}: ${s.status === "hit" ? "[COINCIDENCIA]" : "[LIMPIO]"}\n`;
    });
    
    if (data.summary.totalBreaches > 0) {
      report += `\nFILTRACIONES DETECTADAS: ${data.summary.totalBreaches}\n`;
    }
    
    const github = data.sources.find(s => s.id === "github")?.githubProfile;
    if (github) {
      report += `\nPERFIL GITHUB ENCONTRADO:\n`;
      report += `- Usuario: ${github.login}\n`;
      report += `- Nombre: ${github.name || "N/A"}\n`;
      report += `- Ubicación: ${github.location || "N/A"}\n`;
      report += `- Repositorios: ${github.public_repos}\n`;
    }

    report += `\n==========================================\n`;
    report += `Generado por IMailBeenPwned - OSINT Tool\n`;
    return report;
  };

  const handleExportReport = () => {
    const reportText = generateReport();
    const blob = new Blob([reportText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `reporte_osint_${data.email.replace("@", "_")}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ padding: "1.5rem 0", fontFamily: "var(--font-sans)" }}>

      <div style={{ marginBottom: "2rem" }}>
        <p style={{ fontSize: 11, color: "var(--color-text-tertiary)", margin: "0 0 4px", fontFamily: "var(--font-mono)", letterSpacing: 1 }}>OSINT / EMAIL INTELLIGENCE · 100% FREE & OPEN SOURCE</p>
        <h1 style={{ fontSize: 24, fontWeight: 600, margin: "0 0 6px" }}>IMailBeenPwned</h1>
        <p style={{ fontSize: 14, color: "var(--color-text-secondary)", margin: 0 }}>Investigación anónima de emails sin APIs de pago.</p>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 6 }}>
        <input type="email" placeholder="objetivo@dominio.com" value={email}
          onChange={e => { setEmail(e.target.value); setError(""); }}
          onKeyDown={e => e.key === "Enter" && investigate()}
          style={{ flex: 1, fontFamily: "var(--font-mono)", fontSize: 14 }} disabled={loading} />
        <button onClick={investigate} disabled={loading || !email} style={{ padding: "0 20px", fontFamily: "var(--font-mono)", fontSize: 13 }}>
          {loading ? "..." : "Investigar ↗"}
        </button>
      </div>

      {error && <p style={{ fontSize: 13, color: "var(--color-text-danger)", margin: "4px 0 0" }}>{error}</p>}

      <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
        {Object.keys(SOURCE_META).map(id => <SourcePill key={id} id={id} />)}
      </div>

      {loading && (
        <Card style={{ marginTop: "1.5rem" }}>
          {STEPS.map((s, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, opacity: i <= step ? 1 : 0.25, transition: "opacity 0.35s" }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: i < step ? "var(--color-text-success)" : "var(--color-text-primary)", minWidth: 10 }}>
                {i < step ? "✓" : i === step ? "›" : "·"}
              </span>
              <span style={{ fontSize: 13, color: i < step ? "var(--color-text-secondary)" : "var(--color-text-primary)" }}>{s.label}</span>
              {s.source && i <= step && <SourcePill id={s.source} />}
            </div>
          ))}
        </Card>
      )}

      {data && (
        <div style={{ marginTop: "1.5rem", display: "flex", flexDirection: "column", gap: "1.25rem" }}>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "1rem" }}>
            <Card style={{ textAlign: "center" }}>
              <SectionLabel>Riesgo</SectionLabel>
              <RiskMeter score={data.globalRiskScore} />
            </Card>
            <Card>
              <SectionLabel>Resumen</SectionLabel>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <DataRow label="Email" value={data.email} />
                <DataRow label="Coincidencias" value={`${data.summary.sourcesWithHits} / ${data.summary.totalSources}`} bad={data.summary.sourcesWithHits >= 3} />
                <DataRow label="Fugas encontradas" value={data.summary.totalBreaches} bad={data.summary.totalBreaches > 0} />
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 4 }}>
                   {data.summary.totalBreaches > 0 && <Tag text="posible contraseña expuesta" danger />}
                   {data.summary.sourcesWithHits > 1 && <Tag text="presencia social detectada" />}
                </div>
              </div>
            </Card>
          </div>
          
          {data.aiAssessment && (
            <Card style={{ 
              background: "linear-gradient(135deg, rgba(127, 119, 221, 0.1), rgba(239, 159, 39, 0.05))", 
              borderColor: "rgba(127, 119, 221, 0.3)", 
              position: "relative" 
            }}>
              <div style={{ position: "absolute", top: -10, left: 20, background: "#7F77DD", color: "white", padding: "2px 10px", borderRadius: 12, fontSize: 10, fontWeight: "bold", letterSpacing: 1 }}>
                ✨ AI INSIGHT
              </div>
              <p style={{ margin: "10px 0 0 0", fontSize: 13, lineHeight: 1.6, color: "var(--color-text-primary)", fontStyle: "italic" }}>
                "{data.aiAssessment}"
              </p>
            </Card>
          )}

          <div>
             <SectionLabel>Detalle de fuentes</SectionLabel>
             <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {data.sources.map(s => <SourceDetail key={s.id} source={s} onShowDetail={(src) => setDetailModal({ open: true, source: src })} />)}
             </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
             <button onClick={handleExportReport} style={{ 
               fontSize: "12px", background: "var(--color-text-primary)", 
               color: "var(--color-background-primary)", padding: "10px 20px" 
             }}>Exportar Informe Detallado (TXT) ↗</button>
          </div>
        </div>
      )}

      <Modal 
        isOpen={detailModal.open} 
        onClose={() => setDetailModal({ open: false, source: null })}
        title={detailModal.source?.id === "github" ? "GitHub Intelligence Report" : "Análisis de Filtraciones"}
      >
        {detailModal.source?.id === "github" && detailModal.source.githubProfile && (
           <div>
              <div style={{ display: "flex", gap: 20, marginBottom: 20 }}>
                 <img src={detailModal.source.githubProfile.avatar_url} style={{ width: 80, height: 80, borderRadius: "var(--border-radius-md)" }} alt="Profile" />
                 <div>
                    <h3 style={{ margin: "0 0 5px" }}>{detailModal.source.githubProfile.name || detailModal.source.githubProfile.login}</h3>
                    <p style={{ color: "var(--color-text-secondary)", fontSize: 13, margin: 0 }}>@{detailModal.source.githubProfile.login}</p>
                    <p style={{ color: "var(--color-text-tertiary)", fontSize: 12, margin: "5px 0" }}>{detailModal.source.githubProfile.location || "Ubicación desconocida"}</p>
                 </div>
              </div>
              <Card style={{ marginBottom: 15, background: "var(--color-background-secondary)" }}>
                 <p style={{ fontSize: 13, fontStyle: "italic", margin: 0 }}>{detailModal.source.githubProfile.bio || "No bio available"}</p>
              </Card>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
                 <Card style={{ textAlign: "center" }}>
                    <SectionLabel>Repositorios</SectionLabel>
                    <span style={{ fontSize: 20, fontWeight: 500 }}>{detailModal.source.githubProfile.public_repos}</span>
                 </Card>
                 <Card style={{ textAlign: "center" }}>
                    <SectionLabel>Gists</SectionLabel>
                    <span style={{ fontSize: 20, fontWeight: 500 }}>{detailModal.source.githubProfile.public_gists}</span>
                 </Card>
                 <Card style={{ textAlign: "center" }}>
                    <SectionLabel>Seguidores</SectionLabel>
                    <span style={{ fontSize: 20, fontWeight: 500 }}>{detailModal.source.githubProfile.followers}</span>
                 </Card>
                 <Card style={{ textAlign: "center" }}>
                    <SectionLabel>Siguiendo</SectionLabel>
                    <span style={{ fontSize: 20, fontWeight: 500 }}>{detailModal.source.githubProfile.following}</span>
                 </Card>
              </div>
              <a href={detailModal.source.githubProfile.html_url} target="_blank" rel="noreferrer" 
                 style={{ display: "block", textAlign: "center", background: "var(--color-text-primary)", color: "var(--color-background-primary)", padding: "10px", borderRadius: "8px", textDecoration: "none", fontSize: 13, fontWeight: 500 }}>
                 Abrir perfil completo en GitHub
              </a>
           </div>
        )}

        {detailModal.source?.id === "leakcheck" && (
           <div>
              <p style={{ fontSize: 14, color: "var(--color-text-secondary)", marginBottom: 15 }}>Se han detectado {detailModal.source.breaches.length} bases de datos públicas con este email:</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                 {detailModal.source.breaches.map((b, i) => (
                    <Card key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                       <span style={{ fontSize: 14, fontWeight: 500 }}>{b.name}</span>
                       <Tag text="Crítico" danger />
                    </Card>
                 ))}
              </div>
              <p style={{ fontSize: 11, color: "var(--color-text-tertiary)", marginTop: 20, textAlign: "center" }}>
                 Nota: Estos datos provienen de fuentes públicas agregadas por LeakCheck.net.
              </p>
           </div>
        )}
      </Modal>
    </div>
  );
}
