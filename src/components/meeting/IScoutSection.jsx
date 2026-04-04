import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, ClipboardList } from 'lucide-react';
import { toast } from 'sonner';
import QuizBuilder from './QuizBuilder';

export default function IScoutSection({ programmeId, date }) {
  const queryClient = useQueryClient();
  const [selectedQuizId, setSelectedQuizId] = useState(null);
  const [showNewQuiz, setShowNewQuiz] = useState(false);

  const { data: quizzes = [], isLoading } = useQuery({
    queryKey: ['quizzes', programmeId],
    queryFn: () => base44.entities.Quiz.filter({ programme_id: programmeId }),
    enabled: !!programmeId,
  });

  const deleteQuiz = useMutation({
    mutationFn: (id) => base44.entities.Quiz.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quizzes', programmeId] });
      toast.success('Quiz deleted');
      if (selectedQuizId) setSelectedQuizId(null);
    },
  });

  if (!programmeId) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-gray-500">
          <ClipboardList className="w-10 h-10 mx-auto mb-3 text-gray-300" />
          <p className="font-medium">Save the meeting plan first</p>
          <p className="text-sm mt-1">Add a title and save the meeting before using iScout features.</p>
        </CardContent>
      </Card>
    );
  }

  if (selectedQuizId || showNewQuiz) {
    return (
      <QuizBuilder
        programmeId={programmeId}
        quizId={selectedQuizId}
        onBack={() => { setSelectedQuizId(null); setShowNewQuiz(false); }}
      />
    );
  }

  return (
    <div className="flex gap-6">
      {/* Sidebar */}
      <div className="w-48 flex-shrink-0 space-y-1">
        <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Activities</p>
        <button
          onClick={() => { setSelectedQuizId(null); setShowNewQuiz(false); }}
          className="w-full text-left px-3 py-2 rounded-lg bg-[#7413dc] text-white text-sm font-medium"
        >
          🧠 Quizzes
        </button>
        <div className="text-gray-400 text-xs px-3 py-2">More coming soon...</div>
      </div>

      {/* Main content */}
      <div className="flex-1">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Quizzes</CardTitle>
              <Button size="sm" onClick={() => setShowNewQuiz(true)} className="bg-[#7413dc] hover:bg-[#5c0fb0]">
                <Plus className="w-4 h-4 mr-1" /> New Quiz
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-gray-500 text-sm">Loading...</p>
            ) : quizzes.length === 0 ? (
              <div className="text-center py-10 text-gray-400">
                <ClipboardList className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">No quizzes yet. Create one to engage your scouts!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {quizzes.map(quiz => (
                  <div key={quiz.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                    <div>
                      <p className="font-medium text-sm">{quiz.title}</p>
                      <p className="text-xs text-gray-500">{quiz.questions?.length || 0} questions</p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => setSelectedQuizId(quiz.id)}>
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={() => deleteQuiz.mutate(quiz.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}