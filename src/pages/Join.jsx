import React, { useState } from 'react';
import { CheckCircle, ArrowRight, Users } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import SEO from '../components/SEO';
import FloatingNav from '../components/public/FloatingNav';
import PublicFooter from '../components/public/PublicFooter';

const inputStyle = {
  width: '100%',
  background: 'rgba(255,255,255,0.08)',
  border: '0.5px solid rgba(255,255,255,0.2)',
  borderRadius: '10px',
  color: '#fff',
  padding: '12px 16px',
  fontSize: '15px',
  fontFamily: 'DM Sans, sans-serif',
  outline: 'none',
  boxSizing: 'border-box',
};

const labelStyle = {
  display: 'block',
  fontFamily: 'DM Sans, sans-serif',
  fontSize: '13px',
  color: 'rgba(255,255,255,0.6)',
  marginBottom: '6px',
};

const glassCard = {
  background: 'rgba(116,19,220,0.08)',
  backdropFilter: 'blur(20px) saturate(180%)',
  WebkitBackdropFilter: 'blur(20px) saturate(180%)',
  border: '0.5px solid rgba(255,255,255,0.2)',
  borderRadius: '24px',
  padding: '40px',
};

export default function Join() {
  const [formData, setFormData] = useState({
    child_name: '', date_of_birth: '', parent_name: '', email: '',
    phone: '', address: '', section_interest: '', medical_info: '',
    additional_info: '', consent_photos: false,
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const sections = [
    { value: 'beavers', label: 'Beavers (6–8 years)' },
    { value: 'cubs', label: 'Cubs (8–10½ years)' },
    { value: 'scouts', label: 'Scouts (10½–14 years)' },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const registration = await base44.entities.ChildRegistration.create({ ...formData, status: 'pending' });
      await base44.functions.invoke('sendJoinEnquiryEmail', { registrationId: registration.id });
      setSubmitting(false);
      setSubmitted(true);
      toast.success('Registration submitted successfully!');
    } catch (error) {
      setSubmitting(false);
      toast.error('Error submitting registration: ' + error.message);
    }
  };

  const set = (field) => (e) => setFormData({ ...formData, [field]: e.target.value });

  if (submitted) {
    return (
      <div style={{ background: '#002a6e', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <FloatingNav />
        <div style={{ ...glassCard, maxWidth: '480px', textAlign: 'center' }}>
          <CheckCircle size={56} color="#00a794" style={{ marginBottom: '20px' }} />
          <h1 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '28px', color: '#fff', marginBottom: '12px' }}>Thank You!</h1>
          <p style={{ color: 'rgba(255,255,255,0.7)', lineHeight: 1.75 }}>Your registration has been submitted. We'll review your information and be in touch soon about availability and next steps.</p>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', marginTop: '12px' }}>Submitting this form registers your interest. A place is not confirmed until you hear from us.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: '#002a6e', minHeight: '100vh', fontFamily: 'DM Sans, sans-serif' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&family=DM+Sans:wght@400;500&display=swap');
        input::placeholder, textarea::placeholder, select option { color: rgba(255,255,255,0.3); }
        input:focus, textarea:focus, select:focus { border-color: rgba(116,19,220,0.5) !important; box-shadow: 0 0 0 2px rgba(116,19,220,0.2); }
        select option { background: #003982; color: #fff; }
      `}</style>
      <SEO title="Join Scouts | 40th Rochdale (Syke) Scouts" description="Register your child's interest in joining Scouts." path="/Join" />
      <FloatingNav />

      {/* Hero */}
      <section style={{ background: '#003982', padding: '80px 32px 60px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ maxWidth: '800px' }}>
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 500, fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#00a794', marginBottom: '12px' }}>For parents</p>
          <h1 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: 'clamp(32px, 5vw, 56px)', color: '#fff', margin: '0 0 16px' }}>Join Scouts</h1>
          <p style={{ fontSize: '17px', color: 'rgba(255,255,255,0.7)', lineHeight: 1.75, maxWidth: '560px', margin: 0 }}>Register your child's interest and start their scouting adventure.</p>
        </div>
      </section>

      {/* Form */}
      <section style={{ padding: '64px 32px', maxWidth: '720px', margin: '0 auto' }}>
        <div style={glassCard}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '36px' }}>
            <div style={{ width: '44px', height: '44px', background: '#7413dc', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Users size={22} color="#fff" />
            </div>
            <div>
              <h2 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 600, fontSize: '22px', color: '#fff', margin: 0 }}>Child Registration</h2>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', margin: 0 }}>Register your interest in joining</p>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <p style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 600, fontSize: '14px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.1em', paddingBottom: '12px', borderBottom: '0.5px solid rgba(255,255,255,0.1)', marginBottom: '20px' }}>Child's Details</p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div><label style={labelStyle}>Child's Full Name *</label><input style={inputStyle} value={formData.child_name} onChange={set('child_name')} required placeholder="Full name" /></div>
              <div><label style={labelStyle}>Date of Birth *</label><input style={{ ...inputStyle, colorScheme: 'dark' }} type="date" value={formData.date_of_birth} onChange={set('date_of_birth')} required /></div>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={labelStyle}>Section of Interest *</label>
              <select style={{ ...inputStyle, appearance: 'none' }} value={formData.section_interest} onChange={set('section_interest')} required>
                <option value="">Select a section</option>
                {sections.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>

            <p style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 600, fontSize: '14px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.1em', paddingBottom: '12px', borderBottom: '0.5px solid rgba(255,255,255,0.1)', marginBottom: '20px' }}>Parent / Guardian Details</p>

            <div style={{ marginBottom: '16px' }}><label style={labelStyle}>Parent/Guardian Name *</label><input style={inputStyle} value={formData.parent_name} onChange={set('parent_name')} required placeholder="Full name" /></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div><label style={labelStyle}>Email Address *</label><input style={inputStyle} type="email" value={formData.email} onChange={set('email')} required placeholder="email@example.com" /></div>
              <div><label style={labelStyle}>Phone Number *</label><input style={inputStyle} type="tel" value={formData.phone} onChange={set('phone')} required placeholder="07xxx xxxxxx" /></div>
            </div>
            <div style={{ marginBottom: '24px' }}><label style={labelStyle}>Home Address</label><textarea style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }} value={formData.address} onChange={set('address')} placeholder="Full address including postcode" /></div>

            <p style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 600, fontSize: '14px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.1em', paddingBottom: '12px', borderBottom: '0.5px solid rgba(255,255,255,0.1)', marginBottom: '20px' }}>Additional Information</p>

            <div style={{ marginBottom: '16px' }}><label style={labelStyle}>Medical Conditions / Allergies</label><textarea style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }} value={formData.medical_info} onChange={set('medical_info')} placeholder="Any medical conditions, allergies, or dietary requirements" /></div>
            <div style={{ marginBottom: '20px' }}><label style={labelStyle}>Anything Else We Should Know?</label><textarea style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }} value={formData.additional_info} onChange={set('additional_info')} placeholder="Any other information" /></div>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '16px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', marginBottom: '28px' }}>
              <input type="checkbox" id="consent_photos" checked={formData.consent_photos} onChange={e => setFormData({ ...formData, consent_photos: e.target.checked })} style={{ marginTop: '2px', accentColor: '#7413dc' }} />
              <div>
                <label htmlFor="consent_photos" style={{ ...labelStyle, marginBottom: '4px', color: 'rgba(255,255,255,0.8)', cursor: 'pointer' }}>Photo Consent</label>
                <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', margin: 0 }}>I give permission for photos of my child to be taken and used on the group's website and social media channels.</p>
              </div>
            </div>

            <button type="submit" disabled={submitting} style={{ width: '100%', background: '#7413dc', color: '#fff', border: 'none', borderRadius: '30px', padding: '14px 28px', fontFamily: 'DM Sans, sans-serif', fontWeight: 500, fontSize: '15px', cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              {submitting ? 'Submitting...' : <><span>Submit Registration</span><ArrowRight size={18} /></>}
            </button>
            <p style={{ textAlign: 'center', fontSize: '12px', color: 'rgba(255,255,255,0.35)', marginTop: '16px' }}>By submitting this form, you're registering your interest. We'll be in touch to discuss availability and next steps.</p>
          </form>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}