import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import LeaderNav from '../components/leader/LeaderNav';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowUp, ArrowDown, Trash2, Plus, Save, ChevronDown, Heading, AlignLeft, Type, List, Hash, CheckSquare } from 'lucide-react';
import { toast } from 'sonner';

const BLOCK_TYPES = [
  { type: 'heading', label: 'Heading', icon: Heading, color: 'bg-purple-100 text-purple-700' },
  { type: 'text', label: 'Text Block', icon: AlignLeft, color: 'bg-blue-100 text-blue-700' },
  { type: 'single_line', label: 'Single Line Input', icon: Type, color: 'bg-green-100 text-green-700' },
  { type: 'multi_line', label: 'Multi-line Input', icon: AlignLeft, color: 'bg-teal-100 text-teal-700' },
  { type: 'multiple_choice', label: 'Multiple Choice', icon: List, color: 'bg-orange-100 text-orange-700' },
  { type: 'number', label: 'Number', icon: Hash, color: 'bg-red-100 text-red-700' },
];

function generateId() {
  return Math.random().toString(36).slice(2, 10);
}

function BlockEditor({ block, onChange, onDelete, onMoveUp, onMoveDown, isFirst, isLast }) {
  const blockType = BLOCK_TYPES.find(b => b.type === block.type);

  return (
    <Card className="border-l-4 border-l-[#004851]">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full ${blockType?.color}`}>
            {blockType?.icon && <blockType.icon className="w-3.5 h-3.5" />}
            {blockType?.label}
          </div>
          <div className="flex items-center gap-1">
            <Button size="sm" variant="ghost" onClick={onMoveUp} disabled={isFirst} className="h-7 w-7 p-0">
              <ArrowUp className="w-3.5 h-3.5" />
            </Button>
            <Button size="sm" variant="ghost" onClick={onMoveDown} disabled={isLast} className="h-7 w-7 p-0">
              <ArrowDown className="w-3.5 h-3.5" />
            </Button>
            <Button size="sm" variant="ghost" onClick={onDelete} className="h-7 w-7 p-0 text-red-500 hover:bg-red-50">
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {block.type === 'heading' && (
          <Input
            placeholder="Heading text..."
            value={block.label || ''}
            onChange={e => onChange({ ...block, label: e.target.value })}
            className="font-semibold text-lg"
          />
        )}

        {block.type === 'text' && (
          <Textarea
            placeholder="Text content..."
            value={block.content || ''}
            onChange={e => onChange({ ...block, content: e.target.value })}
            rows={3}
          />
        )}

        {(block.type === 'single_line' || block.type === 'multi_line') && (
          <div className="space-y-2">
            <Input
              placeholder="Question / field label..."
              value={block.label || ''}
              onChange={e => onChange({ ...block, label: e.target.value })}
            />
            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
              <input
                type="checkbox"
                checked={block.required || false}
                onChange={e => onChange({ ...block, required: e.target.checked })}
                className="rounded"
              />
              Required
            </label>
          </div>
        )}

        {block.type === 'multiple_choice' && (
          <div className="space-y-2">
            <Input
              placeholder="Question..."
              value={block.label || ''}
              onChange={e => onChange({ ...block, label: e.target.value })}
            />
            <div className="space-y-1.5">
              {(block.options || []).map((opt, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <Input
                    value={opt}
                    onChange={e => {
                      const newOpts = [...(block.options || [])];
                      newOpts[idx] = e.target.value;
                      onChange({ ...block, options: newOpts });
                    }}
                    placeholder={`Option ${idx + 1}`}
                    className="flex-1"
                  />
                  <Button
                    size="sm" variant="ghost"
                    onClick={() => onChange({ ...block, options: block.options.filter((_, i) => i !== idx) })}
                    className="text-red-400 h-8 w-8 p-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
              <Button
                size="sm" variant="outline"
                onClick={() => onChange({ ...block, options: [...(block.options || []), ''] })}
              >
                <Plus className="w-3.5 h-3.5 mr-1" /> Add Option
              </Button>
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
              <input type="checkbox" checked={block.required || false} onChange={e => onChange({ ...block, required: e.target.checked })} className="rounded" />
              Required
            </label>
          </div>
        )}

        {block.type === 'number' && (
          <div className="space-y-2">
            <Input
              placeholder="Question / field label..."
              value={block.label || ''}
              onChange={e => onChange({ ...block, label: e.target.value })}
            />
            <div className="flex gap-3">
              <div className="flex-1">
                <Label className="text-xs text-gray-500">Min (optional)</Label>
                <Input
                  type="number"
                  value={block.min ?? ''}
                  onChange={e => onChange({ ...block, min: e.target.value === '' ? undefined : Number(e.target.value) })}
                />
              </div>
              <div className="flex-1">
                <Label className="text-xs text-gray-500">Max (optional)</Label>
                <Input
                  type="number"
                  value={block.max ?? ''}
                  onChange={e => onChange({ ...block, max: e.target.value === '' ? undefined : Number(e.target.value) })}
                />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
              <input type="checkbox" checked={block.required || false} onChange={e => onChange({ ...block, required: e.target.checked })} className="rounded" />
              Required
            </label>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function ConsentFormBuilder() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const editId = urlParams.get('id');

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [blocks, setBlocks] = useState([]);
  const [termsAndConditions, setTermsAndConditions] = useState('');
  const [saving, setSaving] = useState(false);
  const [showAddMenu, setShowAddMenu] = useState(false);

  const { data: existingForm } = useQuery({
    queryKey: ['consent-form', editId],
    queryFn: () => base44.entities.ConsentForm.filter({ id: editId }).then(r => r[0]),
    enabled: !!editId,
  });

  useEffect(() => {
    if (existingForm) {
      setTitle(existingForm.title || '');
      setDescription(existingForm.description || '');
      setBlocks(existingForm.blocks || []);
      setTermsAndConditions(existingForm.terms_and_conditions || '');
    }
  }, [existingForm]);

  const addBlock = (type) => {
    const newBlock = { id: generateId(), type, label: '', options: type === 'multiple_choice' ? ['', ''] : undefined };
    setBlocks(prev => [...prev, newBlock]);
    setShowAddMenu(false);
  };

  const updateBlock = (id, updated) => {
    setBlocks(prev => prev.map(b => b.id === id ? updated : b));
  };

  const deleteBlock = (id) => {
    setBlocks(prev => prev.filter(b => b.id !== id));
  };

  const moveBlock = (idx, dir) => {
    const newBlocks = [...blocks];
    const swapIdx = idx + dir;
    [newBlocks[idx], newBlocks[swapIdx]] = [newBlocks[swapIdx], newBlocks[idx]];
    setBlocks(newBlocks);
  };

  const handleSave = async () => {
    if (!title.trim()) { toast.error('Please enter a form title'); return; }
    setSaving(true);
    try {
      const data = { title, description, blocks, terms_and_conditions: termsAndConditions, active: true };
      if (editId) {
        await base44.entities.ConsentForm.update(editId, data);
        toast.success('Form updated');
      } else {
        await base44.entities.ConsentForm.create(data);
        toast.success('Form created');
      }
      navigate(createPageUrl('ConsentForms'));
    } catch (e) {
      toast.error('Failed to save form');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <LeaderNav />
      <div className="bg-gradient-to-r from-[#004851] to-[#00a794] text-white py-8">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <h1 className="text-2xl font-bold">{editId ? 'Edit Consent Form' : 'New Consent Form'}</h1>
          <Button onClick={handleSave} disabled={saving} className="bg-white text-[#004851] hover:bg-white/90 font-semibold">
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Saving...' : 'Save Form'}
          </Button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Form meta */}
        <Card>
          <CardContent className="p-5 space-y-4">
            <div>
              <Label>Form Title *</Label>
              <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Summer Camp Consent Form" className="mt-1" />
            </div>
            <div>
              <Label>Description (optional)</Label>
              <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Brief description of what this form is for" className="mt-1" />
            </div>
          </CardContent>
        </Card>

        {/* Blocks */}
        <div className="space-y-3">
          {blocks.map((block, idx) => (
            <BlockEditor
              key={block.id}
              block={block}
              onChange={updated => updateBlock(block.id, updated)}
              onDelete={() => deleteBlock(block.id)}
              onMoveUp={() => moveBlock(idx, -1)}
              onMoveDown={() => moveBlock(idx, 1)}
              isFirst={idx === 0}
              isLast={idx === blocks.length - 1}
            />
          ))}
        </div>

        {/* Add block */}
        <div className="relative">
          <Button
            variant="outline"
            onClick={() => setShowAddMenu(!showAddMenu)}
            className="w-full border-dashed border-2 border-gray-300 text-gray-500 hover:border-[#004851] hover:text-[#004851]"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Block
            <ChevronDown className="w-4 h-4 ml-2" />
          </Button>
          {showAddMenu && (
            <div className="absolute top-full mt-2 left-0 right-0 z-10 bg-white rounded-xl shadow-xl border border-gray-100 p-2 grid grid-cols-2 gap-1.5">
              {BLOCK_TYPES.map(bt => (
                <button
                  key={bt.type}
                  onClick={() => addBlock(bt.type)}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-left hover:opacity-80 transition-opacity ${bt.color}`}
                >
                  <bt.icon className="w-4 h-4 flex-shrink-0" />
                  {bt.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* T&C */}
        <Card>
          <CardContent className="p-5">
            <Label>Terms & Conditions (shown at bottom with checkbox)</Label>
            <Textarea
              value={termsAndConditions}
              onChange={e => setTermsAndConditions(e.target.value)}
              placeholder="I consent to my child taking part in this activity and understand the risks outlined above..."
              className="mt-1"
              rows={4}
            />
          </CardContent>
        </Card>

        <Button onClick={handleSave} disabled={saving} className="w-full bg-[#004851] hover:bg-[#003840] py-6 text-lg">
          <Save className="w-5 h-5 mr-2" />
          {saving ? 'Saving...' : 'Save Form'}
        </Button>
      </div>
    </div>
  );
}