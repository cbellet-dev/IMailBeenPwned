export const SOURCE_META = {
  leakcheck: { label: "LeakCheck", dot: "#EF9F27", bg: "#FAEEDA", text: "#854F0B" },
  emailrep: { label: "EmailRep", dot: "#7F77DD", bg: "#EEEDFE", text: "#3C3489" },
  github: { label: "GitHub", dot: "#333", bg: "#eee", text: "#000" },
  social: { label: "Social", dot: "#f0f", bg: "#fef", text: "#a0a" },
  domain: { label: "Infra", dot: "#378ADD", bg: "#E6F1FB", text: "#185FA5" },
};

export const STEPS = [
  { label: "Analizando infraestructura...", source: "domain" },
  { label: "Escaneando LeakCheck...", source: "leakcheck" },
  { label: "Verificando GitHub...", source: "github" },
  { label: "Escaneando Redes Sociales...", source: "social" },
  { label: "Consultando EmailRep.io...", source: "emailrep" },
  { label: "Generando veredicto de IA (Groq)...", source: null }
];

export const riskColor = (s) => s >= 70 ? "var(--color-text-danger)" : s >= 40 ? "var(--color-text-warning)" : "var(--color-text-success)";
export const riskLabel = (s) => s >= 70 ? "ALTO" : s >= 40 ? "MEDIO" : "BAJO";
