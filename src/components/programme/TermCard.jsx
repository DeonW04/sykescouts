import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight, Calendar, Clock, Edit } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../../utils';

export default function TermCard({ term, sections, onEdit }) {
  const [expanded, setExpanded] = useState(false);
  const navigate = useNavigate();
  const section = sections.find(s => s.id === term.section_id);

  const { data: meetings = [] } = useQuery({
    queryKey: ['term-meetings', term.id],
    queryFn: () => {
      const allMeetings = [];
      const start = new Date(term.start_date);
      const end = new Date(term.end_date);
      const halfTermStart = new Date(term.half_term_start);
      const halfTermEnd = new Date(term.half_term_end);

      const dayOfWeekMap = {
        'Sunday': 0, 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3,
        'Thursday': 4, 'Friday': 5, 'Saturday': 6
      };
      const targetDay = dayOfWeekMap[term.meeting_day];

      let current = new Date(start);
      while (current.getDay() !== targetDay) {
        current.setDate(current.getDate() + 1);
      }

      while (current <= end) {
        const isHalfTerm = current >= halfTermStart && current <= halfTermEnd;
        allMeetings.push({
          date: new Date(current),
          isHalfTerm,
        });
        current.setDate(current.getDate() + 7);
      }

      return allMeetings;
    },
    enabled: expanded,
  });

  const { data: programmes = [] } = useQuery({
    queryKey: ['programmes', term.section_id],
    queryFn: () => base44.entities.Programme.filter({ section_id: term.section_id }),
    enabled: expanded,
  });

  const handleMeetingClick = (meeting) => {
    if (meeting.isHalfTerm) return;
    const dateStr = meeting.date.toISOString().split('T')[0];
    navigate(createPageUrl('MeetingDetail') + `?section_id=${term.section_id}&date=${dateStr}&term_id=${term.id}`);
  };

  return (
    <Card>
      <CardHeader
        className="cursor-pointer hover:bg-gray-50"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {expanded ? (
              <ChevronDown className="w-5 h-5 text-gray-500" />
            ) : (
              <ChevronRight className="w-5 h-5 text-gray-500" />
            )}
            <div>
              <CardTitle className="text-xl">{term.title}</CardTitle>
              <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {new Date(term.start_date).toLocaleDateString()} - {new Date(term.end_date).toLocaleDateString()}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {term.meeting_day}s {term.meeting_start_time} - {term.meeting_end_time}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(term);
              }}
            >
              <Edit className="w-4 h-4 mr-1" />
              Edit
            </Button>
            <Badge className="bg-[#7413dc]">{section?.display_name}</Badge>
          </div>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="pt-0">
          <div className="space-y-2">
            {meetings.map((meeting, index) => {
              const programme = programmes.find(p => p.date === meeting.date.toISOString().split('T')[0]);
              
              if (meeting.isHalfTerm) {
                return (
                  <div
                    key={index}
                    className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg"
                  >
                    <p className="text-sm font-medium text-yellow-800 text-center">
                      Half Term - {meeting.date.toLocaleDateString()}
                    </p>
                  </div>
                );
              }

              return (
                <div
                  key={index}
                  onClick={() => handleMeetingClick(meeting)}
                  className="p-4 bg-white border rounded-lg hover:border-[#7413dc] hover:shadow-md transition-all cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">
                        {meeting.date.toLocaleDateString('en-GB', { 
                          weekday: 'long', 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        })}
                      </p>
                      {programme ? (
                        <p className="text-sm text-gray-600 mt-1">{programme.title}</p>
                      ) : (
                        <p className="text-sm text-gray-400 mt-1">Not planned yet</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {programme && programme.published && (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
                          Published
                        </Badge>
                      )}
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      )}
    </Card>
  );
}