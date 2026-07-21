import React from 'react';
import { ChevronDown, Check, Settings, LogOut } from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// Option 1 — the account dropdown is REPLACED by a child-identity pill.
// The dropdown merges child switching with the existing account contents.
export default function ChildAccountDropdown({ user, children: kids, selected, onSelect }) {
  const child = kids.find(k => k.id === selected);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          style={{
            display: 'flex', alignItems: 'center', gap: '7px',
            fontFamily: 'DM Sans, sans-serif', fontWeight: 500, fontSize: '13px',
            color: 'rgba(26,26,46,0.75)', background: 'rgba(116,19,220,0.04)',
            border: '0.5px solid rgba(116,19,220,0.12)', borderRadius: '20px',
            cursor: 'pointer', padding: '3px 12px 3px 4px',
            whiteSpace: 'nowrap', transition: 'background 0.2s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(116,19,220,0.08)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(116,19,220,0.04)'; }}
        >
          <span style={{
            width: '24px', height: '24px', borderRadius: '50%', background: child.color,
            color: '#fff', fontSize: '10px', fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>{child.initials}</span>
          {child.first_name}
          <ChevronDown size={11} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" style={{ zIndex: 1100, width: '230px' }}>
        {/* Account header — same as existing dropdown */}
        <div style={{ padding: '8px 12px 6px', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: '13px', color: '#1a1a2e', margin: 0 }}>{user.name}</p>
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: 'rgba(26,26,46,0.4)', margin: '2px 0 0' }}>{user.email}</p>
        </div>
        {/* Child switching section — only shown when more than one child */}
        {kids.length > 1 && (
          <>
            <p style={{ padding: '6px 12px 2px', fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(26,26,46,0.35)', margin: 0, fontFamily: 'DM Sans, sans-serif' }}>Viewing</p>
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
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuItem className="cursor-pointer">
          <Settings className="w-4 h-4 mr-2" /> Account Settings
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="cursor-pointer text-red-600 focus:text-red-600">
          <LogOut className="w-4 h-4 mr-2" /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}