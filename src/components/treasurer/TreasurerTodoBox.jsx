import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ListChecks } from 'lucide-react';

const glassCard = {
  background: 'rgba(255,255,255,0.9)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  border: '1px solid rgba(116,19,220,0.1)',
  borderRadius: '20px',
  boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
};

export default function TreasurerTodoBox({ items }) {
  const navigate = useNavigate();
  return (
    <div style={glassCard}>
      <div style={{ padding: '20px 24px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{ width: '32px', height: '32px', background: 'rgba(116,19,220,0.1)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <ListChecks size={16} color="#7413dc" />
        </div>
        <h3 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 600, fontSize: '16px', color: '#1a1a2e', margin: 0 }}>To-Do</h3>
      </div>
      <div className="grid grid-cols-2" style={{ gap: '10px', padding: '16px 20px 20px' }}>
        {items.map(item => (
          <button
            key={item.label}
            onClick={() => navigate(item.to)}
            style={{
              background: `${item.color}0d`, border: `1px solid ${item.color}30`, borderRadius: '16px',
              padding: '18px 16px', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
              display: 'flex', flexDirection: 'column', gap: '8px',
              transition: 'transform 0.15s, box-shadow 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 8px 22px ${item.color}22`; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
          >
            <div style={{ width: '36px', height: '36px', background: `${item.color}1a`, borderRadius: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <item.icon size={17} color={item.color} />
            </div>
            <p style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '26px', color: item.color, margin: 0, lineHeight: 1 }}>{item.value}</p>
            <div>
              <p style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: '13px', color: '#1a1a2e', margin: 0 }}>{item.label}</p>
              {item.sublabel && <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: 'rgba(26,26,46,0.45)', margin: '2px 0 0' }}>{item.sublabel}</p>}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}