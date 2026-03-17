export function DataRow({ label, value, good, bad }) {
  const color = good ? "var(--color-text-success)" : bad ? "var(--color-text-danger)" : "var(--color-text-primary)";
  return (
    <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "0.5px solid var(--color-border-tertiary)", paddingBottom: 8 }}>
      <span style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: good || bad ? 500 : 400, color }}>{String(value)}</span>
    </div>
  );
}
