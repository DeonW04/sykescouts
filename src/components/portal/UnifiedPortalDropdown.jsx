import React, { useState } from 'react';
import { ChevronDown, Check, Settings, LogOut, Baby, Landmark, Shield, LayoutDashboard, UserCog } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { usePortalContext, SECTION_COLORS } from '@/lib/PortalContextProvider';
import { CHILD_COLORS, childInitials } from '@/hooks/useSelectedChild';
import { useAccountSettingsModal } from '@/lib/AccountSettingsModalProvider';
import ActAsParentDialog from './ActAsParentDialog';

const CONTEXT_ICON = { child: '🧒', section: '📋', 'role:treasurer': '💰', 'role:admin': '🛡' };

export default function UnifiedPortalDropdown() {
  const {
    user, activeContext, availableContexts, setActiveContext,
    canActAsParent, isActingAsParent, startActingAsParent, stopActingAsParent,
  } = usePortalContext();
  const { openAccountSettingsModal } = useAccountSettingsModal();
  const [actAsParentOpen, setActAsParentOpen] = useState(false);

  const userName = (() => {
    const n = user?.display_name || user?.full_name || 'Account';
    return n.charAt(0).toUpperCase() + n.slice(1).toLowerCase();
  })();

  const chipLabel = activeContext ? `${CONTEXT_ICON[activeContext.type] || '👤'} ${activeContext.label}` : userName;
  const isActive = (item) => activeContext?.type === item.type && activeContext?.id === item.id;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            fontFamily: 'DM Sans, sans-serif', fontWeight: 500, fontSize: '13px',
            color: 'rgba(26,26,46,0.6)', background: 'rgba(116,19,220,0.04)',
            border: '0.5px solid rgba(116,19,220,0.12)', borderRadius: '20px',
            cursor: 'pointer', padding: '5px 12px 5px 10px',
            whiteSpace: 'nowrap', transition: 'background 0.2s, color 0.2s',
            maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis',
          }}
        >
          {chipLabel}
          <ChevronDown size={11} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" style={{ zIndex: 1100, width: '260px', maxHeight: '420px', overflowY: 'auto' }}>
        <div style={{ padding: '8px 12px 6px', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: '13px', color: '#1a1a2e', margin: 0 }}>{userName}</p>
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: 'rgba(26,26,46,0.4)', margin: '2px 0 0' }}>{user?.email}</p>
        </div>

        {availableContexts.children?.length > 0 && (
          <>
            <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-gray-400">My Children</DropdownMenuLabel>
            {availableContexts.children.map((c, i) => (
              <DropdownMenuItem key={`child-${c.id}`} onClick={() => setActiveContext(c)} className="cursor-pointer">
                <span style={{ width: '22px', height: '22px', borderRadius: '50%', background: CHILD_COLORS[i % CHILD_COLORS.length], color: '#fff', fontSize: '9px', fontWeight: 700, marginRight: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {childInitials(c.member)}
                </span>
                <span className="flex-1 text-sm font-medium truncate">{c.label}</span>
                {c.acting && <UserCog className="w-3.5 h-3.5 text-amber-500 mr-1" />}
                {isActive(c) && <Check className="w-4 h-4 text-[#7413dc]" />}
              </DropdownMenuItem>
            ))}
          </>
        )}

        {availableContexts.sections?.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-gray-400">My Sections</DropdownMenuLabel>
            {availableContexts.sections.map((s) => (
              <DropdownMenuItem key={`section-${s.id}`} onClick={() => setActiveContext(s)} className="cursor-pointer">
                <span style={{ width: '22px', height: '22px', borderRadius: '7px', background: SECTION_COLORS[s.section?.name] || '#7413dc', marginRight: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <LayoutDashboard size={11} color="#fff" />
                </span>
                <span className="flex-1 text-sm font-medium truncate">{s.label}</span>
                {isActive(s) && <Check className="w-4 h-4 text-[#7413dc]" />}
              </DropdownMenuItem>
            ))}
          </>
        )}

        {(availableContexts.roles?.length > 0 || canActAsParent) && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-gray-400">My Roles</DropdownMenuLabel>
            {availableContexts.roles?.map((r) => (
              <DropdownMenuItem key={`role-${r.id}`} onClick={() => setActiveContext(r)} className="cursor-pointer">
                {r.id === 'treasurer' ? <Landmark className="w-4 h-4 mr-2 text-teal-600" /> : <Shield className="w-4 h-4 mr-2 text-[#7413dc]" />}
                <span className="flex-1 text-sm font-medium truncate">{r.label}</span>
                {isActive(r) && <Check className="w-4 h-4 text-[#7413dc]" />}
              </DropdownMenuItem>
            ))}
            {canActAsParent && (
              isActingAsParent ? (
                <DropdownMenuItem onClick={stopActingAsParent} className="cursor-pointer text-amber-600 focus:text-amber-600">
                  <LogOut className="w-4 h-4 mr-2" /> Exit Parent View
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={() => setActAsParentOpen(true)} className="cursor-pointer">
                  <UserCog className="w-4 h-4 mr-2 text-[#7413dc]" /> Act as Parent
                </DropdownMenuItem>
              )
            )}
          </>
        )}

        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={openAccountSettingsModal} className="flex items-center gap-2 cursor-pointer">
          <Settings className="w-4 h-4" /> Account Settings
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => base44.auth.logout()} className="cursor-pointer text-red-600 focus:text-red-600">
          <LogOut className="w-4 h-4 mr-2" /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
      <ActAsParentDialog
        open={actAsParentOpen}
        onClose={() => setActAsParentOpen(false)}
        onSelect={(member) => { startActingAsParent(member); setActAsParentOpen(false); }}
      />
    </DropdownMenu>
  );
}