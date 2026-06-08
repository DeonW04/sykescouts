import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';

const LOGO_URL = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69540f3779bf32f5ccc6335b/e8eca937a_image.png';

export default function ApproveAccess() {
  const [status, setStatus] = useState('loading'); // loading | success | error
  const [parentEmail, setParentEmail] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get('token');
    if (!token) {
      setStatus('error');
      setMessage('This link is invalid or incomplete.');
      return;
    }
    base44.functions.invoke('approveAccessRequest', { token })
      .then((res) => {
        if (res?.data?.success) {
          setStatus('success');
          setParentEmail(res.data.parentEmail || '');
        } else {
          setStatus('error');
          setMessage('This request could not be found or has already been handled.');
        }
      })
      .catch(() => {
        setStatus('error');
        setMessage('Something went wrong approving this request.');
      });
  }, []);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', background: 'linear-gradient(135deg, #7413dc 0%, #004851 100%)', fontFamily: 'DM Sans, sans-serif' }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Outfit:wght@700;800&display=swap');`}</style>
      <div style={{ background: '#fff', borderRadius: '24px', boxShadow: '0 24px 70px rgba(0,0,0,0.3)', padding: '40px 30px', maxWidth: '440px', width: '100%', textAlign: 'center' }}>
        <img src={LOGO_URL} alt="40th Rochdale (Syke) Scouts" style={{ height: '70px', margin: '0 auto 24px' }} />

        {status === 'loading' && (
          <>
            <Loader2 className="animate-spin" size={36} style={{ color: '#7413dc', margin: '0 auto 16px' }} />
            <p style={{ color: 'rgba(26,26,46,0.6)', fontSize: '15px' }}>Approving request…</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px' }}>
              <CheckCircle2 size={36} style={{ color: '#16a34a' }} />
            </div>
            <h1 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '24px', color: '#1a1a2e', margin: '0 0 12px' }}>Access approved</h1>
            <p style={{ color: 'rgba(26,26,46,0.6)', fontSize: '15px', lineHeight: 1.6, margin: 0 }}>
              A registration link has been emailed to <strong>{parentEmail}</strong>. They can now set up their account.
            </p>
          </>
        )}

        {status === 'error' && (
          <>
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px' }}>
              <XCircle size={36} style={{ color: '#dc2626' }} />
            </div>
            <h1 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '24px', color: '#1a1a2e', margin: '0 0 12px' }}>Unable to approve</h1>
            <p style={{ color: 'rgba(26,26,46,0.6)', fontSize: '15px', lineHeight: 1.6, margin: 0 }}>{message}</p>
          </>
        )}
      </div>
    </div>
  );
}