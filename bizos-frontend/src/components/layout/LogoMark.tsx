'use client';

interface LogoMarkProps {
  size?: number;
  color?: string;
}

export function LogoMark({ size = 28, color = '#C8102E' }: LogoMarkProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      {/* Speed lines */}
      <rect x="1" y="8"  width="10" height="3" rx="1.5" fill={color} />
      <rect x="1" y="14.5" width="7"  height="3" rx="1.5" fill={color} />
      <rect x="1" y="21" width="10" height="3" rx="1.5" fill={color} />
      {/* Letter d */}
      <path
        d="M14 4 L14 28 L20.5 28 C26 28 30 23.5 30 16 C30 8.5 26 4 20.5 4 Z"
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
  const color = scope === 'personal' ? '#D4A535' : '#C8102E';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <LogoMark size={26} color={color} />
      {!collapsed && (
        <div style={{ lineHeight: 1, display: 'flex', flexDirection: 'column' }}>
          <span style={{
            fontFamily: 'var(--font-display)', fontWeight: 800,
            fontSize: '1.05rem', letterSpacing: '-0.01em',
            color: 'var(--text-primary)',
          }}>
            <span style={{ color }}>d</span>-ash
          </span>
          <span style={{
            fontSize: '0.5rem', fontWeight: 700, letterSpacing: '0.15em',
            color: 'var(--text-muted)', textTransform: 'uppercase',
          }}>
            Dash & Co.
          </span>
        </div>
      )}
    </div>
  );
}
