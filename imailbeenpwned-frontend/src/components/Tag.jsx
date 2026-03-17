export const Tag = ({ text, danger, success }) => (
  <span style={{
    fontSize: 11, padding: "3px 8px", borderRadius: 4, fontWeight: 500,
    background: danger ? "var(--color-background-danger)" : success ? "var(--color-background-success)" : "var(--color-background-secondary)",
    color: danger ? "var(--color-text-danger)" : success ? "var(--color-text-success)" : "var(--color-text-secondary)",
  }}>{text}</span>
);
