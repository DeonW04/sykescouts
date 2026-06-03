import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Loader2 } from 'lucide-react';

/**
 * Shared login form body — email + password + OSM SSO.
 * Used inside both the desktop dropdown and the mobile bottom sheet.
 */
export default function LoginPanel({ onClose }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setError('');
    if (!email || !password) {
      setError('Please enter your email and password.');
      return;
    }
    setLoading(true);
    try {
      await base44.auth.loginViaEmailPassword(email, password);
      window.location.href = '/';
    } catch (err) {
      setError('Incorrect email or password. Please try again.');
      setLoading(false);
    }
  };

  const inputStyle = {
    width: '100%',
    fontFamily: 'DM Sans, sans-serif',
    fontSize: '14px',
    color: '#1a1a2e',
    background: '#fff',
    border: '1px solid rgba(26,26,46,0.15)',
    borderRadius: '12px',
    padding: '11px 14px',
    outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
  };

  const labelStyle = {
    fontFamily: 'DM Sans, sans-serif',
    fontWeight: 600,
    fontSize: '12px',
    color: 'rgba(26,26,46,0.7)',
    margin: '0 0 6px',
    display: 'block',
  };

  return (
    <div style={{ fontFamily: 'DM Sans, sans-serif' }}>
      <div style={{ marginBottom: '16px' }}>
        <p style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '18px', color: '#1a1a2e', margin: '0 0 2px' }}>Welcome back</p>
        <p style={{ fontSize: '13px', color: 'rgba(26,26,46,0.5)', margin: 0 }}>Sign in to your account</p>
      </div>

      <form onSubmit={handleEmailLogin}>
        <div style={{ marginBottom: '12px' }}>
          <label style={labelStyle}>Email</label>
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            style={inputStyle}
            onFocus={(e) => { e.currentTarget.style.borderColor = '#7413dc'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(116,19,220,0.1)'; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(26,26,46,0.15)'; e.currentTarget.style.boxShadow = 'none'; }}
          />
        </div>

        <div style={{ marginBottom: '14px' }}>
          <label style={labelStyle}>Password</label>
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            style={inputStyle}
            onFocus={(e) => { e.currentTarget.style.borderColor = '#7413dc'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(116,19,220,0.1)'; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(26,26,46,0.15)'; e.currentTarget.style.boxShadow = 'none'; }}
          />
        </div>

        {error && (
          <p style={{ color: '#dc2626', fontSize: '12.5px', margin: '0 0 12px', fontWeight: 500 }}>{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: '14px',
            color: '#fff', background: '#1a1a2e', border: 'none', borderRadius: '12px',
            padding: '12px', cursor: loading ? 'default' : 'pointer', opacity: loading ? 0.7 : 1,
            transition: 'background 0.2s',
          }}
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : null}
          {loading ? 'Signing in…' : 'Login'}
        </button>
      </form>

      {/* OR divider */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '16px 0' }}>
        <div style={{ flex: 1, height: '1px', background: 'rgba(26,26,46,0.12)' }} />
        <span style={{ fontSize: '12px', color: 'rgba(26,26,46,0.4)', fontWeight: 500 }}>or</span>
        <div style={{ flex: 1, height: '1px', background: 'rgba(26,26,46,0.12)' }} />
      </div>

      {/* OSM SSO button (purple) */}
      <button
        onClick={() => base44.auth.redirectToLogin(window.location.pathname + window.location.search)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
          fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: '14px',
          color: '#fff', background: '#7413dc', border: 'none', borderRadius: '12px',
          padding: '12px', cursor: 'pointer', transition: 'background 0.2s',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = '#5c0fb0'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = '#7413dc'; }}
      >
        Login with OSM
      </button>
    </div>
  );
}