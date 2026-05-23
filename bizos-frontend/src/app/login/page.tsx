'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api/client';
import { useAuthStore } from '@/lib/stores/authStore';
import { LoginResponse } from '@/types/api';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { LogoMark } from '@/components/layout/LogoMark';

export default function LoginPage() {
  const router      = useRouter();
  const { setAuth }  = useAuthStore();
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [showPwd,  setShowPwd]  = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');

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
        /* ── Animations ── */
        @keyframes bg-shift {
          0%, 100% { transform: translate(0, 0) scale(1); }
          25%      { transform: translate(30px, -50px) scale(1.05); }
          50%      { transform: translate(-20px, 20px) scale(0.97); }
          75%      { transform: translate(40px, 30px) scale(1.03); }
        }
        @keyframes bg-shift-2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33%      { transform: translate(-60px, 40px) scale(1.1); }
          66%      { transform: translate(50px, -30px) scale(0.93); }
        }
        @keyframes bg-shift-3 {
          0%, 100% { transform: translate(0, 0) scale(1) rotate(0deg); }
          50%      { transform: translate(20px, -40px) scale(1.08) rotate(30deg); }
        }
        @keyframes float-up {
          0%, 100% { transform: translateY(0); }
          50%      { transform: translateY(-10px); }
        }
        @keyframes pulse-soft {
          0%, 100% { opacity: 0.6; }
          50%      { opacity: 1; }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes card-in {
          from { opacity: 0; transform: translateY(40px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes shimmer-line {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }

        /* ── Glass input ── */
        .login-input {
          width: 100%;
          background: rgba(255,255,255,0.06);
          border: 1.5px solid rgba(255,255,255,0.12);
          border-radius: 14px;
          padding: 15px 18px;
          color: #fff;
          font-size: 1rem;
          outline: none;
          transition: border-color 0.25s, box-shadow 0.25s, background 0.25s;
          font-family: inherit;
          box-sizing: border-box;
          caret-color: #C8102E;
          -webkit-appearance: none;
        }
        .login-input::placeholder { color: rgba(255,255,255,0.25); }
        .login-input:focus {
          border-color: rgba(200,16,46,0.6);
          background: rgba(200,16,46,0.06);
          box-shadow: 0 0 0 3px rgba(200,16,46,0.12), 0 0 20px rgba(200,16,46,0.06);
        }
        .login-input.has-error:focus {
          border-color: rgba(255,77,106,0.6);
          box-shadow: 0 0 0 3px rgba(255,77,106,0.12);
        }

        /* ── Submit button ── */
        .login-btn {
          width: 100%;
          padding: 16px;
          border: 1.5px solid rgba(200,16,46,0.35);
          border-radius: 14px;
          background: linear-gradient(135deg, rgba(200,16,46,0.5) 0%, rgba(200,16,46,0.25) 100%);
          backdrop-filter: blur(12px);
          color: #fff;
          font-size: 1.05rem;
          font-weight: 700;
          cursor: pointer;
          position: relative;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          letter-spacing: 0.04em;
          transition: transform 0.15s, box-shadow 0.25s, background 0.25s, border-color 0.25s;
          box-shadow: 0 4px 24px rgba(200,16,46,0.25), inset 0 1px 0 rgba(255,255,255,0.1);
        }
        .login-btn::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, rgba(255,255,255,0.1) 0%, transparent 50%);
          pointer-events: none;
        }
        .login-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          background: linear-gradient(135deg, rgba(200,16,46,0.65) 0%, rgba(200,16,46,0.35) 100%);
          border-color: rgba(200,16,46,0.55);
          box-shadow: 0 8px 40px rgba(200,16,46,0.4), inset 0 1px 0 rgba(255,255,255,0.12);
        }
        .login-btn:active:not(:disabled) { transform: scale(0.98); }
        .login-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        /* ── Responsive ── */
        @media (max-width: 480px) {
          .login-card { margin: 0 8px !important; padding: 32px 24px !important; }
          .login-input { padding: 14px 16px; font-size: 16px !important; }
        }
      `}</style>

      {/* ─── Full-screen background ─── */}
      <div style={{
        minHeight: '100dvh',
        background: 'linear-gradient(160deg, #0A0206 0%, #1A0810 30%, #120408 55%, #080210 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
        padding: '20px',
      }}>

        {/* ── Animated background shapes ── */}
        <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
          {/* Shape 1 — large red blob top-right */}
          <div style={{
            position: 'absolute', top: '-20%', right: '-15%',
            width: '70vw', height: '70vw', maxWidth: 800, maxHeight: 800,
            borderRadius: '40% 60% 55% 45% / 50% 40% 60% 50%',
            background: 'radial-gradient(ellipse, rgba(200,16,46,0.18) 0%, rgba(200,16,46,0.04) 50%, transparent 70%)',
            animation: 'bg-shift 22s ease-in-out infinite',
            filter: 'blur(40px)',
          }} />
          {/* Shape 2 — dark red blob bottom-left */}
          <div style={{
            position: 'absolute', bottom: '-25%', left: '-20%',
            width: '65vw', height: '65vw', maxWidth: 750, maxHeight: 750,
            borderRadius: '55% 45% 40% 60% / 45% 55% 50% 50%',
            background: 'radial-gradient(ellipse, rgba(150,10,30,0.2) 0%, rgba(100,8,20,0.05) 50%, transparent 70%)',
            animation: 'bg-shift-2 26s ease-in-out infinite',
            filter: 'blur(50px)',
          }} />
          {/* Shape 3 — warm accent center */}
          <div style={{
            position: 'absolute', top: '30%', left: '20%',
            width: '45vw', height: '45vw', maxWidth: 550, maxHeight: 550,
            borderRadius: '50% 50% 40% 60% / 60% 40% 55% 45%',
            background: 'radial-gradient(ellipse, rgba(200,16,46,0.08) 0%, transparent 60%)',
            animation: 'bg-shift-3 18s ease-in-out infinite',
            filter: 'blur(35px)',
          }} />
          {/* Subtle grid */}
          <div style={{
            position: 'absolute', inset: 0, opacity: 0.3,
            backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(200,16,46,0.04) 1px, transparent 0)',
            backgroundSize: '40px 40px',
          }} />
        </div>

        {/* ─── Glass card ─── */}
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="login-card"
          style={{
            position: 'relative', zIndex: 1,
            width: '100%', maxWidth: 400,
            background: 'rgba(20, 8, 12, 0.6)',
            backdropFilter: 'blur(48px) saturate(1.6)',
            WebkitBackdropFilter: 'blur(48px) saturate(1.6)',
            borderRadius: 28,
            border: '1px solid rgba(200,16,46,0.15)',
            padding: '42px 36px',
            boxShadow: `
              0 0 0 1px rgba(255,255,255,0.04),
              0 8px 60px rgba(0,0,0,0.65),
              0 20px 100px rgba(200,16,46,0.08),
              inset 0 1px 0 rgba(255,255,255,0.06)
            `,
            overflow: 'hidden',
          }}
        >
          {/* Top shimmer line */}
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: 2,
            background: 'linear-gradient(90deg, transparent, rgba(200,16,46,0.5), rgba(200,16,46,0.8), rgba(200,16,46,0.5), transparent)',
            borderRadius: '28px 28px 0 0',
            overflow: 'hidden',
          }}>
            <div style={{
              width: '60%', height: '100%',
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)',
              animation: 'shimmer-line 4s ease-in-out infinite',
            }} />
          </div>

          {/* Glass shine overlay */}
          <div style={{
            position: 'absolute', top: 0, left: 0,
            width: '100%', height: '50%',
            background: 'linear-gradient(180deg, rgba(255,255,255,0.04) 0%, transparent 100%)',
            borderRadius: '28px 28px 0 0',
            pointerEvents: 'none',
          }} />

          {/* ── Logo ── */}
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.5 }}
            style={{ textAlign: 'center', marginBottom: 32, position: 'relative', zIndex: 1 }}
          >
            <div style={{
              display: 'inline-flex', position: 'relative',
              animation: 'float-up 4s ease-in-out infinite',
            }}>
              <div style={{
                width: 72, height: 72, borderRadius: 22,
                background: 'linear-gradient(145deg, #E01535 0%, #C8102E 55%, #9B0D22 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 0 40px rgba(200,16,46,0.4), 0 8px 32px rgba(0,0,0,0.5)',
              }}>
                <LogoMark size={42} color="#fff" />
              </div>
              {/* Glow ring */}
              <div style={{
                position: 'absolute', inset: -6, borderRadius: 28,
                border: '1.5px solid rgba(200,16,46,0.3)',
                animation: 'pulse-soft 3s ease-in-out infinite',
              }} />
            </div>

            <div style={{
              fontFamily: 'var(--font-display)',
              fontSize: '1.1rem', fontWeight: 800,
              color: 'rgba(255,255,255,0.5)',
              letterSpacing: '0.15em', textTransform: 'uppercase',
              marginTop: 14,
            }}>
              d-ash
            </div>
          </motion.div>

          {/* ── Welcome text ── */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.25, duration: 0.5 }}
            style={{ textAlign: 'center', marginBottom: 30, position: 'relative', zIndex: 1 }}
          >
            <h1 style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(1.4rem, 5vw, 1.75rem)',
              fontWeight: 700, color: '#fff',
              lineHeight: 1.2, letterSpacing: '-0.02em',
              marginBottom: 0,
            }}>
              Welcome Back
            </h1>
          </motion.div>

          {/* ── Form ── */}
          <form
            onSubmit={handleSubmit}
            style={{ display: 'flex', flexDirection: 'column', gap: 18, position: 'relative', zIndex: 1 }}
          >
            {/* Email */}
            <div>
              <label
                htmlFor="login-email"
                style={{
                  display: 'block', fontSize: '0.78rem', fontWeight: 600,
                  color: 'rgba(255,255,255,0.45)',
                  marginBottom: 8,
                }}
              >
                Email address
              </label>
              <input
                id="login-email"
                type="email"
                className="login-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                autoComplete="email"
                autoFocus
              />
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="login-password"
                style={{
                  display: 'block', fontSize: '0.78rem', fontWeight: 600,
                  color: 'rgba(255,255,255,0.45)',
                  marginBottom: 8,
                }}
              >
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id="login-password"
                  type={showPwd ? 'text' : 'password'}
                  className={`login-input${error ? ' has-error' : ''}`}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  style={{ paddingRight: 48 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  style={{
                    position: 'absolute', right: 14, top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none', border: 'none',
                    color: 'rgba(255,255,255,0.3)',
                    cursor: 'pointer', padding: 4,
                    display: 'flex', alignItems: 'center',
                    transition: 'color 0.2s',
                  }}
                  aria-label={showPwd ? 'Hide password' : 'Show password'}
                >
                  {showPwd ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>

            {/* Forgot password */}
            <div style={{ textAlign: 'right', marginTop: -6 }}>
              <span style={{
                fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)',
                cursor: 'pointer', transition: 'color 0.2s',
              }}
                onMouseEnter={(e) => e.currentTarget.style.color = 'rgba(200,16,46,0.8)'}
                onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255,255,255,0.35)'}
              >
                Forget Password?
              </span>
            </div>

            {/* Error */}
            <AnimatePresence>
              {error && (
                <motion.div
                  key="error"
                  initial={{ opacity: 0, y: -8, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  style={{
                    padding: '12px 16px', borderRadius: 12,
                    background: 'rgba(255,77,106,0.1)',
                    border: '1px solid rgba(255,77,106,0.25)',
                    overflow: 'hidden',
                  }}
                >
                  <span style={{ color: '#FF7A8E', fontSize: '0.82rem', lineHeight: 1.4 }}>{error}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Login button */}
            <button
              type="submit"
              className="login-btn"
              disabled={loading}
              style={{ marginTop: 4 }}
            >
              {loading ? (
                <><Loader2 size={17} style={{ animation: 'spin 1s linear infinite' }} /> Signing in…</>
              ) : (
                'Login'
              )}
            </button>
          </form>

          {/* ── Sign up link ── */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            style={{
              textAlign: 'center', marginTop: 28,
              position: 'relative', zIndex: 1,
            }}
          >
            <span style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.35)' }}>
              Are You New Member?{' '}
              <span
                style={{
                  fontWeight: 700, color: '#fff', cursor: 'pointer',
                  transition: 'color 0.2s',
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#C8102E'}
                onMouseLeave={(e) => e.currentTarget.style.color = '#fff'}
              >
                Sign UP
              </span>
            </span>
          </motion.div>
        </motion.div>
      </div>
    </>
  );
}
