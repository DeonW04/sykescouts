import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Plus } from 'lucide-react';
import { motion } from 'framer-motion';

export default function AllTermsDialog({ open, onOpenChange, terms, sections, onSelectTerm, onCreateNew }) {
  const today = new Date();
  
  const currentTerms = terms.filter(t => {
    const start = new Date(t.start_date);
    const end = new Date(t.end_date);
    return today >= start && today <= end;
  });

  const futureTerms = terms.filter(t => new Date(t.start_date) > today);
  const pastTerms = terms.filter(t => new Date(t.end_date) < today);

  const TermGridCard = ({ term, isPast }) => {
    const section = sections.find(s => s.id === term.section_id);
    
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        whileHover={{ scale: 1.02 }}
        transition={{ duration: 0.2 }}
      >
        <Card 
          className={`cursor-pointer hover:shadow-xl transition-all border-l-4 ${
            isPast 
              ? 'border-l-gray-400 bg-gray-50/50' 
              : 'border-l-[#7413dc] bg-gradient-to-br from-white to-purple-50/30'
          }`}
          onClick={() => {
            onSelectTerm(term);
            onOpenChange(false);
          }}
        >
          <CardContent className="p-5">
            <div className="flex items-start justify-between mb-3">
              <Badge className={isPast ? 'bg-gray-500' : 'bg-[#7413dc]'}>
                {section?.display_name}
              </Badge>
            </div>
            <h3 className={`font-bold text-lg mb-2 ${isPast ? 'text-gray-600' : 'text-gray-900'}`}>
              {term.title}
            </h3>
            <div className="space-y-1 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5" />
                <span>
                  {new Date(term.start_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} - {' '}
                  {new Date(term.end_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              </div>
              <p className="text-xs">
                {term.meeting_day}s • {term.meeting_start_time} - {term.meeting_end_time}
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl">All Terms</DialogTitle>
            <Button 
              onClick={() => {
                onCreateNew();
                onOpenChange(false);
              }}
              className="bg-gradient-to-r from-[#7413dc] to-[#5c0fb0]"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Term
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-8 py-4">
          {currentTerms.length > 0 && (
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                Current Terms
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {currentTerms.map(term => (
                  <TermGridCard key={term.id} term={term} isPast={false} />
                ))}
              </div>
            </div>
          )}

          {futureTerms.length > 0 && (
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-[#7413dc]" />
                Future Terms
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {futureTerms.map(term => (
                  <TermGridCard key={term.id} term={term} isPast={false} />
                ))}
              </div>
            </div>
          )}

          {pastTerms.length > 0 && (
            <div>
              <h3 className="text-lg font-bold text-gray-600 mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-gray-400" />
                Past Terms
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pastTerms.map(term => (
                  <TermGridCard key={term.id} term={term} isPast={true} />
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}