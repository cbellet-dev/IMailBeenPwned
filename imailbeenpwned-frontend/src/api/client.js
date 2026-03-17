export const API_BASE = "http://localhost:8080/api";

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

export const callApi = async (email) => {
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
      aiAssessment: r.aiAssessment,
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
