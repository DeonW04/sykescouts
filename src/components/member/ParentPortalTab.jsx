import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ImagePlus, AlertCircle, CheckCircle, Check } from 'lucide-react';
import { toast } from 'sonner';
import BannerPreview from '@/components/banner/BannerPreview';
import BannerPickerDialog from '@/components/banner/BannerPickerDialog';

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) : '';

export default function ParentPortalTab({ member, section }) {
  const queryClient = useQueryClient();
  const [pickerOpen, setPickerOpen] = useState(false);

  const { data: heroImages = [] } = useQuery({
    queryKey: ['parent-dashboard-hero-images'],
    queryFn: () => base44.entities.WebsiteImage.filter({ page: 'parent_dashboard' }),
  });
  // Same scoping as the parent portal: published programmes for the member's
  // section, published events including the member's section.
  const { data: programmes = [] } = useQuery({
    queryKey: ['pp-programmes', member.section_id],
    queryFn: () => base44.entities.Programme.filter({ published: true, section_id: member.section_id }),
    enabled: !!member.section_id,
  });
  const { data: events = [] } = useQuery({
    queryKey: ['pp-events'],
    queryFn: () => base44.entities.Event.filter({ published: true }),
  });
  const { data: allActions = [] } = useQuery({
    queryKey: ['pp-actions'],
    queryFn: () => base44.entities.ActionRequired.filter({}),
  });
  const { data: allResponses = [] } = useQuery({
    queryKey: ['pp-responses'],
    queryFn: () => base44.entities.ActionResponse.filter({}),
  });

  // ── Banner ──────────────────────────────────────────────────────────────────
  const defaultHero = heroImages.find(i => i.label === section?.name);
  const bannerUrl = member.custom_banner_url || defaultHero?.image_url || null;
  const bannerPos = member.custom_banner_url ? member.custom_banner_position : defaultHero?.position;

  const saveBanner = async (url, position) => {
    await base44.entities.Member.update(member.id, { custom_banner_url: url, custom_banner_position: position });
    queryClient.invalidateQueries({ queryKey: ['member', member.id] });
    queryClient.invalidateQueries({ queryKey: ['all-members-admin'] });
    toast.success('Banner updated');
  };

  // ── Actions — identical logic to the parent dashboard ──────────────────────
  const sectionEvents = events.filter(e => e.section_ids?.some(sid => sid === member.section_id));
  const relevantActions = allActions
    .filter(a =>
      (a.programme_id && programmes.some(p => p.id === a.programme_id)) ||
      (a.event_id && sectionEvents.some(e => e.id === a.event_id))
    )
    .map(a => ({
      ...a,
      programme: programmes.find(p => p.id === a.programme_id),
      event: sectionEvents.find(e => e.id === a.event_id),
    }));

  const memberResponses = allResponses.filter(r => r.member_id === member.id || r.child_member_id === member.id);
  const getResponse = (action) => memberResponses.find(r =>
    (r.action_required_id === action.id || r.action_id === action.id) &&
    (r.response_value || r.response)
  );

  const pendingActions = relevantActions.filter(action => {
    if (action.is_open === false) return false;
    if (action.programme && action.programme.date) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (new Date(action.programme.date) < today) return false;
    }
    if (action.event && (action.event.end_date || action.event.start_date)) {
      if (new Date(action.event.end_date || action.event.start_date) < new Date()) return false;
    }
    return !getResponse(action);
  });

  const respondedActions = relevantActions
    .map(action => {
      const resp = getResponse(action);
      return resp ? { action, resp } : null;
    })
    .filter(Boolean)
    .sort((a, b) => new Date(b.resp.response_date || b.resp.created_date || 0) - new Date(a.resp.response_date || a.resp.created_date || 0));

  const contextLine = (action) => {
    if (action.programme) return `${action.programme.title} · ${fmtDate(action.programme.date)}`;
    if (action.event) return `${action.event.title} · ${fmtDate(action.event.start_date)}`;
    return null;
  };

  return (
    <div className="space-y-4">
      {/* Dashboard banner */}
      <Card className="rounded-2xl border-gray-100 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center gap-2">
            Dashboard Banner
            <Badge className={member.custom_banner_url ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-600'}>
              {member.custom_banner_url ? 'Custom' : 'Default'}
            </Badge>
          </CardTitle>
          <Button size="sm" variant="outline" onClick={() => setPickerOpen(true)}>
            <ImagePlus className="w-3.5 h-3.5 mr-1.5" />Change banner
          </Button>
        </CardHeader>
        <CardContent>
          <BannerPreview
            imageUrl={bannerUrl}
            position={bannerPos}
            memberName={member.full_name}
            sectionLabel={section?.display_name}
          />
          {!bannerUrl && <p className="text-xs text-gray-400 mt-2">No default banner set for this section — parents see the brand gradient.</p>}
        </CardContent>
      </Card>

      {/* Pending actions */}
      <Card className="rounded-2xl border-gray-100 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-orange-500" />
            Actions Required — Pending ({pendingActions.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pendingActions.length === 0 ? (
            <div className="text-center py-6">
              <Check className="w-10 h-10 text-green-500 mx-auto mb-2" />
              <p className="text-gray-500 text-sm">All caught up — nothing pending for this member.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingActions.map(action => (
                <div key={action.id} className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                  <p className="font-medium text-sm text-orange-900">{action.action_text}</p>
                  {contextLine(action) && (
                    <p className="text-xs text-[#7413dc] mt-1 font-medium">{contextLine(action)}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Responded actions */}
      <Card className="rounded-2xl border-gray-100 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            Responded ({respondedActions.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {respondedActions.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-4">No responses recorded yet.</p>
          ) : (
            <div className="space-y-2">
              {respondedActions.map(({ action, resp }) => (
                <div key={action.id} className="flex items-start justify-between gap-3 p-3 bg-gray-50 border border-gray-100 rounded-lg">
                  <div className="min-w-0">
                    <p className="font-medium text-sm text-gray-800">{action.action_text}</p>
                    {contextLine(action) && <p className="text-xs text-gray-400 mt-0.5">{contextLine(action)}</p>}
                    {resp.response_date && <p className="text-[10px] text-gray-400 mt-0.5">Responded {fmtDate(resp.response_date)}</p>}
                  </div>
                  <Badge className="bg-green-100 text-green-800 flex-shrink-0 capitalize">
                    {resp.response_value || resp.response}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <BannerPickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onComplete={saveBanner}
        allowUpload
        sectionId={member.section_id}
        title={`Choose ${member.first_name}'s banner`}
      />
    </div>
  );
}