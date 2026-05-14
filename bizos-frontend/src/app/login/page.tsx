'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api/client';
import { useAuthStore } from '@/lib/stores/authStore';
import { LoginResponse } from '@/types/api';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { LogoMark } from '@/components/layout/LogoMark';

export default function LoginPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
    <div style={{
      minHeight: '100vh', background: 'var(--bg-base)',
      display: 'flex', overflow: 'hidden', position: 'relative',
    }}>
      {/* Ambient orbs for login page */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
        background: `
          radial-gradient(ellipse 80% 50% at 10% 0%, rgba(200,16,46,0.1) 0%, transparent 60%),
          radial-gradient(ellipse 60% 40% at 90% 100%, rgba(212,165,53,0.07) 0%, transparent 55%)
        `,
      }} />
      {/* === LEFT BRAND PANEL === */}
      <div
        className="login-brand-panel"
        style={{
          display: 'none',
          width: 480, flexShrink: 0,
          background: 'linear-gradient(160deg, #8B0018 0%, #C8102E 45%, #A01025 100%)',
          flexDirection: 'column', justifyContent: 'space-between',
          padding: 'var(--space-10)',
          position: 'relative', overflow: 'hidden',
          zIndex: 1,
        }}
      >
        {/* Pattern overlay */}
        <div style={{
          position: 'absolute', inset: 0, opacity: 0.06,
          backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
          backgroundSize: '28px 28px',
        }} />
        {/* Glow orbs */}
        <div style={{
          position: 'absolute', bottom: -120, right: -80, width: 400, height: 400,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,255,255,0.12) 0%, transparent 70%)',
          animation: 'float 8s ease-in-out infinite',
        }} />
        <div style={{
          position: 'absolute', top: -80, left: -60, width: 300, height: 300,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,255,255,0.06) 0%, transparent 70%)',
          animation: 'float 12s ease-in-out infinite reverse',
        }} />

        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          style={{ position: 'relative', zIndex: 1 }}
        >
          {/* Logo mark */}
          <div style={{ marginBottom: 'var(--space-10)' }}>
            <LogoMark size={52} color="#fff" />
          </div>

          {/* Wordmark */}
          <div style={{ marginBottom: 'var(--space-4)' }}>
            <div style={{
              fontFamily: 'var(--font-display)', fontSize: '2.8rem',
              fontWeight: 800, color: '#fff', lineHeight: 1,
              letterSpacing: '-0.02em',
            }}>
              d-ash
            </div>
            <div style={{
              fontSize: 'var(--text-lg)', fontWeight: 700, color: 'rgba(255,255,255,0.7)',
              letterSpacing: '0.05em', textTransform: 'uppercase',
              marginTop: 4,
            }}>
              Dash & Co.
            </div>
            <div style={{
              fontSize: 'var(--text-xs)', color: 'rgba(255,255,255,0.5)',
              textTransform: 'uppercase', letterSpacing: '0.12em', marginTop: 2,
            }}>
              Digital & Hardware Solutions
            </div>
          </div>

          <div style={{
            width: 40, height: 3, background: 'rgba(255,255,255,0.4)',
            borderRadius: 2, marginBottom: 'var(--space-6)',
          }} />

          <p style={{
            fontSize: 'var(--text-base)', color: 'rgba(255,255,255,0.75)',
            lineHeight: 1.7, maxWidth: 320,
          }}>
            Your complete business & personal finance command centre.
          </p>
        </motion.div>

        {/* Bottom features */}
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3, duration: 0.5 }}
          style={{ position: 'relative', zIndex: 1 }}
        >
          {[
            'Repair job tracking & profitability',
            'Live P&L — profit computed in real time',
            'Inventory, sales & expense management',
            'Offline-first PWA — works without internet',
          ].map((f) => (
            <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <div style={{
                width: 18, height: 18, borderRadius: 6,
                background: 'rgba(255,255,255,0.15)',
                border: '1px solid rgba(255,255,255,0.25)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
                fontSize: '0.6rem', color: '#fff', fontWeight: 800,
              }}>✓</div>
              <span style={{ fontSize: 'var(--text-sm)', color: 'rgba(255,255,255,0.7)' }}>{f}</span>
            </div>
          ))}
          <p style={{ fontSize: 'var(--text-xs)', color: 'rgba(255,255,255,0.3)', marginTop: 'var(--space-6)' }}>
            © 2024 Dash & Co. Brand Guidelines
          </p>
        </motion.div>
      </div>

      {/* === RIGHT FORM PANEL === */}
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center',
        justifyContent: 'center', padding: 'var(--space-8)',
        position: 'relative', zIndex: 1,
      }}>
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          style={{ width: '100%', maxWidth: 400 }}
        >
          {/* Mobile-only logo */}
          <div className="mobile-brand" style={{ textAlign: 'center', marginBottom: 'var(--space-8)' }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: 64, height: 64, borderRadius: 20,
              background: 'linear-gradient(135deg, #C8102E, #7B0018)',
              marginBottom: 'var(--space-4)',
              boxShadow: '0 8px 32px rgba(200,16,46,0.4)',
            }}>
              <LogoMark size={38} color="#fff" />
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-2xl)', fontWeight: 800 }}>
              d-ash
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)', letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: 2 }}>
              Dash & Co.
            </p>
          </div>

          {/* Card */}
          <div style={{
            background: 'var(--glass-bg-strong)',
            backdropFilter: 'blur(24px) saturate(1.5)',
            WebkitBackdropFilter: 'blur(24px) saturate(1.5)',
            border: '1px solid var(--glass-border-shine)',
            borderRadius: 24,
            padding: 'var(--space-8)',
            boxShadow: '0 24px 80px rgba(0,0,0,0.5), 0 8px 24px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.08)',
            position: 'relative', overflow: 'hidden',
          }}>
            {/* Top accent */}
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, height: 2,
              background: 'linear-gradient(90deg, transparent, #C8102E, #D4A535, #C8102E, transparent)',
              borderRadius: '24px 24px 0 0',
              pointerEvents: 'none',
            }} />
            {/* Shine */}
            <div style={{
              position: 'absolute', inset: 0, borderRadius: 'inherit',
              background: 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, transparent 50%)',
              pointerEvents: 'none',
            }} />
            <h2 style={{
              fontFamily: 'var(--font-display)', fontSize: 'var(--text-xl)',
              fontWeight: 700, marginBottom: 4,
            }}>
              Welcome back
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-6)' }}>
              Sign in to your Dash & Co. account
            </p>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              {/* Email — floating label */}
              <div className="form-field" style={{ marginBottom: 0 }}>
                <input
                  id="email" type="email" className="input"
                  value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder=" " required autoComplete="email" autoFocus
                />
                <label className="float-label" htmlFor="email">Email address</label>
              </div>

              {/* Password — floating label */}
              <div className="form-field" style={{ marginBottom: 0 }}>
                <input
                  id="password" type={showPassword ? 'text' : 'password'}
                  className="input" value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder=" " required autoComplete="current-password"
                  style={{ paddingRight: 44 }}
                />
                <label className="float-label" htmlFor="password">Password</label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', color: 'var(--text-muted)',
                    cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center',
                    zIndex: 2,
                  }}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                  style={{
                    background: 'rgba(200,16,46,0.08)', border: '1px solid rgba(200,16,46,0.25)',
                    borderRadius: 'var(--input-radius)', padding: 'var(--space-3) var(--space-4)',
                    color: '#C8102E', fontSize: 'var(--text-sm)',
                  }}
                >
                  {error}
                </motion.div>
              )}

              <button
                type="submit" className="btn-primary" disabled={loading}
                style={{
                  width: '100%', justifyContent: 'center',
                  padding: '14px', fontSize: 'var(--text-base)',
                  marginTop: 'var(--space-2)', borderRadius: 12,
                }}
              >
                {loading
                  ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Signing in…</>
                  : 'Sign in'
                }
              </button>
            </form>
          </div>
        </motion.div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (min-width: 860px) {
          .login-brand-panel { display: flex !important; }
          .mobile-brand { display: none !important; }
        }
      `}</style>
    </div>
  );
}
