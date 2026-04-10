import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CheckCircle, Link, Unlink, Search, Loader2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

export default function OSMLinkSection({ member, memberId }) {
  const queryClient = useQueryClient();
  const [searching, setSearching] = useState(false);
  const [osmMembers, setOsmMembers] = useState(null);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [unlinkDialog, setUnlinkDialog] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSearch = async () => {
    setSearching(true);
    setOsmMembers(null);
    setSelected(null);
    try {
      const res = await base44.functions.invoke('searchOSMMembers', {});
      if (res.data.error) {
        toast.error(res.data.error);
      } else {
        setOsmMembers(res.data.members || []);
      }
    } catch (e) {
      toast.error('Failed to search OSM: ' + e.message);
    } finally {
      setSearching(false);
    }
  };

  const handleConfirmLink = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await base44.entities.Member.update(memberId, { osm_scoutid: selected.scoutid });
      queryClient.invalidateQueries({ queryKey: ['member', memberId] });
      toast.success('Successfully linked to OSM account.');
      setConfirming(false);
      setOsmMembers(null);
      setSelected(null);
    } catch (e) {
      toast.error('Failed to save link: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleUnlink = async () => {
    setSaving(true);
    try {
      await base44.entities.Member.update(memberId, { osm_scoutid: null });
      queryClient.invalidateQueries({ queryKey: ['member', memberId] });
      toast.success('OSM account unlinked.');
      setUnlinkDialog(false);
    } catch (e) {
      toast.error('Failed to unlink: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const filtered = (osmMembers || []).filter(m =>
    !search || m.display.toLowerCase().includes(search.toLowerCase())
  );

  const isLinked = !!member?.osm_scoutid;

  return (
    <>
      <Card className={isLinked ? 'border-green-200 bg-green-50' : 'border-gray-200'}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Link className="w-4 h-4" />
            OSM Account
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLinked ? (
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-green-800">Linked to OSM</p>
                  <p className="text-sm text-green-700">Scout ID: {member.osm_scoutid}</p>
                </div>
              </div>
              <Button size="sm" variant="outline" className="border-red-300 text-red-600 hover:bg-red-50" onClick={() => setUnlinkDialog(true)}>
                <Unlink className="w-3.5 h-3.5 mr-1.5" />Unlink
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-gray-500">
                <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                <p className="text-sm">This member is not yet linked to an OSM account.</p>
              </div>
              <Button size="sm" onClick={handleSearch} disabled={searching} className="bg-[#004851] hover:bg-[#003840]">
                {searching ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Searching OSM...</> : <><Search className="w-4 h-4 mr-2" />Find & Link OSM Account</>}
              </Button>

              {osmMembers !== null && (
                <div className="space-y-3 mt-2">
                  <Input
                    placeholder="Search by name or Scout ID..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                  />
                  <div className="max-h-64 overflow-y-auto border rounded-lg divide-y">
                    {filtered.length === 0 ? (
                      <p className="text-sm text-gray-500 p-4 text-center">No results found</p>
                    ) : (
                      filtered.map(m => (
                        <button
                          key={m.scoutid}
                          onClick={() => { setSelected(m); setConfirming(true); }}
                          className="w-full text-left px-4 py-2.5 text-sm hover:bg-blue-50 transition-colors"
                        >
                          {m.display}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Link confirmation dialog */}
      <Dialog open={confirming} onOpenChange={setConfirming}>
        <DialogContent>
          <DialogHeader><DialogTitle>Confirm Link</DialogTitle></DialogHeader>
          <p className="text-sm text-gray-700">
            Link this member to <strong>{selected?.display}</strong>?
          </p>
          <p className="text-xs text-gray-500">OSM ID: {selected?.scoutid}</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirming(false)}>Cancel</Button>
            <Button onClick={handleConfirmLink} disabled={saving} className="bg-[#004851] hover:bg-[#003840]">
              {saving ? 'Saving...' : 'Yes, Link Account'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unlink confirmation dialog */}
      <Dialog open={unlinkDialog} onOpenChange={setUnlinkDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Unlink OSM Account</DialogTitle></DialogHeader>
          <p className="text-sm text-gray-700">Are you sure you want to unlink this member from OSM? This will not affect any pending badge sync records.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUnlinkDialog(false)}>Cancel</Button>
            <Button onClick={handleUnlink} disabled={saving} className="bg-red-600 hover:bg-red-700 text-white">
              {saving ? 'Unlinking...' : 'Yes, Unlink'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}