import React, { useState } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { childColor, childInitials } from '@/hooks/useSelectedChild';

// Post-login step shown in the login panel when a parent has more than one
// child: pick which child to view, then confirm to enter the parent portal.
export default function LoginChildPicker({ children, initialSelected, onConfirm }) {
  const [selected, setSelected] = useState(
    children.some(k => k.id === initialSelected) ? initialSelected : children[0]?.id
  );
  const [confirming, setConfirming] = useState(false);

  return (
    <div style={{ fontFamily: 'DM Sans, sans-serif' }}>
      <div style={{ marginBottom: '16px' }}>
        <p style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '18px', color: '#1a1a2e', margin: '0 0 2px' }}>Who are you checking in on?</p>
        <p style={{ fontSize: '13px', color: 'rgba(26,26,46,0.5)', margin: 0 }}>You can switch child anytime from the nav bar</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
        {children.map((k, i) => {
          const active = k.id === selected;
          return (
            <button
              key={k.id}
              onClick={() => setSelected(k.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: '12px', width: '100%',
                padding: '10px 12px', borderRadius: '14px', cursor: 'pointer', textAlign: 'left',
                background: active ? 'rgba(116,19,220,0.06)' : '#fff',
                border: active ? '2px solid #7413dc' : '2px solid rgba(26,26,46,0.1)',
                transition: 'border-color 0.15s, background 0.15s',
                fontFamily: 'inherit',
              }}
            >
              <span style={{
                width: '36px', height: '36px', borderRadius: '50%', background: childColor(i),
                color: '#fff', fontSize: '13px', fontWeight: 700, flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>{childInitials(k)}</span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#1a1a2e' }}>{k.full_name}</span>
              </span>
              {active && <Check size={18} color="#7413dc" />}
            </button>
          );
        })}
      </div>

      <button
        onClick={() => { setConfirming(true); onConfirm(selected); }}
        disabled={confirming}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
          fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: '14px',
          color: '#fff', background: '#7413dc', border: 'none', borderRadius: '12px',
          padding: '12px', cursor: confirming ? 'default' : 'pointer', opacity: confirming ? 0.7 : 1,
        }}
      >
        {confirming ? <Loader2 size={16} className="animate-spin" /> : null}
        {confirming ? 'Loading portal…' : 'Confirm'}
      </button>
    </div>
  );
}