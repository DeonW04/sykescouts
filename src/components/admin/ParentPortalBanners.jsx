import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Image, Users, X, Search, ImagePlus } from 'lucide-react';
import { toast } from 'sonner';
import BannerPickerDialog from '@/components/banner/BannerPickerDialog';
import BannerPreview from '@/components/banner/BannerPreview';

const SLOTS = [
  { label: 'Beavers', slug: 'beavers' },
  { label: 'Cubs', slug: 'cubs' },
  { label: 'Scouts', slug: 'scouts' },
];

export default function ParentPortalBanners() {
  const queryClient = useQueryClient();
  const [pickerSlot, setPickerSlot] = useState(null);
  const [memberDialogOpen, setMemberDialogOpen] = useState(false);
  const [memberSearch, setMemberSearch] = useState('');
  const [selectedMember, setSelectedMember] = useState(null);
  const [memberPickerOpen, setMemberPickerOpen] = useState(false);

  const { data: images = [] } = useQuery({
    queryKey: ['parent-dashboard-hero-images'],
    queryFn: () => base44.entities.WebsiteImage.filter({ page: 'parent_dashboard' }),
  });
  const { data: members = [] } = useQuery({
    queryKey: ['all-members-admin'],
    queryFn: () => base44.entities.Member.filter({ active: true }),
  });
  const { data: sections = [] } = useQuery({
    queryKey: ['sections'],
    queryFn: () => base44.entities.Section.filter({ active: true }),
  });

  const getDefault = (slug) => images.find(i => i.label === slug);
  const customCount = members.filter(m => m.custom_banner_url).length;

  const handleSlotComplete = async (url, position) => {
    const slug = pickerSlot;
    try {
      const existing = getDefault(slug);
      if (existing) await base44.entities.WebsiteImage.delete(existing.id);
      await base44.entities.WebsiteImage.create({ page: 'parent_dashboard', label: slug, image_url: url, position, order: 0 });
      queryClient.invalidateQueries({ queryKey: ['parent-dashboard-hero-images'] });
      queryClient.invalidateQueries({ queryKey: ['website-images'] });
      toast.success('Default banner updated');
    } catch { toast.error('Failed to save banner'); }
  };

  const handleSlotRemove = async (slug) => {
    const existing = getDefault(slug);
    if (!existing) return;
    await base44.entities.WebsiteImage.delete(existing.id);
    queryClient.invalidateQueries({ queryKey: ['parent-dashboard-hero-images'] });
    toast.success('Banner removed');
  };

  const filteredMembers = useMemo(() => {
    const q = memberSearch.toLowerCase();
    return members
      .filter(m => !q || (m.full_name || '').toLowerCase().includes(q))
      .sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''));
  }, [members, memberSearch]);

  const memberSection = selectedMember ? sections.find(s => s.id === selectedMember.section_id) : null;
  const memberDefault = memberSection ? getDefault(memberSection.name) : null;
  const memberBannerUrl = selectedMember?.custom_banner_url || memberDefault?.image_url || null;
  const memberBannerPos = selectedMember?.custom_banner_url ? selectedMember?.custom_banner_position : memberDefault?.position;

  return (
    <div className="space-y-6">
      <div className="bg-teal-50 border border-teal-200 rounded-xl p-4">
        <h2 className="text-lg font-bold text-teal-900 mb-1">Parent Portal Banners</h2>
        <p className="text-sm text-teal-700">
          Set the default dashboard banner per section, and see which parents have chosen their own custom banner.
        </p>
      </div>

      {/* Default banners */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Image className="w-5 h-5" />
            Default Dashboard Banners
          </CardTitle>
          <p className="text-sm text-gray-500">Shown to parents who haven't set a custom banner. Choose from the gallery or upload your own, then position the crop.</p>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {SLOTS.map(({ label, slug }) => {
            const img = getDefault(slug);
            return (
              <div key={slug} className="p-4 rounded-xl border border-gray-100 bg-white space-y-3">
                <p className="text-sm font-semibold text-gray-800">{label}</p>
                {img ? (
                  <div className="relative group">
                    <div className="h-24 rounded-lg overflow-hidden border border-gray-200">
                      <img src={img.image_url} alt={label} className="w-full h-full object-cover" style={{ objectPosition: img.position || '50% 50%' }} />
                    </div>
                    <button
                      onClick={() => handleSlotRemove(slug)}
                      className="absolute top-2 right-2 p-1.5 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="h-24 flex items-center justify-center rounded-lg border-2 border-dashed border-gray-200 bg-gray-50">
                    <p className="text-xs text-gray-400">No image set</p>
                  </div>
                )}
                <Button size="sm" variant="outline" className="border-teal-300 text-teal-700 hover:bg-teal-50" onClick={() => setPickerSlot(slug)}>
                  <Image className="w-3.5 h-3.5 mr-1.5" />{img ? 'Change image' : 'Choose image'}
                </Button>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Usage */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Custom Banner Usage
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-end gap-3">
            <p className="text-4xl font-black text-teal-700">{customCount}</p>
            <p className="text-sm text-gray-500 pb-1">of {members.length} members have a custom banner set by their parents</p>
          </div>
          <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-teal-600 rounded-full transition-all" style={{ width: `${members.length ? (customCount / members.length) * 100 : 0}%` }} />
          </div>

          <div className="border-t pt-4">
            <Button variant="outline" onClick={() => { setMemberSearch(''); setMemberDialogOpen(true); }}>
              <Search className="w-4 h-4 mr-2" />Select a member
            </Button>
          </div>

          {selectedMember && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-semibold text-gray-800">{selectedMember.full_name}'s dashboard banner</p>
                <Badge className={selectedMember.custom_banner_url ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-600'}>
                  {selectedMember.custom_banner_url ? 'Custom' : 'Default'}
                </Badge>
                <Button size="sm" variant="outline" className="ml-auto" onClick={() => setMemberPickerOpen(true)}>
                  <ImagePlus className="w-3.5 h-3.5 mr-1.5" />Change banner
                </Button>
              </div>
              <BannerPreview
                imageUrl={memberBannerUrl}
                position={memberBannerPos}
                memberName={selectedMember.full_name}
                sectionLabel={memberSection?.display_name}
              />
              {!memberBannerUrl && <p className="text-xs text-gray-400">No default banner set for this section — parents see the brand gradient.</p>}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Member selector dialog */}
      <Dialog open={memberDialogOpen} onOpenChange={setMemberDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Select a member</DialogTitle></DialogHeader>
          <Input placeholder="Search members..." value={memberSearch} onChange={(e) => setMemberSearch(e.target.value)} />
          <div className="max-h-80 overflow-y-auto space-y-1 mt-2">
            {filteredMembers.map(m => {
              const sec = sections.find(s => s.id === m.section_id);
              return (
                <button
                  key={m.id}
                  onClick={() => { setSelectedMember(m); setMemberDialogOpen(false); }}
                  className="w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 border border-transparent hover:border-gray-200 transition-colors text-left"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{m.full_name}</p>
                    <p className="text-xs text-gray-400">{sec?.display_name || '—'}</p>
                  </div>
                  <Badge className={m.custom_banner_url ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-500'}>
                    {m.custom_banner_url ? 'Custom' : 'Default'}
                  </Badge>
                </button>
              );
            })}
            {filteredMembers.length === 0 && <p className="text-sm text-gray-400 text-center py-6">No members found</p>}
          </div>
        </DialogContent>
      </Dialog>

      {/* Gallery/upload picker + crop for default banners */}
      <BannerPickerDialog
        open={!!pickerSlot}
        onOpenChange={(o) => { if (!o) setPickerSlot(null); }}
        onComplete={handleSlotComplete}
        allowUpload
        sectionId={sections.find(s => s.name === pickerSlot)?.id}
        title={`Choose the ${SLOTS.find(s => s.slug === pickerSlot)?.label || ''} default banner`}
      />

      {/* Picker for an individual member's banner */}
      <BannerPickerDialog
        open={memberPickerOpen}
        onOpenChange={setMemberPickerOpen}
        onComplete={async (url, position) => {
          try {
            await base44.entities.Member.update(selectedMember.id, { custom_banner_url: url, custom_banner_position: position });
            setSelectedMember({ ...selectedMember, custom_banner_url: url, custom_banner_position: position });
            queryClient.invalidateQueries({ queryKey: ['all-members-admin'] });
            toast.success('Banner updated');
          } catch { toast.error('Failed to update banner'); }
        }}
        allowUpload
        sectionId={selectedMember?.section_id}
        title={selectedMember ? `Choose ${selectedMember.first_name}'s banner` : 'Choose a banner image'}
      />
    </div>
  );
}