import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ArrowLeft, Users, UserPlus, CheckCircle, AlertCircle, Mail, Phone } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { toast } from 'sonner';
import LeaderNav from '../components/leader/LeaderNav';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function JoinEnquiries() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('member');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedEnquiry, setSelectedEnquiry] = useState(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);

  const { data: enquiries = [] } = useQuery({
    queryKey: ['join-enquiries'],
    queryFn: () => base44.entities.JoinEnquiry.filter({}),
  });

  const { data: sections = [] } = useQuery({
    queryKey: ['sections'],
    queryFn: () => base44.entities.Section.filter({ active: true }),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }) => 
      base44.entities.JoinEnquiry.update(id, { 
        status,
        last_contacted: new Date().toISOString(),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['join-enquiries'] });
      toast.success('Status updated');
    },
  });

  const createMemberFromEnquiryMutation = useMutation({
    mutationFn: async (enquiry) => {
      const formData = enquiry.form_data || {};
      const member = await base44.entities.Member.create({
        full_name: enquiry.full_name,
        date_of_birth: formData.date_of_birth || '',
        parent_one_name: enquiry.full_name,
        parent_one_email: enquiry.email,
        parent_one_phone: enquiry.phone,
        address: formData.address || '',
        medical_info: formData.medical_info || '',
        allergies: formData.allergies || '',
        dietary_requirements: formData.dietary_requirements || '',
        active: true,
        join_date: new Date().toISOString().split('T')[0],
      });
      
      await base44.entities.JoinEnquiry.update(enquiry.id, {
        created_member_id: member.id,
        status: 'complete',
      });
      
      return member;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['join-enquiries'] });
      setShowDetailDialog(false);
      setSelectedEnquiry(null);
      toast.success('Member created successfully');
    },
  });

  const filteredEnquiries = enquiries
    .filter(e => e.enquiry_type === activeTab)
    .filter(e => {
      if (statusFilter !== 'all' && e.status !== statusFilter) return false;
      if (searchTerm && !e.full_name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      return true;
    });

  const stats = {
    member: {
      uncontacted: enquiries.filter(e => e.enquiry_type === 'member' && e.status === 'uncontacted').length,
      contacted: enquiries.filter(e => e.enquiry_type === 'member' && e.status === 'contacted').length,
      complete: enquiries.filter(e => e.enquiry_type === 'member' && e.status === 'complete').length,
    },
    volunteer: {
      uncontacted: enquiries.filter(e => e.enquiry_type === 'volunteer' && e.status === 'uncontacted').length,
      contacted: enquiries.filter(e => e.enquiry_type === 'volunteer' && e.status === 'contacted').length,
      complete: enquiries.filter(e => e.enquiry_type === 'volunteer' && e.status === 'complete').length,
    },
  };

  const statusBadgeColor = {
    uncontacted: 'bg-yellow-100 text-yellow-800',
    contacted: 'bg-blue-100 text-blue-800',
    complete: 'bg-green-100 text-green-800',
  };

  const statusIcon = {
    uncontacted: <AlertCircle className="w-4 h-4" />,
    contacted: <Mail className="w-4 h-4" />,
    complete: <CheckCircle className="w-4 h-4" />,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <LeaderNav />
      
      {/* Header */}
      <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Users className="w-8 h-8" />
            <div>
              <h1 className="text-3xl font-bold">Join Enquiries</h1>
              <p className="mt-1 text-white/80">Manage membership and volunteer applications</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
          <TabsList>
            <TabsTrigger value="member" className="flex items-center gap-2">
              <UserPlus className="w-4 h-4" />
              Member Enquiries ({stats.member.uncontacted + stats.member.contacted + stats.member.complete})
            </TabsTrigger>
            <TabsTrigger value="volunteer" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Volunteer Enquiries ({stats.volunteer.uncontacted + stats.volunteer.contacted + stats.volunteer.complete})
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Uncontacted</p>
                  <p className="text-2xl font-bold text-yellow-600">
                    {activeTab === 'member' ? stats.member.uncontacted : stats.volunteer.uncontacted}
                  </p>
                </div>
                <AlertCircle className="w-8 h-8 text-yellow-500 opacity-20" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Contacted</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {activeTab === 'member' ? stats.member.contacted : stats.volunteer.contacted}
                  </p>
                </div>
                <Mail className="w-8 h-8 text-blue-500 opacity-20" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Completed</p>
                  <p className="text-2xl font-bold text-green-600">
                    {activeTab === 'member' ? stats.member.complete : stats.volunteer.complete}
                  </p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-500 opacity-20" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex gap-4 flex-wrap">
              <Input
                placeholder="Search by name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1 min-w-64"
              />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="uncontacted">Uncontacted</SelectItem>
                  <SelectItem value="contacted">Contacted</SelectItem>
                  <SelectItem value="complete">Complete</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Enquiries List */}
        <div className="space-y-3">
          {filteredEnquiries.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600">No enquiries found</p>
              </CardContent>
            </Card>
          ) : (
            filteredEnquiries.map(enquiry => (
              <Card key={enquiry.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-lg">{enquiry.full_name}</h3>
                        <Badge className={statusBadgeColor[enquiry.status]}>
                          <span className="mr-1">{statusIcon[enquiry.status]}</span>
                          {enquiry.status}
                        </Badge>
                      </div>
                      <div className="grid md:grid-cols-3 gap-3 text-sm text-gray-600 mb-3">
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4" />
                          {enquiry.email}
                        </div>
                        {enquiry.phone && (
                          <div className="flex items-center gap-2">
                            <Phone className="w-4 h-4" />
                            {enquiry.phone}
                          </div>
                        )}
                        <div className="text-xs text-gray-500">
                          {new Date(enquiry.created_date).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 flex-wrap justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedEnquiry(enquiry);
                          setShowDetailDialog(true);
                        }}
                      >
                        View Details
                      </Button>
                      {activeTab === 'member' && enquiry.status !== 'complete' && (
                        <Button
                          size="sm"
                          className="bg-blue-600 hover:bg-blue-700"
                          onClick={() => updateStatusMutation.mutate({ id: enquiry.id, status: 'contacted' })}
                        >
                          Mark Contacted
                        </Button>
                      )}
                      {activeTab === 'member' && enquiry.status !== 'complete' && !enquiry.created_member_id && (
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() => createMemberFromEnquiryMutation.mutate(enquiry)}
                        >
                          Create Member
                        </Button>
                      )}
                      {enquiry.status !== 'complete' && (
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() => updateStatusMutation.mutate({ id: enquiry.id, status: 'complete' })}
                        >
                          Complete
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedEnquiry?.full_name}</DialogTitle>
          </DialogHeader>
          {selectedEnquiry && (
            <div className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Email</p>
                  <p className="font-medium">{selectedEnquiry.email}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Phone</p>
                  <p className="font-medium">{selectedEnquiry.phone || 'Not provided'}</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Status</p>
                <Badge className={statusBadgeColor[selectedEnquiry.status]}>
                  {selectedEnquiry.status}
                </Badge>
              </div>
              {selectedEnquiry.form_data && (
                <div className="border-t pt-4">
                  <p className="font-semibold mb-2">Form Responses</p>
                  <div className="space-y-2 text-sm">
                    {Object.entries(selectedEnquiry.form_data).map(([key, value]) => (
                      <div key={key} className="flex justify-between">
                        <span className="text-gray-600 capitalize">{key.replace(/_/g, ' ')}:</span>
                        <span className="font-medium">{String(value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {selectedEnquiry.notes && (
                <div className="border-t pt-4">
                  <p className="font-semibold mb-2">Notes</p>
                  <p className="text-sm">{selectedEnquiry.notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}