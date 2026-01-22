import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Plus, ChevronRight, Sparkles } from 'lucide-react';
import NewTermDialog from '../components/programme/NewTermDialog';
import TermCard from '../components/programme/TermCard';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';

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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="relative bg-gradient-to-br from-[#004851] to-[#7413dc] text-white py-16 overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-white rounded-full blur-3xl"></div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                  <Sparkles className="w-6 h-6" />
                </div>
                <h1 className="text-4xl font-bold">Programme Planning</h1>
              </div>
              <p className="text-blue-100 text-lg">Plan weekly meetings and track your section's progress</p>
            </div>
            <Button
              onClick={() => setShowNewTermDialog(true)}
              size="lg"
              className="bg-white text-[#004851] hover:bg-blue-50 font-semibold shadow-xl"
            >
              <Plus className="w-5 h-5 mr-2" />
              Create Term
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="animate-spin w-12 h-12 border-4 border-[#004851] border-t-transparent rounded-full mb-4" />
            <p className="text-gray-600 font-medium">Loading terms...</p>
          </div>
        ) : terms.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="border-dashed border-2 border-gray-300 bg-white/50 backdrop-blur-sm">
              <CardContent className="p-16 text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <Calendar className="w-10 h-10 text-[#004851]" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">No Terms Yet</h3>
                <p className="text-gray-600 mb-8 max-w-md mx-auto">Start organizing your weekly programme by creating your first term.</p>
                <Button 
                  onClick={() => setShowNewTermDialog(true)} 
                  size="lg"
                  className="bg-gradient-to-r from-[#004851] to-[#003840] hover:from-[#003840] hover:to-[#004851] shadow-lg"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Create First Term
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="h-1 w-12 bg-gradient-to-r from-[#004851] to-transparent rounded-full"></div>
              <h2 className="text-2xl font-bold text-gray-900">Your Terms</h2>
              <Badge className="bg-[#004851]">{terms.length}</Badge>
            </div>
            <div className="space-y-5">
              {terms.map((term, index) => (
                <motion.div
                  key={term.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <TermCard 
                    term={term} 
                    sections={sections}
                    onEdit={(term) => {
                      setEditingTerm(term);
                      setShowNewTermDialog(true);
                    }}
                  />
                </motion.div>
              ))}
            </div>
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