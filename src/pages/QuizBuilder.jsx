import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Plus, Trash2, Save, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import LeaderNav from '../components/leader/LeaderNav';
import { createPageUrl } from '../utils';

function emptyQuestion() {
  return { question_text: '', options: ['', '', '', ''], correct_answer: 0, explanation: '' };
}

export default function QuizBuilder() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const programmeId = urlParams.get('programme_id');
  const quizId = urlParams.get('quiz_id');

  const [title, setTitle] = useState('');
  const [questions, setQuestions] = useState([emptyQuestion()]);

  const { data: existingQuiz } = useQuery({
    queryKey: ['quiz', quizId],
    queryFn: () => base44.entities.Quiz.filter({ id: quizId }).then(r => r[0] || null),
    enabled: !!quizId,
  });

  const { data: programme } = useQuery({
    queryKey: ['programme-detail', programmeId],
    queryFn: () => base44.entities.Programme.filter({ id: programmeId }).then(r => r[0] || null),
    enabled: !!programmeId,
  });

  useEffect(() => {
    if (existingQuiz) {
      setTitle(existingQuiz.title || '');
      setQuestions(existingQuiz.questions?.length > 0 ? existingQuiz.questions : [emptyQuestion()]);
    }
  }, [existingQuiz]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = { programme_id: programmeId, title, questions };
      if (quizId) {
        return base44.entities.Quiz.update(quizId, payload);
      } else {
        return base44.entities.Quiz.create(payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quizzes', programmeId] });
      toast.success('Quiz saved!');
      // Go back to meeting detail — we need section_id and date from the programme
      if (programme) {
        navigate(createPageUrl('MeetingDetail') + `?section_id=${programme.section_id}&date=${programme.date}`);
      } else {
        navigate(-1);
      }
    },
    onError: (e) => toast.error('Failed to save: ' + e.message),
  });

  const addQuestion = () => setQuestions([...questions, emptyQuestion()]);

  const removeQuestion = (i) => setQuestions(questions.filter((_, idx) => idx !== i));

  const updateQuestion = (i, field, value) => {
    const next = [...questions];
    next[i] = { ...next[i], [field]: value };
    setQuestions(next);
  };

  const updateOption = (qi, oi, value) => {
    const next = [...questions];
    const opts = [...next[qi].options];
    opts[oi] = value;
    next[qi] = { ...next[qi], options: opts };
    setQuestions(next);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <LeaderNav />
      <div className="bg-[#004851] text-white py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="text-white/70 hover:text-white transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold">{quizId ? 'Edit Quiz' : 'Create New Quiz'}</h1>
              {programme && <p className="text-white/70 text-sm mt-0.5">For: {programme.title || 'Untitled Meeting'}</p>}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Quiz Title */}
        <Card>
          <CardHeader><CardTitle>Quiz Details</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label>Quiz Title *</Label>
              <Input
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g., Fire Safety Quiz"
              />
            </div>
          </CardContent>
        </Card>

        {/* Questions */}
        {questions.map((q, qi) => (
          <Card key={qi} className="border-l-4 border-l-[#7413dc]">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Question {qi + 1}</CardTitle>
                {questions.length > 1 && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => removeQuestion(qi)}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Question Text *</Label>
                <Textarea
                  value={q.question_text}
                  onChange={e => updateQuestion(qi, 'question_text', e.target.value)}
                  placeholder="What is the first thing you should do in a fire emergency?"
                  className="min-h-[70px]"
                />
              </div>

              <div className="space-y-2">
                <Label>Answer Options — click ✓ to mark correct answer</Label>
                <div className="space-y-2">
                  {q.options.map((opt, oi) => (
                    <div key={oi} className="flex items-center gap-2">
                      <button
                        onClick={() => updateQuestion(qi, 'correct_answer', oi)}
                        className={`w-7 h-7 flex-shrink-0 rounded-full border-2 flex items-center justify-center transition-all ${
                          q.correct_answer === oi
                            ? 'border-green-500 bg-green-500 text-white'
                            : 'border-gray-300 hover:border-green-400'
                        }`}
                      >
                        {q.correct_answer === oi && <CheckCircle className="w-4 h-4" />}
                      </button>
                      <Input
                        value={opt}
                        onChange={e => updateOption(qi, oi, e.target.value)}
                        placeholder={`Option ${oi + 1}`}
                        className={q.correct_answer === oi ? 'border-green-400 bg-green-50' : ''}
                      />
                      <span className="text-xs text-gray-400 w-5 flex-shrink-0 text-center font-medium">
                        {String.fromCharCode(65 + oi)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Explanation (optional)</Label>
                <Input
                  value={q.explanation}
                  onChange={e => updateQuestion(qi, 'explanation', e.target.value)}
                  placeholder="Shown after answering — e.g., The correct procedure is RACE..."
                />
              </div>
            </CardContent>
          </Card>
        ))}

        <Button variant="outline" onClick={addQuestion} className="w-full gap-2 border-dashed">
          <Plus className="w-4 h-4" />
          Add Question
        </Button>

        <div className="flex gap-3 pb-10">
          <Button variant="outline" onClick={() => navigate(-1)} className="flex-1 sm:flex-none">
            Cancel
          </Button>
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={!title || saveMutation.isPending}
            className="flex-1 sm:flex-none bg-[#7413dc] hover:bg-[#5c0fb0] text-white gap-2"
          >
            <Save className="w-4 h-4" />
            {saveMutation.isPending ? 'Saving...' : 'Save Quiz'}
          </Button>
        </div>
      </div>
    </div>
  );
}