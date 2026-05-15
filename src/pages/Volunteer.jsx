import React, { useState } from 'react';
import { CheckCircle, ArrowRight, Heart, Award, Users, Clock } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import SEO from '../components/SEO';
import FloatingNav from '../components/public/FloatingNav';
import NavBarSpacer from '../components/public/NavBarSpacer';
import PublicFooter from '../components/public/PublicFooter';

const inputStyle = {
  width: '100%',
  background: '#fff',
  border: '1px solid rgba(116,19,220,0.2)',
  borderRadius: '10px',
  color: '#1a1a2e',
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
  color: 'rgba(26,26,46,0.6)',
  marginBottom: '6px',
};

const glassCard = {
  background: '#f8f7ff',
  border: '1px solid rgba(116,19,220,0.12)',
  borderRadius: '24px',
  padding: '40px',
};

export default function Volunteer() {
  const [formData, setFormData] = useState({
    full_name: '', email: '', phone: '', address: '', occupation: '',
    previous_scouting: false, previous_scouting_details: '',
    skills: '', availability: '', why_volunteer: '', section_preference: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const sectionPreferences = [
    { value: 'any', label: "Any section - I'm flexible!" },
    { value: 'beavers', label: 'Beavers (6–8 years)' },
    { value: 'cubs', label: 'Cubs (8–10½ years)' },
    { value: 'scouts', label: 'Scouts (10½–14 years)' },
    { value: 'admin', label: 'Behind the scenes / Admin' },
  ];

  const benefits = [
    { icon: Heart, title: 'Make a Difference', description: 'Help young people develop confidence, skills, and friendships that last a lifetime.' },
    { icon: Award, title: 'Gain Qualifications', description: 'Access free training and nationally recognised qualifications.' },
    { icon: Users, title: 'Join a Community', description: 'Become part of a friendly team of volunteers who support each other.' },
    { icon: Clock, title: 'Flexible Commitment', description: 'Give as much or as little time as you can — even a few hours a month.' },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    await base44.entities.VolunteerApplication.create({ ...formData, status: 'pending' });
    setSubmitting(false);
    setSubmitted(true);
    toast.success('Application submitted successfully!');
  };

  const set = (field) => (e) => setFormData({ ...formData, [field]: e.target.value });

  if (submitted) {
    return (
      <div style={{ background: '#ffffff', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <FloatingNav />
        <div style={{ ...glassCard, maxWidth: '480px', textAlign: 'center' }}>
          <CheckCircle size={56} color="#7413dc" style={{ marginBottom: '20px' }} />
          <h1 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '28px', color: '#1a1a2e', marginBottom: '12px' }}>Thank You!</h1>
          <p style={{ color: 'rgba(26,26,46,0.65)', lineHeight: 1.75 }}>Your volunteer application has been submitted. We're excited you want to join our team! We'll be in touch soon to discuss opportunities.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: '#ffffff', minHeight: '100vh', fontFamily: 'DM Sans, sans-serif' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&family=DM+Sans:wght@400;500&display=swap');
        input::placeholder, textarea::placeholder { color: rgba(26,26,46,0.35); }
        input:focus, textarea:focus, select:focus { border-color: rgba(116,19,220,0.5) !important; box-shadow: 0 0 0 2px rgba(116,19,220,0.15); }
        select option { background: #fff; color: #1a1a2e; }
      `}</style>
      <SEO title="Volunteer With Us | 40th Rochdale (Syke) Scouts" description="Become a volunteer with Syke Scouts. No experience needed." path="/Volunteer" />
      <FloatingNav />
      <NavBarSpacer />

      {/* Hero */}
      <section style={{ background: '#f8f7ff', padding: '80px 32px 60px', borderBottom: '1px solid rgba(116,19,220,0.1)' }}>
        <div style={{ maxWidth: '800px' }}>
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 500, fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#7413dc', marginBottom: '12px' }}>For adults</p>
          <h1 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: 'clamp(32px, 5vw, 56px)', color: '#1a1a2e', margin: '0 0 16px' }}>Become a Volunteer</h1>
          <p style={{ fontSize: '17px', color: 'rgba(26,26,46,0.65)', lineHeight: 1.75, maxWidth: '600px', margin: 0 }}>You don't need to be Bear Grylls. We provide all the training — you just need enthusiasm and a desire to help young people.</p>
        </div>
      </section>

      {/* Benefits */}
      <section style={{ padding: '64px 32px', maxWidth: '1200px', margin: '0 auto' }}>
        <h2 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 600, fontSize: 'clamp(22px, 3vw, 36px)', color: '#1a1a2e', textAlign: 'center', marginBottom: '40px' }}>Why Volunteer With Us?</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
          {benefits.map(b => (
            <div key={b.title} style={{ ...glassCard, padding: '28px', textAlign: 'center' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(116,19,220,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <b.icon size={22} color="#7413dc" />
              </div>
              <h3 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 600, fontSize: '17px', color: '#1a1a2e', marginBottom: '8px' }}>{b.title}</h3>
              <p style={{ fontSize: '14px', color: 'rgba(26,26,46,0.6)', lineHeight: 1.65 }}>{b.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Form */}
      <section style={{ padding: '0 32px 80px', maxWidth: '720px', margin: '0 auto' }}>
        <div style={glassCard}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '36px' }}>
            <div style={{ width: '44px', height: '44px', background: '#00a794', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Heart size={22} color="#fff" />
            </div>
            <div>
              <h2 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 600, fontSize: '22px', color: '#1a1a2e', margin: 0 }}>Volunteer Application</h2>
              <p style={{ color: 'rgba(26,26,46,0.5)', fontSize: '13px', margin: 0 }}>Tell us about yourself</p>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <p style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 600, fontSize: '14px', color: 'rgba(26,26,46,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em', paddingBottom: '12px', borderBottom: '1px solid rgba(116,19,220,0.1)', marginBottom: '20px' }}>Your Details</p>
            <div style={{ marginBottom: '16px' }}><label style={labelStyle}>Full Name *</label><input style={inputStyle} value={formData.full_name} onChange={set('full_name')} required placeholder="Your full name" /></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div><label style={labelStyle}>Email Address *</label><input style={inputStyle} type="email" value={formData.email} onChange={set('email')} required placeholder="email@example.com" /></div>
              <div><label style={labelStyle}>Phone Number *</label><input style={inputStyle} type="tel" value={formData.phone} onChange={set('phone')} required placeholder="07xxx xxxxxx" /></div>
            </div>
            <div style={{ marginBottom: '16px' }}><label style={labelStyle}>Address</label><input style={inputStyle} value={formData.address} onChange={set('address')} placeholder="Your address" /></div>
            <div style={{ marginBottom: '24px' }}><label style={labelStyle}>Current Occupation</label><input style={inputStyle} value={formData.occupation} onChange={set('occupation')} placeholder="What do you do?" /></div>

            <p style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 600, fontSize: '14px', color: 'rgba(26,26,46,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em', paddingBottom: '12px', borderBottom: '1px solid rgba(116,19,220,0.1)', marginBottom: '20px' }}>Experience & Interests</p>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '16px', background: 'rgba(116,19,220,0.04)', borderRadius: '12px', marginBottom: '16px', border: '1px solid rgba(116,19,220,0.1)' }}>
              <input type="checkbox" id="prev_scouting" checked={formData.previous_scouting} onChange={e => setFormData({ ...formData, previous_scouting: e.target.checked })} style={{ marginTop: '2px', accentColor: '#7413dc' }} />
              <div>
                <label htmlFor="prev_scouting" style={{ ...labelStyle, color: 'rgba(26,26,46,0.8)', cursor: 'pointer', marginBottom: '2px' }}>I have previous scouting experience</label>
                <p style={{ fontSize: '12px', color: 'rgba(26,26,46,0.4)', margin: 0 }}>Either as a young person or adult volunteer</p>
              </div>
            </div>

            {formData.previous_scouting && (
              <div style={{ marginBottom: '16px' }}><label style={labelStyle}>Tell us about your experience</label><textarea style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }} value={formData.previous_scouting_details} onChange={set('previous_scouting_details')} placeholder="Roles, years involved, etc." /></div>
            )}

            <div style={{ marginBottom: '16px' }}><label style={labelStyle}>Skills & Interests</label><textarea style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }} value={formData.skills} onChange={set('skills')} placeholder="What skills or hobbies could you bring?" /></div>

            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>Section Preference</label>
              <select style={{ ...inputStyle, appearance: 'none' }} value={formData.section_preference} onChange={set('section_preference')}>
                <option value="">Which section would you prefer?</option>
                {sectionPreferences.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>

            <div style={{ marginBottom: '16px' }}><label style={labelStyle}>Availability</label><textarea style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }} value={formData.availability} onChange={set('availability')} placeholder="Which days/times are you typically available?" /></div>
            <div style={{ marginBottom: '28px' }}><label style={labelStyle}>Why do you want to volunteer? *</label><textarea style={{ ...inputStyle, minHeight: '100px', resize: 'vertical' }} value={formData.why_volunteer} onChange={set('why_volunteer')} required placeholder="Tell us what motivates you to volunteer with scouts" /></div>

            <button type="submit" disabled={submitting} style={{ width: '100%', background: '#00a794', color: '#fff', border: 'none', borderRadius: '30px', padding: '14px 28px', fontFamily: 'DM Sans, sans-serif', fontWeight: 500, fontSize: '15px', cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              {submitting ? 'Submitting...' : <><span>Submit Application</span><ArrowRight size={18} /></>}
            </button>
            <p style={{ textAlign: 'center', fontSize: '12px', color: 'rgba(26,26,46,0.4)', marginTop: '16px' }}>All volunteers are subject to DBS checks and safeguarding training. We'll guide you through the process.</p>
          </form>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}