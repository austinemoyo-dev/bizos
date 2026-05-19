'use client';

// Brand color from DASH & Co. brand guide
export const BRAND_COLOR = '#800000';

interface LogoMarkProps {
  size?: number;
  color?: string;
}

export function LogoMark({ size = 28, color = BRAND_COLOR }: LogoMarkProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Speed lines — 3 horizontal dashes, left portion */}
      <rect x="1"   y="8.2"  width="10.5" height="2.8" rx="1.4" fill={color} />
      <rect x="1"   y="14.6" width="7"    height="2.8" rx="1.4" fill={color} />
      <rect x="1"   y="21"   width="10.5" height="2.8" rx="1.4" fill={color} />

      {/* "d" letterform — bowl on left, ascender/stem extends up on right.
          fillRule="evenodd" punches out the inner counter. */}
      <path
        fillRule="evenodd"
        d={[
          // Outer boundary (clockwise)
          'M 27,3',
          'L 27,29',
          'C 26,31 21,32 16,30',
          'C 10,28 9,23 9,19',
          'C 9,12 12,6 17,5',
          'C 21,4 27,5 27,3',
          'Z',
          // Inner counter / hole (creates the bowl opening)
          'M 22,19',
          'C 22,23 19,25 16,24',
          'C 13,23 12,21 12,19',
          'C 12,15 15,12 18,13',
          'C 21,14 22,16 22,19',
          'Z',
        ].join(' ')}
        fill={color}
      />
    </svg>
  );
}

interface LogoWordmarkProps {
  collapsed?: boolean;
  scope?: 'business' | 'personal';
}

export function LogoWordmark({ collapsed, scope = 'business' }: LogoWordmarkProps) {
  const color = scope === 'personal' ? '#D4A535' : BRAND_COLOR;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
      <LogoMark size={26} color={color} />
      {!collapsed && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1, lineHeight: 1 }}>
          <span style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 800,
            fontSize: '1rem',
            letterSpacing: '-0.01em',
            color: 'var(--text-primary)',
          }}>
            DASH &amp; Co.
          </span>
          <span style={{
            fontSize: '0.44rem',
            fontWeight: 700,
            letterSpacing: '0.12em',
            color: 'var(--text-muted)',
            textTransform: 'uppercase',
          }}>
            Digital &amp; Hardware Solutions
          </span>
        </div>
      )}
    </div>
  );
}
