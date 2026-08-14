import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Baby, Shield, Landmark, LayoutDashboard } from 'lucide-react';
import { usePortalContext, SECTION_COLORS } from '@/lib/PortalContextProvider';
import { CHILD_COLORS, childInitials } from '@/hooks/useSelectedChild';

const ROLE_META = {
  treasurer: { icon: Landmark, color: '#0d9488', bg: 'rgba(13,148,136,0.08)' },
  admin: { icon: Shield, color: '#7413dc', bg: 'rgba(116,19,220,0.08)' },
};

function GroupRow({ title, children: content }) {
  if (!content || content.length === 0) return null;
  return (
    <div style={{ marginBottom: '18px' }}>
      <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(26,26,46,0.4)', margin: '0 0 10px' }}>{title}</p>
      <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '4px' }}>
        {content}
      </div>
    </div>
  );
}

const cardBase = {
  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px',
  minWidth: '92px', padding: '14px 10px', borderRadius: '16px', cursor: 'pointer',
  border: '1px solid rgba(116,19,220,0.1)', background: '#fff', flexShrink: 0,
  transition: 'transform 0.15s, box-shadow 0.15s', fontFamily: 'DM Sans, sans-serif',
};

export default function PortalContextModal() {
  const { pickerOpen, closePicker, availableContexts, activeContext, setActiveContext } = usePortalContext();
  const isActive = (item) => activeContext?.type === item.type && activeContext?.id === item.id;

  const childCards = (availableContexts.children || []).map((c, i) => (
    <div key={c.id} onClick={() => setActiveContext(c)}
      style={{ ...cardBase, borderColor: isActive(c) ? CHILD_COLORS[i % CHILD_COLORS.length] : cardBase.border }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.08)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
    >
      <span style={{ width: '40px', height: '40px', borderRadius: '50%', background: CHILD_COLORS[i % CHILD_COLORS.length], color: '#fff', fontWeight: 700, fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {childInitials(c.member)}
      </span>
      <span style={{ fontSize: '13px', fontWeight: 600, color: '#1a1a2e', textAlign: 'center' }}>{c.label}</span>
      {c.member?.section_id && <span style={{ fontSize: '10px', color: 'rgba(26,26,46,0.45)' }}>Child</span>}
    </div>
  ));

  const sectionCards = (availableContexts.sections || []).map((s) => {
    const color = SECTION_COLORS[s.section?.name] || '#7413dc';
    return (
      <div key={s.id} onClick={() => setActiveContext(s)}
        style={{ ...cardBase, borderColor: isActive(s) ? color : cardBase.border }}
        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.08)'; }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
      >
        <span style={{ width: '40px', height: '40px', borderRadius: '12px', background: color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <LayoutDashboard size={18} />
        </span>
        <span style={{ fontSize: '13px', fontWeight: 600, color: '#1a1a2e', textAlign: 'center' }}>{s.label}</span>
        <span style={{ fontSize: '10px', color: 'rgba(26,26,46,0.45)' }}>Section</span>
      </div>
    );
  });

  const roleCards = (availableContexts.roles || []).map((r) => {
    const meta = ROLE_META[r.id] || ROLE_META.admin;
    const Icon = meta.icon;
    return (
      <div key={r.id} onClick={() => setActiveContext(r)}
        style={{ ...cardBase, borderColor: isActive(r) ? meta.color : cardBase.border }}
        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.08)'; }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
      >
        <span style={{ width: '40px', height: '40px', borderRadius: '12px', background: meta.color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={18} />
        </span>
        <span style={{ fontSize: '13px', fontWeight: 600, color: '#1a1a2e', textAlign: 'center' }}>{r.label}</span>
      </div>
    );
  });

  return (
    <Dialog open={pickerOpen} onOpenChange={(open) => !open && closePicker()}>
      <DialogContent className="rounded-2xl" style={{ maxWidth: '560px' }}>
        <DialogHeader>
          <DialogTitle style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Baby size={20} color="#7413dc" /> Choose Your Portal
          </DialogTitle>
        </DialogHeader>
        <div style={{ paddingTop: '4px' }}>
          <GroupRow title="My Children">{childCards}</GroupRow>
          <GroupRow title="My Sections">{sectionCards}</GroupRow>
          <GroupRow title="My Roles">{roleCards}</GroupRow>
          {childCards.length === 0 && sectionCards.length === 0 && roleCards.length === 0 && (
            <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '14px', color: 'rgba(26,26,46,0.5)', textAlign: 'center', padding: '20px 0' }}>
              No portal contexts available for your account yet.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}