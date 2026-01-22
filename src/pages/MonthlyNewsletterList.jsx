import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Plus, Copy, Eye, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { toast } from 'sonner';
import LeaderNav from '../components/leader/LeaderNav';

export default function MonthlyNewsletterList() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');

  const { data: pages = [] } = useQuery({
    queryKey: ['communication-pages-newsletter'],
    queryFn: () => base44.entities.CommunicationPage.filter({ type: 'monthly_newsletter' }),
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const pageId = Math.random().toString(36).substring(2, 11);
      return base44.entities.CommunicationPage.create({
        type: 'monthly_newsletter',
        title: 'New Monthly Newsletter',
        page_id: pageId,
        status: 'draft',
        blocks: [],
      });
    },
    onSuccess: (newPage) => {
      queryClient.invalidateQueries({ queryKey: ['communication-pages-newsletter'] });
      navigate(createPageUrl('MonthlyNewsletter') + `?pageId=${newPage.page_id}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.CommunicationPage.update(id, { status: 'archived' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['communication-pages-newsletter'] });
      toast.success('Page archived');
    },
  });

  const filteredPages = pages.filter(page => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return page.title.toLowerCase().includes(search) || 
           (page.published_date && new Date(page.published_date).toLocaleDateString().includes(search));
  });

  const shareUrl = (pageId) => `${window.location.origin}/view/monthly-newsletter/${pageId}`;

  return (
    <div className="min-h-screen bg-gray-50">
      <LeaderNav />
      
      <div className="bg-gradient-to-r from-purple-500 to-pink-600 text-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Button
            variant="ghost"
            onClick={() => navigate(createPageUrl('Communications'))}
            className="text-white hover:bg-white/10 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold">Monthly Newsletters</h1>
            <Button
              onClick={() => createMutation.mutate()}
              className="bg-white text-purple-600 hover:bg-gray-100"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create New
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card className="mb-6">
          <CardContent className="p-4">
            <Input
              placeholder="Search by title or date..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </CardContent>
        </Card>

        {filteredPages.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-gray-600 mb-4">No monthly newsletters yet</p>
              <Button
                onClick={() => createMutation.mutate()}
                className="bg-purple-600 hover:bg-purple-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create First Newsletter
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredPages.map(page => (
              <Card key={page.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">{page.title}</h3>
                      <div className="flex gap-4 text-sm text-gray-600 mt-1">
                        <span>{page.view_count || 0} views</span>
                        <span className={page.status === 'published' ? 'text-green-600' : 'text-yellow-600'}>
                          {page.status.charAt(0).toUpperCase() + page.status.slice(1)}
                        </span>
                        {page.published_date && <span>{new Date(page.published_date).toLocaleDateString()}</span>}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(createPageUrl('MonthlyNewsletter') + `?pageId=${page.page_id}`)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          navigator.clipboard.writeText(shareUrl(page.page_id));
                          toast.success('Link copied!');
                        }}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteMutation.mutate(page.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
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