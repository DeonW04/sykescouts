import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Edit2, Check, Plus, Trash2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function InteractiveBlock({ data, onUpdate, isEditing, setIsEditing, pageId, pageType, isPublicView }) {
  const [type, setType] = useState(data.type || 'question');
  const [question, setQuestion] = useState(data.question || '');
  const [options, setOptions] = useState(data.options || []);
  const [allowMultiple, setAllowMultiple] = useState(data.allowMultiple || false);
  const [newOption, setNewOption] = useState('');
  const [responses, setResponses] = useState(data.responses || []);
  const [childName, setChildName] = useState('');
  const [answer, setAnswer] = useState('');
  const [selectedOptions, setSelectedOptions] = useState([]);

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
    onUpdate({ type, question, options, allowMultiple, responses });
    setIsEditing(false);
  };

  const submitResponse = async () => {
    if (!childName.trim()) {
      toast.error('Please enter child name');
      return;
    }

    let finalAnswer = answer;
    if (type === 'vote' && allowMultiple) {
      finalAnswer = selectedOptions.join(', ');
    }

    if (!finalAnswer || finalAnswer.trim() === '') {
      toast.error('Please select an answer');
      return;
    }

    // Check if child already responded by checking database
    try {
      const existingResponses = await base44.entities.BlockResponse.filter({ 
        page_id: pageId,
        block_id: data.id || `block_${Date.now()}`
      });
      
      if (existingResponses.some(r => r.response_data?.childName?.toLowerCase() === childName.toLowerCase())) {
        toast.error('This child has already responded');
        return;
      }

      // Save to BlockResponse entity
      await base44.entities.BlockResponse.create({
        page_id: pageId,
        block_id: data.id || `block_${Date.now()}`,
        response_type: type,
        response_data: { childName, answer: finalAnswer },
        respondent_email: null,
        response_date: new Date().toISOString(),
      });
      
      toast.success('Response submitted successfully!');
      setChildName('');
      setAnswer('');
      setSelectedOptions([]);
    } catch (error) {
      toast.error('Failed to save response: ' + error.message);
    }
  };

  const toggleOption = (opt) => {
    if (selectedOptions.includes(opt)) {
      setSelectedOptions(selectedOptions.filter(o => o !== opt));
    } else {
      setSelectedOptions([...selectedOptions, opt]);
    }
  };

  // Public view (on shared page)
  if (isPublicView) {
    return (
      <div className="bg-gradient-to-br from-blue-50 to-white border-2 border-blue-200 rounded-xl p-6 shadow-lg">
        <h3 className="text-xl font-bold text-gray-900 mb-4">{question}</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Child's Name</label>
            <Input
              placeholder="Enter child's name"
              value={childName}
              onChange={(e) => setChildName(e.target.value)}
              className="bg-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Response</label>
            
            {type === 'question' && (
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant={answer === 'Yes' ? 'default' : 'outline'}
                  onClick={() => setAnswer('Yes')}
                  className={`h-12 ${answer === 'Yes' ? 'bg-green-600 hover:bg-green-700' : ''}`}
                >
                  Yes
                </Button>
                <Button
                  variant={answer === 'No' ? 'default' : 'outline'}
                  onClick={() => setAnswer('No')}
                  className={`h-12 ${answer === 'No' ? 'bg-red-600 hover:bg-red-700' : ''}`}
                >
                  No
                </Button>
              </div>
            )}

            {type === 'vote' && (
              <div className="space-y-2">
                {options.map((opt, idx) => (
                  <div
                    key={idx}
                    onClick={() => {
                      if (allowMultiple) {
                        toggleOption(opt);
                      } else {
                        setAnswer(opt);
                      }
                    }}
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      allowMultiple 
                        ? (selectedOptions.includes(opt) ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-blue-300')
                        : (answer === opt ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-blue-300')
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {allowMultiple && (
                        <Checkbox 
                          checked={selectedOptions.includes(opt)}
                          className="pointer-events-none"
                        />
                      )}
                      <span className="font-medium">{opt}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {type === 'text_input' && (
              <Textarea
                placeholder="Type your response here..."
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                className="min-h-[100px] bg-white"
              />
            )}
          </div>

          <Button 
            onClick={submitResponse} 
            className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-lg font-semibold"
          >
            Submit Response
          </Button>
        </div>
      </div>
    );
  }

  // Editor view (on EventUpdate page)
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