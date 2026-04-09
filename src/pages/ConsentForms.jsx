import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import LeaderNav from '../components/leader/LeaderNav';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { FileText, Plus, Pencil, Trash2, Eye, ToggleLeft, ToggleRight } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function ConsentForms() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: forms = [], isLoading } = useQuery({
    queryKey: ['consent-forms'],
    queryFn: () => base44.entities.ConsentForm.list('-created_date'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ConsentForm.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consent-forms'] });
      toast.success('Form deleted');
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, active }) => base44.entities.ConsentForm.update(id, { active }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['consent-forms'] }),
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <LeaderNav />
      <div className="bg-gradient-to-r from-[#004851] to-[#00a794] text-white py-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <FileText className="w-10 h-10" />
              <div>
                <h1 className="text-3xl font-bold">Consent Forms</h1>
                <p className="text-white/70 mt-1">Build and manage consent forms for events and meetings</p>
              </div>
            </div>
            <Button
              onClick={() => navigate(createPageUrl('ConsentFormBuilder'))}
              className="bg-white text-[#004851] hover:bg-white/90 font-semibold"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Form
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isLoading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin w-8 h-8 border-4 border-[#004851] border-t-transparent rounded-full" />
          </div>
        ) : forms.length === 0 ? (
          <Card>
            <CardContent className="p-16 text-center">
              <FileText className="w-16 h-16 text-gray-200 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-700 mb-2">No consent forms yet</h3>
              <p className="text-gray-500 mb-6">Create your first consent form to use with events and meetings</p>
              <Button onClick={() => navigate(createPageUrl('ConsentFormBuilder'))} className="bg-[#004851] hover:bg-[#003840]">
                <Plus className="w-4 h-4 mr-2" />
                Create First Form
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {forms.map(form => (
              <Card key={form.id} className={`transition-all ${!form.active ? 'opacity-60' : ''}`}>
                <CardContent className="p-5 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-teal-100 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-6 h-6 text-teal-700" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900">{form.title}</h3>
                      {!form.active && (
                        <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">Inactive</span>
                      )}
                    </div>
                    {form.description && <p className="text-sm text-gray-500 mt-0.5 truncate">{form.description}</p>}
                    <p className="text-xs text-gray-400 mt-0.5">
                      {form.blocks?.length || 0} field{form.blocks?.length !== 1 ? 's' : ''} · Created {format(new Date(form.created_date), 'd MMM yyyy')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => toggleMutation.mutate({ id: form.id, active: !form.active })}
                      title={form.active ? 'Deactivate' : 'Activate'}
                    >
                      {form.active ? <ToggleRight className="w-5 h-5 text-teal-600" /> : <ToggleLeft className="w-5 h-5 text-gray-400" />}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => navigate(createPageUrl('ConsentFormBuilder') + `?id=${form.id}`)}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        if (confirm('Delete this form?')) deleteMutation.mutate(form.id);
                      }}
                      className="text-red-500 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}