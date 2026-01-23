import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ArrowLeft, Plus, Copy, BarChart3, MessageSquare } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { toast } from 'sonner';
import LeaderNav from '../components/leader/LeaderNav';
import PageBuilder from '../components/pageBuilder/PageBuilder';
import ResponsesDialog from '../components/communications/ResponsesDialog';
import HeaderBarConfig from '../components/communications/HeaderBarConfig';

export default function EventUpdate() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [pageId, setPageId] = useState(null);
  const [editTitle, setEditTitle] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [newMode, setNewMode] = useState('');
  const [showStats, setShowStats] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showResponses, setShowResponses] = useState(false);
  const [selectedBlockId, setSelectedBlockId] = useState(null);

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

  const { data: events = [] } = useQuery({
    queryKey: ['events'],
    queryFn: () => base44.entities.Event.filter({}),
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
      setEditMode(false);
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
        <div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full" />
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

  const shareUrl = `https://testsite.sykescouts.org/sharedpage?id=${page.page_id}`;

  return (
    <div className="min-h-screen bg-gray-50">
      <LeaderNav />
      
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-500 to-red-600 text-white py-8">
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
                    className="text-black bg-white/20 border-white/40"
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
              <p className="mt-2 text-white/80">Event Update Editor</p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="text-black border-white hover:bg-white/20"
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
                className={`text-black border-white transition-all ${copied ? 'bg-green-600 hover:bg-green-700' : 'hover:bg-white/20'}`}
                onClick={() => {
                  navigator.clipboard.writeText(shareUrl);
                  setCopied(true);
                  toast.success('Link copied!');
                  setTimeout(() => setCopied(false), 2000);
                }}
              >
                <Copy className="w-4 h-4 mr-2" />
                {copied ? 'Copied!' : 'Copy Link'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Configuration */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Update Configuration</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium block mb-2">Update Type</label>
                {editMode ? (
                  <Select value={newMode} onValueChange={setNewMode}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mid_event">Mid-Event Update</SelectItem>
                      <SelectItem value="post_event">Post-Event Update</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="font-medium capitalize">{page.event_update_mode?.replace('_', '-') || 'Not set'}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setNewMode(page.event_update_mode || 'mid_event');
                        setEditMode(true);
                      }}
                    >
                      Edit
                    </Button>
                  </div>
                )}
                {editMode && (
                  <Button
                    size="sm"
                    className="mt-2 bg-blue-600"
                    onClick={() => updatePageMutation.mutate({ event_update_mode: newMode })}
                  >
                    Save
                  </Button>
                )}
              </div>
              <div>
                <label className="text-sm font-medium block mb-2">Linked Event (Optional)</label>
                <Select value={page.linked_event_id || 'none'} onValueChange={(value) => {
                  updatePageMutation.mutate({ 
                    linked_event_id: value === 'none' ? null : value 
                  });
                }}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No event linked</SelectItem>
                    {events.map(event => (
                      <SelectItem key={event.id} value={event.id}>
                        {event.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <p className="text-gray-600 text-sm mb-1">Page Views</p>
              <p className="text-2xl font-bold text-orange-600">{views.length}</p>
            </CardContent>
          </Card>
          <Card 
            className="cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => {
              if (page?.blocks?.find(b => b.type === 'interactive')) {
                const interactiveBlock = page.blocks.find(b => b.type === 'interactive');
                setSelectedBlockId(interactiveBlock.id);
                setShowResponses(true);
              }
            }}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-1">
                <p className="text-gray-600 text-sm">Responses</p>
                <MessageSquare className="w-4 h-4 text-blue-600" />
              </div>
              <p className="text-2xl font-bold text-blue-600">{responses.length}</p>
              <p className="text-xs text-gray-500 mt-1">Click to view</p>
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
              <p className="text-2xl font-bold text-purple-600">
                {views.length > 0 ? Math.round((responses.length / views.length) * 100) : 0}%
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Editor */}
        {/* Header Bar Configuration */}
        <HeaderBarConfig page={page} onUpdate={(data) => updatePageMutation.mutate(data)} />
        
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
                pageType="event_update"
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Responses Dialog */}
      {selectedBlockId && (
        <ResponsesDialog
          open={showResponses}
          onClose={() => setShowResponses(false)}
          responses={responses.filter(r => r.block_id === selectedBlockId)}
          page={page}
          blockId={selectedBlockId}
        />
      )}

      {/* Analytics Dialog */}
      <Dialog open={showStats} onOpenChange={setShowStats}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Analytics & Responses</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-orange-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Total Views</p>
              <p className="text-2xl font-bold text-orange-600">{views.length}</p>
            </div>
            <div className="p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Interactive Responses</p>
              <p className="text-2xl font-bold text-blue-600">{responses.length}</p>
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