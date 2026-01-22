import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Edit2, Check, Plus, Trash2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function InteractiveBlock({ data, onUpdate, isEditing, setIsEditing, pageId, pageType }) {
  const [type, setType] = useState(data.type || 'question');
  const [question, setQuestion] = useState(data.question || '');
  const [options, setOptions] = useState(data.options || []);
  const [allowMultiple, setAllowMultiple] = useState(data.allowMultiple || false);
  const [newOption, setNewOption] = useState('');
  const [responses, setResponses] = useState(data.responses || []);
  const [showResponseForm, setShowResponseForm] = useState(false);
  const [childName, setChildName] = useState('');
  const [answer, setAnswer] = useState('');

  const addOption = () => {
    if (newOption.trim()) {
      setOptions([...options, newOption]);
      setNewOption('');
    }
  };

  const removeOption = (idx) => {
    setOptions(options.filter((_, i) => i !== idx));
  };

  const handleSave = () => {
    if (!question.trim()) {
      toast.error('Please enter a question');
      return;
    }
    if ((type === 'vote' || type === 'text_input') && !question.trim()) {
      toast.error('Please fill all required fields');
      return;
    }
    onUpdate({ type, question, options, allowMultiple, responses });
    setIsEditing(false);
  };

  const submitResponse = async () => {
    if (!childName.trim() || !answer.trim()) {
      toast.error('Please fill all fields');
      return;
    }

    // Check if child already responded
    if (responses.some(r => r.childName === childName)) {
      toast.error('This child has already responded');
      return;
    }

    const newResponse = {
      id: `response_${Date.now()}`,
      childName,
      answer,
      timestamp: new Date().toISOString(),
    };

    const updated = [...responses, newResponse];
    onUpdate({ type, question, options, allowMultiple, responses: updated });

    // Save to BlockResponse entity
    try {
      await base44.entities.BlockResponse.create({
        page_id: pageId,
        block_id: data.id,
        response_type: type,
        response_data: { childName, answer },
        respondent_email: null,
        response_date: new Date().toISOString(),
      });
      toast.success('Response submitted');
      setChildName('');
      setAnswer('');
      setShowResponseForm(false);
    } catch (error) {
      toast.error('Failed to save response');
    }
  };

  if (!isEditing) {
    return (
      <div className="space-y-4">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="font-semibold text-lg">{question}</p>
            <p className="text-sm text-gray-600 mt-1 capitalize">{type.replace('_', ' ')}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
            <Edit2 className="w-4 h-4" />
          </Button>
        </div>

        {/* Response Form */}
        {!showResponseForm ? (
          <Button onClick={() => setShowResponseForm(true)} className="bg-blue-600 hover:bg-blue-700">
            Submit Response
          </Button>
        ) : (
          <div className="bg-gray-50 p-4 rounded-lg space-y-3">
            <Input
              placeholder="Child name"
              value={childName}
              onChange={(e) => setChildName(e.target.value)}
            />

            {type === 'question' && (
              <div className="flex gap-2">
                <Button
                  variant={answer === 'yes' ? 'default' : 'outline'}
                  onClick={() => setAnswer('yes')}
                  className="flex-1"
                >
                  Yes
                </Button>
                <Button
                  variant={answer === 'no' ? 'default' : 'outline'}
                  onClick={() => setAnswer('no')}
                  className="flex-1"
                >
                  No
                </Button>
              </div>
            )}

            {(type === 'vote') && (
              <div className="space-y-2">
                {options.map((opt, idx) => (
                  <Button
                    key={idx}
                    variant={answer === opt ? 'default' : 'outline'}
                    className="w-full justify-start"
                    onClick={() => setAnswer(allowMultiple ? (answer.includes(opt) ? answer.replace(opt, '') : answer + ',' + opt) : opt)}
                  >
                    {allowMultiple && <Checkbox checked={answer.includes(opt)} className="mr-2" />}
                    {opt}
                  </Button>
                ))}
              </div>
            )}

            {type === 'text_input' && (
              <Textarea
                placeholder="Your response..."
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
              />
            )}

            <div className="flex gap-2">
              <Button onClick={submitResponse} className="flex-1 bg-green-600 hover:bg-green-700">
                Submit
              </Button>
              <Button onClick={() => setShowResponseForm(false)} variant="outline" className="flex-1">
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Display Responses */}
        {responses.length > 0 && (
          <div className="mt-4 pt-4 border-t">
            <p className="font-semibold text-sm mb-3">{responses.length} Responses</p>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {responses.map(r => (
                <div key={r.id} className="bg-gray-50 p-2 rounded text-sm">
                  <p className="font-medium">{r.childName}</p>
                  <p className="text-gray-700">{r.answer}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4 w-full">
      <div>
        <label className="text-sm font-medium block mb-2">Type</label>
        <Select value={type} onValueChange={setType}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="question">Question (Yes/No)</SelectItem>
            <SelectItem value="vote">Vote</SelectItem>
            <SelectItem value="text_input">Text Input</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <label className="text-sm font-medium block mb-2">Question</label>
        <Input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Enter question..."
        />
      </div>

      {type === 'vote' && (
        <div>
          <label className="text-sm font-medium block mb-2">Options</label>
          <div className="flex items-center gap-2 mb-2">
            <Checkbox
              checked={allowMultiple}
              onCheckedChange={setAllowMultiple}
            />
            <span className="text-sm">Allow multiple selections</span>
          </div>
          <div className="space-y-2 mb-3">
            {options.map((opt, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <Input value={opt} readOnly />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeOption(idx)}
                  className="text-red-600"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              value={newOption}
              onChange={(e) => setNewOption(e.target.value)}
              placeholder="New option..."
            />
            <Button onClick={addOption} size="sm" className="bg-blue-600">
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      <Button onClick={handleSave} className="bg-green-600 hover:bg-green-700" size="sm">
        <Check className="w-4 h-4 mr-1" />
        Save
      </Button>
    </div>
  );
}