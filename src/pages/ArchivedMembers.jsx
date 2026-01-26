import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Users, Archive, Trash2, RotateCcw, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import LeaderNav from '../components/leader/LeaderNav';

export default function ArchivedMembers() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [sectionFilter, setSectionFilter] = useState('all');

  const { data: sections = [] } = useQuery({
    queryKey: ['sections'],
    queryFn: () => base44.entities.Section.filter({ active: true }),
  });

  const { data: archivedMembers = [], isLoading } = useQuery({
    queryKey: ['archived-members'],
    queryFn: () => base44.entities.Member.filter({ active: false }),
  });

  const restoreMutation = useMutation({
    mutationFn: (memberId) => base44.entities.Member.update(memberId, { active: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['archived-members'] });
      queryClient.invalidateQueries({ queryKey: ['members'] });
      toast.success('Member restored successfully');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (memberId) => base44.entities.Member.delete(memberId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['archived-members'] });
      toast.success('Member deleted permanently');
    },
  });

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

  const filteredMembers = archivedMembers.filter(member => {
    const matchesSearch = member.full_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSection = sectionFilter === 'all' || member.section_id === sectionFilter;
    return matchesSearch && matchesSection;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <LeaderNav />
      <div className="bg-orange-600 text-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Button
            variant="ghost"
            onClick={() => navigate(createPageUrl('AdminSettings'))}
            className="text-white hover:bg-white/20 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Settings
          </Button>
          <div className="flex items-center gap-3">
            <Archive className="w-8 h-8" />
            <div>
              <h1 className="text-3xl font-bold">Archived Members</h1>
              <p className="mt-2 text-white/80">{archivedMembers.length} archived members</p>
            </div>
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
                    placeholder="Search archived members..."
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
            <div className="animate-spin w-8 h-8 border-4 border-orange-600 border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-gray-600">Loading archived members...</p>
          </div>
        ) : filteredMembers.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Archive className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No archived members</h3>
              <p className="text-gray-600">
                {searchTerm || sectionFilter !== 'all' 
                  ? 'Try adjusting your filters' 
                  : 'Archived members will appear here'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredMembers.map(member => {
              const age = calculateAge(member.date_of_birth);
              const section = sections.find(s => s.id === member.section_id);
              
              return (
                <Card key={member.id} className="border-l-4 border-l-orange-500">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-6 flex-1">
                        <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
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
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (confirm('Restore this member to active status?')) {
                              restoreMutation.mutate(member.id);
                            }
                          }}
                          className="border-green-300 text-green-600 hover:bg-green-50"
                        >
                          <RotateCcw className="w-4 h-4 mr-2" />
                          Restore
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (confirm('Are you sure you want to permanently delete this member? This action cannot be undone and all their data will be lost.')) {
                              deleteMutation.mutate(member.id);
                            }
                          }}
                          className="border-red-300 text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
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
      </div>
    </div>
  );
}