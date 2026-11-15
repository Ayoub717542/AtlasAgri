// Simple line icons (24px grid), drawn for AtlasAgri
const P = {
  sun: <><circle cx="12" cy="12" r="4.5" /><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8" /></>,
  drop: <path d="M12 3c3.5 4.4 6 7.9 6 11a6 6 0 0 1-12 0c0-3.1 2.5-6.6 6-11z" />,
  soil: <><path d="M3 9h18M3 14h18M3 19h18" /><path d="M8 9V5M12 9V3.5M16 9V6" /></>,
  sprout: <><path d="M12 21v-9" /><path d="M12 12c0-4 3-6.5 7-6.5 0 4-3 6.5-7 6.5zM12 14c0-3.5-2.5-5.5-6-5.5 0 3.5 2.5 5.5 6 5.5z" /></>,
  pin: <><path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z" /><circle cx="12" cy="9.5" r="2.5" /></>,
  file: <><path d="M6 2.5h8l4 4V21.5H6z" /><path d="M14 2.5v4h4M9 12h6M9 16h6" /></>,
  check: <path d="M4.5 12.5l5 5L19.5 7" />,
  alert: <><path d="M12 3.5L22 20.5H2z" /><path d="M12 10v4.5M12 17.5v.5" /></>,
  chat: <path d="M4 5h16v11H9l-5 4z" />,
  close: <path d="M5 5l14 14M19 5L5 19" />,
  send: <path d="M3.5 12L20.5 4l-4 16-5-6.5z M11.5 13.5L20.5 4" />,
  upload: <><path d="M12 16V4M6.5 9.5L12 4l5.5 5.5" /><path d="M4 16v4h16v-4" /></>,
  globe: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z" /></>,
  map: <><path d="M3 6.5l6-2.5 6 2.5 6-2.5v14l-6 2.5-6-2.5-6 2.5z" /><path d="M9 4v14M15 6.5v14" /></>,
  layers: <><path d="M12 3l9 5-9 5-9-5z" /><path d="M3 12.5l9 5 9-5M3 17l9 5 9-5" /></>,
  thermometer: <><path d="M10 13.6V5a2 2 0 1 1 4 0v8.6a5 5 0 1 1-4 0z" /><path d="M12 9v7" /></>,
  leaf: <><path d="M20 4C10 4 4 9 4 16c0 2 .6 3.4 1.4 4.4C8 14 12 11.5 18 10c-4 2.4-7.4 5.2-9.6 10.4" /><path d="M4.8 20.2C10 21 20 19 20 4z" /></>,
  rotate: <><path d="M20 11a8 8 0 1 0-2.6 6.4" /><path d="M20 4v7h-7" /></>,
  store: <><path d="M4 9.5V20h16V9.5" /><path d="M3 9.5L5 4h14l2 5.5z" /><path d="M9 20v-6h6v6" /></>,
  mic: <><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3M8.5 21h7" /></>,
  chevronRight: <path d="M9 5l7 7-7 7" />,
  chevronDown: <path d="M5 9l7 7 7-7" />,
  menu: <><path d="M4 7h16M4 12h16M4 17h16" /></>,
  target: <><circle cx="12" cy="12" r="7" /><circle cx="12" cy="12" r="1.6" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" /></>,
  info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8v.5" /></>,
  arrowRight: <path d="M4 12h16M14 6l6 6-6 6" />,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5.2l3.5 2" /></>,
  phone: <path d="M5 3.5h4l1.5 4-2.2 1.6a12 12 0 0 0 6.6 6.6l1.6-2.2 4 1.5v4a2 2 0 0 1-2.2 2A17.5 17.5 0 0 1 3 5.7 2 2 0 0 1 5 3.5z" />,
  ruler: <><path d="M3 16L16 3l5 5L8 21z" /><path d="M7 12l2 2M10 9l2 2M13 6l2 2" /></>,
  navigation: <path d="M20 4L4 11l6.5 2.5L13 20z" />,
  calendar: <><rect x="3.5" y="5" width="17" height="16" rx="2" /><path d="M3.5 10h17M8 3v4M16 3v4" /></>,
  shield: <><path d="M12 3l8 3v6c0 4.6-3.4 7.8-8 9-4.6-1.2-8-4.4-8-9V6z" /><path d="M8.5 12l2.5 2.5 4.5-5" /></>,
  sparkle: <><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" /><path d="M19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z" /></>,
};

export default function Icon({ name, size = 22, className = '', title }) {
  return (
    <svg
      className={'icon ' + className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={title ? undefined : 'true'}
      role={title ? 'img' : undefined}
    >
      {title && <title>{title}</title>}
      {P[name]}
    </svg>
  );
}
