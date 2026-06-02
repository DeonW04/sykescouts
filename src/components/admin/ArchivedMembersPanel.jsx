import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Archive, Trash2, RotateCcw, AlertTriangle, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

// Every entity type that references a member_id — in deletion order
const DELETION_STEPS = [
  { label: 'Badge awards',           entity: 'MemberBadgeAward',          field: 'member_id' },
  { label: 'Requirement progress',   entity: 'MemberRequirementProgress',  field: 'member_id' },
  { label: 'Badge progress',         entity: 'BadgeProgress',              field: 'member_id' },
  { label: 'Meeting attendance',     entity: 'Attendance',                 field: 'member_id' },
  { label: 'Event attendance',       entity: 'EventAttendance',            field: 'member_id' },
  { label: 'Action responses',       entity: 'ActionResponse',             field: 'member_id' },
  { label: 'Action assignments',     entity: 'ActionAssignment',           field: 'member_id' },
  { label: 'Meeting payment status', entity: 'MeetingPaymentStatus',       field: 'member_id' },
  { label: 'Event payment status',   entity: 'EventPaymentStatus',         field: 'member_id' },
  { label: 'Consent submissions',    entity: 'ConsentFormSubmission',      field: 'member_id' },
  { label: 'Nights away logs',       entity: 'NightsAwayLog',              field: 'member_id' },
  { label: 'Gift Aid declarations',  entity: 'GiftAidDeclaration',         field: 'member_id' },
  { label: 'Pending notifications',  entity: 'PendingBadgeNotification',   field: 'member_id' },
  { label: 'Pending badge syncs',    entity: 'PendingBadgeSync',           field: 'member_id' },
  { label: 'Member record',          entity: 'Member',                     field: null },        // final step
];

async function deleteAllForMember(memberId, onProgress) {
  const total = DELETION_STEPS.length;

  for (let i = 0; i < total; i++) {
    const step = DELETION_STEPS[i];
    onProgress({ step: i, label: step.label, percent: Math.round((i / total) * 100) });

    try {
      if (step.field) {
        // Find all records for this member and delete them
        const records = await base44.entities[step.entity].filter({ [step.field]: memberId });
        await Promise.all(records.map(r => base44.entities[step.entity].delete(r.id)));
      } else {
        // Final step: delete the member itself
        await base44.entities.Member.delete(memberId);
      }
    } catch (err) {
      // If entity doesn't exist or other error, log and continue
      console.warn(`Step "${step.label}" failed (skipping):`, err.message);
    }
  }

  onProgress({ step: total, label: 'Complete', percent: 100 });
}

