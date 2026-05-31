import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Search, CheckCircle, AlertCircle, User, ChevronRight,
  Award, Loader2, Mail, ArrowLeft,
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';

const IMPORT_STAGES = [
  { label: 'Identifying Member',               percent: 8  },
  { label: 'Fetching Individual Details',       percent: 28 },
  { label: 'Fetching Contact & Medical Data',   percent: 52 },
  { label: 'Creating Member Record',            percent: 65 },
  { label: 'Fetching Badge Data from OSM',      percent: 80 },
  { label: 'Awarding Badges',                   percent: 92 },
  { label: 'Import Complete!',                  percent: 100 },
];

function ProgressBar({ percent }) {
  return (
    <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
      <div
        className="h-3 rounded-full bg-gradient-to-r from-[#7413dc] to-[#5c0fb0] transition-all duration-700 ease-out"
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export default function OSMImportFlow({ open, onClose, sectionId }) {
  const [step, setStep]                 = useState('loading');
  const [osmMembers, setOsmMembers]     = useState([]);
  const [osmMeta, setOsmMeta]           = useState({});
  const [search, setSearch]             = useState('');
  const [selected, setSelected]         = useState(null);
  const [progress, setProgress]         = useState(0);
  const [stageLabel, setStageLabel]     = useState('');
  const [importResult, setImportResult] = useState(null);
  const [inviting, setInviting]         = useState(false);
  const [inviteDone, setInviteDone]     = useState(false);
  const [error, setError]               = useState('');
  const [sectionOsmData, setSectionOsmData] = useState(null);

  useEffect(() => {
    if (open) {
      setStep('loading');
      setSelected(null);
      setSearch('');
      setProgress(0);
      setStageLabel('');
      setImportResult(null);
      setInviteDone(false);
      setError('');
      fetchMembers();
    }
  }, [open]);

  const fetchMembers = async () => {
    // Load section OSM data fresh — avoids stale-state race condition
    let sectionData = null;
    if (sectionId) {
      const all = await base44.entities.Section.filter({ active: true });
      sectionData = all.find(s => s.id === sectionId) || null;
      setSectionOsmData(sectionData);
    }
    const osmPayload = sectionData?.osm_section_id ? {
      osm_section_id_override:   sectionData.osm_section_id,
      osm_section_type_override: sectionData.osm_section_type,
      osm_term_id_override:      sectionData.osm_term_id,
    } : {};
    const resp = await base44.functions.invoke('getOSMMembersList', osmPayload);
    if (resp.data.success) {
      setOsmMembers(resp.data.members || []);
      setOsmMeta(resp.data);
      setStep('list');
    } else {
      setError(resp.data.error || 'Failed to load OSM members.');
      setStep('error');
    }
  };

  const startImport = async () => {
    if (!selected) return;
    setStep('importing');

    const advance = (idx) => {
      setProgress(IMPORT_STAGES[idx].percent);
      setStageLabel(IMPORT_STAGES[idx].label);
    };

    advance(0);
    await delay(400);

    // Stage 1: fetch dob / startedsection / started via getIndividual
    advance(1);
    // sectionOsmData is loaded fresh in fetchMembers — safe to use here
    const sectionOverrides = sectionOsmData?.osm_section_id ? {
      osm_section_id_override: sectionOsmData.osm_section_id,
      osm_term_id_override:    sectionOsmData.osm_term_id,
    } : {};
    const individualResp = await base44.functions.invoke('getOSMMemberIndividual', {
      scoutid: selected.scoutid,
      ...sectionOverrides,
    });
    if (!individualResp.data.success) {
      setError(individualResp.data.error || 'Failed to fetch individual member details from OSM.');
      setStep('error');
      return;
    }
    const individual = individualResp.data;

    // Stage 2: fetch contact/medical data and create/update member record
    advance(2);
    const detailsResp = await base44.functions.invoke('importOSMMemberCore', {
      scoutid:                 selected.scoutid,
      firstname:               individual.firstname || selected.firstname,
      lastname:                individual.lastname  || selected.lastname,
      dob:                     individual.dob            || null,
      startedsection:          individual.startedsection || null,
      started:                 individual.started        || null,
      section_id:              sectionId || null,
      ...(sectionOsmData?.osm_section_id ? { osm_section_id_override: sectionOsmData.osm_section_id } : {}),
    });

    if (!detailsResp.data.success) {
      setError(detailsResp.data.error || 'Failed to import member details.');
      setStep('error');
      return;
    }

    advance(3);
    await delay(500);

    advance(4);
    const badgesResp = await base44.functions.invoke('importOSMMemberBadges', {
      member_id: detailsResp.data.member_id,
      scoutid:   selected.scoutid,
      ...(sectionOsmData?.osm_section_id ? {
        osm_section_id_override:   sectionOsmData.osm_section_id,
        osm_section_type_override: sectionOsmData.osm_section_type,
        osm_term_id_override:      sectionOsmData.osm_term_id,
      } : {}),
    });

    advance(5);
    await delay(500);

    const badgesAwarded = badgesResp.data?.badges_awarded || 0;
    advance(6);
    setImportResult({ ...detailsResp.data, badges_awarded: badgesAwarded });

    await delay(700);
    confetti({ particleCount: 120, spread: 80, origin: { y: 0.55 } });
    setStep('complete');
  };

  const sendInvite = async () => {
    if (!importResult?.member_id) return;
    setInviting(true);
    try {
      const member = importResult.member;
      const emails = [member?.parent_one_email, member?.parent_two_email].filter(Boolean);
      for (const email of emails) {
        await base44.users.inviteUser(email, 'user').catch(() => {});
      }
      const emailResp = await base44.functions.invoke('sendOSMWelcomeEmail', {
        member_id: importResult.member_id,
      });
      if (emailResp.data.success || emailResp.data.emails_sent > 0) {
        toast.success(`Welcome email sent to ${emailResp.data.emails_sent} parent(s)`);
        setInviteDone(true);
      } else {
        toast.error('Email failed — check Outlook connection in Admin Settings.');
      }
    } catch (e) {
      toast.error('Error: ' + e.message);
    } finally {
      setInviting(false);
    }
  };

  const filteredMembers = osmMembers.filter(m => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (m.firstname || '').toLowerCase().includes(q) ||
      (m.lastname  || '').toLowerCase().includes(q)
    );
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl flex flex-col max-h-[90vh] p-0 overflow-hidden">

        <DialogHeader className="px-6 pt-6 pb-4 border-b flex-shrink-0">
          <div className="flex items-center gap-3">
            {step === 'confirm' && (
              <button onClick={() => setStep('list')} className="p-1 rounded-lg hover:bg-gray-100">
                <ArrowLeft className="w-4 h-4 text-gray-500" />
              </button>
            )}
            <div>
              <DialogTitle className="text-lg">Import from OSM</DialogTitle>
              {osmMeta.total_osm > 0 && step === 'list' && (
                <p className="text-xs text-gray-400 mt-0.5">
                  {osmMembers.length} new to import &middot; {osmMeta.already_imported} already imported
                </p>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">

          {step === 'loading' && (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <Loader2 className="w-10 h-10 text-[#7413dc] animate-spin" />
              <p className="text-sm text-gray-500">Connecting to OSM and fetching members&hellip;</p>
            </div>
          )}

          {step === 'error' && (
            <div className="p-6">
              <div className="flex items-start gap-4 p-5 bg-red-50 border border-red-200 rounded-xl">
                <AlertCircle className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-red-800">Import Failed</p>
                  <p className="text-sm text-red-600 mt-1">{error}</p>
                </div>
              </div>
              <Button variant="outline" className="mt-4 w-full" onClick={onClose}>Close</Button>
            </div>
          )}

          {step === 'list' && (
            <div className="p-4 space-y-3">
              {osmMembers.length === 0 ? (
                <div className="text-center py-16">
                  <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
                  <p className="font-semibold text-gray-700">All OSM members are already imported!</p>
                  <p className="text-sm text-gray-400 mt-1">No new members found in OSM for this section.</p>
                  <Button variant="outline" className="mt-5" onClick={onClose}>Close</Button>
                </div>
              ) : (
                <>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      placeholder="Search by name&hellip;"
                      className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#7413dc]/30"
                    />
                  </div>
                  <p className="text-xs text-gray-400 px-1">Select a member to import their full profile and badges.</p>
                  <div className="space-y-1">
                    {filteredMembers.map(m => (
                      <button
                        key={m.scoutid}
                        onClick={() => { setSelected(m); setStep('confirm'); }}
                        className="w-full flex items-center gap-4 px-4 py-3 rounded-xl hover:bg-[#7413dc]/5 border border-transparent hover:border-[#7413dc]/20 transition-all text-left group"
                      >
                        <div className="w-10 h-10 rounded-full bg-[#7413dc]/10 flex items-center justify-center text-[#7413dc] font-bold flex-shrink-0">
                          {(m.firstname || '?').charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 text-sm">{m.firstname} {m.lastname}</p>
                          <p className="text-xs text-gray-400">
                            Started: {m.startdate ? format(new Date(m.startdate), 'd MMM yyyy') : '—'}
                            {m.age_simple ? ` \u00b7 Age: ${m.age_simple}` : ''}
                          </p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-[#7413dc] flex-shrink-0" />
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {step === 'confirm' && selected && (
            <div className="p-6 space-y-5">
              <div className="flex items-center gap-4 p-5 bg-[#7413dc]/5 border border-[#7413dc]/15 rounded-2xl">
                <div className="w-14 h-14 rounded-2xl bg-[#7413dc]/15 flex items-center justify-center text-[#7413dc] font-bold text-2xl flex-shrink-0">
                  {(selected.firstname || '?').charAt(0)}
                </div>
                <div>
                  <p className="font-bold text-gray-900 text-lg">{selected.firstname} {selected.lastname}</p>
                  <p className="text-sm text-gray-500">OSM ID: {selected.scoutid}</p>
                  {selected.startdate && (
                    <p className="text-sm text-gray-500">
                      Started: {format(new Date(selected.startdate), 'd MMMM yyyy')}
                      {selected.age_simple ? ` \u00b7 Age: ${selected.age_simple}` : ''}
                    </p>
                  )}
                </div>
              </div>

              <div className="bg-gray-50 rounded-xl p-4 space-y-1.5 text-sm text-gray-600">
                <p className="font-semibold text-gray-700 text-xs uppercase tracking-wide mb-2">What will be imported</p>
                {[
                  'Personal details (name, DOB, join date)',
                  'Both parent contact details',
                  'Medical info, allergies and dietary requirements',
                  'Emergency contact details',
                  "Doctor's surgery details",
                  'All completed badge awards from OSM',
                ].map(item => (
                  <p key={item} className="flex items-center gap-2">
                    <CheckCircle className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                    {item}
                  </p>
                ))}
              </div>

              <Button
                onClick={startImport}
                className="w-full bg-[#7413dc] hover:bg-[#5c0fb0] h-11 text-base font-semibold"
              >
                Start Import for {selected.firstname} {selected.lastname}
              </Button>
            </div>
          )}

          {step === 'importing' && (
            <div className="p-10 flex flex-col items-center gap-7">
              <div className="w-16 h-16 rounded-2xl bg-[#7413dc]/10 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-[#7413dc] animate-spin" />
              </div>
              <div className="w-full space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-gray-700">{stageLabel}</p>
                  <p className="text-sm font-bold text-[#7413dc]">{progress}%</p>
                </div>
                <ProgressBar percent={progress} />
                <div className="flex gap-1">
                  {IMPORT_STAGES.map((s, i) => (
                    <div
                      key={i}
                      className={`flex-1 h-1 rounded-full transition-all duration-500 ${progress >= s.percent ? 'bg-[#7413dc]' : 'bg-gray-200'}`}
                    />
                  ))}
                </div>
              </div>
              <p className="text-xs text-gray-400 text-center">
                Importing {selected?.firstname} {selected?.lastname}&rsquo;s data from OSM&hellip; please wait.
              </p>
            </div>
          )}

          {step === 'complete' && importResult && (
            <div className="p-8 flex flex-col items-center text-center gap-5">
              <div className="w-20 h-20 rounded-2xl bg-green-50 border-2 border-green-200 flex items-center justify-center">
                <CheckCircle className="w-10 h-10 text-green-500" />
              </div>

              <div>
                <h2 className="text-2xl font-bold text-gray-900">Import Complete!</h2>
                <p className="text-gray-500 mt-1">
                  {importResult.member?.full_name} has been added successfully.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 w-full max-w-xs">
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
                  <User className="w-5 h-5 text-green-600 mx-auto mb-1" />
                  <p className="text-sm font-bold text-green-700">Profile</p>
                  <p className="text-xs text-green-600">Imported</p>
                </div>
                <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 text-center">
                  <Award className="w-5 h-5 text-[#7413dc] mx-auto mb-1" />
                  <p className="text-lg font-bold text-[#7413dc]">{importResult.badges_awarded}</p>
                  <p className="text-xs text-purple-600">Badges Awarded</p>
                </div>
              </div>

              <div className="w-full space-y-2">
                {!inviteDone ? (
                  <Button
                    onClick={sendInvite}
                    disabled={inviting}
                    className="w-full bg-[#004851] hover:bg-[#003840] h-11 font-semibold"
                  >
                    {inviting ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Sending Invite&hellip;</>
                    ) : (
                      <><Mail className="w-4 h-4 mr-2" />Invite Parent{importResult.member?.parent_two_email ? 's' : ''} to Parent Portal</>
                    )}
                  </Button>
                ) : (
                  <div className="flex items-center justify-center gap-2 py-3 bg-green-50 border border-green-200 rounded-xl">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <p className="text-sm font-semibold text-green-700">Invitation sent!</p>
                  </div>
                )}
                <Button variant="outline" className="w-full" onClick={onClose}>Done</Button>
              </div>
            </div>
          )}

        </div>
      </DialogContent>
    </Dialog>
  );
}