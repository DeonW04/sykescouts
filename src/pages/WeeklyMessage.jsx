import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ArrowLeft, Plus, Copy, Eye, Trash2, Settings, ExternalLink, MessageSquare, Mail } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { toast } from 'sonner';
import LeaderNav from '../components/leader/LeaderNav';
import PageBuilder from '../components/pageBuilder/PageBuilder';
import ResponsesDialog from '../components/communications/ResponsesDialog';
import HeaderBarConfig from '../components/communications/HeaderBarConfig';
import SendEmailDialog from '../components/communications/SendEmailDialog';

export default function WeeklyMessage() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [pageId, setPageId] = useState(null);
  const [editTitle, setEditTitle] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [copied, setCopied] = useState(false);
  const [showResponses, setShowResponses] = useState(false);
  const [selectedBlockId, setSelectedBlockId] = useState(null);
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [selectedSection, setSelectedSection] = useState('');

  const { data: sections = [] } = useQuery({
    queryKey: ['sections'],
    queryFn: () => base44.entities.Section.filter({ active: true }),
  });

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
        <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full" />
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

  const shareUrl = `https://sykescouts.org/sharedpage?id=${page.page_id}`;

  return (
    <div className="min-h-screen bg-gray-50">
      <LeaderNav />
      
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500 to-cyan-600 text-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Button
            variant="ghost"
            onClick={() => navigate(createPageUrl('Communications'))}
            className="text-white hover:bg-white/10 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex-1">
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
                    className="text-2xl sm:text-3xl font-bold cursor-pointer hover:underline"
                    onClick={() => {
                      setNewTitle(page.title);
                      setEditTitle(true);
                    }}
                  >
                    {page.title}
                  </h1>
                )}
              </div>
              <p className="mt-2 text-white/80">Weekly Message Editor</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {page.status === 'draft' && (
                <Button
                  onClick={() => publishMutation.mutate()}
                  className="bg-green-600 hover:bg-green-700 text-white flex-1 sm:flex-none"
                >
                  Publish
                </Button>
              )}
              <Button
                onClick={() => setShowEmailDialog(true)}
                className="bg-white text-blue-600 hover:bg-blue-50 flex-1 sm:flex-none"
              >
                <Mail className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Send as Email</span>
              </Button>
              <Button
                variant="outline"
                className={`text-white border-white transition-all flex-1 sm:flex-none ${copied ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-white/10 hover:bg-white/20'}`}
                onClick={() => {
                  navigator.clipboard.writeText(shareUrl);
                  setCopied(true);
                  toast.success('Link copied!');
                  setTimeout(() => setCopied(false), 2000);
                }}
              >
                <Copy className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">{copied ? 'Copied!' : 'Copy Link'}</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="grid md:grid-cols-4 gap-4 my-6">
          <Card>
            <CardContent className="p-4">
              <p className="text-gray-600 text-sm mb-1">Page Views</p>
              <p className="text-2xl font-bold text-blue-600">{views.length}</p>
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

        {/* Section Selector */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-gray-700">Section (Optional):</label>
              <Select 
                value={selectedSection || page?.section_id || ''} 
                onValueChange={(value) => {
                  setSelectedSection(value);
                  updatePageMutation.mutate({ section_id: value || null });
                }}
              >
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Select section..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>None</SelectItem>
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
                 pageType="weekly_message"
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

      {/* Email Dialog */}
      <SendEmailDialog
        open={showEmailDialog}
        onClose={() => setShowEmailDialog(false)}
        page={page}
      />
    </div>
  );
}