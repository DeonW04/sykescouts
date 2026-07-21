import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, Check, Settings, LogOut, UserCircle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useParentPortal } from '@/hooks/useParentPortal';
import { useSelectedChildId, childColor, childInitials } from '@/hooks/useSelectedChild';

// Combined account + child-switcher dropdown for the parent nav strip.
// Replaces the plain account dropdown for parents: the trigger shows the
// selected child's avatar; the dropdown merges child switching (only when
// the parent has more than one child) with the account actions.
export default function ChildSwitcherDropdown({ user }) {
  const { data: portal } = useParentPortal();
  const children = portal?.children || [];
  const [selectedId, setSelectedId] = useSelectedChildId(children);
  const child = children.find(c => c.id === selectedId) || children[0];
  const childIdx = children.findIndex(c => c.id === (child?.id));

  const triggerStyle = {
    display: 'flex', alignItems: 'center', gap: '7px',
    fontFamily: 'DM Sans, sans-serif', fontWeight: 500, fontSize: '13px',
    color: 'rgba(26,26,46,0.75)', background: 'rgba(116,19,220,0.04)',
    border: '0.5px solid rgba(116,19,220,0.12)', borderRadius: '20px',
    cursor: 'pointer', padding: child ? '3px 12px 3px 4px' : '5px 12px 5px 10px',
    whiteSpace: 'nowrap', transition: 'background 0.2s',
  };

  const userName = (() => {
    const n = user?.display_name || user?.full_name || 'Account';
    return n.charAt(0).toUpperCase() + n.slice(1).toLowerCase();
  })();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          style={triggerStyle}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(116,19,220,0.08)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(116,19,220,0.04)'; }}
        >
          {child ? (
            <>
              <span style={{
                width: '24px', height: '24px', borderRadius: '50%', background: childColor(childIdx),
                color: '#fff', fontSize: '10px', fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>{childInitials(child)}</span>
              {child.preferred_name || child.first_name}
            </>
          ) : (
            <>
              <UserCircle size={14} />
              {userName.split(' ')[0]}
            </>
          )}
          <ChevronDown size={11} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" style={{ zIndex: 1100, width: '230px' }}>
        <div style={{ padding: '8px 12px 6px', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: '13px', color: '#1a1a2e', margin: 0 }}>{userName}</p>
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: 'rgba(26,26,46,0.4)', margin: '2px 0 0' }}>{user?.email}</p>
        </div>
        {children.length > 1 && (
          <>
            <p style={{ padding: '6px 12px 2px', fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(26,26,46,0.35)', margin: 0, fontFamily: 'DM Sans, sans-serif' }}>Viewing</p>
            {children.map((k, i) => (
              <DropdownMenuItem key={k.id} onClick={() => setSelectedId(k.id)} className="cursor-pointer">
                <span style={{
                  width: '26px', height: '26px', borderRadius: '50%', background: childColor(i),
                  color: '#fff', fontSize: '10px', fontWeight: 700, marginRight: '8px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>{childInitials(k)}</span>
                <span className="flex-1 text-sm font-medium">{k.full_name}</span>
                {k.id === selectedId && <Check className="w-4 h-4 text-[#7413dc]" />}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuItem asChild>
          <Link to={createPageUrl('AccountSettings')} className="flex items-center gap-2 cursor-pointer">
            <Settings className="w-4 h-4" /> Account Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => base44.auth.logout()} className="cursor-pointer text-red-600 focus:text-red-600">
          <LogOut className="w-4 h-4 mr-2" /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}