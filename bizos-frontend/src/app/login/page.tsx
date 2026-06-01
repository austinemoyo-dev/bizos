'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api/client';
import { useAuthStore } from '@/lib/stores/authStore';
import { LoginResponse } from '@/types/api';
import { Eye, EyeOff, Loader2, Fingerprint, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { authenticateWithBiometric, isBiometricAvailable } from '@/lib/capacitor/biometric';

export default function LoginPage() {
  const router = useRouter();
  const { setAuth, hasSavedSession, refreshSession, loadFromStorage } = useAuthStore();
  const [email,      setEmail]      = useState('');
  const [password,   setPassword]   = useState('');
  const [showPwd,    setShowPwd]    = useState(false);
  const [loading,    setLoading]    = useState(false);
  const [bioLoading, setBioLoading] = useState(false);
  const [warmingUp,  setWarmingUp]  = useState(false);
  const [error,      setError]      = useState('');
  const [mounted,    setMounted]    = useState(false);
  const [savedName,  setSavedName]  = useState<string | null>(null);
  const [rememberMe, setRememberMe] = useState(true);
  const [bioAvailable, setBioAvailable] = useState(false);
  const warmupRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setMounted(true);
    // Pre-fill email and show biometric option if there's a saved session
    try {
      const userJson = localStorage.getItem('bizos_user');
      if (userJson && hasSavedSession()) {
        const user = JSON.parse(userJson);
        setSavedName(user.name ?? user.email ?? null);
        setEmail(user.email ?? '');
      }
    } catch {}
    // Check if device has fingerprint/face hardware
    isBiometricAvailable().then(setBioAvailable);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setWarmingUp(false);

    // Show "server waking up" note after 8 s (Render.com cold starts)
    warmupRef.current = setTimeout(() => setWarmingUp(true), 8_000);
    // Belt-and-suspenders timeout — AbortController can be unreliable in Android WebView
    const manualAbort = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Server took too long. It may be waking up — please try again in a moment.')), 50_000)
    );

    try {
      const data = await Promise.race([
        api.post<LoginResponse>('/auth/login', { email, password }, { skipAuth: true }),
        manualAbort,
      ]);
      clearTimeout(warmupRef.current!);
      setAuth(data.user, data.access_token, data.refresh_token, rememberMe);
      router.push('/business/dashboard');
    } catch (err) {
      clearTimeout(warmupRef.current!);
      setWarmingUp(false);
      setError(err instanceof Error ? err.message : 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  const handleBiometricLogin = async () => {
    setBioLoading(true);
    setError('');
    try {
      const passed = await authenticateWithBiometric();
      if (!passed) { setError('Biometric verification failed. Please use your password.'); return; }

      // Try refresh token first
      const ok = await refreshSession();
      if (ok) { router.push('/business/dashboard'); return; }

      // Refresh token expired — load user from storage and ask for password
      loadFromStorage();
      setError('Your session expired. Please enter your password once to continue.');
    } catch {
      setError('Biometric login failed. Please use your password.');
    } finally {
      setBioLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');

        /* ── Animations ── */
        @keyframes lamp-swing {
          0%, 100% { transform: rotate(-1.5deg); }
          50%      { transform: rotate(1.5deg); }
        }
        @keyframes float-up {
          0%, 100% { transform: translateY(0); }
          50%      { transform: translateY(-6px); }
        }
        @keyframes pulse-ring {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50%      { opacity: 0.8; transform: scale(1.05); }
        }
        @keyframes shimmer-line {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(300%); }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes bg-orb-1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33%      { transform: translate(40px, -30px) scale(1.08); }
          66%      { transform: translate(-20px, 20px) scale(0.95); }
        }
        @keyframes bg-orb-2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50%      { transform: translate(-50px, 40px) scale(1.12); }
        }
        @keyframes bg-orb-3 {
          0%, 100% { transform: translate(0, 0) scale(1) rotate(0deg); }
          50%      { transform: translate(30px, -20px) scale(1.05) rotate(15deg); }
        }
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(30px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes particle-float {
          0%, 100% { transform: translateY(0) translateX(0); opacity: 0.3; }
          25%      { transform: translateY(-20px) translateX(5px); opacity: 0.7; }
          50%      { transform: translateY(-35px) translateX(-3px); opacity: 0.5; }
          75%      { transform: translateY(-15px) translateX(8px); opacity: 0.4; }
        }

        /* ── Glass inputs ── */
        .login-input {
          width: 100%;
          background: rgba(255,255,255,0.06);
          border: 1.5px solid rgba(255,255,255,0.1);
          border-radius: 14px;
          padding: 15px 18px;
          color: #fff;
          font-size: 0.95rem;
          outline: none;
          transition: border-color 0.3s, box-shadow 0.3s, background 0.3s;
          font-family: 'Inter', sans-serif;
          box-sizing: border-box;
          caret-color: #E8A94A;
          -webkit-appearance: none;
          letter-spacing: 0.01em;
        }
        .login-input::placeholder { color: rgba(255,255,255,0.2); }
        .login-input:focus {
          border-color: rgba(232,169,74,0.5);
          background: rgba(232,169,74,0.04);
          box-shadow: 0 0 0 3px rgba(232,169,74,0.1), 0 0 24px rgba(232,169,74,0.05);
        }
        .login-input.has-error:focus {
          border-color: rgba(255,77,106,0.6);
          box-shadow: 0 0 0 3px rgba(255,77,106,0.12);
        }

        /* ── Submit button ── */
        .login-btn {
          width: 100%;
          padding: 16px;
          border: 1.5px solid rgba(139,15,43,0.4);
          border-radius: 14px;
          background: linear-gradient(135deg, rgba(139,15,43,0.7) 0%, rgba(107,15,43,0.4) 100%);
          backdrop-filter: blur(12px);
          color: #fff;
          font-size: 1rem;
          font-weight: 700;
          cursor: pointer;
          position: relative;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          letter-spacing: 0.04em;
          font-family: 'Inter', sans-serif;
          transition: transform 0.15s, box-shadow 0.3s, background 0.3s, border-color 0.3s;
          box-shadow: 0 4px 24px rgba(139,15,43,0.3), inset 0 1px 0 rgba(255,255,255,0.08);
        }
        .login-btn::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, rgba(255,255,255,0.08) 0%, transparent 50%);
          pointer-events: none;
        }
        .login-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          background: linear-gradient(135deg, rgba(139,15,43,0.85) 0%, rgba(107,15,43,0.55) 100%);
          border-color: rgba(139,15,43,0.6);
          box-shadow: 0 8px 40px rgba(139,15,43,0.45), inset 0 1px 0 rgba(255,255,255,0.1);
        }
        .login-btn:active:not(:disabled) { transform: scale(0.98); }
        .login-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        /* ── Responsive ── */
        @media (max-width: 480px) {
          .login-card-wrap { margin: 0 8px !important; padding: 32px 22px !important; }
          .login-input { padding: 14px 16px; font-size: 16px !important; }
          .lamp-assembly { transform: scale(0.85) !important; }
        }

        /* Override global html/body overflow:hidden for login page */
        html, body {
          overflow: auto !important;
          overflow-x: hidden !important;
          overscroll-behavior-y: auto !important;
        }
      `}</style>

      {/* ─── Full-screen background ─── */}
      <div style={{
        minHeight: '100dvh',
        background: 'linear-gradient(160deg, #0A0505 0%, #1A0C08 25%, #120806 50%, #0A0408 75%, #080406 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflowX: 'hidden',
        padding: '40px 20px',
        fontFamily: "'Inter', sans-serif",
      }}>

        {/* ── Ambient background orbs ── */}
        <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
          {/* Warm orb top-right */}
          <div style={{
            position: 'absolute', top: '-15%', right: '-10%',
            width: '60vw', height: '60vw', maxWidth: 700, maxHeight: 700,
            borderRadius: '40% 60% 55% 45% / 50% 40% 60% 50%',
            background: 'radial-gradient(ellipse, rgba(232,169,74,0.08) 0%, rgba(200,100,30,0.03) 40%, transparent 65%)',
            animation: 'bg-orb-1 20s ease-in-out infinite',
            filter: 'blur(40px)',
          }} />
          {/* Deep red orb bottom-left */}
          <div style={{
            position: 'absolute', bottom: '-20%', left: '-15%',
            width: '55vw', height: '55vw', maxWidth: 650, maxHeight: 650,
            borderRadius: '55% 45% 40% 60% / 45% 55% 50% 50%',
            background: 'radial-gradient(ellipse, rgba(139,15,43,0.1) 0%, rgba(80,8,20,0.04) 45%, transparent 65%)',
            animation: 'bg-orb-2 25s ease-in-out infinite',
            filter: 'blur(50px)',
          }} />
          {/* Subtle warm center */}
          <div style={{
            position: 'absolute', top: '40%', left: '30%',
            width: '40vw', height: '40vw', maxWidth: 500, maxHeight: 500,
            borderRadius: '50%',
            background: 'radial-gradient(ellipse, rgba(200,120,50,0.05) 0%, transparent 55%)',
            animation: 'bg-orb-3 18s ease-in-out infinite',
            filter: 'blur(35px)',
          }} />
          {/* Subtle noise grid */}
          <div style={{
            position: 'absolute', inset: 0, opacity: 0.25,
            backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.02) 1px, transparent 0)',
            backgroundSize: '32px 32px',
          }} />
        </div>

        {/* ─── LAMP ASSEMBLY ─── */}
        <div className="lamp-assembly" style={{
          position: 'relative',
          zIndex: 2,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          marginBottom: -2,
        }}>
          {/* Ceiling mount bar */}
          <div style={{
            width: 60,
            height: 3,
            background: 'linear-gradient(90deg, rgba(120,90,60,0.3), rgba(180,140,80,0.5), rgba(120,90,60,0.3))',
            borderRadius: 2,
            boxShadow: '0 1px 6px rgba(0,0,0,0.4)',
          }} />

          {/* Cord / wire */}
          <div style={{
            width: 2,
            height: 50,
            background: 'linear-gradient(180deg, rgba(150,120,80,0.4), rgba(100,80,50,0.2))',
            borderRadius: 1,
          }} />

          {/* Lamp head — swings gently */}
          <motion.div
            animate={{ rotate: [-1.5, 1.5, -1.5] }}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
            style={{
              transformOrigin: 'top center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            {/* Lamp shade (trapezoid shape) */}
            <div style={{
              width: 60,
              height: 30,
              background: 'linear-gradient(180deg, #2A2018 0%, #1A1410 100%)',
              borderRadius: '6px 6px 0 0',
              clipPath: 'polygon(15% 0%, 85% 0%, 100% 100%, 0% 100%)',
              boxShadow: 'inset 0 -2px 8px rgba(232,169,74,0.15), 0 2px 10px rgba(0,0,0,0.5)',
              position: 'relative',
              border: '1px solid rgba(180,140,80,0.15)',
              borderBottom: 'none',
            }} />

            {/* Light bulb */}
            <motion.div
              animate={{
                boxShadow: showPwd
                  ? '0 0 30px rgba(255,200,100,0.8), 0 0 60px rgba(255,180,80,0.5), 0 0 100px rgba(255,160,60,0.3)'
                  : '0 0 12px rgba(255,200,100,0.3), 0 0 25px rgba(255,180,80,0.15), 0 0 40px rgba(255,160,60,0.08)',
              }}
              transition={{ duration: 0.6, ease: 'easeInOut' }}
              style={{
                width: 16,
                height: 16,
                borderRadius: '50%',
                background: showPwd
                  ? 'radial-gradient(circle, #FFF8E0 20%, #FFD870 60%, #E8A94A 100%)'
                  : 'radial-gradient(circle, #FFE8B8 20%, #C8963A 60%, #8A6828 100%)',
                transition: 'background 0.6s ease',
                marginTop: -1,
              }}
            />

            {/* Cone of light */}
            <motion.div
              animate={{
                opacity: showPwd ? 1 : 0.35,
                background: showPwd
                  ? 'linear-gradient(180deg, rgba(255,210,120,0.25) 0%, rgba(255,200,100,0.1) 30%, rgba(255,180,80,0.03) 60%, transparent 100%)'
                  : 'linear-gradient(180deg, rgba(255,200,120,0.1) 0%, rgba(255,180,80,0.04) 30%, rgba(255,160,60,0.01) 60%, transparent 100%)',
              }}
              transition={{ duration: 0.6, ease: 'easeInOut' }}
              style={{
                width: 30,
                height: 220,
                clipPath: 'polygon(20% 0%, 80% 0%, 100% 100%, 0% 100%)',
                marginTop: -2,
                filter: 'blur(8px)',
                pointerEvents: 'none',
              }}
            />
          </motion.div>

          {/* Wide light glow on card area */}
          <motion.div
            animate={{
              opacity: showPwd ? 0.6 : 0.18,
              scale: showPwd ? 1.1 : 1,
            }}
            transition={{ duration: 0.6, ease: 'easeInOut' }}
            style={{
              position: 'absolute',
              bottom: -200,
              left: '50%',
              transform: 'translateX(-50%)',
              width: 500,
              height: 350,
              background: 'radial-gradient(ellipse at top, rgba(255,210,120,0.15) 0%, rgba(255,180,80,0.06) 35%, transparent 65%)',
              pointerEvents: 'none',
              filter: 'blur(20px)',
            }}
          />
        </div>

        {/* ─── Glass login card ─── */}
        <motion.div
          initial={mounted ? { opacity: 0, y: 40, scale: 0.96 } : false}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="login-card-wrap"
          style={{
            position: 'relative',
            zIndex: 1,
            width: '100%',
            maxWidth: 400,
            background: 'rgba(18, 12, 10, 0.55)',
            backdropFilter: 'blur(40px) saturate(1.5)',
            WebkitBackdropFilter: 'blur(40px) saturate(1.5)',
            borderRadius: 28,
            border: '1px solid rgba(255,255,255,0.08)',
            padding: '42px 36px',
            boxShadow: `
              0 0 0 1px rgba(255,255,255,0.03),
              0 8px 60px rgba(0,0,0,0.6),
              0 20px 80px rgba(0,0,0,0.4),
              inset 0 1px 0 rgba(255,255,255,0.05)
            `,
            overflow: 'hidden',
          }}
        >
          {/* Light reflection on card top — reacts to lamp state */}
          <motion.div
            animate={{
              opacity: showPwd ? 0.12 : 0.04,
            }}
            transition={{ duration: 0.6, ease: 'easeInOut' }}
            style={{
              position: 'absolute',
              top: -50,
              left: '50%',
              transform: 'translateX(-50%)',
              width: 300,
              height: 200,
              background: 'radial-gradient(ellipse, rgba(255,220,140,0.3) 0%, rgba(255,200,100,0.1) 30%, transparent 60%)',
              pointerEvents: 'none',
              filter: 'blur(25px)',
              borderRadius: '50%',
            }}
          />

          {/* Top shimmer line */}
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: 1.5,
            background: 'linear-gradient(90deg, transparent, rgba(232,169,74,0.3), rgba(232,169,74,0.6), rgba(232,169,74,0.3), transparent)',
            borderRadius: '28px 28px 0 0',
            overflow: 'hidden',
          }}>
            <div style={{
              width: '50%', height: '100%',
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)',
              animation: 'shimmer-line 5s ease-in-out infinite',
            }} />
          </div>

          {/* Glass shine overlay */}
          <motion.div
            animate={{
              opacity: showPwd ? 0.06 : 0.03,
            }}
            transition={{ duration: 0.6, ease: 'easeInOut' }}
            style={{
              position: 'absolute', top: 0, left: 0,
              width: '100%', height: '55%',
              background: 'linear-gradient(180deg, rgba(255,255,255,0.05) 0%, transparent 100%)',
              borderRadius: '28px 28px 0 0',
              pointerEvents: 'none',
            }}
          />

          {/* Edge reflections for glass effect */}
          <div style={{
            position: 'absolute', top: 0, left: 0,
            width: '100%', height: '100%',
            borderRadius: 28,
            background: 'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, transparent 30%, transparent 70%, rgba(255,255,255,0.02) 100%)',
            pointerEvents: 'none',
          }} />

          {/* ── Logo ── */}
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.5 }}
            style={{ textAlign: 'center', marginBottom: 28, position: 'relative', zIndex: 1 }}
          >
            <div style={{
              display: 'inline-flex',
              position: 'relative',
              animation: 'float-up 5s ease-in-out infinite',
            }}>
              <div style={{
                width: 72,
                height: 72,
                borderRadius: 22,
                background: 'linear-gradient(145deg, rgba(139,15,43,0.3) 0%, rgba(107,15,43,0.15) 100%)',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(139,15,43,0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 30px rgba(139,15,43,0.15), 0 8px 32px rgba(0,0,0,0.4)',
                overflow: 'hidden',
              }}>
                <Image
                  src="/logo.png"
                  alt="Logo"
                  width={48}
                  height={48}
                  style={{ objectFit: 'contain', filter: 'brightness(1.1)' }}
                  priority
                />
              </div>
              {/* Glow ring */}
              <motion.div
                animate={{ opacity: [0.3, 0.6, 0.3], scale: [1, 1.04, 1] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                style={{
                  position: 'absolute', inset: -6, borderRadius: 28,
                  border: '1.5px solid rgba(232,169,74,0.15)',
                }}
              />
            </div>

            <div style={{
              fontSize: '0.85rem',
              fontWeight: 700,
              color: 'rgba(255,255,255,0.35)',
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
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
            style={{ textAlign: 'center', marginBottom: 28, position: 'relative', zIndex: 1 }}
          >
            <h1 style={{
              fontSize: 'clamp(1.4rem, 5vw, 1.7rem)',
              fontWeight: 700,
              color: '#fff',
              lineHeight: 1.2,
              letterSpacing: '-0.02em',
              marginBottom: 6,
            }}>
              Welcome Back
            </h1>
            <p style={{
              fontSize: '0.82rem',
              color: 'rgba(255,255,255,0.3)',
              fontWeight: 400,
              margin: 0,
            }}>
              Sign in to your account
            </p>
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
                  display: 'block', fontSize: '0.75rem', fontWeight: 600,
                  color: 'rgba(255,255,255,0.4)',
                  marginBottom: 8, letterSpacing: '0.03em',
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
                disabled={loading || bioLoading}
              />
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="login-password"
                style={{
                  display: 'block', fontSize: '0.75rem', fontWeight: 600,
                  color: 'rgba(255,255,255,0.4)',
                  marginBottom: 8, letterSpacing: '0.03em',
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
                  disabled={loading || bioLoading}
                  style={{ paddingRight: 48 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  style={{
                    position: 'absolute', right: 14, top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none', border: 'none',
                    color: showPwd ? 'rgba(232,169,74,0.8)' : 'rgba(255,255,255,0.25)',
                    cursor: 'pointer', padding: 4,
                    display: 'flex', alignItems: 'center',
                    transition: 'color 0.3s',
                  }}
                  aria-label={showPwd ? 'Hide password' : 'Show password'}
                >
                  {showPwd ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>

            {/* Remember me + Forgot password */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: -4 }}>
              {/* Remember me checkbox */}
              <button
                type="button"
                onClick={() => setRememberMe(v => !v)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                }}
              >
                <span style={{
                  width: 20, height: 20, borderRadius: 6, flexShrink: 0,
                  border: `1.5px solid ${rememberMe ? 'rgba(232,169,74,0.7)' : 'rgba(255,255,255,0.18)'}`,
                  background: rememberMe ? 'rgba(232,169,74,0.15)' : 'rgba(255,255,255,0.04)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.2s',
                }}>
                  {rememberMe && <Check size={12} style={{ color: 'rgba(232,169,74,0.95)' }} />}
                </span>
                <span style={{ fontSize: '0.76rem', color: 'rgba(255,255,255,0.4)', fontFamily: "'Inter', sans-serif" }}>
                  Remember me
                </span>
              </button>

              <span style={{
                fontSize: '0.73rem', color: 'rgba(255,255,255,0.3)',
                cursor: 'pointer', transition: 'color 0.2s',
              }}
                onMouseEnter={(e) => e.currentTarget.style.color = 'rgba(232,169,74,0.8)'}
                onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255,255,255,0.3)'}
              >
                Forgot Password?
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
                    border: '1px solid rgba(255,77,106,0.2)',
                    overflow: 'hidden',
                  }}
                >
                  <span style={{ color: '#FF7A8E', fontSize: '0.82rem', lineHeight: 1.4 }}>{error}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Warming-up notice */}
            <AnimatePresence>
              {warmingUp && (
                <motion.div
                  key="warmup"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  style={{
                    padding: '10px 14px', borderRadius: 10,
                    background: 'rgba(232,169,74,0.08)',
                    border: '1px solid rgba(232,169,74,0.2)',
                  }}
                >
                  <span style={{ color: 'rgba(232,169,74,0.9)', fontSize: '0.78rem', lineHeight: 1.5 }}>
                    ⏳ Server is waking up — this takes ~30 seconds on first login. Please wait…
                  </span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Login button */}
            <button
              type="submit"
              className="login-btn"
              disabled={loading || bioLoading}
              style={{ marginTop: 4 }}
            >
              {loading ? (
                <><Loader2 size={17} style={{ animation: 'spin 1s linear infinite' }} /> {warmingUp ? 'Waking server…' : 'Signing in…'}</>
              ) : (
                'Login'
              )}
            </button>

            {/* Biometric quick-login — shows when device has fingerprint/face AND a saved session */}
            {(savedName || bioAvailable) && !loading && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' }}>
                {/* Divider */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%' }}>
                  <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.07)' }} />
                  <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.2)', letterSpacing: '0.06em' }}>OR</span>
                  <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.07)' }} />
                </div>

                <motion.button
                  type="button"
                  onClick={savedName ? handleBiometricLogin : undefined}
                  disabled={bioLoading || loading || !savedName}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  style={{
                    width: '100%', padding: '14px 16px',
                    border: savedName
                      ? '1.5px solid rgba(232,169,74,0.2)'
                      : '1.5px solid rgba(255,255,255,0.08)',
                    borderRadius: 14,
                    background: savedName ? 'rgba(232,169,74,0.06)' : 'rgba(255,255,255,0.03)',
                    backdropFilter: 'blur(12px)',
                    color: savedName ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.3)',
                    fontSize: '0.92rem', fontWeight: 600,
                    cursor: savedName && !bioLoading ? 'pointer' : 'default',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                    fontFamily: "'Inter', sans-serif",
                    transition: 'background 0.2s, border-color 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    if (savedName) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(232,169,74,0.1)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = savedName ? 'rgba(232,169,74,0.06)' : 'rgba(255,255,255,0.03)';
                  }}
                >
                  {bioLoading
                    ? <><Loader2 size={17} style={{ animation: 'spin 1s linear infinite' }} /> Verifying…</>
                    : savedName
                      ? <><Fingerprint size={19} style={{ color: 'rgba(232,169,74,0.85)' }} /> Continue as {savedName.split(' ')[0]}</>
                      : <><Fingerprint size={19} style={{ color: 'rgba(255,255,255,0.25)' }} /> Use fingerprint (remember me to enable)</>
                  }
                </motion.button>
              </div>
            )}
          </form>

          {/* ── Sign up link ── */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            style={{
              textAlign: 'center', marginTop: 26,
              position: 'relative', zIndex: 1,
            }}
          >
            <span style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.3)' }}>
              Are You New Member?{' '}
              <span
                style={{
                  fontWeight: 700, color: 'rgba(232,169,74,0.9)', cursor: 'pointer',
                  transition: 'color 0.2s',
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#E8A94A'}
                onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(232,169,74,0.9)'}
              >
                Sign Up
              </span>
            </span>
          </motion.div>

          {/* Floating particles inside card — ambient detail */}
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              style={{
                position: 'absolute',
                bottom: 20 + (i * 25),
                left: `${15 + (i * 18)}%`,
                width: 2,
                height: 2,
                borderRadius: '50%',
                background: `rgba(232,169,74,${0.1 + (i * 0.04)})`,
                animation: `particle-float ${4 + i}s ease-in-out infinite`,
                animationDelay: `${i * 0.8}s`,
                pointerEvents: 'none',
              }}
            />
          ))}
        </motion.div>

        {/* ── Ambient floor reflection ── */}
        <motion.div
          animate={{
            opacity: showPwd ? 0.2 : 0.06,
          }}
          transition={{ duration: 0.6, ease: 'easeInOut' }}
          style={{
            position: 'relative',
            zIndex: 0,
            width: 300,
            height: 80,
            marginTop: -20,
            background: 'radial-gradient(ellipse, rgba(255,200,120,0.15) 0%, transparent 70%)',
            filter: 'blur(20px)',
            pointerEvents: 'none',
          }}
        />
      </div>
    </>
  );
}
