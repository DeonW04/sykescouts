import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ArrowLeft, Plus, Copy, BarChart3, Trash2 } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { toast } from 'sonner';
import LeaderNav from '../components/leader/LeaderNav';
import PageBuilder from '../components/pageBuilder/PageBuilder';

export default function MonthlyNewsletter() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [pageId, setPageId] = useState(null);
  const [editTitle, setEditTitle] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [showStats, setShowStats] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    setPageId(params.get('pageId'));
  }, [location]);

  const { data: page, isLoading } = useQuery({
    queryKey: ['communication-page', pageId],
    queryFn: () => {
      if (!pageId) return null;
      return base44.entities.CommunicationPage.filter({ page_id: pageId }).then(result => result[0]);
    },
    enabled: !!pageId,
  });

  const { data: views = [] } = useQuery({
    queryKey: ['page-views', pageId],
    queryFn: () => base44.entities.PageView.filter({ page_id: pageId }),
    enabled: !!pageId,
  });

  const { data: responses = [] } = useQuery({
    queryKey: ['block-responses', pageId],
    queryFn: () => base44.entities.BlockResponse.filter({ page_id: pageId }),
    enabled: !!pageId,
  });

  const updatePageMutation = useMutation({
    mutationFn: (data) => base44.entities.CommunicationPage.update(page.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['communication-page', pageId] });
      toast.success('Page updated');
      setEditTitle(false);
    },
  });

  const publishMutation = useMutation({
    mutationFn: () => 
      base44.entities.CommunicationPage.update(page.id, {
        status: 'published',
        published_date: new Date().toISOString(),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['communication-page', pageId] });
      toast.success('Page published!');
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!page) {
    return (
      <div className="min-h-screen bg-gray-50">
        <LeaderNav />
        <div className="max-w-7xl mx-auto px-4 py-8">
          <Button
            variant="ghost"
            onClick={() => navigate(createPageUrl('Communications'))}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-gray-600">Page not found</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const shareUrl = `${window.location.origin}/view/monthly-newsletter/${page.page_id}`;

  return (
    <div className="min-h-screen bg-gray-50">
      <LeaderNav />
      
      {/* Header */}
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
            <div>
              <div className="flex items-center gap-2">
                {editTitle ? (
                  <Input
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    onBlur={() => {
                      if (newTitle) {
                        updatePageMutation.mutate({ title: newTitle });
                      }
                    }}
                    autoFocus
                    className="text-white bg-white/20 border-white/40"
                  />
                ) : (
                  <h1 
                    className="text-3xl font-bold cursor-pointer hover:underline"
                    onClick={() => {
                      setNewTitle(page.title);
                      setEditTitle(true);
                    }}
                  >
                    {page.title}
                  </h1>
                )}
              </div>
              <p className="mt-2 text-white/80">Monthly Newsletter Editor</p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="text-white border-white hover:bg-white/20"
                onClick={() => setShowStats(true)}
              >
                <BarChart3 className="w-4 h-4 mr-2" />
                Analytics
              </Button>
              {page.status === 'draft' && (
                <Button
                  onClick={() => publishMutation.mutate()}
                  className="bg-green-600 hover:bg-green-700"
                >
                  Publish
                </Button>
              )}
              <Button
                variant="outline"
                className="text-white border-white hover:bg-white/20"
                onClick={() => {
                  navigator.clipboard.writeText(shareUrl);
                  toast.success('Share link copied!');
                }}
              >
                <Copy className="w-4 h-4 mr-2" />
                Copy Link
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="grid md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <p className="text-gray-600 text-sm mb-1">Page Views</p>
              <p className="text-2xl font-bold text-purple-600">{views.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-gray-600 text-sm mb-1">Responses</p>
              <p className="text-2xl font-bold text-blue-600">{responses.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-gray-600 text-sm mb-1">Status</p>
              <p className={`text-lg font-bold ${page.status === 'published' ? 'text-green-600' : 'text-yellow-600'}`}>
                {page.status.charAt(0).toUpperCase() + page.status.slice(1)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-gray-600 text-sm mb-1">Engagement</p>
              <p className="text-2xl font-bold text-orange-600">
                {views.length > 0 ? Math.round((responses.length / views.length) * 100) : 0}%
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Editor */}
        <Card>
          <CardHeader>
            <CardTitle>Page Builder</CardTitle>
          </CardHeader>
          <CardContent>
            {page && (
              <PageBuilder
                blocks={page.blocks || []}
                onBlocksChange={(blocks) => updatePageMutation.mutate({ blocks })}
                pageId={page.page_id}
                pageType="monthly_newsletter"
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Analytics Dialog */}
      <Dialog open={showStats} onOpenChange={setShowStats}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Analytics & Responses</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Total Views</p>
              <p className="text-2xl font-bold text-blue-600">{views.length}</p>
            </div>
            <div className="p-4 bg-green-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Interactive Responses</p>
              <p className="text-2xl font-bold text-green-600">{responses.length}</p>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Engagement Rate</p>
              <p className="text-2xl font-bold text-purple-600">
                {views.length > 0 ? Math.round((responses.length / views.length) * 100) : 0}%
              </p>
            </div>
            {responses.length > 0 && (
              <div className="border-t pt-4">
                <h4 className="font-semibold mb-3">Recent Responses</h4>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {responses.slice(0, 5).map(r => (
                    <div key={r.id} className="p-3 bg-gray-50 rounded text-sm">
                      <p className="font-medium">{r.response_type}</p>
                      <p className="text-gray-600">{JSON.stringify(r.response_data)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}