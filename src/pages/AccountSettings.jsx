import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Save, CreditCard, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import FloatingNav from '../components/public/FloatingNav';
import NavBarSpacer from '../components/public/NavBarSpacer';
import PaymentMethodsPanel from '../components/mobile/PaymentMethodsPanel';

export default function AccountSettings() {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [saved, setSaved] = useState(false);
  const [leaderSaved, setLeaderSaved] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [leaderForm, setLeaderForm] = useState({
    dbs_certificate_number: '',
    dbs_check_date: '',
    dbs_expiry_date: '',
    safeguarding_expiry: '',
    first_aid_expiry: '',
  });

  useEffect(() => {
    (async () => {
      const u = await base44.auth.me();
      setUser(u);
      setDisplayName(u?.display_name || u?.full_name || '');
      if (u?.role === 'admin') {
        setRole('leader');
      } else {
        const leaders = await base44.entities.Leader.filter({ user_id: u.id });
        setRole(leaders.length > 0 ? 'leader' : 'parent');
      }
    })();
  }, []);

  const { data: children = [] } = useQuery({
    queryKey: ['account-settings-children', user?.email],
    queryFn: async () => {
      const all = await base44.entities.Member.filter({});
      return all.filter(m => m.parent_one_email === user.email || m.parent_two_email === user.email);
    },
    enabled: !!user?.email && role === 'parent',
  });

  const child = children[0];
  const isParentOne = !!child && child.parent_one_email === user?.email;
  const isParentTwo = !!child && !isParentOne && child.parent_two_email === user?.email;

  const { data: leader } = useQuery({
    queryKey: ['account-settings-leader', user?.id],
    queryFn: () => base44.entities.Leader.filter({ user_id: user.id }).then(r => r[0] || null),
    enabled: !!user?.id && role === 'leader',
  });

  useEffect(() => {
    if (role === 'parent' && child) {
      setPhone((isParentOne ? child.parent_one_phone : child.parent_two_phone) || '');
    }
  }, [child, role, isParentOne]);

  useEffect(() => {
    if (role === 'leader' && leader) {
      setPhone(leader.phone || '');
      setLeaderForm({
        dbs_certificate_number: leader.dbs_certificate_number || '',
        dbs_check_date: leader.dbs_check_date || '',
        dbs_expiry_date: leader.dbs_expiry_date || '',
        safeguarding_expiry: leader.safeguarding_expiry || '',
        first_aid_expiry: leader.first_aid_expiry || '',
      });
    }
  }, [leader, role]);

  const handleSaveAccount = async () => {
    await base44.auth.updateMe({ display_name: displayName });
    if (role === 'parent' && child) {
      const updates = {};
      const parts = displayName.trim().split(' ');
      if (isParentOne) {
        Object.assign(updates, { parent_one_phone: phone, parent_one_name: displayName, parent_one_first_name: parts[0] || '', parent_one_surname: parts.slice(1).join(' ') || '' });
      } else if (isParentTwo) {
        Object.assign(updates, { parent_two_phone: phone, parent_two_name: displayName, parent_two_first_name: parts[0] || '', parent_two_surname: parts.slice(1).join(' ') || '' });
      }
      if (Object.keys(updates).length) await base44.entities.Member.update(child.id, updates);
    } else if (role === 'leader' && leader) {
      await base44.entities.Leader.update(leader.id, { phone, display_name: displayName });
    }
    queryClient.invalidateQueries({ queryKey: ['account-settings-children'] });
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
    toast.success('Changes saved');
  };

  const handleSaveLeaderProfile = async () => {
    if (!leader) return;
    await base44.entities.Leader.update(leader.id, leaderForm);
    queryClient.invalidateQueries({ queryKey: ['account-settings-leader'] });
    setLeaderSaved(true);
    setTimeout(() => setLeaderSaved(false), 3000);
    toast.success('Profile updated');
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-[#7413dc] border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <FloatingNav />
      <NavBarSpacer />

      <div style={{ background: '#ffffff', borderBottom: '1px solid rgba(116,19,220,0.1)', padding: '20px 24px' }}>
        <div className="max-w-4xl mx-auto">
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 500, fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#7413dc', margin: '0 0 4px' }}>Parent Portal</p>
          <h1 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: 'clamp(22px, 3vw, 32px)', color: '#1a1a2e', margin: '0 0 2px', lineHeight: 1.2 }}>Account Settings</h1>
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '14px', color: 'rgba(26,26,46,0.45)', margin: 0 }}>Manage your {role === 'parent' ? 'account and payment' : 'account and leader profile'} information</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">

        {/* Section 1: Account Information */}
        <Card className="shadow-xl bg-white/90 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-2xl">Account Information</CardTitle>
            <p className="text-gray-500 text-sm">
              {role === 'parent'
                ? isParentOne ? 'Saving as Parent One on your child\'s record' : isParentTwo ? 'Saving as Parent Two on your child\'s record' : 'Could not match your email to a parent record'
                : 'Saving to your leader profile'}
            </p>
          </CardHeader>
          <CardContent className="space-y-5">
            {role === 'parent' && !isParentOne && !isParentTwo && children.length > 0 && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                Your email does not match any parent record. Please contact your section leader.
              </div>
            )}
            <div className="grid md:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <Label>Display Name</Label>
                <Input value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Your full name" />
              </div>
              <div className="space-y-1.5">
                <Label>Phone Number</Label>
                <Input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="Your mobile number" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Email Address</Label>
              <p className="text-sm text-gray-700 font-medium">{user.email} <span className="text-xs text-gray-400 font-normal ml-1">(cannot be changed here)</span></p>
            </div>
            <div className="flex items-center gap-4 pt-2">
              <Button onClick={handleSaveAccount} className="bg-[#7413dc] hover:bg-[#5c0fb0]">
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </Button>
              {saved && (
                <span className="text-green-600 text-sm flex items-center gap-1.5 font-medium">
                  <CheckCircle className="w-4 h-4" /> Changes saved
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Section 2: Payment Information (parents only) */}
        {role === 'parent' && child && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-900">Payment Information</h2>
            <PaymentMethodsPanel child={child} />
          </div>
        )}

        {/* Section 3: Leader Profile (leaders only) */}
        {role === 'leader' && (
          <Card className="shadow-xl bg-white/90 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-2xl">Leader Profile</CardTitle>
              <p className="text-gray-500 text-sm">Update your compliance and certification information</p>
            </CardHeader>
            <CardContent className="space-y-5">
              {leader ? (
                <>
                  {/* Status badges (read-only, set by admin) */}
                  <div className="flex flex-wrap gap-2 p-3 bg-gray-50 rounded-lg">
                    <Badge className={leader.first_aid_certified ? 'bg-green-600' : 'bg-gray-400'}>First Aid {leader.first_aid_certified ? '✓' : '—'}</Badge>
                    <Badge className={leader.safeguarding_trained ? 'bg-green-600' : 'bg-gray-400'}>Safeguarding {leader.safeguarding_trained ? '✓' : '—'}</Badge>
                    <Badge className={leader.gdpr_trained ? 'bg-green-600' : 'bg-gray-400'}>GDPR {leader.gdpr_trained ? '✓' : '—'}</Badge>
                  </div>

                  <div className="grid md:grid-cols-2 gap-5">
                    <div className="space-y-1.5">
                      <Label>DBS Certificate Number</Label>
                      <Input value={leaderForm.dbs_certificate_number} onChange={e => setLeaderForm({ ...leaderForm, dbs_certificate_number: e.target.value })} placeholder="Certificate number" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>DBS Issue Date</Label>
                      <Input type="date" value={leaderForm.dbs_check_date} onChange={e => setLeaderForm({ ...leaderForm, dbs_check_date: e.target.value })} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>DBS Expiry Date</Label>
                      <Input type="date" value={leaderForm.dbs_expiry_date} onChange={e => setLeaderForm({ ...leaderForm, dbs_expiry_date: e.target.value })} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Safeguarding Expiry Date</Label>
                      <Input type="date" value={leaderForm.safeguarding_expiry} onChange={e => setLeaderForm({ ...leaderForm, safeguarding_expiry: e.target.value })} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>First Aid Expiry Date</Label>
                      <Input type="date" value={leaderForm.first_aid_expiry} onChange={e => setLeaderForm({ ...leaderForm, first_aid_expiry: e.target.value })} />
                    </div>
                  </div>

                  <div className="flex items-center gap-4 pt-2">
                    <Button onClick={handleSaveLeaderProfile} className="bg-[#7413dc] hover:bg-[#5c0fb0]">
                      <Save className="w-4 h-4 mr-2" />
                      Save Profile
                    </Button>
                    {leaderSaved && (
                      <span className="text-green-600 text-sm flex items-center gap-1.5 font-medium">
                        <CheckCircle className="w-4 h-4" /> Profile updated
                      </span>
                    )}
                  </div>
                </>
              ) : (
                <p className="text-gray-500">No leader profile found. Contact an administrator.</p>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}