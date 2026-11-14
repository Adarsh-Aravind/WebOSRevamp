// Line icons in the spirit of SF Symbols (drawn from scratch, 24×24 grid).

export type GlyphName =
  | 'sun' | 'moon' | 'cloud' | 'cloudSun' | 'cloudMoon' | 'rain' | 'snow' | 'bolt' | 'fog'
  | 'tv' | 'hdmi' | 'globe' | 'bag' | 'gear' | 'power' | 'sleep' | 'speaker' | 'mute'
  | 'plus' | 'minus' | 'grid' | 'sliders' | 'photo' | 'music' | 'mic' | 'sparkle' | 'trophy'
  | 'info' | 'eyeOff' | 'eye' | 'check' | 'chevron' | 'play' | 'ytplay' | 'spotify' | 'pencil'
  | 'reset' | 'pulse' | 'x';

const CLOUD = 'M7 17.5h10.5a3.5 3.5 0 0 0 .4-6.98A5.5 5.5 0 0 0 7.3 9.6 4 4 0 0 0 7 17.5z';
const CLOUD_UP = 'M7 14.5h10.5a3.5 3.5 0 0 0 .4-6.98A5.5 5.5 0 0 0 7.3 6.6 4 4 0 0 0 7 14.5z';

const P: Record<string, string> = {
  sun: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z M12 2.5v2 M12 19.5v2 M4.6 4.6l1.4 1.4 M18 18l1.4 1.4 M2.5 12h2 M19.5 12h2 M4.6 19.4L6 18 M18 6l1.4-1.4',
  moon: 'M20.5 14.2A8.5 8.5 0 0 1 9.8 3.5a8.5 8.5 0 1 0 10.7 10.7z',
  cloud: CLOUD,
  cloudSun: 'M9 6.2a3.6 3.6 0 0 1 6.2 1.4 M8.2 2.8v1.4 M3.6 7.2H5 M4.6 3.8l1 1 ' + 'M8 20h9.5a3.2 3.2 0 0 0 .4-6.4 5 5 0 0 0-9.6-.9A3.7 3.7 0 0 0 8 20z',
  cloudMoon: 'M14.5 3.6a4.4 4.4 0 0 0 5.6 5.6 4.4 4.4 0 0 1-5.6-5.6z M8 20h9.5a3.2 3.2 0 0 0 .4-6.4 5 5 0 0 0-9.6-.9A3.7 3.7 0 0 0 8 20z',
  rain: CLOUD_UP + ' M8.5 18l-1 2.5 M12.5 18l-1 2.5 M16.5 18l-1 2.5',
  snow: CLOUD_UP + ' M8 18.5h.01 M12 20h.01 M16 18.5h.01 M10 21.5h.01 M14 21.5h.01',
  bolt: CLOUD_UP + ' M12.5 15l-2 3.5h3l-2 3.5',
  fog: CLOUD_UP + ' M5 18h14 M7 21h10',
  tv: 'M4 5.5h16a1.5 1.5 0 0 1 1.5 1.5v9a1.5 1.5 0 0 1-1.5 1.5H4A1.5 1.5 0 0 1 2.5 16V7A1.5 1.5 0 0 1 4 5.5z M8 21h8 M12 17.5V21',
  hdmi: 'M3 8.5h18v5l-3 3H6l-3-3z M7 12h10',
  globe: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z M3 12h18 M12 3c2.6 2.6 3.8 5.6 3.8 9s-1.2 6.4-3.8 9 M12 3C9.4 5.6 8.2 8.6 8.2 12s1.2 6.4 3.8 9',
  bag: 'M5.5 8h13l-1 12.5h-11z M9 8V6.5a3 3 0 0 1 6 0V8',
  power: 'M12 3v8.5 M6.6 6.2a8 8 0 1 0 10.8 0',
  sleep: 'M17.5 14.6A6.5 6.5 0 0 1 9.4 6.5a6.5 6.5 0 1 0 8.1 8.1z M15 3.5h4l-4 4h4',
  speaker: 'M4 9.5h3.5L12 5.5v13l-4.5-4H4z M15.5 9a4 4 0 0 1 0 6 M18 6.5a7.5 7.5 0 0 1 0 11',
  mute: 'M4 9.5h3.5L12 5.5v13l-4.5-4H4z M16 9.5l5 5 M21 9.5l-5 5',
  plus: 'M12 5v14 M5 12h14',
  minus: 'M5 12h14',
  grid: 'M4.5 4.5h6v6h-6z M13.5 4.5h6v6h-6z M4.5 13.5h6v6h-6z M13.5 13.5h6v6h-6z',
  sliders: 'M4 7h9 M17 7h3 M4 17h3 M11 17h9 M15 5v4 M9 15v4',
  photo: 'M4 5.5h16v13H4z M4 15.5l4.5-4.5 4 4 2.5-2.5 5 5 M15.5 9.5h.01',
  music: 'M9 18V6l11-2v12 M9 18a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0z M20 16a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0z',
  mic: 'M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3z M5.5 11a6.5 6.5 0 0 0 13 0 M12 17.5V21',
  sparkle: 'M12 3l1.9 5.6L19.5 10.5l-5.6 1.9L12 18l-1.9-5.6L4.5 10.5l5.6-1.9z M19 16l.8 2.2 2.2.8-2.2.8L19 22l-.8-2.2-2.2-.8 2.2-.8z',
  trophy: 'M7 4h10v5a5 5 0 0 1-10 0z M7 6H4v1.5A3 3 0 0 0 7 10.5 M17 6h3v1.5a3 3 0 0 1-3 3 M12 14v4 M8.5 21h7 M9.5 18h5',
  info: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z M12 11v6 M12 7.5v.5',
  eyeOff: 'M3 3l18 18 M10.6 6.1A10.6 10.6 0 0 1 12 6c5 0 8.5 4.5 9.5 6a17 17 0 0 1-3 3.4 M6.4 7.6A16.6 16.6 0 0 0 2.5 12c1 1.5 4.5 6 9.5 6a9.7 9.7 0 0 0 4.4-1.1 M9.9 10a3 3 0 0 0 4.2 4.2',
  eye: 'M2.5 12c1-1.5 4.5-6 9.5-6s8.5 4.5 9.5 6c-1 1.5-4.5 6-9.5 6s-8.5-4.5-9.5-6z M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  chevron: 'M9 5l7 7-7 7',
  play: 'M8 5.5v13l10.5-6.5z',
  pencil: 'M4 20l1-4.5L15.5 5a2 2 0 0 1 2.8 0l.7.7a2 2 0 0 1 0 2.8L8.5 19z M13.5 7l3.5 3.5',
  reset: 'M4 12a8 8 0 1 0 2.4-5.7 M4 4v4.5h4.5',
  pulse: 'M3 12h4l2.5-6 5 12 2.5-6h4',
  x: 'M6 6l12 12 M18 6L6 18',
};

