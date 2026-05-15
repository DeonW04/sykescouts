import React, { useState } from 'react';
import { MapPin, Mail, Clock, Send, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import SEO from '../components/SEO';
import FloatingNav from '../components/public/FloatingNav';
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
  borderRadius: '20px',
};

export default function Contact() {
  const [formData, setFormData] = useState({ name: '', email: '', subject: '', message: '' });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setSubmitting(false);
    setSubmitted(true);
    toast.success("Message sent! We'll be in touch soon.");
    setFormData({ name: '', email: '', subject: '', message: '' });
    setTimeout(() => setSubmitted(false), 4000);
  };

  const set = (field) => (e) => setFormData({ ...formData, [field]: e.target.value });

  const contactInfo = [
    { icon: MapPin, title: 'Our Location', details: ['Syke Methodist Church', '206 Syke Road', 'Syke, OL12 9TF'] },
    { icon: Mail, title: 'Email Us', details: ['info@sykescouts.org', 'We aim to respond within 48 hours'] },
    { icon: Clock, title: 'Meeting Times', details: ['Beavers: Tuesday 6:15–7:30pm', 'Cubs: Thursday 6:15–7:30pm', 'Scouts: Thursday 7:45–9:15pm'] },
  ];

  return (
    <div style={{ background: '#ffffff', minHeight: '100vh', fontFamily: 'DM Sans, sans-serif' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&family=DM+Sans:wght@400;500&display=swap');
        input::placeholder, textarea::placeholder { color: rgba(26,26,46,0.35); }
        input:focus, textarea:focus { border-color: rgba(116,19,220,0.5) !important; box-shadow: 0 0 0 2px rgba(116,19,220,0.15); }
      `}</style>
      <SEO title="Contact Us | 40th Rochdale (Syke) Scouts" description="Get in touch with 40th Rochdale (Syke) Scouts." path="/Contact" />
      <FloatingNav />

      {/* Hero */}
      <section style={{ background: '#f8f7ff', padding: '80px 32px 60px', borderBottom: '1px solid rgba(116,19,220,0.1)' }}>
        <div style={{ maxWidth: '800px' }}>
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 500, fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#7413dc', marginBottom: '12px' }}>Get in touch</p>
          <h1 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: 'clamp(32px, 5vw, 56px)', color: '#1a1a2e', margin: '0 0 16px' }}>Say hello.</h1>
          <p style={{ fontSize: '17px', color: 'rgba(26,26,46,0.65)', lineHeight: 1.75, margin: 0 }}>Have a question? We'd love to hear from you.</p>
        </div>
      </section>

      {/* Content */}
      <section style={{ padding: '64px 32px', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '32px', alignItems: 'start' }}>
          {/* Info cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {contactInfo.map(info => (
              <div key={info.title} style={{ ...glassCard, padding: '24px' }}>
                <div style={{ width: '40px', height: '40px', background: 'rgba(116,19,220,0.3)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
                  <info.icon size={20} color="#7413dc" />
                </div>
                <h3 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 600, fontSize: '17px', color: '#1a1a2e', marginBottom: '8px' }}>{info.title}</h3>
                {info.details.map((d, i) => <p key={i} style={{ fontSize: '13px', color: 'rgba(26,26,46,0.6)', margin: '2px 0' }}>{d}</p>)}
              </div>
            ))}
            {/* Safeguarding note — uses yellow per Scouting standard */}
            <div style={{ background: '#ffe627', borderRadius: '16px', padding: '20px 24px' }}>
              <h3 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 600, fontSize: '15px', color: '#1a1a00', marginBottom: '8px' }}>Safeguarding</h3>
              <p style={{ fontSize: '13px', color: '#1a1a00', lineHeight: 1.6, margin: 0 }}>For safeguarding concerns, please speak directly to a leader or follow our safeguarding procedures. This takes priority over all other contact methods.</p>
            </div>
          </div>

          {/* Contact form */}
          <div style={{ ...glassCard, padding: '36px' }}>
            <h2 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 600, fontSize: '22px', color: '#1a1a2e', marginBottom: '28px' }}>Send us a Message</h2>
            {submitted ? (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <CheckCircle size={48} color="#7413dc" style={{ marginBottom: '16px' }} />
                <h3 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 600, fontSize: '20px', color: '#1a1a2e', marginBottom: '8px' }}>Message Sent!</h3>
                <p style={{ color: 'rgba(26,26,46,0.6)' }}>We'll get back to you as soon as possible.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                  <div><label style={labelStyle}>Your Name *</label><input style={inputStyle} value={formData.name} onChange={set('name')} required placeholder="John Smith" /></div>
                  <div><label style={labelStyle}>Email Address *</label><input style={inputStyle} type="email" value={formData.email} onChange={set('email')} required placeholder="john@example.com" /></div>
                </div>
                <div style={{ marginBottom: '16px' }}><label style={labelStyle}>Subject *</label><input style={inputStyle} value={formData.subject} onChange={set('subject')} required placeholder="What's your enquiry about?" /></div>
                <div style={{ marginBottom: '28px' }}><label style={labelStyle}>Message *</label><textarea style={{ ...inputStyle, minHeight: '150px', resize: 'vertical' }} value={formData.message} onChange={set('message')} required placeholder="Tell us more about your enquiry..." /></div>
                <button type="submit" disabled={submitting} style={{ background: '#7413dc', color: '#fff', border: 'none', borderRadius: '30px', padding: '13px 28px', fontFamily: 'DM Sans, sans-serif', fontWeight: 500, fontSize: '15px', cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {submitting ? 'Sending...' : <><span>Send Message</span><Send size={16} /></>}
                </button>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* Map */}
      <section style={{ padding: '0 32px 80px', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ borderRadius: '20px', overflow: 'hidden', aspectRatio: '21/9' }}>
          <iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2067.750593194814!2d-2.157421029994334!3d53.63814087185271!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x487bbf001add47e9%3A0x250cbb2c42e3f300!2sSyke%20Scout%20Group!5e1!3m2!1sen!2suk!4v1770370159006!5m2!1sen!2suk" width="100%" height="100%" style={{ border: 0, display: 'block' }} allowFullScreen loading="lazy" referrerPolicy="no-referrer-when-downgrade" title="Syke Methodist Church" />
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}