function DeleteProgressDialog({ member, onClose, onDone }) {
  const [phase, setPhase] = useState('confirm'); // 'confirm' | 'deleting' | 'done'
  const [progress, setProgress] = useState({ step: 0, label: '', percent: 0 });

  const handleDelete = async () => {
    setPhase('deleting');
    await deleteAllForMember(member.id, setProgress);
    setPhase('done');
  };

  return (
    <Dialog open onOpenChange={() => phase !== 'deleting' && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {phase === 'done'
              ? <><CheckCircle className="w-5 h-5 text-green-600" /> Deletion Complete</>
              : <><AlertTriangle className="w-5 h-5 text-red-600" /> Permanently Delete Member</>}
          </DialogTitle>
        </DialogHeader>

        {phase === 'confirm' && (
          <div className="space-y-4 mt-2">
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <p className="font-semibold text-red-900 mb-1">{member.full_name}</p>
              <p className="text-sm text-red-700">
                This will permanently delete ALL data associated with this member including badge progress, attendance records, payment history, consent forms, and the member record itself.
              </p>
              <p className="text-sm font-bold text-red-800 mt-2">This cannot be undone.</p>
            </div>
            <p className="text-sm text-gray-600">The following data will be erased:</p>
            <ul className="text-xs text-gray-500 space-y-1 pl-4 list-disc">
              {DELETION_STEPS.slice(0, -1).map(s => <li key={s.entity}>{s.label}</li>)}
            </ul>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
              <Button className="flex-1 bg-red-600 hover:bg-red-700 text-white" onClick={handleDelete}>
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Everything
              </Button>
            </div>
          </div>
        )}

        {phase === 'deleting' && (
          <div className="space-y-5 mt-2">
            <div className="text-center">
              <p className="text-sm font-semibold text-gray-800 mb-1">Deleting {member.full_name}…</p>
              <p className="text-xs text-gray-500">Removing: {progress.label}</p>
            </div>
            {/* Progress bar */}
            <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
              <div
                className="h-3 bg-gradient-to-r from-red-500 to-red-600 rounded-full transition-all duration-300"
                style={{ width: `${progress.percent}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-400">
              <span>Step {progress.step + 1} of {DELETION_STEPS.length}</span>
              <span>{progress.percent}%</span>
            </div>
            {/* Step list */}
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {DELETION_STEPS.map((step, i) => (
                <div key={step.entity} className={`flex items-center gap-2 text-xs rounded-lg px-3 py-1.5 ${
                  i < progress.step ? 'bg-green-50 text-green-700' :
                  i === progress.step ? 'bg-red-50 text-red-700 font-semibold' :
                  'text-gray-400'
                }`}>
                  {i < progress.step
                    ? <CheckCircle className="w-3 h-3 flex-shrink-0 text-green-600" />
                    : i === progress.step
                    ? <div className="w-3 h-3 border-2 border-red-500 border-t-transparent rounded-full animate-spin flex-shrink-0" />
                    : <div className="w-3 h-3 rounded-full border border-gray-300 flex-shrink-0" />
                  }
                  {step.label}
                </div>
              ))}
            </div>
          </div>
        )}

        {phase === 'done' && (
          <div className="space-y-4 mt-2 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <p className="text-gray-800 font-semibold">{member.full_name} has been permanently deleted.</p>
            <p className="text-sm text-gray-500">All associated records have been removed from the system.</p>
            <Button className="w-full" onClick={onDone}>Close</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function ArchivedMembersPanel() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [sectionFilter, setSectionFilter] = useState('all');
  const [deletingMember, setDeletingMember] = useState(null);
  const [restoringId, setRestoringId] = useState(null);

  const { data: sections = [] } = useQuery({
    queryKey: ['sections'],
    queryFn: () => base44.entities.Section.filter({ active: true }),
  });

  const { data: archivedMembers = [], isLoading } = useQuery({
    queryKey: ['archived-members'],
    queryFn: () => base44.entities.Member.filter({ active: false }),
  });

  const handleRestore = async (member) => {
    if (!confirm(`Restore ${member.full_name} to active status?`)) return;
    setRestoringId(member.id);
    try {
      await base44.entities.Member.update(member.id, { active: true });
      queryClient.invalidateQueries({ queryKey: ['archived-members'] });
      queryClient.invalidateQueries({ queryKey: ['members'] });
      toast.success(`${member.full_name} restored`);
    } finally {
      setRestoringId(null);
    }
  };

  const filteredMembers = archivedMembers.filter(member => {
    const matchesSearch = (member.full_name || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSection = sectionFilter === 'all' || member.section_id === sectionFilter;
    return matchesSearch && matchesSection;
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Archived Members</h2>
          <p className="text-sm text-gray-500 mt-0.5">{archivedMembers.length} archived member{archivedMembers.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search archived members..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={sectionFilter} onValueChange={setSectionFilter}>
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue placeholder="All Sections" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sections</SelectItem>
                {sections.map(section => (
                  <SelectItem key={section.id} value={section.id}>{section.display_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* List */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin w-8 h-8 border-4 border-[#7413dc] border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-600">Loading archived members…</p>
        </div>
      ) : filteredMembers.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Archive className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No archived members</h3>
            <p className="text-gray-500 text-sm">
              {searchTerm || sectionFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'Archived members will appear here'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredMembers.map(member => {
            const section = sections.find(s => s.id === member.section_id);
            return (
              <Card key={member.id} className="rounded-2xl border border-gray-100 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="w-11 h-11 bg-[#7413dc]/10 rounded-full flex items-center justify-center text-[#7413dc] font-bold text-lg flex-shrink-0">
                      {(member.full_name || '?').charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900">{member.full_name}</p>
                      <p className="text-sm text-gray-500">{section?.display_name || 'No section'}{member.patrol ? ` · ${member.patrol}` : ''}</p>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={restoringId === member.id}
                        onClick={() => handleRestore(member)}
                        className="border-green-300 text-green-700 hover:bg-green-50"
                      >
                        <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                        Restore
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDeletingMember(member)}
                        className="border-red-300 text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                        Delete Permanently
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {deletingMember && (
        <DeleteProgressDialog
          member={deletingMember}
          onClose={() => setDeletingMember(null)}
          onDone={() => {
            setDeletingMember(null);
            queryClient.invalidateQueries({ queryKey: ['archived-members'] });
            queryClient.invalidateQueries({ queryKey: ['members'] });
          }}
        />
      )}
    </div>
  );
}