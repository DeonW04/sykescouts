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
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedEnquiry, setSelectedEnquiry] = useState(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
  });

  const { data: userLeader } = useQuery({
    queryKey: ['leader', user?.id],
    queryFn: () => base44.entities.Leader.filter({ user_id: user?.id }).then(result => result[0]),
    enabled: !!user,
  });

  const { data: enquiries = [] } = useQuery({
    queryKey: ['join-enquiries'],
    queryFn: () => base44.entities.ChildRegistration.filter({}),
  });

  const { data: sections = [] } = useQuery({
    queryKey: ['sections'],
    queryFn: () => base44.entities.Section.filter({ active: true }),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }) => 
      base44.entities.ChildRegistration.update(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['join-enquiries'] });
      toast.success('Status updated');
    },
  });

  const createMemberFromEnquiryMutation = useMutation({
    mutationFn: async (enquiry) => {
      const childName = enquiry.child_name || '';
      const nameParts = childName.split(' ');
      const firstName = nameParts[0] || '';
      const surname = nameParts.slice(1).join(' ') || '';
      
      // Find the section ID based on section_interest
      const section = sections.find(s => s.name === enquiry.section_interest);
      
      const member = await base44.entities.Member.create({
        first_name: firstName,
        surname: surname,
        full_name: childName,
        date_of_birth: enquiry.date_of_birth,
        parent_one_name: enquiry.parent_name,
        parent_one_email: enquiry.email,
        parent_one_phone: enquiry.phone,
        address: enquiry.address || '',
        medical_info: enquiry.medical_info || '',
        photo_consent: enquiry.consent_photos || false,
        section_id: section?.id || null,
        active: true,
        join_date: new Date().toISOString().split('T')[0],
        notes: enquiry.additional_info || '',
      });
      
      await base44.entities.ChildRegistration.update(enquiry.id, {
        status: 'enrolled',
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

  // Filter enquiries based on user role
  const accessibleEnquiries = enquiries.filter(e => {
    // Admins can see all
    if (user?.role === 'admin') return true;
    // Leaders can only see enquiries for their sections
    if (userLeader?.section_ids?.length > 0) {
      const sectionOfInterest = e.section_interest;
      if (sectionOfInterest) {
        const sectionId = sections.find(s => s.name === sectionOfInterest)?.id;
        return userLeader.section_ids.includes(sectionId);
      }
      return false;
    }
    return false;
  });

  const filteredEnquiries = accessibleEnquiries
    .filter(e => {
      if (statusFilter !== 'all' && e.status !== statusFilter) return false;
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        return e.child_name?.toLowerCase().includes(search) || 
               e.parent_name?.toLowerCase().includes(search) ||
               e.email?.toLowerCase().includes(search);
      }
      return true;
    });

  const stats = {
    pending: accessibleEnquiries.filter(e => e.status === 'pending').length,
    contacted: accessibleEnquiries.filter(e => e.status === 'contacted').length,
    enrolled: accessibleEnquiries.filter(e => e.status === 'enrolled').length,
    waitlist: accessibleEnquiries.filter(e => e.status === 'waitlist').length,
  };

  const statusBadgeColor = {
    pending: 'bg-yellow-100 text-yellow-800',
    contacted: 'bg-blue-100 text-blue-800',
    enrolled: 'bg-green-100 text-green-800',
    waitlist: 'bg-orange-100 text-orange-800',
  };

  const statusIcon = {
    pending: <AlertCircle className="w-4 h-4" />,
    contacted: <Mail className="w-4 h-4" />,
    enrolled: <CheckCircle className="w-4 h-4" />,
    waitlist: <Users className="w-4 h-4" />,
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
        {/* Stats Cards */}
        <div className="grid md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Pending</p>
                  <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
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
                  <p className="text-2xl font-bold text-blue-600">{stats.contacted}</p>
                </div>
                <Mail className="w-8 h-8 text-blue-500 opacity-20" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Enrolled</p>
                  <p className="text-2xl font-bold text-green-600">{stats.enrolled}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-500 opacity-20" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Waitlist</p>
                  <p className="text-2xl font-bold text-orange-600">{stats.waitlist}</p>
                </div>
                <Users className="w-8 h-8 text-orange-500 opacity-20" />
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
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="contacted">Contacted</SelectItem>
                  <SelectItem value="enrolled">Enrolled</SelectItem>
                  <SelectItem value="waitlist">Waitlist</SelectItem>
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
                        <h3 className="font-semibold text-lg">{enquiry.child_name}</h3>
                        <Badge className={statusBadgeColor[enquiry.status]}>
                          <span className="mr-1">{statusIcon[enquiry.status]}</span>
                          {enquiry.status}
                        </Badge>
                      </div>
                      <div className="grid md:grid-cols-3 gap-3 text-sm text-gray-600 mb-3">
                        <div>
                          <span className="text-gray-500">Parent:</span> {enquiry.parent_name}
                        </div>
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
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        <span>Section: {enquiry.section_interest}</span>
                        <span>•</span>
                        <span>Submitted: {new Date(enquiry.created_date).toLocaleDateString()}</span>
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
                      {enquiry.status === 'pending' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateStatusMutation.mutate({ id: enquiry.id, status: 'contacted' })}
                        >
                          Mark Contacted
                        </Button>
                      )}
                      {(enquiry.status === 'pending' || enquiry.status === 'contacted') && (
                        <Button
                          size="sm"
                          className="bg-orange-600 hover:bg-orange-700"
                          onClick={() => updateStatusMutation.mutate({ id: enquiry.id, status: 'waitlist' })}
                        >
                          Add to Waitlist
                        </Button>
                      )}
                      {(enquiry.status === 'pending' || enquiry.status === 'contacted' || enquiry.status === 'waitlist') && (
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() => createMemberFromEnquiryMutation.mutate(enquiry)}
                        >
                          Convert to Member
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
            <DialogTitle>{selectedEnquiry?.child_name}</DialogTitle>
          </DialogHeader>
          {selectedEnquiry && (
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600 mb-1">Status</p>
                <Badge className={statusBadgeColor[selectedEnquiry.status]}>
                  <span className="mr-1">{statusIcon[selectedEnquiry.status]}</span>
                  {selectedEnquiry.status}
                </Badge>
              </div>
              <div className="border-t pt-4">
                <p className="font-semibold mb-3">Child Details</p>
                <div className="grid md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600 mb-1">Full Name</p>
                    <p className="font-medium">{selectedEnquiry.child_name}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 mb-1">Date of Birth</p>
                    <p className="font-medium">{new Date(selectedEnquiry.date_of_birth).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 mb-1">Section Interest</p>
                    <p className="font-medium capitalize">{selectedEnquiry.section_interest}</p>
                  </div>
                </div>
              </div>
              <div className="border-t pt-4">
                <p className="font-semibold mb-3">Parent/Guardian Details</p>
                <div className="grid md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600 mb-1">Name</p>
                    <p className="font-medium">{selectedEnquiry.parent_name}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 mb-1">Email</p>
                    <p className="font-medium">{selectedEnquiry.email}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 mb-1">Phone</p>
                    <p className="font-medium">{selectedEnquiry.phone || 'Not provided'}</p>
                  </div>
                  {selectedEnquiry.address && (
                    <div className="md:col-span-2">
                      <p className="text-gray-600 mb-1">Address</p>
                      <p className="font-medium">{selectedEnquiry.address}</p>
                    </div>
                  )}
                </div>
              </div>
              {selectedEnquiry.medical_info && (
                <div className="border-t pt-4">
                  <p className="font-semibold mb-2">Medical Information</p>
                  <p className="text-sm text-gray-700">{selectedEnquiry.medical_info}</p>
                </div>
              )}
              {selectedEnquiry.additional_info && (
                <div className="border-t pt-4">
                  <p className="font-semibold mb-2">Additional Information</p>
                  <p className="text-sm text-gray-700">{selectedEnquiry.additional_info}</p>
                </div>
              )}
              <div className="border-t pt-4">
                <p className="text-sm text-gray-600">
                  <strong>Photo Consent:</strong> {selectedEnquiry.consent_photos ? 'Yes' : 'No'}
                </p>
              </div>
              <DialogFooter className="gap-2">
                {(selectedEnquiry.status === 'pending' || selectedEnquiry.status === 'contacted') && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      updateStatusMutation.mutate({ id: selectedEnquiry.id, status: 'waitlist' });
                      setShowDetailDialog(false);
                    }}
                    className="bg-orange-600 hover:bg-orange-700 text-white"
                  >
                    Add to Waitlist
                  </Button>
                )}
                {(selectedEnquiry.status === 'pending' || selectedEnquiry.status === 'contacted' || selectedEnquiry.status === 'waitlist') && (
                  <Button
                    onClick={() => createMemberFromEnquiryMutation.mutate(selectedEnquiry)}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    Convert to Member
                  </Button>
                )}
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}