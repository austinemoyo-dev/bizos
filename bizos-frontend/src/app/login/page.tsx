'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api/client';
import { useAuthStore } from '@/lib/stores/authStore';
import { LoginResponse } from '@/types/api';
import { Eye, EyeOff, Loader2, Shield, Wifi, Lock, Zap, Database, Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { LogoMark } from '@/components/layout/LogoMark';

// ── Design tokens ─────────────────────────────────────────────────────────────
const CYAN   = '#00D4FF';
const PURPLE = '#7B3FE4';
const RED    = '#C8102E';
const GOLD   = '#D4A535';

// Static particles (deterministic positions avoid hydration mismatch)
const PARTICLES = [
  { left: '8%',  top: '12%', s: 2,   d: '0s',   t: '9s',  c: CYAN   },
  { left: '88%', top: '8%',  s: 1.5, d: '2.2s', t: '13s', c: PURPLE },
  { left: '44%', top: '4%',  s: 1,   d: '1.5s', t: '11s', c: GOLD   },
  { left: '72%', top: '86%', s: 2,   d: '0.8s', t: '8s',  c: CYAN   },
  { left: '20%', top: '80%', s: 1.5, d: '3.1s', t: '10s', c: PURPLE },
  { left: '93%', top: '55%', s: 1,   d: '0.4s', t: '14s', c: CYAN   },
  { left: '4%',  top: '50%', s: 2,   d: '2.7s', t: '7s',  c: GOLD   },
  { left: '58%', top: '93%', s: 1.5, d: '1.8s', t: '12s', c: PURPLE },
  { left: '32%', top: '22%', s: 1,   d: '4.0s', t: '15s', c: CYAN   },
  { left: '76%', top: '38%', s: 1.5, d: '0.6s', t: '9s',  c: GOLD   },
  { left: '15%', top: '65%', s: 1,   d: '3.5s', t: '11s', c: PURPLE },
  { left: '50%', top: '48%', s: 1,   d: '1.2s', t: '10s', c: CYAN   },
];

const FEATURES = [
  { icon: Activity, label: 'Real-time P&L',      desc: 'Profit computed live, never stored'  },
  { icon: Database, label: 'Inventory Control',   desc: 'Parts, sales & restock management'   },
  { icon: Shield,   label: 'Role-based Access',   desc: '6-tier permission hierarchy'          },
  { icon: Wifi,     label: 'Offline-first PWA',   desc: 'Full sync when back online'           },
  { icon: Zap,      label: 'Repair Pipeline',      desc: 'Received → Diagnosed → Delivered'    },
];

// ── Component ─────────────────────────────────────────────────────────────────
export default function LoginPage() {
  const router        = useRouter();
  const { setAuth }   = useAuthStore();
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [showPwd,  setShowPwd]  = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const [emailFocused, setEmailFocused] = useState(false);
  const [pwdFocused,   setPwdFocused]   = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await api.post<LoginResponse>('/auth/login', { email, password }, { skipAuth: true });
      setAuth(data.user, data.access_token, data.refresh_token);
      router.push('/business/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        /* ── Keyframes ── */
        @keyframes orb-a {
          0%,100% { transform: translate(0,0) scale(1); }
          33%      { transform: translate(50px,-40px) scale(1.1); }
          66%      { transform: translate(-30px,60px) scale(0.92); }
        }
        @keyframes orb-b {
          0%,100% { transform: translate(0,0) scale(1); }
          50%      { transform: translate(-70px,50px) scale(1.15); }
        }
        @keyframes orb-c {
          0%,100% { transform: translate(0,0) scale(1); }
          40%      { transform: translate(40px,-60px) scale(0.88); }
          80%      { transform: translate(-50px,30px) scale(1.08); }
        }
        @keyframes particle-float {
          0%,100% { transform: translateY(0px);  opacity: 0.7; }
          50%      { transform: translateY(-20px); opacity: 0.2; }
        }
        @keyframes scanline {
          0%   { transform: translateY(-4px); opacity: 0; }
          5%   { opacity: 1; }
          88%  { opacity: 0.8; }
          100% { transform: translateY(700px); opacity: 0; }
        }
        @keyframes pulse-ring {
          0%   { transform: scale(1);   opacity: 0.7; }
          100% { transform: scale(1.6); opacity: 0; }
        }
        @keyframes status-blink {
          0%,100% { opacity: 1; }
          50%      { opacity: 0.25; }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes logo-rotate {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }

        /* ── Glass input ── */
        .gl-input {
          width: 100%;
          background: rgba(0,212,255,0.04);
          border: 1.5px solid rgba(0,212,255,0.14);
          border-radius: 12px;
          padding: 13px 16px;
          color: #fff;
          font-size: 0.9rem;
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
          font-family: inherit;
          box-sizing: border-box;
          caret-color: ${CYAN};
        }
        .gl-input::placeholder { color: rgba(255,255,255,0.2); }
        .gl-input:focus {
          border-color: rgba(0,212,255,0.5);
          background: rgba(0,212,255,0.07);
          box-shadow: 0 0 0 3px rgba(0,212,255,0.1), 0 0 24px rgba(0,212,255,0.07);
        }
        .gl-input.has-error:focus {
          border-color: rgba(255,77,106,0.5);
          box-shadow: 0 0 0 3px rgba(255,77,106,0.1);
        }

        /* ── Submit button ── */
        .auth-btn {
          width: 100%;
          padding: 15px;
          border: none;
          border-radius: 13px;
          background: linear-gradient(135deg, ${RED} 0%, ${PURPLE} 100%);
          color: #fff;
          font-size: 0.92rem;
          font-weight: 800;
          cursor: pointer;
          position: relative;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          letter-spacing: 0.03em;
          transition: transform 0.15s, box-shadow 0.2s, opacity 0.2s;
          box-shadow:
            0 4px 24px rgba(200,16,46,0.4),
            0 2px 12px rgba(123,63,228,0.25),
            inset 0 1px 0 rgba(255,255,255,0.15);
        }
        .auth-btn::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, rgba(255,255,255,0.15) 0%, transparent 55%);
          pointer-events: none;
        }
        .auth-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow:
            0 8px 36px rgba(200,16,46,0.55),
            0 4px 20px rgba(123,63,228,0.4),
            inset 0 1px 0 rgba(255,255,255,0.15);
        }
        .auth-btn:active:not(:disabled) { transform: translateY(0); }
        .auth-btn:disabled { opacity: 0.55; cursor: not-allowed; }

        /* ── Responsive ── */
        @media (min-width: 860px) {
          .left-panel  { display: flex !important; }
          .mobile-logo { display: none !important; }
        }
      `}</style>

      {/* ─── Full-page shell ─────────────────────────────────────── */}
      <div style={{
        minHeight: '100dvh',
        background: 'linear-gradient(145deg, #020610 0%, #060C1E 55%, #030810 100%)',
        display: 'flex',
        overflow: 'hidden',
        position: 'relative',
      }}>

        {/* ─── Background layer ───────────────────────────────────── */}
        <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
          {/* Orb 1 – Cyan, top-left */}
          <div style={{
            position: 'absolute', top: '-18%', left: '-12%',
            width: '58vw', height: '58vw', maxWidth: 720, maxHeight: 720,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(0,212,255,0.13) 0%, transparent 68%)',
            animation: 'orb-a 20s ease-in-out infinite',
          }} />
          {/* Orb 2 – Purple, bottom-right */}
          <div style={{
            position: 'absolute', bottom: '-22%', right: '-12%',
            width: '52vw', height: '52vw', maxWidth: 680, maxHeight: 680,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(123,63,228,0.16) 0%, transparent 68%)',
            animation: 'orb-b 24s ease-in-out infinite',
          }} />
          {/* Orb 3 – Red, center */}
          <div style={{
            position: 'absolute', top: '25%', left: '30%',
            width: '42vw', height: '42vw', maxWidth: 520, maxHeight: 520,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(200,16,46,0.07) 0%, transparent 68%)',
            animation: 'orb-c 16s ease-in-out infinite',
          }} />

          {/* Dot-grid overlay */}
          <div style={{
            position: 'absolute', inset: 0,
            backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(0,212,255,0.07) 1px, transparent 0)',
            backgroundSize: '34px 34px',
          }} />

          {/* Floating particles */}
          {PARTICLES.map((p, i) => (
            <div key={i} style={{
              position: 'absolute',
              left: p.left, top: p.top,
              width: p.s, height: p.s,
              borderRadius: '50%',
              background: p.c,
              boxShadow: `0 0 ${p.s * 5}px ${p.c}`,
              animation: `particle-float ${p.t} ${p.d} ease-in-out infinite`,
            }} />
          ))}
        </div>

        {/* ─── LEFT PANEL (desktop only) ──────────────────────────── */}
        <div
          className="left-panel"
          style={{
            display: 'none',
            width: 420, flexShrink: 0,
            flexDirection: 'column', justifyContent: 'space-between',
            padding: '52px 44px',
            position: 'relative', zIndex: 1,
            borderRight: '1px solid rgba(0,212,255,0.07)',
            background: 'rgba(0,10,28,0.5)',
            backdropFilter: 'blur(12px)',
          }}
        >
          {/* Top section */}
          <motion.div
            initial={{ opacity: 0, x: -28 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Logo + wordmark */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 36 }}>
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <div style={{
                  width: 58, height: 58, borderRadius: 19,
                  background: `linear-gradient(135deg, ${RED}, ${PURPLE})`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: `0 0 28px rgba(200,16,46,0.45), 0 8px 24px rgba(0,0,0,0.5)`,
                }}>
                  <LogoMark size={34} color="#fff" />
                </div>
                {/* Pulse ring */}
                <div style={{
                  position: 'absolute', inset: -5, borderRadius: 24,
                  border: `1.5px solid rgba(200,16,46,0.45)`,
                  animation: 'pulse-ring 2.8s ease-out infinite',
                }} />
              </div>
              <div>
                <div style={{
                  fontFamily: 'var(--font-display)', fontSize: '1.75rem', fontWeight: 800,
                  color: '#fff', lineHeight: 1, letterSpacing: '-0.025em',
                }}>d-ash</div>
                <div style={{
                  fontFamily: 'var(--font-mono)', fontSize: '0.58rem', fontWeight: 700,
                  color: CYAN, letterSpacing: '0.2em', textTransform: 'uppercase', marginTop: 4,
                }}>BizOS · v2.4</div>
              </div>
            </div>

            {/* Status badge */}
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '7px 16px', borderRadius: 24,
              background: 'rgba(0,255,128,0.06)',
              border: '1px solid rgba(0,255,128,0.22)',
              marginBottom: 40,
            }}>
              <div style={{
                width: 7, height: 7, borderRadius: '50%',
                background: '#00FF80',
                boxShadow: '0 0 10px #00FF80',
                animation: 'status-blink 2.4s ease-in-out infinite',
              }} />
              <span style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.6rem', fontWeight: 700,
                color: 'rgba(0,255,128,0.85)',
                letterSpacing: '0.14em', textTransform: 'uppercase',
              }}>All Systems Operational</span>
            </div>

            <p style={{
              color: 'rgba(255,255,255,0.42)', fontSize: '0.8rem', lineHeight: 1.8,
              marginBottom: 40, maxWidth: 300,
            }}>
              Complete business & personal finance command centre for Dash & Co.
            </p>

            {/* Feature list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {FEATURES.map(({ icon: Icon, label, desc }, i) => (
                <motion.div
                  key={label}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.18 + i * 0.08, duration: 0.4 }}
                  style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}
                >
                  <div style={{
                    width: 36, height: 36, borderRadius: 11, flexShrink: 0,
                    background: 'rgba(0,212,255,0.07)',
                    border: `1px solid rgba(0,212,255,0.18)`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Icon size={15} style={{ color: CYAN }} />
                  </div>
                  <div>
                    <p style={{
                      fontSize: '0.8rem', fontWeight: 700,
                      color: '#fff', marginBottom: 3, lineHeight: 1,
                    }}>{label}</p>
                    <p style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.35)', lineHeight: 1.4 }}>{desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Bottom – copyright */}
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.52rem', color: 'rgba(255,255,255,0.18)',
            letterSpacing: '0.1em', textTransform: 'uppercase',
          }}>
            © 2024 Dash & Co. · Digital & Hardware Solutions
          </div>
        </div>

        {/* ─── RIGHT FORM PANEL ────────────────────────────────────── */}
        <div style={{
          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '28px 20px',
          position: 'relative', zIndex: 1,
        }}>
          <motion.div
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            style={{ width: '100%', maxWidth: 420 }}
          >
            {/* Mobile logo */}
            <div className="mobile-logo" style={{ textAlign: 'center', marginBottom: 36 }}>
              <div style={{ position: 'relative', display: 'inline-block', marginBottom: 18 }}>
                <div style={{
                  width: 76, height: 76, borderRadius: 24,
                  background: `linear-gradient(135deg, ${RED}, ${PURPLE})`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: `0 0 36px rgba(200,16,46,0.45), 0 12px 32px rgba(0,0,0,0.55)`,
                  margin: '0 auto',
                }}>
                  <LogoMark size={44} color="#fff" />
                </div>
                <div style={{
                  position: 'absolute', inset: -6, borderRadius: 30,
                  border: `1.5px solid rgba(200,16,46,0.4)`,
                  animation: 'pulse-ring 2.8s ease-out infinite',
                }} />
              </div>
              <div style={{
                fontFamily: 'var(--font-display)', fontSize: '1.6rem', fontWeight: 800,
                color: '#fff', letterSpacing: '-0.02em',
              }}>d-ash</div>
              <div style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.58rem', color: CYAN,
                letterSpacing: '0.2em', textTransform: 'uppercase', marginTop: 5,
              }}>BizOS Platform</div>
            </div>

            {/* ── Glass card ────────────────────────────── */}
            <div style={{
              position: 'relative',
              background: 'rgba(4, 10, 28, 0.8)',
              backdropFilter: 'blur(44px) saturate(1.8)',
              WebkitBackdropFilter: 'blur(44px) saturate(1.8)',
              borderRadius: 26,
              border: '1px solid rgba(0,212,255,0.14)',
              padding: '38px 34px',
              boxShadow: `
                0 0 0 1px rgba(0,212,255,0.06),
                0 4px 48px rgba(0,0,0,0.7),
                0 12px 100px rgba(0,0,0,0.45),
                inset 0 1px 0 rgba(255,255,255,0.07),
                inset 0 -1px 0 rgba(0,212,255,0.04),
                0 0 80px rgba(0,212,255,0.03)
              `,
              overflow: 'hidden',
            }}>
              {/* Top accent gradient line */}
              <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, height: 2,
                background: `linear-gradient(90deg, transparent, ${RED} 30%, ${GOLD} 50%, ${RED} 70%, transparent)`,
                borderRadius: '26px 26px 0 0',
              }} />

              {/* Corner shine */}
              <div style={{
                position: 'absolute', top: 0, left: 0,
                width: '55%', height: '45%',
                background: `radial-gradient(ellipse at top left, rgba(0,212,255,0.07) 0%, transparent 65%)`,
                pointerEvents: 'none',
              }} />

              {/* Scanline sweep */}
              <div style={{
                position: 'absolute', left: 0, right: 0, top: 0,
                height: 2,
                background: `linear-gradient(90deg, transparent, rgba(0,212,255,0.5) 30%, rgba(0,212,255,0.7) 50%, rgba(0,212,255,0.5) 70%, transparent)`,
                animation: 'scanline 8s ease-in-out infinite',
                pointerEvents: 'none',
                zIndex: 10,
                filter: 'blur(0.5px)',
              }} />

              {/* Card header */}
              <div style={{ position: 'relative', zIndex: 1, marginBottom: 28 }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14,
                }}>
                  <div style={{
                    width: 7, height: 7, borderRadius: '50%',
                    background: '#00FF80',
                    boxShadow: '0 0 10px #00FF80',
                    animation: 'status-blink 2.5s ease-in-out infinite',
                  }} />
                  <span style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.58rem', fontWeight: 700,
                    color: 'rgba(0,255,128,0.8)',
                    letterSpacing: '0.16em', textTransform: 'uppercase',
                  }}>
                    Secure Portal · Auth Required
                  </span>
                </div>

                <h1 style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 'clamp(1.5rem, 4vw, 1.8rem)',
                  fontWeight: 800, color: '#fff',
                  lineHeight: 1.1, letterSpacing: '-0.025em',
                  marginBottom: 8,
                }}>
                  Welcome back
                </h1>
                <p style={{
                  color: 'rgba(255,255,255,0.36)', fontSize: '0.82rem', lineHeight: 1.5,
                }}>
                  Sign in to your Dash & Co. account
                </p>
              </div>

              {/* Form */}
              <form
                onSubmit={handleSubmit}
                style={{ display: 'flex', flexDirection: 'column', gap: 16, position: 'relative', zIndex: 1 }}
              >
                {/* Email field */}
                <div>
                  <label
                    htmlFor="login-email"
                    style={{
                      display: 'block',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.58rem', fontWeight: 700,
                      color: emailFocused ? CYAN : 'rgba(255,255,255,0.36)',
                      letterSpacing: '0.14em', textTransform: 'uppercase',
                      marginBottom: 8, transition: 'color 0.2s',
                    }}
                  >
                    Email Address
                  </label>
                  <input
                    id="login-email"
                    type="email"
                    className="gl-input"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onFocus={() => setEmailFocused(true)}
                    onBlur={() => setEmailFocused(false)}
                    placeholder="your@email.com"
                    required
                    autoComplete="email"
                    autoFocus
                  />
                </div>

                {/* Password field */}
                <div>
                  <label
                    htmlFor="login-password"
                    style={{
                      display: 'block',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.58rem', fontWeight: 700,
                      color: pwdFocused ? CYAN : 'rgba(255,255,255,0.36)',
                      letterSpacing: '0.14em', textTransform: 'uppercase',
                      marginBottom: 8, transition: 'color 0.2s',
                    }}
                  >
                    Password
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      id="login-password"
                      type={showPwd ? 'text' : 'password'}
                      className={`gl-input${error ? ' has-error' : ''}`}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onFocus={() => setPwdFocused(true)}
                      onBlur={() => setPwdFocused(false)}
                      placeholder="••••••••"
                      required
                      autoComplete="current-password"
                      style={{ paddingRight: 48 }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPwd(!showPwd)}
                      style={{
                        position: 'absolute', right: 13, top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none', border: 'none',
                        color: 'rgba(255,255,255,0.28)',
                        cursor: 'pointer', padding: 4,
                        display: 'flex', alignItems: 'center',
                        transition: 'color 0.2s',
                      }}
                      aria-label={showPwd ? 'Hide password' : 'Show password'}
                    >
                      {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* Error message */}
                <AnimatePresence>
                  {error && (
                    <motion.div
                      key="error"
                      initial={{ opacity: 0, y: -8, height: 0 }}
                      animate={{ opacity: 1, y: 0, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      style={{
                        padding: '10px 14px', borderRadius: 11,
                        background: 'rgba(255,77,106,0.08)',
                        border: '1px solid rgba(255,77,106,0.28)',
                        display: 'flex', alignItems: 'center', gap: 10,
                        overflow: 'hidden',
                      }}
                    >
                      <div style={{
                        width: 6, height: 6, borderRadius: '50%',
                        background: '#FF4D6A', flexShrink: 0,
                        boxShadow: '0 0 8px rgba(255,77,106,0.6)',
                      }} />
                      <span style={{ color: '#FF7A8E', fontSize: '0.78rem', lineHeight: 1.4 }}>{error}</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Submit */}
                <button
                  type="submit"
                  className="auth-btn"
                  disabled={loading}
                  style={{ marginTop: 4 }}
                >
                  {loading ? (
                    <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Authenticating…</>
                  ) : (
                    <><Lock size={15} /> Sign In</>
                  )}
                </button>
              </form>

              {/* Card footer */}
              <div style={{
                marginTop: 26, paddingTop: 20,
                borderTop: '1px solid rgba(255,255,255,0.05)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0,
                position: 'relative', zIndex: 1,
              }}>
                {['Encrypted', 'AES-256', 'JWT Auth'].map((t, i) => (
                  <span key={t} style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.52rem', color: 'rgba(255,255,255,0.18)',
                    letterSpacing: '0.1em', textTransform: 'uppercase',
                    display: 'flex', alignItems: 'center',
                  }}>
                    {i > 0 && (
                      <span style={{ margin: '0 10px', opacity: 0.3, fontSize: '0.6rem' }}>·</span>
                    )}
                    {t}
                  </span>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </>
  );
}
