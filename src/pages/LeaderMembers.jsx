import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Search, Plus, Users } from 'lucide-react';
import { toast } from 'sonner';
import LeaderNav from '../components/leader/LeaderNav';
import { useSectionContext } from '../components/leader/SectionContext';

export default function LeaderMembers() {
  const { selectedSection, availableSections, isAdmin } = useSectionContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [sending, setSending] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    parent_one_name: '',
    parent_one_email: '',
    parent_one_phone: '',
    parent_two_name: '',
    parent_two_email: '',
    parent_two_phone: '',
    child_name: '',
    child_dob: '',
  });

  const { data: sections = [] } = useQuery({
    queryKey: ['sections'],
    queryFn: () => base44.entities.Section.filter({ active: true }),
  });

  const { data: allMembers = [], isLoading, refetch: refetchMembers } = useQuery({
    queryKey: ['members'],
    queryFn: () => base44.entities.Member.filter({ active: true }),
  });

  const members = selectedSection 
    ? allMembers.filter(m => m.section_id === selectedSection)
    : allMembers;

  const calculateAge = (dob) => {
    const birthDate = new Date(dob);
    const today = new Date();
    let years = today.getFullYear() - birthDate.getFullYear();
    let months = today.getMonth() - birthDate.getMonth();
    
    if (months < 0) {
      years--;
      months += 12;
    }
    
    if (today.getDate() < birthDate.getDate()) {
      months--;
      if (months < 0) {
        years--;
        months += 12;
      }
    }
    
    return { years, months };
  };

  const filteredMembers = members
    .filter(member => {
      const matchesSearch = member.full_name.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesSearch;
    })
    .sort((a, b) => {
      const ageA = new Date(a.date_of_birth).getTime();
      const ageB = new Date(b.date_of_birth).getTime();
      return ageA - ageB; // Oldest first (earlier birth date)
    });

  const handleSendInvite = async (e) => {
    e.preventDefault();
    setSending(true);

    try {
      // Create member record
      await base44.entities.Member.create({
        full_name: inviteForm.child_name,
        date_of_birth: inviteForm.child_dob,
        parent_one_name: inviteForm.parent_one_name,
        parent_one_email: inviteForm.parent_one_email,
        parent_one_phone: inviteForm.parent_one_phone,
        parent_two_name: inviteForm.parent_two_name,
        parent_two_email: inviteForm.parent_two_email,
        parent_two_phone: inviteForm.parent_two_phone,
        active: true,
        join_date: new Date().toISOString().split('T')[0],
      });
      
      toast.success('Member added successfully!');
      setShowInviteDialog(false);
      setInviteForm({
        parent_one_name: '',
        parent_one_email: '',
        parent_one_phone: '',
        parent_two_name: '',
        parent_two_email: '',
        parent_two_phone: '',
        child_name: '',
        child_dob: '',
      });
      refetchMembers();
    } catch (error) {
      toast.error('Error adding member: ' + error.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <LeaderNav />
      <div className="bg-[#004851] text-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold">Members</h1>
              <p className="mt-2 text-white/80">{members.length} total members</p>
            </div>
            <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
              <DialogTrigger asChild>
                <Button className="bg-white text-[#004851] hover:bg-gray-100">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Member
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Add New Member</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSendInvite} className="space-y-4 mt-4">
                  <div className="space-y-3 p-3 bg-gray-50 rounded-lg">
                    <Label className="text-base font-semibold">Parent One</Label>
                    <div className="space-y-2">
                      <Label>Name *</Label>
                      <Input
                        required
                        value={inviteForm.parent_one_name}
                        onChange={(e) => setInviteForm({ ...inviteForm, parent_one_name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Email *</Label>
                      <Input
                        type="email"
                        required
                        value={inviteForm.parent_one_email}
                        onChange={(e) => setInviteForm({ ...inviteForm, parent_one_email: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Phone *</Label>
                      <Input
                        type="tel"
                        required
                        value={inviteForm.parent_one_phone}
                        onChange={(e) => setInviteForm({ ...inviteForm, parent_one_phone: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-3 p-3 bg-gray-50 rounded-lg">
                    <Label className="text-base font-semibold">Parent Two (Optional)</Label>
                    <div className="space-y-2">
                      <Label>Name</Label>
                      <Input
                        value={inviteForm.parent_two_name}
                        onChange={(e) => setInviteForm({ ...inviteForm, parent_two_name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input
                        type="email"
                        value={inviteForm.parent_two_email}
                        onChange={(e) => setInviteForm({ ...inviteForm, parent_two_email: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Phone</Label>
                      <Input
                        type="tel"
                        value={inviteForm.parent_two_phone}
                        onChange={(e) => setInviteForm({ ...inviteForm, parent_two_phone: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-3 p-3 bg-blue-50 rounded-lg border-t-2 border-blue-300">
                    <Label className="text-base font-semibold">Child Details</Label>
                    <div className="space-y-2">
                      <Label>Child Full Name *</Label>
                      <Input
                        required
                        value={inviteForm.child_name}
                        onChange={(e) => setInviteForm({ ...inviteForm, child_name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Child's Date of Birth *</Label>
                      <Input
                        id="child_dob"
                        type="date"
                        value={inviteForm.child_dob}
                        onChange={(e) => setInviteForm({ ...inviteForm, child_dob: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <Button 
                    type="submit" 
                    disabled={sending}
                    className="w-full bg-[#7413dc] hover:bg-[#5c0fb0]"
                  >
                    {sending ? 'Adding Member...' : 'Add Member'}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4 md:p-6">
            <div className="flex flex-col gap-3 md:flex-row md:gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Search members..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Members List */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin w-8 h-8 border-4 border-[#004851] border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-gray-600">Loading members...</p>
          </div>
        ) : filteredMembers.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No members found</h3>
              <p className="text-gray-600">
                {searchTerm 
                  ? 'Try adjusting your search' 
                  : 'Get started by adding your first member'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredMembers.map(member => {
              const age = calculateAge(member.date_of_birth);
              const section = sections.find(s => s.id === member.section_id);
              
              return (
                <Link key={member.id} to={createPageUrl(`MemberDetail?id=${member.id}`)}>
                  <Card className="hover:shadow-xl transition-all hover:-translate-y-1 h-full">
                    <CardContent className="p-6">
                      <div className="flex flex-col items-center text-center space-y-4">
                        <div className="w-20 h-20 bg-gradient-to-br from-[#004851] to-[#7413dc] rounded-full flex items-center justify-center text-white font-bold text-2xl shadow-lg">
                          {member.full_name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-lg text-gray-900">{member.full_name}</p>
                          <p className="text-sm text-gray-500 mt-1">{section?.display_name || 'No section'}</p>
                        </div>
                        <div className="w-full space-y-2 pt-2 border-t">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Age:</span>
                            <span className="font-semibold text-gray-900">
                              {age.years}y {age.months}m
                            </span>
                          </div>
                          {member.patrol && (
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">Patrol:</span>
                              <span className="font-semibold text-gray-900">{member.patrol}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}