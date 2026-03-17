export function Modal({ isOpen, onClose, title, children }) {
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
