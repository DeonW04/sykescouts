import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, HelpCircle, Zap, Trophy, BarChart3, ChevronRight, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../../utils';

const NAV_ITEMS = [
  { id: 'quizzes', label: 'Quizzes', icon: HelpCircle, active: true },
  { id: 'activities', label: 'Activities', icon: Zap, comingSoon: true },
  { id: 'challenges', label: 'Challenges', icon: Trophy, comingSoon: true },
  { id: 'leaderboards', label: 'Leaderboards', icon: BarChart3, comingSoon: true },
];

export default function IScoutSection({ programmeId }) {
  const navigate = useNavigate();
  const [activeNav, setActiveNav] = useState('quizzes');

  const { data: quizzes = [], isLoading } = useQuery({
    queryKey: ['quizzes', programmeId],
    queryFn: () => base44.entities.Quiz.filter({ programme_id: programmeId }),
    enabled: !!programmeId,
  });

  const handleCreateQuiz = () => {
    navigate(createPageUrl('QuizBuilder') + `?programme_id=${programmeId}`);
  };

  const handleEditQuiz = (quizId) => {
    navigate(createPageUrl('QuizBuilder') + `?programme_id=${programmeId}&quiz_id=${quizId}`);
  };

  return (
    <div className="space-y-4">
      {/* iScout header with deep-link button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-[#7413dc] rounded-lg flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <h2 className="text-lg font-bold text-gray-900">iScout</h2>
          <Badge className="bg-[#7413dc]/10 text-[#7413dc] border border-[#7413dc]/20 text-xs">
            Interactive
          </Badge>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="flex items-center gap-2 border-[#7413dc]/30 text-[#7413dc] hover:bg-[#7413dc]/5"
          onClick={() => {
            // Placeholder — URL to be added later
            alert('iScout Syke deep-link not yet configured.');
          }}
        >
          <ExternalLink className="w-3.5 h-3.5" />
          Open in iScout Syke
        </Button>
      </div>

      {!programmeId ? (
        <Card>
          <CardContent className="py-10 text-center text-gray-400">
            <HelpCircle className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">Save the meeting plan first to add iScout content.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="flex gap-4">
          {/* Left Sidebar */}
          <div className="w-44 flex-shrink-0">
            <Card className="overflow-hidden">
              <CardContent className="p-2">
                <nav className="space-y-1">
                  {NAV_ITEMS.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeNav === item.id && !item.comingSoon;
                    return (
                      <button
                        key={item.id}
                        onClick={() => !item.comingSoon && setActiveNav(item.id)}
                        disabled={item.comingSoon}
                        className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-left ${
                          isActive
                            ? 'bg-[#7413dc] text-white shadow-sm'
                            : item.comingSoon
                            ? 'text-gray-300 cursor-not-allowed'
                            : 'text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        <Icon className="w-4 h-4 flex-shrink-0" />
                        <span className="truncate">{item.label}</span>
                        {item.comingSoon && (
                          <span className="ml-auto text-[10px] bg-gray-100 text-gray-400 rounded px-1 py-0.5 leading-none whitespace-nowrap">
                            Soon
                          </span>
                        )}
                      </button>
                    );
                  })}
                </nav>
              </CardContent>
            </Card>
          </div>

          {/* Right Main Area */}
          <div className="flex-1 min-w-0">
            {activeNav === 'quizzes' && (
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Quizzes</CardTitle>
                    <Button
                      size="sm"
                      className="bg-[#7413dc] hover:bg-[#5c0fb0] text-white gap-2"
                      onClick={handleCreateQuiz}
                    >
                      <Plus className="w-4 h-4" />
                      Create New Quiz
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="py-8 text-center text-gray-400 text-sm">Loading...</div>
                  ) : quizzes.length === 0 ? (
                    <div className="py-10 text-center">
                      <HelpCircle className="w-10 h-10 mx-auto mb-3 text-gray-200" />
                      <p className="text-gray-500 text-sm font-medium mb-1">No quizzes yet</p>
                      <p className="text-gray-400 text-xs mb-4">No quizzes created for this meeting yet.</p>
                      <Button
                        size="sm"
                        className="bg-[#7413dc] hover:bg-[#5c0fb0] text-white gap-2"
                        onClick={handleCreateQuiz}
                      >
                        <Plus className="w-4 h-4" />
                        Create New Quiz for this Meeting
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {quizzes.map((quiz) => (
                        <button
                          key={quiz.id}
                          onClick={() => handleEditQuiz(quiz.id)}
                          className="w-full flex items-center justify-between p-4 border border-gray-200 rounded-xl hover:border-[#7413dc]/40 hover:bg-purple-50/30 transition-all group text-left"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 bg-[#7413dc]/10 rounded-lg flex items-center justify-center">
                              <HelpCircle className="w-4 h-4 text-[#7413dc]" />
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900 text-sm">{quiz.title}</p>
                              <p className="text-xs text-gray-500">
                                {quiz.questions?.length ?? 0} question{quiz.questions?.length !== 1 ? 's' : ''}
                              </p>
                            </div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-[#7413dc] transition-colors" />
                        </button>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}