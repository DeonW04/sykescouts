import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Search, UserCog } from 'lucide-react';
import { toast } from 'sonner';

// Admin-only: searchable child picker used to "Act as Parent" — impersonate
// the real parent of the selected child, seeing the portal exactly as they do.
export default function ActAsParentDialog({ open, onClose, onSelect }) {
  const [search, setSearch] = useState('');

  const { data: members = [], isLoading } = useQuery({
    queryKey: ['all-members-for-acting'],
    queryFn: () => base44.entities.Member.filter({ active: true }),
    enabled: open,
  });

  const filtered = search.trim()
    ? members.filter(m => m.full_name?.toLowerCase().includes(search.trim().toLowerCase()))
    : members;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCog className="w-5 h-5 text-[#7413dc]" /> Act as Parent
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-gray-500 -mt-2">
          Search for a child to view the parent portal exactly as their parent sees it.
        </p>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            autoFocus
            placeholder="Search by child's name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="max-h-80 overflow-y-auto -mx-1 px-1 space-y-1">
          {isLoading ? (
            <p className="text-sm text-gray-400 text-center py-6">Loading members...</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No members found</p>
          ) : (
            filtered.map(m => (
              <button
                key={m.id}
                onClick={() => {
                  if (!m.parent_one_email && !m.parent_two_email) {
                    toast.error("This child has no parent email on file — can't act as their parent");
                    return;
                  }
                  onSelect(m);
                }}
                className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-[#7413dc]/5 transition-colors text-left"
              >
                <div className="w-9 h-9 bg-[#7413dc] rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                  {m.full_name?.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-gray-900 truncate">{m.full_name}</p>
                  <p className="text-xs text-gray-500 truncate">{m.parent_one_email || m.parent_two_email || 'No parent email on file'}</p>
                </div>
              </button>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}