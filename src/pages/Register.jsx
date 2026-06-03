import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Loader2, Lock, CheckCircle, AlertCircle, Mail } from 'lucide-react';

const LOGO_URL = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69540f3779bf32f5ccc6335b/e8eca937a_image.png';

const inputStyle = {
  width: '100%', fontFamily: 'DM Sans, sans-serif', fontSize: '15px', color: '#1a1a2e',
  background: '#fff', border: '1px solid rgba(26,26,46,0.15)', borderRadius: '12px',
  padding: '13px 15px', outline: 'none', boxSizing: 'border-box',
};
const labelStyle = {
  fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: '12px',
  color: 'rgba(26,26,46,0.7)', margin: '0 0 6px', display: 'block',
};

export default function Register() {
  const token = new URLSearchParams(window.location.search).get('token');

  const [checking, setChecking] = useState(true);
  const [invite, setInvite] = useState(null);
  const [inviteError, setInviteError] = useState(null);

  const [stage, setStage] = useState('form'); // form | otp
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) { setInviteError('missing'); setChecking(false); return; }
    base44.functions.invoke('validateRegistrationInvite', { token })
      .then((res) => {
        if (res.data.valid) setInvite(res.data);
        else setInviteError(res.data.reason || 'invalid');
      })
      .catch(() => setInviteError('error'))
      .finally(() => setChecking(false));
  }, [token]);

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    setLoading(true);
    try {
      await base44.auth.register({ email: invite.parent_email, password });
      setStage('otp');
    } catch (err) {
      setError(err?.message?.includes('exist') ? 'An account with this email already exists. Please sign in instead.' : 'Could not create your account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    setError('');
    if (!otp.trim()) { setError('Please enter the code from your email.'); return; }
    setLoading(true);
    try {
      const res = await base44.auth.verifyOtp({ email: invite.parent_email, otpCode: otp.trim() });
      const accessToken = res?.access_token || res?.data?.access_token;
      if (accessToken) base44.auth.setToken(accessToken);
      await base44.functions.invoke('completeRegistrationInvite', { token });
      window.location.href = '/CompleteRegistration';
    } catch (err) {
      setError('That code wasn\'t right. Please check your email and try again.');
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError('');
    try {
      await base44.auth.resendOtp(invite.parent_email);
    } catch { /* no-op */ }
  };

  // ── Loading ──
  if (checking) {
    return (
      <div style={pageWrap}>
        <Loader2 size={32} className="animate-spin" color="#7413dc" />
      </div>
    );
  }

  // ── Invalid invite ──
  if (!invite) {
    const messages = {
      missing: 'This registration link is missing its code.',
      not_found: 'We couldn\'t find this invitation. It may have been cancelled.',
      expired: 'This invitation has expired. Please ask a leader to send a new one.',
      already_used: 'This invitation has already been used. Please sign in instead.',
      error: 'Something went wrong checking your invitation. Please try again.',
      invalid: 'This invitation link is not valid.',
    };
    return (
      <div style={pageWrap}>
        <div style={cardStyle}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: 56, height: 56, background: '#fef2f2', borderRadius: 18, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
              <AlertCircle size={28} color="#dc2626" />
            </div>
            <h1 style={titleStyle}>Invitation problem</h1>
            <p style={{ ...subStyle, marginBottom: 24 }}>{messages[inviteError] || messages.invalid}</p>
            <button onClick={() => base44.auth.redirectToLogin('/')} style={primaryBtn}>Go to Sign In</button>
          </div>
        </div>
      </div>
    );
  }

  // ── Valid: form / otp ──
  return (
    <div style={pageWrap}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Outfit:wght@700;800&display=swap');`}</style>
      <div style={cardStyle}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <img src={LOGO_URL} alt="40th Rochdale Scouts" style={{ height: 64, width: 'auto', marginBottom: 12 }} />
          <h1 style={{ ...titleStyle, fontFamily: 'Outfit, sans-serif' }}>
            {stage === 'form' ? 'Create your account' : 'Verify your email'}
          </h1>
          <p style={subStyle}>
            {stage === 'form'
              ? <>Welcome{invite.parent_name ? `, ${invite.parent_name.split(' ')[0]}` : ''}! Set a password to access {invite.child_name || 'your child'}'s portal.</>
              : <>We've sent a 6-digit code to <strong>{invite.parent_email}</strong>.</>}
          </p>
        </div>

        {stage === 'form' ? (
          <form onSubmit={handleRegister}>
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Email</label>
              <div style={{ position: 'relative' }}>
                <input type="email" value={invite.parent_email} disabled
                  style={{ ...inputStyle, background: '#f3f4f6', color: 'rgba(26,26,46,0.6)', paddingRight: 40 }} />
                <Lock size={15} style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', color: 'rgba(26,26,46,0.35)' }} />
              </div>
              <p style={{ fontSize: 11.5, color: 'rgba(26,26,46,0.4)', margin: '6px 0 0' }}>This is the email your invitation was sent to.</p>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Choose a password</label>
              <input type="password" autoComplete="new-password" value={password}
                onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" style={inputStyle} />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Confirm password</label>
              <input type="password" autoComplete="new-password" value={confirm}
                onChange={(e) => setConfirm(e.target.value)} placeholder="Re-enter your password" style={inputStyle} />
            </div>

            {error && <p style={errStyle}>{error}</p>}

            <button type="submit" disabled={loading} style={{ ...primaryBtn, opacity: loading ? 0.7 : 1 }}>
              {loading ? <Loader2 size={16} className="animate-spin" /> : null}
              {loading ? 'Creating account…' : 'Create Account'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerify}>
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Verification code</label>
              <input type="text" inputMode="numeric" value={otp}
                onChange={(e) => setOtp(e.target.value)} placeholder="Enter 6-digit code"
                style={{ ...inputStyle, letterSpacing: '0.3em', textAlign: 'center', fontSize: 18 }} />
            </div>

            {error && <p style={errStyle}>{error}</p>}

            <button type="submit" disabled={loading} style={{ ...primaryBtn, opacity: loading ? 0.7 : 1 }}>
              {loading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
              {loading ? 'Verifying…' : 'Verify & Continue'}
            </button>

            <button type="button" onClick={handleResend}
              style={{ width: '100%', background: 'none', border: 'none', color: '#7413dc', fontSize: 13, fontWeight: 600, marginTop: 14, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
              Resend code
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

const pageWrap = {
  minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
  background: 'linear-gradient(135deg, #7413dc 0%, #004851 100%)', padding: 20,
  fontFamily: 'DM Sans, sans-serif',
};
const cardStyle = {
  width: '100%', maxWidth: 420, background: '#fff', borderRadius: 24,
  padding: '36px 32px', boxShadow: '0 25px 60px rgba(0,0,0,0.25)',
};
const titleStyle = { fontSize: 24, fontWeight: 700, color: '#1a1a2e', margin: '0 0 8px' };
const subStyle = { fontSize: 14, color: 'rgba(26,26,46,0.55)', margin: 0, lineHeight: 1.5 };
const errStyle = { color: '#dc2626', fontSize: 13, margin: '0 0 14px', fontWeight: 500 };
const primaryBtn = {
  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
  fontFamily: 'DM Sans, sans-serif', fontWeight: 700, fontSize: 15, color: '#fff',
  background: '#7413dc', border: 'none', borderRadius: 12, padding: 14, cursor: 'pointer',
};