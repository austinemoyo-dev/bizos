'use client';

export const BRAND_COLOR = '#8B0018';

interface LogoMarkProps {
  size?: number;
  color?: string;
}

/**
 * Recreates the DASH & Co. D-ASH Symbol:
 *
 *  ≡d   →   three horizontal speed lines pointing into a bold "d"
 *
 * Key observations from the brand guide:
 *  1. Three speed lines span the full bowl height (long / short / long)
 *  2. "d" has a large CIRCULAR bowl on the left, tall ascender on the right
 *  3. Top of the ascender has a backward sweep / hook (the "Dash" motion feel)
 *  4. Inner counter (the open hole of the "d") is a rounded oval
 */
export function LogoMark({ size = 28, color = BRAND_COLOR }: LogoMarkProps) {
  // All coordinates are in a 44×44 viewBox so the "d" has room for proper proportions.
  //
  // Layout:
  //   Speed lines  : x = 0–16,  centred on bowl height  y = 16–38
  //   Ascender     : x = 32–40, y = 4–18   (above the bowl)
  //   Bowl circle  : centre (24, 27), radius 11  → spans x=13–35, y=16–38
  //   Counter hole : centre (24, 27), radius 6.5

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 44 44"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* ── Speed lines ──────────────────────────────────────────────
          Three horizontal dashes aligned with the bowl (y 16–38).
          Top and bottom are longer; middle is shorter.           */}
      <rect x="0" y="16"   width="14" height="3.5" rx="1.75" fill={color} />
      <rect x="0" y="23.5" width="9"  height="3.5" rx="1.75" fill={color} />
      <rect x="0" y="31"   width="14" height="3.5" rx="1.75" fill={color} />

      {/* ── "d" letterform ───────────────────────────────────────────
          Constructed with fillRule="evenodd" so the inner counter is
          transparent (works on any background colour).

          Outer path (clockwise):
            1. Start at the top of the ascender with a backward sweep
            2. Drop down the right stem
            3. Curve around the bottom of the bowl (going left)
            4. Arc around the entire left side of the bowl (CCW = sweep 0)
            5. Curve back up through the top of the bowl to the ascender

          Inner counter (clockwise circle = hole via evenodd):
            Two semi-circle arcs forming a full circle at the bowl centre.
      */}
      <path
        fillRule="evenodd"
        d={[
          // ── Outer "d" ──
          'M 33,4',             // top of ascender — slightly left of stem edge
          'C 39,4 40,8 38,14',  // backward sweep at top: curves right then falls
          'L 38,38',            // straight down the right side of the stem
          'C 36,40 30,41 24,38',// bottom-right curve sweeping left to bowl bottom
          'A 11,11 0 0,0 24,16',// arc CCW around the entire left side of the bowl
                                // (from bowl bottom y=38 through left x=13 to bowl top y=16)
          'C 30,13 38,15 33,4', // top curve: from bowl top back to ascender start
          'Z',

          // ── Inner counter (hole) ──
          // Circle at centre (24,27) radius 6.5
          // Two clockwise semicircles → evenodd creates the transparent hole
          'M 30.5,27',
          'A 6.5,6.5 0 0,1 17.5,27',
          'A 6.5,6.5 0 0,1 30.5,27',
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
      <LogoMark size={28} color={color} />
      {!collapsed && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, lineHeight: 1 }}>
          {/* "DASH & Co." — matches the bold wordmark in the brand guide */}
          <span style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 800,
            fontSize: '1rem',
            letterSpacing: '0.01em',
            color: 'var(--text-primary)',
          }}>
            DASH &amp; Co.
          </span>
          {/* Tagline — "DIGITAL & HARDWARE SOLUTIONS" */}
          <span style={{
            fontSize: '0.43rem',
            fontWeight: 700,
            letterSpacing: '0.13em',
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
