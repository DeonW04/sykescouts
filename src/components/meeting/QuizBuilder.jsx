import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Plus, Trash2, Save } from 'lucide-react';
import { toast } from 'sonner';

const emptyQuestion = () => ({
  question_text: '',
  options: ['', '', '', ''],
  correct_answer: 0,
  explanation: '',
});

export default function QuizBuilder({ programmeId, quizId, onBack }) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [questions, setQuestions] = useState([emptyQuestion()]);

  const { data: existingQuiz } = useQuery({
    queryKey: ['quiz', quizId],
    queryFn: async () => {
      const quizzes = await base44.entities.Quiz.filter({ id: quizId });
      return quizzes[0] || null;
    },
    enabled: !!quizId,
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
      onBack();
    },
    onError: (e) => toast.error('Failed to save: ' + e.message),
  });

  const updateQuestion = (index, field, value) => {
    const updated = [...questions];
    updated[index] = { ...updated[index], [field]: value };
    setQuestions(updated);
  };

  const updateOption = (qIndex, oIndex, value) => {
    const updated = [...questions];
    const opts = [...updated[qIndex].options];
    opts[oIndex] = value;
    updated[qIndex] = { ...updated[qIndex], options: opts };
    setQuestions(updated);
  };

  const addQuestion = () => setQuestions([...questions, emptyQuestion()]);

  const removeQuestion = (index) => {
    if (questions.length === 1) return;
    setQuestions(questions.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </Button>
        <h2 className="text-lg font-bold">{quizId ? 'Edit Quiz' : 'New Quiz'}</h2>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="space-y-2">
            <Label>Quiz Title</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Fire Safety Quiz" />
          </div>
        </CardContent>
      </Card>

      {questions.map((q, qi) => (
        <Card key={qi}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Question {qi + 1}</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                className="text-red-500 hover:text-red-700"
                onClick={() => removeQuestion(qi)}
                disabled={questions.length === 1}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Question</Label>
              <Textarea
                value={q.question_text}
                onChange={e => updateQuestion(qi, 'question_text', e.target.value)}
                placeholder="Enter your question..."
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label>Answer Options (select the correct one)</Label>
              {q.options.map((opt, oi) => (
                <div key={oi} className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => updateQuestion(qi, 'correct_answer', oi)}
                    className={`w-6 h-6 rounded-full border-2 flex-shrink-0 transition-colors ${
                      q.correct_answer === oi
                        ? 'bg-green-500 border-green-500'
                        : 'border-gray-300 hover:border-green-400'
                    }`}
                  />
                  <Input
                    value={opt}
                    onChange={e => updateOption(qi, oi, e.target.value)}
                    placeholder={`Option ${oi + 1}`}
                  />
                </div>
              ))}
              <p className="text-xs text-gray-500">Click the circle to mark the correct answer</p>
            </div>
            <div className="space-y-2">
              <Label>Explanation (optional)</Label>
              <Input
                value={q.explanation}
                onChange={e => updateQuestion(qi, 'explanation', e.target.value)}
                placeholder="Shown after answering..."
              />
            </div>
          </CardContent>
        </Card>
      ))}

      <div className="flex gap-3">
        <Button variant="outline" onClick={addQuestion}>
          <Plus className="w-4 h-4 mr-1" /> Add Question
        </Button>
        <Button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending || !title.trim()}
          className="bg-[#7413dc] hover:bg-[#5c0fb0]"
        >
          <Save className="w-4 h-4 mr-1" />
          {saveMutation.isPending ? 'Saving...' : 'Save Quiz'}
        </Button>
      </div>
    </div>
  );
}