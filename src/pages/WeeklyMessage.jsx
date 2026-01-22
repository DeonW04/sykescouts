import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ArrowLeft, Plus, Copy, Eye, Trash2, Settings, ExternalLink } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { toast } from 'sonner';
import LeaderNav from '../components/leader/LeaderNav';
import PageBuilder from '../components/pageBuilder/PageBuilder';

export default function WeeklyMessage() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [pageId, setPageId] = useState(null);
  const [editTitle, setEditTitle] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [copied, setCopied] = useState(false);

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

  const shareUrl = `https://testsite.sykescouts.org/sharedpage?id=${page.page_id}`;

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
              <p className="mt-2 text-white/80">Weekly Message Editor</p>
            </div>
            <div className="flex gap-2">
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
                className={`text-white border-white transition-all ${copied ? 'bg-green-600 hover:bg-green-700' : 'hover:bg-white/20'}`}
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
        {/* Stats */}
        <div className="grid md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <p className="text-gray-600 text-sm mb-1">Page Views</p>
              <p className="text-2xl font-bold text-blue-600">{views.length}</p>
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
              <p className="text-gray-600 text-sm mb-1">Share URL</p>
              <a 
                href={shareUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-xs font-mono text-blue-600 hover:text-blue-800 hover:underline truncate flex items-center gap-1"
              >
                {shareUrl}
                <ExternalLink className="w-3 h-3 flex-shrink-0" />
              </a>
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
                 pageType="weekly_message"
               />
             )}
           </CardContent>
         </Card>
      </div>
    </div>
  );
}