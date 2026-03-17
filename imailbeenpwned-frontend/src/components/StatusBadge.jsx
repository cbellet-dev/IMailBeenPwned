export const StatusBadge = ({ status }) => (
  <span style={{
    fontSize: 11, padding: "2px 8px", borderRadius: 4, fontWeight: 500,
    background: status === "hit" ? "var(--color-background-danger)" : status === "clean" ? "var(--color-background-success)" : "var(--color-background-secondary)",
    color: status === "hit" ? "var(--color-text-danger)" : status === "clean" ? "var(--color-text-success)" : "var(--color-text-secondary)",
  }}>
    {status === "hit" ? "COINCIDENCIA" : status === "clean" ? "LIMPIO" : "ERROR"}
  </span>
);
