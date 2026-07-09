import type { ReactNode } from 'react';

const ANSI_REGEX = /\x1b\[((\d+(;\d+)*)?)m/g;

const FG_COLORS: Record<string, string> = {
  '30': '#808080', '31': '#f44336', '32': '#4caf50', '33': '#ffeb3b',
  '34': '#2196f3', '35': '#9c27b0', '36': '#00bcd4', '37': '#e0e0e0',
  '90': '#9e9e9e', '91': '#ff5252', '92': '#69f0ae', '93': '#fff176',
  '94': '#448aff', '95': '#e040fb', '96': '#18ffff', '97': '#ffffff',
};

const BG_COLORS: Record<string, string> = {
  '40': '#1a1a2e', '41': '#4a1a1a', '42': '#1a4a1a', '43': '#4a4a1a',
  '44': '#1a1a4a', '45': '#4a1a4a', '46': '#1a4a4a', '47': '#4a4a4a',
  '100': '#303050', '101': '#6a3a3a', '102': '#306a30', '103': '#6a6a30',
  '104': '#30306a', '105': '#6a306a', '106': '#306a6a', '107': '#6a6a6a',
};

// Approximate 256-color palette
const COLORS256: string[] = [
  // 0-7: standard
  '#000000', '#aa0000', '#00aa00', '#aa5500', '#0000aa', '#aa00aa', '#00aaaa', '#aaaaaa',
  // 8-15: bright
  '#555555', '#ff5555', '#55ff55', '#ffff55', '#5555ff', '#ff55ff', '#55ffff', '#ffffff',
  // 16-231: 6x6x6 color cube
  ...Array.from({ length: 216 }, (_, i) => {
    const r = Math.floor(i / 36) * 51 % 255;
    const g = Math.floor((i % 36) / 6) * 51 % 255;
    const b = (i % 6) * 51 % 255;
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }),
  // 232-255: grayscale
  ...Array.from({ length: 24 }, (_, i) => {
    const v = 8 + i * 10;
    return `#${v.toString(16).padStart(2, '0')}${v.toString(16).padStart(2, '0')}${v.toString(16).padStart(2, '0')}`;
  }),
];

function parse256Color(code: string): string | null {
  const num = parseInt(code, 10);
  if (num >= 16 && num <= 255 && COLORS256[num]) {
    return COLORS256[num];
  }
  return null;
}

interface Segment {
  text: string;
  color?: string;
  bgColor?: string;
  bold?: boolean;
}

export function parseAnsi(text: string): Segment[] {
  const segments: Segment[] = [];
  let current: Segment = { text: '' };


  const parts = text.split(ANSI_REGEX);

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];

    if (i % 2 === 0) {
      // Text portion
      current.text += part;
      if (i === parts.length - 1) {
        // Last text segment
        if (current.text) segments.push({ ...current });
      }
    } else {
      // ANSI code portion — flush current segment
      if (current.text) segments.push({ ...current });

      // Parse codes
      const codes = part.split(';').map((c) => c.trim());
      let j = 0;
      while (j < codes.length) {
        const code = codes[j];
        if (code === '' || code === '0') {
          current = { text: '' };
        } else if (code === '1') {
          current.bold = true;
        } else if (code === '38' && codes[j + 1] === '5') {
          // 256-color foreground: \x1b[38;5;Nm
          const color = parse256Color(codes[j + 2]);
          if (color) current.color = color;
          j += 2;
        } else if (code === '48' && codes[j + 1] === '5') {
          // 256-color background: \x1b[48;5;Nm
          const color = parse256Color(codes[j + 2]);
          if (color) current.bgColor = color;
          j += 2;
        } else if (code in FG_COLORS) {
          current.color = FG_COLORS[code];
        } else if (code in BG_COLORS) {
          current.bgColor = BG_COLORS[code];
        }
        j++;
      }

      current = { text: '', color: current.color, bgColor: current.bgColor, bold: current.bold };
    }
  }

  return segments.length ? segments : [{ text }];
}

export function renderAnsiLine(line: string | null | undefined): ReactNode {
  if (!line) return null;
  const segments = parseAnsi(line);
  return segments.map((seg, i) => (
    <span
      key={i}
      style={{
        color: seg.color,
        backgroundColor: seg.bgColor,
        fontWeight: seg.bold ? 'bold' : undefined,
      }}
    >
      {seg.text}
    </span>
  ));
}
