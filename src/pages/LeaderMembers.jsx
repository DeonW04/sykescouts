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

export default function LeaderMembers() {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [leaderSections, setLeaderSections] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sectionFilter, setSectionFilter] = useState('all');
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [sending, setSending] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    parent_name: '',
    parent_email: '',
    parent_phone: '',
    child_name: '',
    child_dob: '',
  });

  React.useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    const currentUser = await base44.auth.me();
    setUser(currentUser);
    
    if (currentUser.role === 'admin') {
      setIsAdmin(true);
    } else {
      const leaders = await base44.entities.Leader.filter({ user_id: currentUser.id });
      if (leaders.length > 0) {
        setLeaderSections(leaders[0].section_ids || []);
      }
    }
  };

  const { data: sections = [] } = useQuery({
    queryKey: ['sections'],
    queryFn: () => base44.entities.Section.filter({ active: true }),
  });

  const { data: allMembers = [], isLoading, refetch: refetchMembers } = useQuery({
    queryKey: ['members'],
    queryFn: () => base44.entities.Member.filter({ active: true }),
    enabled: !!user,
  });

  const members = isAdmin 
    ? allMembers 
    : allMembers.filter(m => leaderSections.includes(m.section_id));

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

  const filteredMembers = members.filter(member => {
    const matchesSearch = member.full_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSection = sectionFilter === 'all' || member.section_id === sectionFilter;
    return matchesSearch && matchesSection;
  });

  const handleSendInvite = async (e) => {
    e.preventDefault();
    setSending(true);

    try {
      // Create member record
      await base44.entities.Member.create({
        full_name: inviteForm.child_name,
        date_of_birth: inviteForm.child_dob,
        parent_name: inviteForm.parent_name,
        parent_email: inviteForm.parent_email,
        parent_phone: inviteForm.parent_phone,
        active: true,
        join_date: new Date().toISOString().split('T')[0],
      });
      
      toast.success('Member added successfully!');
      setShowInviteDialog(false);
      setInviteForm({
        parent_name: '',
        parent_email: '',
        parent_phone: '',
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
                  <div className="space-y-2">
                    <Label htmlFor="parent_name">Parent Name *</Label>
                    <Input
                      id="parent_name"
                      value={inviteForm.parent_name}
                      onChange={(e) => setInviteForm({ ...inviteForm, parent_name: e.target.value })}
                      required
                      placeholder="Full name"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="parent_email">Parent Email Address *</Label>
                    <Input
                      id="parent_email"
                      type="email"
                      value={inviteForm.parent_email}
                      onChange={(e) => setInviteForm({ ...inviteForm, parent_email: e.target.value })}
                      required
                      placeholder="email@example.com"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="parent_phone">Parent Phone Number *</Label>
                    <Input
                      id="parent_phone"
                      type="tel"
                      value={inviteForm.parent_phone}
                      onChange={(e) => setInviteForm({ ...inviteForm, parent_phone: e.target.value })}
                      required
                      placeholder="07xxx xxxxxx"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="child_name">Child's Name *</Label>
                    <Input
                      id="child_name"
                      value={inviteForm.child_name}
                      onChange={(e) => setInviteForm({ ...inviteForm, child_name: e.target.value })}
                      required
                      placeholder="Full name"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="child_dob">Child's Date of Birth *</Label>
                    <Input
                      id="child_dob"
                      type="date"
                      value={inviteForm.child_dob}
                      onChange={(e) => setInviteForm({ ...inviteForm, child_dob: e.target.value })}
                      required
                    />
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
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
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
              <Select value={sectionFilter} onValueChange={setSectionFilter}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="All Sections" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sections</SelectItem>
                  {sections.map(section => (
                    <SelectItem key={section.id} value={section.id}>
                      {section.display_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                {searchTerm || sectionFilter !== 'all' 
                  ? 'Try adjusting your filters' 
                  : 'Get started by adding your first member'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredMembers.map(member => {
              const age = calculateAge(member.date_of_birth);
              const section = sections.find(s => s.id === member.section_id);
              
              return (
                <Link key={member.id} to={createPageUrl(`MemberDetail?id=${member.id}`)}>
                  <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-6 flex-1">
                          <div className="w-12 h-12 bg-[#004851] rounded-full flex items-center justify-center text-white font-bold text-lg">
                            {member.full_name.charAt(0)}
                          </div>
                          <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                              <p className="font-semibold text-gray-900">{member.full_name}</p>
                              <p className="text-sm text-gray-500">{section?.display_name || 'No section'}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-600">Age</p>
                              <p className="font-medium text-gray-900">
                                {age.years} years {age.months} months
                              </p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-600">Patrol</p>
                              <p className="font-medium text-gray-900">
                                {member.patrol || 'Not assigned'}
                              </p>
                            </div>
                          </div>
                        </div>
                        <Button variant="outline" size="sm">
                          View Details
                        </Button>
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