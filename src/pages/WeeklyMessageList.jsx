import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Plus, Search, Eye, Trash2, Edit2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { toast } from 'sonner';
import LeaderNav from '../components/leader/LeaderNav';

export default function WeeklyMessageList() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all'); // all, date, month, title

  const { data: pages = [] } = useQuery({
    queryKey: ['communication-pages-weekly'],
    queryFn: () => base44.entities.CommunicationPage.filter({ type: 'weekly_message' }),
  });

  const deletePageMutation = useMutation({
    mutationFn: (id) => base44.entities.CommunicationPage.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['communication-pages-weekly'] });
      toast.success('Message deleted');
    },
  });

  const createNewPage = async () => {
    const pageId = Math.random().toString(36).substring(2, 11);
    const newPage = await base44.entities.CommunicationPage.create({
      type: 'weekly_message',
      title: 'New Weekly Message',
      page_id: pageId,
      status: 'draft',
      blocks: [],
    });
    navigate(createPageUrl('WeeklyMessage') + `?pageId=${pageId}`);
  };

  const filteredPages = pages.filter(page => {
    if (!searchTerm) return true;
    
    const search = searchTerm.toLowerCase();
    
    // Search by title
    if (page.title.toLowerCase().includes(search)) return true;
    
    // Search by date (YYYY-MM-DD or DD/MM/YYYY format)
    if (page.published_date) {
      const date = new Date(page.published_date);
      const dateStr = date.toISOString().split('T')[0];
      const dateFormatted = `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
      if (dateStr.includes(search) || dateFormatted.includes(search)) return true;
    }
    
    // Search by month (e.g., "January", "Feb", "01", etc.)
    if (page.published_date) {
      const date = new Date(page.published_date);
      const monthNames = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
      const monthShort = monthNames[date.getMonth()].substring(0, 3);
      const monthNum = (date.getMonth() + 1).toString().padStart(2, '0');
      if (monthNames[date.getMonth()].includes(search) || monthShort.includes(search) || monthNum.includes(search)) return true;
    }
    
    return false;
  }).sort((a, b) => {
    const dateA = a.published_date ? new Date(a.published_date) : new Date(a.created_date);
    const dateB = b.published_date ? new Date(b.published_date) : new Date(b.created_date);
    return dateB - dateA;
  });

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
            <h1 className="text-3xl font-bold">Weekly Messages</h1>
            <Button onClick={createNewPage} className="bg-white text-blue-600 hover:bg-gray-100">
              <Plus className="w-4 h-4 mr-2" />
              Create New
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search by title, date (YYYY-MM-DD), or month (e.g., January, 01)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* List */}
        <div className="space-y-3">
          {filteredPages.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <p className="text-gray-600 mb-4">
                  {pages.length === 0 ? 'No weekly messages created yet.' : 'No messages match your search.'}
                </p>
                {pages.length === 0 && (
                  <Button onClick={createNewPage} className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Create First Message
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            filteredPages.map(page => (
              <Card key={page.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-lg">{page.title}</h3>
                        <Badge className={page.status === 'published' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                          {page.status}
                        </Badge>
                      </div>
                      <div className="grid md:grid-cols-3 gap-3 text-sm text-gray-600">
                        <div>
                          {page.published_date ? new Date(page.published_date).toLocaleDateString() : 'Not published'}
                        </div>
                        <div className="flex items-center gap-1">
                          <Eye className="w-4 h-4" />
                          {page.view_count || 0} views
                        </div>
                        <div>
                          Created {new Date(page.created_date).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(createPageUrl('WeeklyMessage') + `?pageId=${page.page_id}`)}
                      >
                        <Edit2 className="w-4 h-4 mr-1" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600 hover:bg-red-50"
                        onClick={() => {
                          if (confirm('Delete this message?')) {
                            deletePageMutation.mutate(page.id);
                          }
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}