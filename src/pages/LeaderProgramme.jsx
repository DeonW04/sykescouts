import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Plus, ChevronRight } from 'lucide-react';
import NewTermDialog from '../components/programme/NewTermDialog';
import TermCard from '../components/programme/TermCard';

export default function LeaderProgramme() {
  const [user, setUser] = useState(null);
  const [isLeader, setIsLeader] = useState(false);
  const [showNewTermDialog, setShowNewTermDialog] = useState(false);
  const [editingTerm, setEditingTerm] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    const currentUser = await base44.auth.me();
    setUser(currentUser);
    
    if (currentUser.role === 'admin') {
      setIsLeader(true);
    } else {
      const leaders = await base44.entities.Leader.filter({ user_id: currentUser.id });
      setIsLeader(leaders.length > 0);
    }
  };

  const { data: sections = [] } = useQuery({
    queryKey: ['sections', user],
    queryFn: async () => {
      if (!user) return [];
      
      if (user.role === 'admin') {
        return base44.entities.Section.filter({ active: true });
      } else {
        const leaders = await base44.entities.Leader.filter({ user_id: user.id });
        if (leaders.length === 0) return [];
        
        const leader = leaders[0];
        const allSections = await base44.entities.Section.filter({ active: true });
        return allSections.filter(s => leader.section_ids?.includes(s.id));
      }
    },
    enabled: !!user,
  });

  const { data: terms = [], isLoading } = useQuery({
    queryKey: ['terms', sections],
    queryFn: async () => {
      if (sections.length === 0) return [];
      const sectionIds = sections.map(s => s.id);
      const allTerms = await base44.entities.Term.filter({ active: true });
      return allTerms.filter(t => sectionIds.includes(t.section_id)).sort((a, b) => 
        new Date(b.start_date) - new Date(a.start_date)
      );
    },
    enabled: sections.length > 0,
  });

  if (!user || !isLeader) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="p-8">
          <p className="text-gray-600">Access denied. Leaders only.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-[#004851] text-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Calendar className="w-8 h-8" />
              <div>
                <h1 className="text-3xl font-bold">Programme Planning</h1>
                <p className="mt-1 text-white/80">Plan your weekly meetings and track attendance</p>
              </div>
            </div>
            <Button
              onClick={() => setShowNewTermDialog(true)}
              className="bg-[#7413dc] hover:bg-[#5c0fb0]"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Term
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin w-8 h-8 border-4 border-[#004851] border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-gray-600">Loading terms...</p>
          </div>
        ) : terms.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No Terms Yet</h3>
              <p className="text-gray-600 mb-6">Create your first term to start planning your programme.</p>
              <Button onClick={() => setShowNewTermDialog(true)} className="bg-[#7413dc] hover:bg-[#5c0fb0]">
                <Plus className="w-4 h-4 mr-2" />
                Create First Term
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {terms.map(term => (
              <TermCard 
                key={term.id} 
                term={term} 
                sections={sections}
                onEdit={(term) => {
                  setEditingTerm(term);
                  setShowNewTermDialog(true);
                }}
              />
            ))}
          </div>
        )}
      </div>

      <NewTermDialog
        open={showNewTermDialog}
        onOpenChange={(open) => {
          setShowNewTermDialog(open);
          if (!open) setEditingTerm(null);
        }}
        sections={sections}
        editTerm={editingTerm}
      />
    </div>
  );
}