import { SOURCE_META } from "../utils/constants";

export const SourcePill = ({ id }) => {
  const m = SOURCE_META[id];
  if (!m) return null;
  return (
    <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 99, fontWeight: 500, background: m.bg, color: m.text }}>{m.label}</span>
  );
};
