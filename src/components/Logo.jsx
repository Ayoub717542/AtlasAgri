// Three contour lines: the Atlas range over a field
export default function Logo({ href = '#/' }) {
  return (
    <a className="logo" href={href} aria-label="AtlasAgri home">
      <svg width="30" height="22" viewBox="0 0 30 22" aria-hidden="true">
        <path d="M1 20 L11 6 L16 12 L21 4 L29 20" fill="none" stroke="var(--field)" strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round" />
        <path d="M6 20 L11 13 L15 18" fill="none" stroke="var(--wheat)" strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round" />
      </svg>
      <span>AtlasAgri</span>
    </a>
  );
}
