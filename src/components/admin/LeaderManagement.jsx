import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, User, Phone, MapPin, Shield, AlertTriangle, CreditCard, Clock, Edit, CheckCircle, XCircle, Receipt, Calendar } from 'lucide-react';
import { format, subDays, isAfter, isBefore, addDays } from 'date-fns';
import { toast } from 'sonner';

const DBS_WARNING_DAYS = 90;

function StatusBadge({ ok, label }) {
  return ok
    ? <span className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-100 px-2 py-0.5 rounded-full"><CheckCircle className="w-3 h-3" />{label}</span>
    : <span className="inline-flex items-center gap-1 text-xs text-red-700 bg-red-100 px-2 py-0.5 rounded-full"><XCircle className="w-3 h-3" />{label}</span>;
}

function ExpiryBadge({ date, label }) {
  if (!date) return <span className="text-xs text-gray-400">Not recorded</span>;
  const d = new Date(date);
  const now = new Date();
  const expiringSoon = isBefore(d, addDays(now, DBS_WARNING_DAYS));
  const expired = isBefore(d, now);
  const color = expired ? 'bg-red-100 text-red-700' : expiringSoon ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700';
  return <span className={`text-xs px-2 py-0.5 rounded-full ${color}`}>{label}: {format(d, 'd MMM yyyy')}{expired ? ' (EXPIRED)' : expiringSoon ? ' (expiring soon)' : ''}</span>;
}

function InfoRow({ label, value }) {
  if (!value) return null;
  return (
    <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 py-1.5 border-b border-gray-50 last:border-0">
      <span className="text-xs text-gray-500 sm:w-48 flex-shrink-0">{label}</span>
      <span className="text-sm text-gray-900">{value}</span>
    </div>
  );
}

