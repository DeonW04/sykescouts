import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { MapPin, Clock, Users, Award, Heart, Target } from 'lucide-react';
import SEO from '../components/SEO';
import FloatingNav from '../components/public/FloatingNav';
import NavBarSpacer from '../components/public/NavBarSpacer';
import PublicFooter from '../components/public/PublicFooter';
import { base44 } from '@/api/base44Client';

const glassCard = {
  background: '#f8f7ff',
  border: '1px solid rgba(116,19,220,0.12)',
  borderRadius: '20px',
};

export default function About() {
  const [heroImage, setHeroImage] = useState(null);
  const [aboutImage, setAboutImage] = useState(null);

  useEffect(() => {
    base44.entities.WebsiteImage.filter({ page: 'about' }).then(imgs => {
      const hero = imgs.find(i => i.label === 'hero');
      const main = imgs.find(i => i.label === 'main' || !i.label);
      if (hero) setHeroImage(hero.image_url);
      if (main) setAboutImage(main.image_url);
    }).catch(() => {});
  }, []);

  const values = [
    { icon: Heart, title: 'Integrity', description: 'We act with integrity and do what is right.' },
    { icon: Users, title: 'Respect', description: 'We show respect for others and ourselves.' },
    { icon: Target, title: 'Care', description: 'We support others and take care of the world around us.' },
    { icon: Award, title: 'Belief', description: 'We explore our beliefs, attitudes and spirituality.' },
  ];

  return (
    <div style={{ background: '#ffffff', minHeight: '100vh', fontFamily: 'DM Sans, sans-serif' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&family=DM+Sans:wght@400;500&display=swap');
        @keyframes fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .about-hero-eyebrow { animation: fadeUp 0.6s ease forwards; opacity: 0; }
        .about-hero-h1 { animation: fadeUp 0.6s ease 0.12s forwards; opacity: 0; }
        .about-hero-sub { animation: fadeUp 0.6s ease 0.24s forwards; opacity: 0; }
      `}</style>
      <SEO title="About Us | 40th Rochdale (Syke) Scouts" description="Learn about 40th Rochdale (Syke) Scouts." path="/About" />
      <FloatingNav />

      {/* Full-bleed hero — matches home page style */}
      <section style={{ position: 'relative', height: 'clamp(360px, 50vh, 520px)', overflow: 'hidden', display: 'flex', alignItems: 'center', marginTop: '-72px' }}>
        <NavBarSpacer />
        {/* Background */}
        {heroImage ? (
          <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${heroImage})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
        ) : (
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, #1a1a2e 0%, #2d1b69 100%)' }} />
        )}
        {/* Dark overlay */}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.5) 50%, rgba(0,0,0,0.75) 100%)' }} />
        {/* Content */}
        <div style={{ position: 'relative', zIndex: 1, padding: '80px 40px 40px', maxWidth: '900px', margin: '0 auto', width: '100%' }}>
          <p className="about-hero-eyebrow" style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 500, fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.75)', marginBottom: '14px' }}>
            About us
          </p>
          <h1 className="about-hero-h1" style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: 'clamp(36px, 5vw, 60px)', color: '#fff', margin: '0 0 16px', lineHeight: 1.05 }}>
            Who we are.
          </h1>
          <p className="about-hero-sub" style={{ fontSize: '18px', color: 'rgba(255,255,255,0.8)', lineHeight: 1.75, maxWidth: '600px', margin: 0 }}>
            A volunteer-run Scout Group helping young people develop skills for life through adventure and friendship.
          </p>
        </div>
      </section>

      {/* Welcome + image */}
      <section style={{ padding: '80px 32px', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '56px', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 600, fontSize: 'clamp(24px, 3vw, 38px)', color: '#1a1a2e', marginBottom: '20px' }}>Welcome to Syke Scouts</h2>
            <p style={{ fontSize: '17px', color: 'rgba(26,26,46,0.65)', lineHeight: 1.75, marginBottom: '16px' }}>
              Our Scout group is part of The Scout Association, the UK's largest youth organisation. We provide young people aged 6–14 with the opportunity to experience adventure, develop skills, and make lifelong friends.
            </p>
            <p style={{ fontSize: '17px', color: 'rgba(26,26,46,0.65)', lineHeight: 1.75, marginBottom: '16px' }}>
              Run entirely by dedicated volunteers, we offer weekly meetings packed with activities, games, badge work, and outdoor adventures. From camping trips to community service, from earning badges to international jamborees — there's always something exciting happening.
            </p>
            <p style={{ fontSize: '17px', color: 'rgba(26,26,46,0.65)', lineHeight: 1.75 }}>
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
                  <Users size={48} color="rgba(116,19,220,0.2)" />
                  <p style={{ color: 'rgba(26,26,46,0.35)', marginTop: '12px', fontSize: '13px' }}>Group photo — upload in Admin Settings</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Meeting info */}
      <section style={{ padding: '0 32px 80px', maxWidth: '1200px', margin: '0 auto' }}>
        <h2 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 600, fontSize: 'clamp(24px, 3vw, 38px)', color: '#1a1a2e', textAlign: 'center', marginBottom: '40px' }}>When & Where We Meet</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '24px', maxWidth: '800px', margin: '0 auto 48px' }}>
          {[
            { icon: MapPin, title: 'Our Location', details: ['Syke Methodist Church', '206 Syke Road', 'Rochdale, OL12 9TF'] },
            { icon: Clock, title: 'Meeting Times', details: ['Beavers: Tuesday 6:15–7:30pm', 'Cubs: Thursday 6:15–7:30pm', 'Scouts: Thursday 7:45–9:15pm'] },
          ].map(info => (
            <div key={info.title} style={{ ...glassCard, padding: '28px' }}>
              <div style={{ width: '44px', height: '44px', background: 'rgba(116,19,220,0.1)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
                <info.icon size={22} color="#7413dc" />
              </div>
              <h3 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 600, fontSize: '18px', color: '#1a1a2e', marginBottom: '10px' }}>{info.title}</h3>
              {info.details.map((d, i) => <p key={i} style={{ fontSize: '14px', color: 'rgba(26,26,46,0.6)', margin: '2px 0' }}>{d}</p>)}
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
        <h2 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 600, fontSize: 'clamp(24px, 3vw, 38px)', color: '#1a1a2e', textAlign: 'center', marginBottom: '40px' }}>Our Scout Values</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '24px' }}>
          {values.map((v) => (
            <div key={v.title} style={{ ...glassCard, padding: '32px 24px', textAlign: 'center' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#7413dc', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <v.icon size={26} color="#fff" />
              </div>
              <h3 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 600, fontSize: '18px', color: '#1a1a2e', marginBottom: '8px' }}>{v.title}</h3>
              <p style={{ fontSize: '14px', color: 'rgba(26,26,46,0.6)', lineHeight: 1.65 }}>{v.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: '60px 32px', background: '#f8f7ff', borderTop: '1px solid rgba(116,19,220,0.1)', textAlign: 'center' }}>
        <h2 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 600, fontSize: 'clamp(22px, 3vw, 34px)', color: '#1a1a2e', marginBottom: '16px' }}>Ready to Join the Adventure?</h2>
        <p style={{ fontSize: '17px', color: 'rgba(26,26,46,0.6)', marginBottom: '32px' }}>Whether you're looking to sign up your child or volunteer with us, we'd love to hear from you.</p>
        <div style={{ display: 'flex', gap: '14px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link to={createPageUrl('Join')} style={{ display: 'inline-block', fontFamily: 'DM Sans, sans-serif', fontWeight: 500, fontSize: '15px', color: '#fff', textDecoration: 'none', background: '#7413dc', borderRadius: '30px', padding: '13px 28px' }}>Join Scouts →</Link>
          <Link to={createPageUrl('Volunteer')} style={{ display: 'inline-block', fontFamily: 'DM Sans, sans-serif', fontWeight: 500, fontSize: '15px', color: 'rgba(26,26,46,0.75)', textDecoration: 'none', border: '1px solid rgba(26,26,46,0.25)', borderRadius: '30px', padding: '13px 28px', background: 'transparent' }}>Volunteer With Us</Link>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}