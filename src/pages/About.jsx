import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { MapPin, Clock, Users, Award, Heart, Target } from 'lucide-react';
import SEO from '../components/SEO';
import FloatingNav from '../components/public/FloatingNav';
import PublicFooter from '../components/public/PublicFooter';
import { base44 } from '@/api/base44Client';

const glassCard = {
  background: 'rgba(116,19,220,0.08)',
  backdropFilter: 'blur(20px) saturate(180%)',
  WebkitBackdropFilter: 'blur(20px) saturate(180%)',
  border: '0.5px solid rgba(255,255,255,0.2)',
  borderRadius: '20px',
};

export default function About() {
  const [aboutImage, setAboutImage] = React.useState(null);

  useEffect(() => {
    base44.entities.WebsiteImage.filter({ page: 'about' }).then(imgs => {
      if (imgs[0]) setAboutImage(imgs[0].image_url);
    }).catch(() => {});
  }, []);

  const values = [
    { icon: Heart, title: 'Integrity', description: 'We act with integrity and do what is right.' },
    { icon: Users, title: 'Respect', description: 'We show respect for others and ourselves.' },
    { icon: Target, title: 'Care', description: 'We support others and take care of the world around us.' },
    { icon: Award, title: 'Belief', description: 'We explore our beliefs, attitudes and spirituality.' },
  ];

  return (
    <div style={{ background: '#002a6e', minHeight: '100vh', fontFamily: 'DM Sans, sans-serif' }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&family=DM+Sans:wght@400;500&display=swap');`}</style>
      <SEO
        title="About Us | 40th Rochdale (Syke) Scouts"
        description="Learn about 40th Rochdale (Syke) Scouts."
        path="/About"
      />
      <FloatingNav />

      {/* Hero */}
      <section style={{ background: '#003982', padding: '80px 32px 60px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ maxWidth: '800px' }}>
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 500, fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#00a794', marginBottom: '12px' }}>About us</p>
          <h1 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: 'clamp(32px, 5vw, 56px)', color: '#fff', margin: '0 0 16px' }}>
            Who we are.
          </h1>
          <p style={{ fontSize: '17px', color: 'rgba(255,255,255,0.7)', lineHeight: 1.75, maxWidth: '640px', margin: 0 }}>
            A dedicated volunteer-run Scout Group helping young people develop skills for life through adventure and friendship.
          </p>
        </div>
      </section>

      {/* Welcome + image */}
      <section style={{ padding: '80px 32px', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '56px', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 600, fontSize: 'clamp(24px, 3vw, 38px)', color: '#fff', marginBottom: '20px' }}>Welcome to Syke Scouts</h2>
            <p style={{ fontSize: '17px', color: 'rgba(255,255,255,0.7)', lineHeight: 1.75, marginBottom: '16px' }}>
              Our Scout group is part of The Scout Association, the UK's largest youth organisation. We provide young people aged 6–14 with the opportunity to experience adventure, develop skills, and make lifelong friends.
            </p>
            <p style={{ fontSize: '17px', color: 'rgba(255,255,255,0.7)', lineHeight: 1.75, marginBottom: '16px' }}>
              Run entirely by dedicated volunteers, we offer weekly meetings packed with activities, games, badge work, and outdoor adventures. From camping trips to community service, from earning badges to international jamborees — there's always something exciting happening.
            </p>
            <p style={{ fontSize: '17px', color: 'rgba(255,255,255,0.7)', lineHeight: 1.75 }}>
              Our group is always looking for adults who can help — no previous experience is needed. Full support and training are provided.
            </p>
          </div>
          <div>
            {aboutImage ? (
              <div style={{ borderRadius: '20px', overflow: 'hidden', aspectRatio: '4/3' }}>
                <img src={aboutImage} alt="About us" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            ) : (
              <div style={{ ...glassCard, aspectRatio: '4/3', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ textAlign: 'center' }}>
                  <Users size={48} color="rgba(255,255,255,0.2)" />
                  <p style={{ color: 'rgba(255,255,255,0.3)', marginTop: '12px', fontSize: '13px' }}>Group photo — upload in Admin Settings</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Meeting info */}
      <section style={{ padding: '0 32px 80px', maxWidth: '1200px', margin: '0 auto' }}>
        <h2 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 600, fontSize: 'clamp(24px, 3vw, 38px)', color: '#fff', textAlign: 'center', marginBottom: '40px' }}>When & Where We Meet</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '24px', maxWidth: '800px', margin: '0 auto 48px' }}>
          {[
            { icon: MapPin, title: 'Our Location', details: ['Syke Methodist Church', '206 Syke Road', 'Rochdale, OL12 9TF'] },
            { icon: Clock, title: 'Meeting Times', details: ['Beavers: Tuesday 6:15–7:30pm', 'Cubs: Thursday 6:15–7:30pm', 'Scouts: Thursday 7:45–9:15pm'] },
          ].map(info => (
            <div key={info.title} style={{ ...glassCard, padding: '28px' }}>
              <div style={{ width: '44px', height: '44px', background: 'rgba(116,19,220,0.3)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
                <info.icon size={22} color="#7413dc" />
              </div>
              <h3 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 600, fontSize: '18px', color: '#fff', marginBottom: '10px' }}>{info.title}</h3>
              {info.details.map((d, i) => <p key={i} style={{ fontSize: '14px', color: 'rgba(255,255,255,0.65)', margin: '2px 0' }}>{d}</p>)}
            </div>
          ))}
        </div>

        {/* Map */}
        <div style={{ borderRadius: '20px', overflow: 'hidden', aspectRatio: '21/9' }}>
          <iframe
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2067.750593194814!2d-2.157421029994334!3d53.63814087185271!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x487bbf001add47e9%3A0x250cbb2c42e3f300!2sSyke%20Scout%20Group!5e1!3m2!1sen!2suk!4v1770370159006!5m2!1sen!2suk"
            width="100%" height="100%" style={{ border: 0, display: 'block' }}
            allowFullScreen loading="lazy" referrerPolicy="no-referrer-when-downgrade" title="Syke Methodist Church"
          />
        </div>
      </section>

      {/* Values */}
      <section style={{ padding: '0 32px 80px', maxWidth: '1200px', margin: '0 auto' }}>
        <h2 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 600, fontSize: 'clamp(24px, 3vw, 38px)', color: '#fff', textAlign: 'center', marginBottom: '40px' }}>Our Scout Values</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '24px' }}>
          {values.map((v, i) => (
            <div key={v.title} style={{ ...glassCard, padding: '32px 24px', textAlign: 'center' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#7413dc', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <v.icon size={26} color="#fff" />
              </div>
              <h3 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 600, fontSize: '18px', color: '#fff', marginBottom: '8px' }}>{v.title}</h3>
              <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.65)', lineHeight: 1.65 }}>{v.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: '60px 32px', background: 'rgba(116,19,220,0.15)', borderTop: '1px solid rgba(255,255,255,0.08)', textAlign: 'center' }}>
        <h2 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 600, fontSize: 'clamp(22px, 3vw, 34px)', color: '#fff', marginBottom: '16px' }}>Ready to Join the Adventure?</h2>
        <p style={{ fontSize: '17px', color: 'rgba(255,255,255,0.7)', marginBottom: '32px' }}>Whether you're looking to sign up your child or volunteer with us, we'd love to hear from you.</p>
        <div style={{ display: 'flex', gap: '14px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link to={createPageUrl('Join')} style={{ display: 'inline-block', fontFamily: 'DM Sans, sans-serif', fontWeight: 500, fontSize: '15px', color: '#fff', textDecoration: 'none', background: '#7413dc', borderRadius: '30px', padding: '13px 28px' }}>Join Scouts →</Link>
          <Link to={createPageUrl('Volunteer')} style={{ display: 'inline-block', fontFamily: 'DM Sans, sans-serif', fontWeight: 500, fontSize: '15px', color: 'rgba(255,255,255,0.9)', textDecoration: 'none', border: '1px solid rgba(255,255,255,0.35)', borderRadius: '30px', padding: '13px 28px', background: 'transparent' }}>Volunteer With Us</Link>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}