export function Glyph({ name, size = 24, stroke = 1.8, className }: { name: GlyphName; size?: number; stroke?: number; className?: string }) {
  if (name === 'gear') {
    return (
      <svg class={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width={stroke} stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="7.6" stroke-width={stroke * 2.2} stroke-dasharray="3.4 2.6" />
        <circle cx="12" cy="12" r="5.6" />
        <circle cx="12" cy="12" r="2.2" />
      </svg>
    );
  }
  if (name === 'ytplay') {
    return (
      <svg class={className} width={size * 1.4} height={size} viewBox="0 0 34 24">
        <rect x="0" y="0" width="34" height="24" rx="7" fill="#FF0033" />
        <path d="M13.5 7v10l9-5z" fill="#fff" />
      </svg>
    );
  }
  if (name === 'spotify') {
    return (
      <svg class={className} width={size} height={size} viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="11" fill="currentColor" />
        <path d="M6.5 9.3c3.8-1.2 8-.9 11.2.9 M7.2 12.6c3.2-.9 6.6-.6 9.3.9 M7.9 15.7c2.5-.7 5.1-.5 7.3.7" stroke="#121212" stroke-width="1.7" stroke-linecap="round" fill="none" />
      </svg>
    );
  }
  return (
    <svg class={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width={stroke} stroke-linecap="round" stroke-linejoin="round">
      <path d={P[name]} />
    </svg>
  );
}
