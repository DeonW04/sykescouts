import React from 'react';
import { CheckCircle, Trophy } from 'lucide-react';

// ─── Circular progress ring (small, sits over centre of badge) ────────────────
function ProgressRing({ percentage, diameter, color }) {
  const strokeWidth = Math.max(2, diameter * 0.06);
  const radius = (diameter - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;
  return (
    <div
      style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: diameter,
        height: diameter,
        borderRadius: '50%',
        background: 'rgba(15,23,42,0.55)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <svg width={diameter} height={diameter} style={{ position: 'absolute', transform: 'rotate(-90deg)' }}>
        <circle cx={diameter / 2} cy={diameter / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth={strokeWidth} />
        <circle
          cx={diameter / 2} cy={diameter / 2} r={radius}
          fill="none" stroke={color} strokeWidth={strokeWidth}
          strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.6s ease' }}
        />
      </svg>
      <span style={{ fontSize: diameter * 0.28, fontWeight: 800, color: 'white', lineHeight: 1, zIndex: 1 }}>
        {percentage}%
      </span>
    </div>
  );
}

// ─── A single complete-badge image positioned absolutely ──────────────────────
// The PNG IS the hexagon. We never draw a hex behind it or crop it.
export default function BadgeHex({ badge, width, left, top, isEarned, percentage, onClick, accentColor }) {
  const inProgress = !isEarned && percentage > 0;
  const filter = isEarned ? 'none' : 'grayscale(100%)';
  const opacity = isEarned ? 1 : (inProgress ? 0.5 : 0.32);
  const ringDiameter = width * 0.45;

  return (
    <button
      onClick={onClick}
      title={badge?.name}
      style={{
        position: 'absolute',
        left,
        top,
        width,
        height: width, // PNGs are roughly square (hex within transparent square)
        padding: 0,
        border: 'none',
        background: 'none',
        cursor: 'pointer',
        WebkitTapHighlightColor: 'transparent',
        transition: 'transform 0.15s',
      }}
      onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.95)')}
      onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
      onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
    >
      {badge?.image_url ? (
        <img
          src={badge.image_url}
          alt={badge?.name || ''}
          style={{ width: '100%', height: '100%', objectFit: 'contain', filter, opacity, display: 'block' }}
        />
      ) : (
        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Trophy style={{ width: width * 0.45, height: width * 0.45, color: isEarned ? '#fbbf24' : '#94a3b8' }} />
        </div>
      )}

      {inProgress && <ProgressRing percentage={percentage} diameter={ringDiameter} color={accentColor} />}

      {isEarned && (
        <div style={{ position: 'absolute', bottom: '14%', right: '14%', background: '#22c55e', borderRadius: '50%', padding: 1, display: 'flex', boxShadow: '0 1px 3px rgba(0,0,0,0.4)' }}>
          <CheckCircle style={{ width: width * 0.16, height: width * 0.16, color: 'white' }} />
        </div>
      )}
    </button>
  );
}