import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';

// Restricts treasurer pages to admin/treasurer accounts only.
export default function TreasurerGuard({ children }) {
  const [status, setStatus] = useState('checking'); // checking | allowed | denied

  useEffect(() => {
    (async () => {
      try {
        const user = await base44.auth.me();
        setStatus(user?.role === 'admin' || user?.role === 'treasurer' ? 'allowed' : 'denied');
      } catch {
        setStatus('denied');
      }
    })();
  }, []);

  if (status === 'checking') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin w-8 h-8 border-4 border-[#7413dc] border-t-transparent rounded-full" />
      </div>
    );
  }

  if (status === 'denied') {
    window.location.href = '/login';
    return null;
  }

  return children;
}