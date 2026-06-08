import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Loader2 } from 'lucide-react';
import LoginBackground from '@/components/login/LoginBackground';
import RequestAccessDialog from '@/components/login/RequestAccessDialog';

const LOGO_URL = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69540f3779bf32f5ccc6335b/e8eca937a_image.png';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState('login'); // 'login' | 'forgot'
  const [resetSent, setResetSent] = useState(false);
  const [bgImages, setBgImages] = useState([]);
  const [bgInterval, setBgInterval] = useState(6);
  const [requestOpen, setRequestOpen] = useState(false);

  // Where to go after login — honour ?next= param, default to /app
  const params = new URLSearchParams(window.location.search);
  const nextUrl = params.get('next') || '/app';

  useEffect(() => {
    base44.functions.invoke('getLoginConfig', {})
      .then((res) => {
        setBgImages(res?.data?.background_images || []);
        setBgInterval(res?.data?.slideshow_interval_seconds || 6);
      })
      .catch(() => {});
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    if (!email || !password) {
      setError('Please enter your email and password.');
      return;
    }
    setLoading(true);
    try {
      await base44.auth.loginViaEmailPassword(email, password);
      window.location.href = nextUrl;
    } catch (err) {
      setError('Incorrect email or password. Please try again.');
      setLoading(false);
    }
  };

  const handleForgot = async (e) => {
    e.preventDefault();
    setError('');
    if (!email) {
      setError('Please enter your email address.');
      return;
    }
    setLoading(true);
    try {
      await base44.auth.resetPasswordRequest(email);
    } catch (err) {
      // Intentionally swallow — never reveal whether the email exists
    }
    setResetSent(true);
    setLoading(false);
  };

  const inputStyle = {
    width: '100%', fontFamily: 'DM Sans, sans-serif', fontSize: '15px', color: '#1a1a2e',
    background: '#fff', border: '1px solid rgba(26,26,46,0.15)', borderRadius: '12px',
    padding: '13px 15px', outline: 'none', transition: 'border-color 0.2s, box-shadow 0.2s',
  };
  const labelStyle = {
    fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: '13px',
    color: 'rgba(26,26,46,0.7)', margin: '0 0 7px', display: 'block',
  };
  const focusOn = (e) => { e.currentTarget.style.borderColor = '#7413dc'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(116,19,220,0.12)'; };
  const focusOff = (e) => { e.currentTarget.style.borderColor = 'rgba(26,26,46,0.15)'; e.currentTarget.style.boxShadow = 'none'; };

  return (
    <div style={{ position: 'relative', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Outfit:wght@600;700;800&display=swap');`}</style>

      <LoginBackground images={bgImages} intervalSeconds={bgInterval} />

      {/* Card */}
      <div style={{
        position: 'relative', zIndex: 1, width: '100%', maxWidth: '420px',
        background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(20px)',
        borderRadius: '24px', boxShadow: '0 24px 70px rgba(0,0,0,0.35)',
        padding: '34px 28px', fontFamily: 'DM Sans, sans-serif',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '22px' }}>
          <img src={LOGO_URL} alt="40th Rochdale (Syke) Scouts" style={{ height: '76px', width: 'auto', margin: '0 auto' }} />
        </div>

        {mode === 'login' ? (
          <>
            <div style={{ marginBottom: '20px', textAlign: 'center' }}>
              <p style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '22px', color: '#1a1a2e', margin: '0 0 4px' }}>Welcome back</p>
              <p style={{ fontSize: '14px', color: 'rgba(26,26,46,0.5)', margin: 0 }}>Sign in to your account</p>
            </div>

            <form onSubmit={handleLogin}>
              <div style={{ marginBottom: '14px' }}>
                <label style={labelStyle}>Email</label>
                <input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com" style={inputStyle} onFocus={focusOn} onBlur={focusOff} />
              </div>
              <div style={{ marginBottom: '8px' }}>
                <label style={labelStyle}>Password</label>
                <input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••" style={inputStyle} onFocus={focusOn} onBlur={focusOff} />
              </div>

              <div style={{ textAlign: 'right', marginBottom: '16px' }}>
                <button type="button" onClick={() => { setMode('forgot'); setError(''); }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', fontSize: '13px', fontWeight: 600, color: '#7413dc', padding: 0 }}>
                  Forgot password?
                </button>
              </div>

              {error && <p style={{ color: '#dc2626', fontSize: '13px', margin: '0 0 14px', fontWeight: 500 }}>{error}</p>}

              <button type="submit" disabled={loading} style={{
                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: '15px', color: '#fff',
                background: '#1a1a2e', border: 'none', borderRadius: '12px', padding: '14px',
                cursor: loading ? 'default' : 'pointer', opacity: loading ? 0.7 : 1,
              }}>
                {loading ? <Loader2 size={17} className="animate-spin" /> : null}
                {loading ? 'Signing in…' : 'Login'}
              </button>
            </form>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '18px 0' }}>
              <div style={{ flex: 1, height: '1px', background: 'rgba(26,26,46,0.12)' }} />
              <span style={{ fontSize: '12px', color: 'rgba(26,26,46,0.4)', fontWeight: 500 }}>or</span>
              <div style={{ flex: 1, height: '1px', background: 'rgba(26,26,46,0.12)' }} />
            </div>

            <button onClick={() => base44.auth.loginWithProvider('sso', nextUrl)} style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: '15px', color: '#fff',
              background: '#7413dc', border: 'none', borderRadius: '12px', padding: '14px', cursor: 'pointer',
            }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#5c0fb0'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = '#7413dc'; }}
            >
              Login with OSM
            </button>

            <div style={{ textAlign: 'center', marginTop: '22px', paddingTop: '18px', borderTop: '1px solid rgba(26,26,46,0.08)' }}>
              <p style={{ fontSize: '13.5px', color: 'rgba(26,26,46,0.55)', margin: '0 0 10px' }}>New parent and don't have an account?</p>
              <button onClick={() => setRequestOpen(true)} style={{
                width: '100%', fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: '14px',
                color: '#004851', background: 'rgba(0,72,81,0.07)', border: '1px solid rgba(0,72,81,0.2)',
                borderRadius: '12px', padding: '12px', cursor: 'pointer', transition: 'background 0.2s',
              }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(0,72,81,0.13)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(0,72,81,0.07)'; }}
              >
                Request Access
              </button>
            </div>
          </>
        ) : (
          /* ── Forgot password ── */
          <>
            <div style={{ marginBottom: '20px', textAlign: 'center' }}>
              <p style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '22px', color: '#1a1a2e', margin: '0 0 4px' }}>Reset password</p>
              <p style={{ fontSize: '14px', color: 'rgba(26,26,46,0.5)', margin: 0 }}>We'll email you a reset link</p>
            </div>

            {resetSent ? (
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: '14px', color: 'rgba(26,26,46,0.7)', lineHeight: 1.6, margin: '0 0 20px' }}>
                  If an account exists for <strong>{email}</strong>, you'll receive an email with instructions to reset your password.
                </p>
                <button onClick={() => { setMode('login'); setResetSent(false); setError(''); }} style={{
                  width: '100%', fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: '15px',
                  color: '#fff', background: '#1a1a2e', border: 'none', borderRadius: '12px', padding: '14px', cursor: 'pointer',
                }}>Back to login</button>
              </div>
            ) : (
              <form onSubmit={handleForgot}>
                <div style={{ marginBottom: '16px' }}>
                  <label style={labelStyle}>Email</label>
                  <input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com" style={inputStyle} onFocus={focusOn} onBlur={focusOff} />
                </div>

                {error && <p style={{ color: '#dc2626', fontSize: '13px', margin: '0 0 14px', fontWeight: 500 }}>{error}</p>}

                <button type="submit" disabled={loading} style={{
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: '15px', color: '#fff',
                  background: '#7413dc', border: 'none', borderRadius: '12px', padding: '14px',
                  cursor: loading ? 'default' : 'pointer', opacity: loading ? 0.7 : 1,
                }}>
                  {loading ? <Loader2 size={17} className="animate-spin" /> : null}
                  {loading ? 'Sending…' : 'Send reset link'}
                </button>

                <div style={{ textAlign: 'center', marginTop: '16px' }}>
                  <button type="button" onClick={() => { setMode('login'); setError(''); }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', fontSize: '13.5px', fontWeight: 600, color: '#7413dc', padding: 0 }}>
                    Back to login
                  </button>
                </div>
              </form>
            )}
          </>
        )}
      </div>

      <RequestAccessDialog open={requestOpen} onOpenChange={setRequestOpen} />
    </div>
  );
}