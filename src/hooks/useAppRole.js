import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

/**
 * Determines the current user's app role for the mobile PWA.
 *
 * Current roles:
 *   'parent'  — default for regular users
 *   'leader'  — has a Leader record or is admin
 *
 * Future roles (reserved, not yet implemented):
 *   'ipad'    — iPad kiosk mode
 *   'member'  — young person / scout member view
 *
 * Returns: { role, user, leader, isLoading }
 */
export function useAppRole() {
  const [role, setRole] = useState(null);
  const [user, setUser] = useState(null);
  const [leader, setLeader] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const detect = async () => {
      try {
        const u = await base44.auth.me();
        setUser(u);

        if (u.role === 'admin') {
          setRole('leader');
          setLeader({ display_name: u.display_name || u.full_name });
          return;
        }

        const leaders = await base44.entities.Leader.filter({ user_id: u.id });
        if (leaders.length > 0) {
          setRole('leader');
          setLeader(leaders[0]);
          return;
        }

        // Future: check for 'ipad' or 'member' roles here when needed

        setRole('parent');
      } catch {
        setRole('parent');
      } finally {
        setIsLoading(false);
      }
    };
    detect();
  }, []);

  return { role, user, leader, isLoading };
}