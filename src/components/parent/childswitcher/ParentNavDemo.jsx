import React, { useState } from 'react';
import { ChevronDown, Check, LayoutDashboard, Baby, Calendar, CalendarDays, Award, UserCircle } from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Settings, LogOut } from 'lucide-react';
import ChildAccountDropdown from './ChildAccountDropdown';

// Exact replica of the FloatingNav in parent mode (strip expanded), rendered
// statically so multiple copies can sit on the test page.
// variant: 'combined' | 'right' | 'left' | 'centre'

const parentNavLinks = [
  { label: 'My Child', icon: Baby, active: true },
  { label: 'Programme', icon: Calendar },
  { label: 'Events', icon: CalendarDays },
  { label: 'Badges', icon: Award },
];

const stripBtnStyle = {
  display: 'flex', alignItems: 'center', gap: '5px',
  fontFamily: 'DM Sans, sans-serif', fontWeight: 500, fontSize: '13px',
  color: 'rgba(26,26,46,0.65)', background: 'none', border: 'none',
  cursor: 'pointer', padding: '6px 12px', borderRadius: '20px',
  whiteSpace: 'nowrap',
};

// Pill switcher using a Radix dropdown (matches how the real nav would do it)
function ChildPill({ children: kids, selected, onSelect }) {
  const child = kids.find(k => k.id === selected);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: '13px',
          color: '#1a1a2e', background: '#fff',
          border: `1px solid ${child.color}55`, borderRadius: '20px',
          cursor: 'pointer', padding: '3px 10px 3px 4px', whiteSpace: 'nowrap',
        }}>
          <span style={{
            width: '24px', height: '24px', borderRadius: '50%', background: child.color,
            color: '#fff', fontSize: '10px', fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>{child.initials}</span>
          {child.first_name}
          <span style={{ fontSize: '9px', fontWeight: 600, color: '#fff', background: child.color, padding: '1px 7px', borderRadius: '10px' }}>{child.section}</span>
          <ChevronDown size={11} style={{ color: 'rgba(26,26,46,0.4)' }} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" style={{ zIndex: 1100, width: '220px' }}>
        <p style={{ padding: '6px 12px 2px', fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(26,26,46,0.35)', margin: 0, fontFamily: 'DM Sans, sans-serif' }}>Switch child</p>
        {kids.map(k => (
          <DropdownMenuItem key={k.id} onClick={() => onSelect(k.id)} className="cursor-pointer">
            <span style={{
              width: '26px', height: '26px', borderRadius: '50%', background: k.color,
              color: '#fff', fontSize: '10px', fontWeight: 700, marginRight: '8px',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>{k.initials}</span>
            <span className="flex-1">
              <span className="block text-sm font-medium">{k.full_name}</span>
              <span className="block text-[11px] text-gray-400">{k.section}</span>
            </span>
            {k.id === selected && <Check className="w-4 h-4 text-[#7413dc]" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function AccountDropdownStatic({ user }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          fontFamily: 'DM Sans, sans-serif', fontWeight: 500, fontSize: '13px',
          color: 'rgba(26,26,46,0.6)', background: 'rgba(116,19,220,0.04)',
          border: '0.5px solid rgba(116,19,220,0.12)', borderRadius: '20px',
          cursor: 'pointer', padding: '5px 12px 5px 10px', whiteSpace: 'nowrap',
        }}>
          <UserCircle size={14} /> {user.name.split(' ')[0]} <ChevronDown size={11} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" style={{ zIndex: 1100 }}>
        <div style={{ padding: '8px 12px 6px', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: '13px', color: '#1a1a2e', margin: 0 }}>{user.name}</p>
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: 'rgba(26,26,46,0.4)', margin: '2px 0 0' }}>{user.email}</p>
        </div>
        <DropdownMenuItem className="cursor-pointer"><Settings className="w-4 h-4 mr-2" /> Account Settings</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="cursor-pointer text-red-600 focus:text-red-600"><LogOut className="w-4 h-4 mr-2" /> Sign out</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function ParentNavDemo({ variant, children: kids, selected, onSelect, user }) {
  return (
    <div style={{
      borderRadius: '24px',
      boxShadow: '0 2px 16px rgba(0,0,0,0.08)',
      border: '0.5px solid rgba(116,19,220,0.18)',
      background: '#ffffff',
    }}>
      {/* ── Pill nav row (exact copy) ── */}
      <div style={{
        background: '#ffffff', borderRadius: '24px 24px 0 0',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 20px',
      }}>
        <img
          src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69540f3779bf32f5ccc6335b/e8eca937a_image.png"
          alt="Syke Scouts" style={{ height: '48px', width: 'auto' }}
        />
        <div className="hidden md:flex" style={{ alignItems: 'center', gap: '2px' }}>
          {['Home', 'About', 'Gallery', 'Join', 'Volunteer', 'Contact'].map(l => (
            <span key={l} style={{
              fontFamily: 'DM Sans, sans-serif', fontWeight: 500, fontSize: '14px',
              color: 'rgba(26,26,46,0.7)', padding: '4px 12px', whiteSpace: 'nowrap',
            }}>{l}</span>
          ))}
        </div>
        <button style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          background: '#7413dc', color: '#fff',
          border: 'none', borderRadius: '25px',
          padding: '8px 18px', fontSize: '14px', fontWeight: 500,
          fontFamily: 'DM Sans, sans-serif', cursor: 'default',
        }}>
          <LayoutDashboard size={15} /> Parent Portal <ChevronDown size={14} style={{ transform: 'rotate(180deg)' }} />
        </button>
      </div>

      {/* ── Parent strip (exact copy) ── */}
      <div style={{ background: 'rgba(255,255,255,0.97)', borderRadius: '0 0 24px 24px' }}>
        <div style={{
          borderTop: '0.5px solid rgba(116,19,220,0.12)',
          padding: '8px 20px 10px',
          display: 'flex', alignItems: 'center',
          background: 'rgba(116,19,220,0.025)',
          borderRadius: '0 0 24px 24px',
        }}>
          {/* Dashboard button */}
          <span style={{
            display: 'flex', alignItems: 'center', gap: '5px',
            fontWeight: 600, fontSize: '12px', color: '#7413dc',
            padding: '5px 12px', borderRadius: '20px',
            background: 'rgba(116,19,220,0.1)',
            whiteSpace: 'nowrap', flexShrink: 0, marginRight: '12px',
            fontFamily: 'DM Sans, sans-serif', cursor: 'default',
          }}>
            <LayoutDashboard size={13} /> Dashboard
          </span>

          <div style={{ width: '1px', height: '18px', background: 'rgba(116,19,220,0.15)', flexShrink: 0, marginRight: '8px' }} />

          {/* Left placement — pill straight after the divider */}
          {variant === 'left' && (
            <div style={{ flexShrink: 0, marginRight: '8px' }}>
              <ChildPill children={kids} selected={selected} onSelect={onSelect} />
            </div>
          )}

          {/* Centre nav */}
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2px' }}>
            {parentNavLinks.map(({ label, icon: Icon, active }) => (
              <span key={label} style={{
                ...stripBtnStyle, cursor: 'default',
                background: active ? 'rgba(116,19,220,0.1)' : 'none',
                color: active ? '#7413dc' : 'rgba(26,26,46,0.65)',
                fontWeight: active ? 600 : 500,
              }}>
                <Icon size={13} /> {label}
              </span>
            ))}
            {/* Centre placement — pill sits with the nav links */}
            {variant === 'centre' && (
              <>
                <div style={{ width: '1px', height: '18px', background: 'rgba(116,19,220,0.15)', margin: '0 8px' }} />
                <ChildPill children={kids} selected={selected} onSelect={onSelect} />
              </>
            )}
          </div>

          <div style={{ width: '1px', height: '18px', background: 'rgba(116,19,220,0.15)', flexShrink: 0, marginLeft: '8px', marginRight: '8px' }} />

          {/* Right side */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
            {variant === 'combined' ? (
              <ChildAccountDropdown user={user} children={kids} selected={selected} onSelect={onSelect} />
            ) : variant === 'right' ? (
              <>
                <ChildPill children={kids} selected={selected} onSelect={onSelect} />
                <AccountDropdownStatic user={user} />
              </>
            ) : (
              <AccountDropdownStatic user={user} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}