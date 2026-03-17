import { useState, useEffect } from "react";

const API_BASE = "http://localhost:8080/api";

const mockData = (email) => ({
  email,
  globalRiskScore: 45,
  summary: {
    totalBreaches: 2,
    totalSources: 4,
    sourcesWithHits: 2,
    oldestBreach: "—",
    newestBreach: "—",
    exposedPasswords: true,
    exposedPhone: false,
    exposedAddress: false,
  },
  sources: [
    { id: "leakcheck", name: "LeakCheck (Public)", status: "hit", meta: "Filtraciones en bases de datos públicas.", records: 2 },
    { id: "emailrep", name: "EmailRep.io", status: "clean", meta: "Reputación y actividad del email." },
    { id: "github", name: "GitHub Profile", status: "hit", meta: "Perfil de desarrollador encontrado." },
    { id: "social", name: "Social Scanner", status: "hit", meta: "Presencia en plataformas sociales.", platforms: ["Twitter", "Instagram", "Pinterest"] }
  ]
});

const callApi = async (email) => {
  try {
    const res = await fetch(`${API_BASE}/investigate/email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    if (!res.ok) throw new Error();
    const r = await res.json();

    return {
      email: r.email,
      globalRiskScore: r.riskScore ?? 0,
      summary: {
        totalBreaches: Math.max(r.leakCheckCount ?? 0, r.leakCheckSources?.length ?? 0), 
        totalSources: 5,
        sourcesWithHits: [
          (r.leakCheckSources?.length > 0 || r.leakCheckCount > 0 || r.leakCheckFound),
          r.githubFound,
          r.socialProfiles?.length > 0,
          (r.emailRepSuspicious || r.emailRepMalicious),
          r.isDisposable
        ].filter(Boolean).length,
        oldestBreach: "—",
        newestBreach: "—",
        exposedPasswords: r.leakCheckFound || r.leakCheckCount > 0,
        exposedPhone: r.emailRepProfiles?.length > 0,
        exposedAddress: false,
      },
      sources: [
        {
          id: "leakcheck", name: "LeakCheck", status: (r.leakCheckSources?.length > 0 || r.leakCheckCount > 0) ? "hit" : "clean",
          breaches: r.leakCheckSources?.map(s => ({ name: s, date: "—", records: 0, dataTypes: [] })) ?? [],
          meta: "Filtraciones en bases de datos públicas.",
        },
        {
          id: "emailrep", name: "EmailRep.io", status: r.emailRepSuspicious ? "hit" : "clean",
          reputation: {
            score: r.emailReputation ?? "none",
            suspicious: r.emailRepSuspicious ?? false,
            blacklisted: r.emailRepBlacklisted ?? false,
            maliciousActivity: r.emailRepMalicious ?? false,
            profilesExist: r.emailRepProfiles?.length > 0,
            referencesInPaste: r.appearsInPastebin ?? false,
          },
          meta: "Score de reputación global (modo anónimo).",
        },
        {
          id: "github", name: "GitHub", status: r.githubFound ? "hit" : "clean",
          githubProfile: r.githubProfile,
          meta: "Búsqueda de perfiles asociados en GitHub.",
        },
        {
          id: "social", name: "Social Scanner", status: r.socialProfiles?.length > 0 ? "hit" : "clean",
          platforms: r.socialProfiles ?? [],
          meta: "Detección de perfiles mediante escaneo de nombres de usuario.",
        },
        {
          id: "domain", name: "Infraestructura", status: "clean",
          domainInfo: {
            mx: r.mxRecords,
            spf: r.spfRecord,
            dmarc: r.dmarcRecord,
            disposable: r.isDisposable
          },
          meta: "Configuración de seguridad del dominio y DNS.",
        }
      ],
    };
  } catch {
    return mockData(email);
  }
};

const STEPS = [
  { label: "Analizando infraestructura...", source: "domain" },
  { label: "Escaneando LeakCheck...", source: "leakcheck" },
  { label: "Verificando GitHub...", source: "github" },
  { label: "Escaneando Redes Sociales...", source: "social" },
  { label: "Consultando EmailRep.io...", source: "emailrep" },
];

const SOURCE_META = {
  leakcheck: { label: "LeakCheck", dot: "#EF9F27", bg: "#FAEEDA", text: "#854F0B" },
  emailrep: { label: "EmailRep", dot: "#7F77DD", bg: "#EEEDFE", text: "#3C3489" },
  github: { label: "GitHub", dot: "#333", bg: "#eee", text: "#000" },
  social: { label: "Social", dot: "#f0f", bg: "#fef", text: "#a0a" },
  domain: { label: "Infra", dot: "#378ADD", bg: "#E6F1FB", text: "#185FA5" },
};

const riskColor = (s) => s >= 70 ? "var(--color-text-danger)" : s >= 40 ? "var(--color-text-warning)" : "var(--color-text-success)";
const riskLabel = (s) => s >= 70 ? "ALTO" : s >= 40 ? "MEDIO" : "BAJO";

function Modal({ isOpen, onClose, title, children }) {
  if (!isOpen) return null;
  return (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, bottom: 0, 
      background: "rgba(0,0,0,0.7)", display: "flex", justifyContent: "center", 
      alignItems: "center", zIndex: 1000, padding: "20px"
    }} onClick={onClose}>
      <div style={{
        background: "var(--color-background-primary)", borderRadius: "var(--border-radius-lg)",
        width: "100%", maxWidth: "600px", maxHeight: "90vh", overflow: "auto",
        border: "0.5px solid var(--color-border-tertiary)", position: "relative"
      }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: "20px", borderBottom: "0.5px solid var(--color-border-tertiary)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ fontSize: "18px", margin: 0 }}>{title}</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: "var(--color-text-secondary)" }}>&times;</button>
        </div>
        <div style={{ padding: "20px" }}>{children}</div>
      </div>
    </div>
  );
}

function RiskMeter({ score }) {
  const color = riskColor(score);
  const r = 42, cx = 56, cy = 56, circ = 2 * Math.PI * r;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <svg width="112" height="112" style={{ transform: "rotate(-90deg)" }}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--color-border-tertiary)" strokeWidth="8" />
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth="8"
          strokeDasharray={`${(score / 100) * circ} ${circ}`} strokeLinecap="round"
          style={{ transition: "stroke-dasharray 1s ease" }} />
      </svg>
      <div style={{ marginTop: -80, display: "flex", flexDirection: "column", alignItems: "center" }}>
        <span style={{ fontSize: 26, fontWeight: 500, color, fontFamily: "var(--font-mono)" }}>{score}</span>
        <span style={{ fontSize: 11, color: "var(--color-text-secondary)", letterSpacing: 2 }}>{riskLabel(score)}</span>
      </div>
      <div style={{ height: 32 }} />
    </div>
  );
}

const Card = ({ children, style = {} }) => (
  <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-lg)", padding: "1rem 1.25rem", ...style }}>
    {children}
  </div>
);

const SectionLabel = ({ children }) => (
  <p style={{ fontSize: 11, letterSpacing: 2, color: "var(--color-text-tertiary)", margin: "0 0 10px", textTransform: "uppercase", fontWeight: 500 }}>{children}</p>
);

const Tag = ({ text, danger, success }) => (
  <span style={{
    fontSize: 11, padding: "3px 8px", borderRadius: 4, fontWeight: 500,
    background: danger ? "var(--color-background-danger)" : success ? "var(--color-background-success)" : "var(--color-background-secondary)",
    color: danger ? "var(--color-text-danger)" : success ? "var(--color-text-success)" : "var(--color-text-secondary)",
  }}>{text}</span>
);

const SourcePill = ({ id }) => {
  const m = SOURCE_META[id];
  if (!m) return null;
  return (
    <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 99, fontWeight: 500, background: m.bg, color: m.text }}>{m.label}</span>
  );
};

const StatusBadge = ({ status }) => (
  <span style={{
    fontSize: 11, padding: "2px 8px", borderRadius: 4, fontWeight: 500,
    background: status === "hit" ? "var(--color-background-danger)" : status === "clean" ? "var(--color-background-success)" : "var(--color-background-secondary)",
    color: status === "hit" ? "var(--color-text-danger)" : status === "clean" ? "var(--color-text-success)" : "var(--color-text-secondary)",
  }}>
    {status === "hit" ? "COINCIDENCIA" : status === "clean" ? "LIMPIO" : "ERROR"}
  </span>
);

function DataRow({ label, value, good, bad }) {
  const color = good ? "var(--color-text-success)" : bad ? "var(--color-text-danger)" : "var(--color-text-primary)";
  return (
    <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "0.5px solid var(--color-border-tertiary)", paddingBottom: 8 }}>
      <span style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: good || bad ? 500 : 400, color }}>{String(value)}</span>
    </div>
  );
}

function SourceDetail({ source, onShowDetail }) {
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