function Section({ title, icon: Icon, children, color = 'blue' }) {
  const colors = { blue: 'bg-blue-50 border-blue-100', green: 'bg-green-50 border-green-100', purple: 'bg-purple-50 border-purple-100', orange: 'bg-orange-50 border-orange-100', red: 'bg-red-50 border-red-100', gray: 'bg-gray-50 border-gray-100' };
  return (
    <div className={`rounded-xl border p-4 ${colors[color]}`}>
      <div className="flex items-center gap-2 mb-3">
        <Icon className="w-4 h-4 text-gray-600" />
        <h3 className="font-semibold text-gray-900 text-sm">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function LeaderProfile({ leader, user, sections, receipts, pageViews, onEdit, onBack }) {
  const leaderSections = sections.filter(s => leader.section_ids?.includes(s.id));

  const now = new Date();
  const signIns7 = pageViews.filter(v => v.user_email === user?.email && isAfter(new Date(v.timestamp), subDays(now, 7))).length;
  const signIns30 = pageViews.filter(v => v.user_email === user?.email && isAfter(new Date(v.timestamp), subDays(now, 30))).length;
  const signIns90 = pageViews.filter(v => v.user_email === user?.email && isAfter(new Date(v.timestamp), subDays(now, 90))).length;
  const lastActivity = pageViews.filter(v => v.user_email === user?.email).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];

  const leaderReceipts = receipts.filter(r => r.submitted_by_email === user?.email || r.leader_id === leader.id);
  const pendingReceipts = leaderReceipts.filter(r => r.status === 'pending' || r.status === 'submitted');
  const approvedTotal = leaderReceipts.filter(r => r.status === 'approved').reduce((sum, r) => sum + (r.amount || 0), 0);

  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-2 text-gray-500 hover:text-gray-900 mb-5 text-sm">
        <ArrowLeft className="w-4 h-4" /> Back to Leaders
      </button>

      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-[#004851] rounded-2xl flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
            {(leader.display_name || user?.full_name)?.charAt(0)}
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">{leader.display_name || user?.full_name}</h2>
            {leader.role_title && <p className="text-sm text-gray-500">{leader.role_title}</p>}
            {user?.email && <p className="text-xs text-gray-400">{user.email}</p>}
            <div className="flex flex-wrap gap-2 mt-2">
              {leaderSections.map(s => <Badge key={s.id} className="bg-[#004851] text-white text-xs">{s.display_name}</Badge>)}
            </div>
          </div>
        </div>
        <Button size="sm" variant="outline" onClick={onEdit}><Edit className="w-3.5 h-3.5 mr-1.5" />Edit Profile</Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Contact Details */}
        <Section title="Contact Details" icon={Phone} color="blue">
          <InfoRow label="Phone" value={leader.phone} />
          <InfoRow label="Secondary Phone" value={leader.secondary_phone} />
          <InfoRow label="Email" value={user?.email} />
          <InfoRow label="Address" value={leader.address} />
          <InfoRow label="Postcode" value={leader.postcode} />
          <InfoRow label="Date of Birth" value={leader.date_of_birth ? format(new Date(leader.date_of_birth), 'd MMM yyyy') : null} />
          <InfoRow label="Membership Number" value={leader.membership_number} />
        </Section>

        {/* Emergency Contact */}
        <Section title="Emergency Contact" icon={AlertTriangle} color="orange">
          <InfoRow label="Name" value={leader.emergency_contact_name} />
          <InfoRow label="Phone" value={leader.emergency_contact_phone} />
          <InfoRow label="Relationship" value={leader.emergency_contact_relationship} />
          {!leader.emergency_contact_name && <p className="text-xs text-gray-400">No emergency contact recorded</p>}
        </Section>

        {/* Disclosure & Compliance */}
        <Section title="Disclosure & Compliance" icon={Shield} color="purple">
          <div className="space-y-2 mb-3">
            <StatusBadge ok={leader.first_aid_certified} label="First Aid" />
            {' '}
            <StatusBadge ok={leader.safeguarding_trained} label="Safeguarding" />
            {' '}
            <StatusBadge ok={leader.gdpr_trained} label="GDPR" />
          </div>
          <div className="space-y-1.5">
            <InfoRow label="DBS Certificate No." value={leader.dbs_certificate_number} />
            <div className="flex flex-col gap-1 mt-2">
              <ExpiryBadge date={leader.dbs_check_date} label="DBS Checked" />
              <ExpiryBadge date={leader.dbs_expiry_date} label="DBS Expires" />
              <ExpiryBadge date={leader.first_aid_expiry} label="First Aid Expires" />
              <ExpiryBadge date={leader.safeguarding_expiry} label="Safeguarding Expires" />
            </div>
          </div>
        </Section>

        {/* Medical Info */}
        <Section title="Medical Information" icon={AlertTriangle} color="red">
          {!leader.medical_info && !leader.allergies && !leader.dietary_requirements && !leader.medications ? (
            <p className="text-xs text-gray-400">No medical information recorded</p>
          ) : (
            <>
              <InfoRow label="Medical Conditions" value={leader.medical_info} />
              <InfoRow label="Allergies" value={leader.allergies} />
              <InfoRow label="Dietary Requirements" value={leader.dietary_requirements} />
              <InfoRow label="Medications" value={leader.medications} />
            </>
          )}
        </Section>

        {/* Sign-in Activity */}
        <Section title="Sign-in Activity" icon={Clock} color="green">
          <div className="grid grid-cols-3 gap-3 mb-3">
            {[['7 days', signIns7], ['30 days', signIns30], ['90 days', signIns90]].map(([period, count]) => (
              <div key={period} className="bg-white rounded-xl p-3 text-center border border-green-100">
                <p className="text-2xl font-bold text-[#004851]">{count}</p>
                <p className="text-xs text-gray-500 mt-0.5">{period}</p>
              </div>
            ))}
          </div>
          <InfoRow label="Last activity" value={lastActivity ? format(new Date(lastActivity.timestamp), 'd MMM yyyy, HH:mm') : 'Never'} />
          <InfoRow label="Account created" value={user?.created_date ? format(new Date(user.created_date), 'd MMM yyyy') : null} />
        </Section>

        {/* Receipts */}
        <Section title="Expense Receipts" icon={Receipt} color="gray">
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="bg-white rounded-xl p-3 text-center border border-gray-200">
              <p className="text-2xl font-bold text-amber-600">{pendingReceipts.length}</p>
              <p className="text-xs text-gray-500 mt-0.5">Pending</p>
            </div>
            <div className="bg-white rounded-xl p-3 text-center border border-gray-200">
              <p className="text-2xl font-bold text-green-600">£{approvedTotal.toFixed(2)}</p>
              <p className="text-xs text-gray-500 mt-0.5">Approved total</p>
            </div>
          </div>
          {leaderReceipts.slice(0, 5).map(r => (
            <div key={r.id} className="flex items-center justify-between py-1.5 border-b border-gray-100 last:border-0 text-sm">
              <div>
                <p className="font-medium text-gray-800">{r.description || 'Receipt'}</p>
                <p className="text-xs text-gray-400">{r.created_date ? format(new Date(r.created_date), 'd MMM yyyy') : ''}</p>
              </div>
              <div className="text-right">
                <p className="font-semibold">£{(r.amount || 0).toFixed(2)}</p>
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${r.status === 'approved' ? 'bg-green-100 text-green-700' : r.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>{r.status}</span>
              </div>
            </div>
          ))}
          {leaderReceipts.length === 0 && <p className="text-xs text-gray-400">No receipts submitted</p>}
        </Section>

        {/* Notes */}
        {leader.notes && (
          <Section title="Admin Notes" icon={User} color="gray">
            <p className="text-sm text-gray-700 whitespace-pre-line">{leader.notes}</p>
          </Section>
        )}
      </div>
    </div>
  );
}

const EMPTY_FORM = {
  display_name: '', phone: '', secondary_phone: '', address: '', postcode: '',
  date_of_birth: '', role_title: '', membership_number: '',
  dbs_check_date: '', dbs_expiry_date: '', dbs_certificate_number: '',
  first_aid_certified: false, first_aid_expiry: '',
  safeguarding_trained: false, safeguarding_expiry: '',
  gdpr_trained: false,
  emergency_contact_name: '', emergency_contact_phone: '', emergency_contact_relationship: '',
  medical_info: '', allergies: '', dietary_requirements: '', medications: '',
  section_ids: [], notes: '',
};

function EditLeaderDialog({ open, onOpenChange, leader, sections, onSave }) {
  const [form, setForm] = useState(EMPTY_FORM);
  React.useEffect(() => { if (leader && open) setForm({ ...EMPTY_FORM, ...leader }); }, [leader, open]);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const Field = ({ label, name, type = 'text' }) => (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <Input type={type} value={form[name] || ''} onChange={e => set(name, e.target.value)} className="h-8 text-sm" />
    </div>
  );
  const BoolField = ({ label, name }) => (
    <div className="flex items-center gap-2">
      <Checkbox id={name} checked={!!form[name]} onCheckedChange={v => set(name, v)} />
      <Label htmlFor={name} className="text-sm cursor-pointer">{label}</Label>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Edit Leader Profile</DialogTitle></DialogHeader>
        <div className="space-y-5 mt-2">
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Basic Details</p>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Display Name" name="display_name" />
              <Field label="Role / Appointment Title" name="role_title" />
              <Field label="Membership Number" name="membership_number" />
              <Field label="Date of Birth" name="date_of_birth" type="date" />
            </div>
          </div>
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Contact</p>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Phone" name="phone" />
              <Field label="Secondary Phone" name="secondary_phone" />
              <div className="col-span-2"><Field label="Address" name="address" /></div>
              <Field label="Postcode" name="postcode" />
            </div>
          </div>
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Disclosure & Compliance</p>
            <div className="grid grid-cols-2 gap-3">
              <Field label="DBS Certificate Number" name="dbs_certificate_number" />
              <div />
              <Field label="DBS Check Date" name="dbs_check_date" type="date" />
              <Field label="DBS Expiry Date" name="dbs_expiry_date" type="date" />
            </div>
            <div className="mt-3 space-y-2">
              <BoolField label="First Aid Certified" name="first_aid_certified" />
              {form.first_aid_certified && <Field label="First Aid Expiry" name="first_aid_expiry" type="date" />}
              <BoolField label="Safeguarding Trained" name="safeguarding_trained" />
              {form.safeguarding_trained && <Field label="Safeguarding Expiry" name="safeguarding_expiry" type="date" />}
              <BoolField label="GDPR Trained" name="gdpr_trained" />
            </div>
          </div>
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Emergency Contact</p>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Name" name="emergency_contact_name" />
              <Field label="Phone" name="emergency_contact_phone" />
              <Field label="Relationship" name="emergency_contact_relationship" />
            </div>
          </div>
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Medical Information</p>
            <div className="grid grid-cols-1 gap-3">
              <Field label="Medical Conditions" name="medical_info" />
              <Field label="Allergies" name="allergies" />
              <Field label="Dietary Requirements" name="dietary_requirements" />
              <Field label="Medications" name="medications" />
            </div>
          </div>
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Sections</p>
            <div className="flex flex-wrap gap-3">
              {sections.map(s => (
                <div key={s.id} className="flex items-center gap-2">
                  <Checkbox id={`edit-sec-${s.id}`} checked={(form.section_ids || []).includes(s.id)} onCheckedChange={v => set('section_ids', v ? [...(form.section_ids || []), s.id] : (form.section_ids || []).filter(id => id !== s.id))} />
                  <Label htmlFor={`edit-sec-${s.id}`} className="text-sm cursor-pointer">{s.display_name}</Label>
                </div>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Admin Notes</p>
            <textarea value={form.notes || ''} onChange={e => set('notes', e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm min-h-[80px] resize-none focus:outline-none focus:ring-1 focus:ring-ring" placeholder="Private notes visible to admins only..." />
          </div>
          <Button onClick={() => onSave(form)} className="w-full bg-[#004851] hover:bg-[#003840]">Save Changes</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function LeaderManagement() {
  const queryClient = useQueryClient();
  const [selectedLeaderId, setSelectedLeaderId] = useState(null);
  const [showEdit, setShowEdit] = useState(false);

  const { data: leaders = [] } = useQuery({ queryKey: ['all-leaders-mgmt'], queryFn: () => base44.entities.Leader.filter({}) });
  const { data: users = [] } = useQuery({ queryKey: ['all-users-mgmt'], queryFn: () => base44.entities.User.list() });
  const { data: sections = [] } = useQuery({ queryKey: ['sections-mgmt'], queryFn: () => base44.entities.Section.filter({ active: true }) });
  const { data: receipts = [] } = useQuery({ queryKey: ['all-receipts-mgmt'], queryFn: () => base44.entities.Receipt.filter({}) });
  const { data: pageViews = [] } = useQuery({ queryKey: ['page-views-mgmt'], queryFn: () => base44.entities.PageView.filter({}) });

  const selectedLeader = leaders.find(l => l.id === selectedLeaderId);
  const selectedUser = selectedLeader ? users.find(u => u.id === selectedLeader.user_id) : null;

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Leader.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-leaders-mgmt'] });
      setShowEdit(false);
      toast.success('Leader profile updated');
    },
    onError: e => toast.error('Error: ' + e.message),
  });

  const now = new Date();

  const getComplianceStatus = (leader) => {
    const issues = [];
    if (!leader.first_aid_certified) issues.push('No first aid');
    if (!leader.safeguarding_trained) issues.push('No safeguarding');
    if (leader.dbs_expiry_date && isBefore(new Date(leader.dbs_expiry_date), addDays(now, 90))) issues.push('DBS expiring');
    return issues;
  };

  if (selectedLeader) {
    return (
      <>
        <LeaderProfile
          leader={selectedLeader}
          user={selectedUser}
          sections={sections}
          receipts={receipts}
          pageViews={pageViews}
          onEdit={() => setShowEdit(true)}
          onBack={() => setSelectedLeaderId(null)}
        />
        <EditLeaderDialog
          open={showEdit}
          onOpenChange={setShowEdit}
          leader={selectedLeader}
          sections={sections}
          onSave={(data) => updateMutation.mutate({ id: selectedLeader.id, data })}
        />
      </>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="w-5 h-5" />
          Leader Management
          <span className="ml-auto text-sm font-normal text-gray-500">{leaders.length} leaders</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {leaders.length === 0 ? (
          <p className="text-gray-500 text-sm py-4">No leaders found.</p>
        ) : (
          <div className="space-y-2">
            {leaders.map(leader => {
              const user = users.find(u => u.id === leader.user_id);
              const leaderSections = sections.filter(s => leader.section_ids?.includes(s.id));
              const issues = getComplianceStatus(leader);
              const dbsExpired = leader.dbs_expiry_date && isBefore(new Date(leader.dbs_expiry_date), now);

              return (
                <div
                  key={leader.id}
                  onClick={() => setSelectedLeaderId(leader.id)}
                  className="flex items-center gap-4 p-4 bg-white border rounded-xl hover:border-[#004851] hover:shadow-sm cursor-pointer transition-all"
                >
                  <div className="w-10 h-10 bg-[#004851] rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
                    {(leader.display_name || user?.full_name)?.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900">{leader.display_name || user?.full_name}</p>
                    <p className="text-xs text-gray-500">{user?.email}</p>
                    {leader.role_title && <p className="text-xs text-gray-400">{leader.role_title}</p>}
                  </div>
                  <div className="hidden sm:flex flex-wrap gap-1">
                    {leaderSections.map(s => <Badge key={s.id} className="bg-teal-100 text-teal-800 text-xs">{s.display_name}</Badge>)}
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {issues.length === 0
                      ? <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">✓ Compliant</span>
                      : <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">{issues.length} issue{issues.length > 1 ? 's' : ''}</span>
                    }
                    {dbsExpired && <span className="text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded-full">DBS Expired</span>}
                    <span className="text-xs text-gray-400">{leader.phone || 'No phone'}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}