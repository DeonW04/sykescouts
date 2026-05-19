import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import FloatingNav from '@/components/public/FloatingNav';
import NavBarSpacer from '@/components/public/NavBarSpacer';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Trash2, Wand2, ChevronUp, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const PLACEHOLDERS = ['{{title}}', '{{date}}', '{{section}}', '{{start_time}}', '{{end_time}}', '{{location}}'];

export function formatTiming(timing) {
  if (!timing) return 'No timing set';
  if (timing.type === 'hours_before') return `${timing.hours}h before meeting start`;
  if (timing.type === 'day_before_at') return `Day before at ${timing.time}`;
  if (timing.type === 'days_before_at') return `${timing.days} day${timing.days !== 1 ? 's' : ''} before at ${timing.time}`;
  if (timing.type === 'week_before_on') return `${DAY_NAMES[timing.day ?? 0]} before at ${timing.time}`;
  return 'Custom';
}

function BlockEditor({ block, onUpdate, onDelete, onMoveUp, onMoveDown, isFirst, isLast }) {
  const labels = { text: '📝 Text', volunteers: '🙋 Volunteer List', location_time: '📍 Location/Time' };
  return (
    <div className="border border-gray-200 rounded-lg p-3 bg-white space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-600">{labels[block.type] || block.type}</span>
        <div className="flex items-center gap-1">
          <Button size="icon" variant="ghost" className="h-5 w-5" onClick={onMoveUp} disabled={isFirst}><ChevronUp className="w-3 h-3" /></Button>
          <Button size="icon" variant="ghost" className="h-5 w-5" onClick={onMoveDown} disabled={isLast}><ChevronDown className="w-3 h-3" /></Button>
          <Button size="icon" variant="ghost" className="h-5 w-5 text-red-400 hover:text-red-600" onClick={onDelete}><Trash2 className="w-3 h-3" /></Button>
        </div>
      </div>
      {block.type === 'text' && (
        <>
          <Textarea value={block.content || ''} onChange={e => onUpdate({ content: e.target.value })} rows={3}
            placeholder="Message text. Click placeholders below to insert them." className="text-sm" />
          <div className="flex flex-wrap gap-1">
            {PLACEHOLDERS.map(p => (
              <button key={p} type="button"
                className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded hover:bg-purple-200 transition-colors"
                onClick={() => onUpdate({ content: (block.content || '') + p })}>
                {p}
              </button>
            ))}
          </div>
        </>
      )}
      {block.type === 'volunteers' && (
        <div className="space-y-2">
          <Input value={block.intro || ''} onChange={e => onUpdate({ intro: e.target.value })} placeholder="Heading (e.g. 🙋 *Thank you to this week's helpers:*)" className="text-sm" />
          <Input value={block.fallback_text || ''} onChange={e => onUpdate({ fallback_text: e.target.value })} placeholder="Text if no volunteers (leave blank to hide section)" className="text-sm" />
        </div>
      )}
      {block.type === 'location_time' && (
        <p className="text-xs text-gray-500 italic bg-gray-50 rounded p-2">Auto-shown only if the meeting has an unusual location, time, or no-meeting notice. Nothing to configure.</p>
      )}
    </div>
  );
}

function TemplateForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState(initial || {
    template_name: '',
    schedule_type: 'parent_reminder',
    send_timing: { type: 'hours_before', hours: 2 },
    message_blocks: [{ id: crypto.randomUUID(), type: 'text', content: '' }]
  });

  const updateBlock = (id, u) => setForm(f => ({ ...f, message_blocks: f.message_blocks.map(b => b.id === id ? { ...b, ...u } : b) }));
  const addBlock = (type) => setForm(f => ({ ...f, message_blocks: [...(f.message_blocks || []), { id: crypto.randomUUID(), type }] }));
  const removeBlock = (id) => setForm(f => ({ ...f, message_blocks: f.message_blocks.filter(b => b.id !== id) }));
  const moveBlock = (id, dir) => setForm(f => {
    const arr = [...f.message_blocks];
    const i = arr.findIndex(b => b.id === id);
    if (dir === 'up' && i > 0) [arr[i - 1], arr[i]] = [arr[i], arr[i - 1]];
    if (dir === 'down' && i < arr.length - 1) [arr[i], arr[i + 1]] = [arr[i + 1], arr[i]];
    return { ...f, message_blocks: arr };
  });

  const timing = form.send_timing || {};
  const updateTiming = (u) => setForm(f => ({ ...f, send_timing: { ...(f.send_timing || {}), ...u } }));

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label>Template Name</Label>
        <Input value={form.template_name || ''} onChange={e => setForm(f => ({ ...f, template_name: e.target.value }))} placeholder="e.g. Evening reminder, Leaders RA link" />
      </div>

      <div className="space-y-1.5">
        <Label>Message Type</Label>
        <Select value={form.schedule_type} onValueChange={v => setForm(f => ({ ...f, schedule_type: v }))}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="parent_reminder">💬 Parent Group Reminder</SelectItem>
            <SelectItem value="risk_assessment_leaders">📋 Leaders Risk Assessment Link</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Send Timing</Label>
        <Select value={timing.type || 'hours_before'} onValueChange={v => updateTiming({ type: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="hours_before">X hours before meeting start</SelectItem>
            <SelectItem value="day_before_at">Day before at a specific time</SelectItem>
            <SelectItem value="days_before_at">X days before at a specific time</SelectItem>
            <SelectItem value="week_before_on">A specific day of the week before</SelectItem>
          </SelectContent>
        </Select>

        {timing.type === 'hours_before' && (
          <div className="flex items-center gap-2">
            <Input type="number" min="0.5" step="0.5" value={timing.hours ?? 2} onChange={e => updateTiming({ hours: parseFloat(e.target.value) })} className="w-24" />
            <span className="text-sm text-gray-500">hours before meeting start</span>
          </div>
        )}
        {(timing.type === 'day_before_at' || timing.type === 'days_before_at') && (
          <div className="flex items-center gap-2 flex-wrap">
            {timing.type === 'days_before_at' && (
              <>
                <Input type="number" min="1" value={timing.days ?? 1} onChange={e => updateTiming({ days: parseInt(e.target.value) })} className="w-20" />
                <span className="text-sm text-gray-500">days before at</span>
              </>
            )}
            {timing.type === 'day_before_at' && <span className="text-sm text-gray-500">Day before at</span>}
            <Input type="time" value={timing.time || '18:00'} onChange={e => updateTiming({ time: e.target.value })} className="w-32" />
          </div>
        )}
        {timing.type === 'week_before_on' && (
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={String(timing.day ?? 0)} onValueChange={v => updateTiming({ day: parseInt(v) })}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                {DAY_NAMES.map((d, i) => <SelectItem key={i} value={String(i)}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
            <span className="text-sm text-gray-500">before at</span>
            <Input type="time" value={timing.time || '20:00'} onChange={e => updateTiming({ time: e.target.value })} className="w-32" />
          </div>
        )}
        <p className="text-xs text-[#7413dc] font-medium">→ {formatTiming(timing)}</p>
      </div>

      {form.schedule_type === 'parent_reminder' && (
        <div className="space-y-2">
          <Label>Message Blocks</Label>
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-700">
            Use placeholders — they auto-fill when applied to a meeting:
            {PLACEHOLDERS.map(p => <code key={p} className="ml-1 bg-amber-100 px-1 rounded">{p}</code>)}
          </div>
          {(form.message_blocks || []).map((block, i) => (
            <BlockEditor key={block.id} block={block}
              onUpdate={u => updateBlock(block.id, u)}
              onDelete={() => removeBlock(block.id)}
              onMoveUp={() => moveBlock(block.id, 'up')}
              onMoveDown={() => moveBlock(block.id, 'down')}
              isFirst={i === 0} isLast={i === (form.message_blocks?.length || 0) - 1}
            />
          ))}
          <div className="flex gap-2 flex-wrap">
            <Button size="sm" variant="outline" className="text-xs h-7 gap-1" onClick={() => addBlock('text')}><Plus className="w-3 h-3" /> Text</Button>
            <Button size="sm" variant="outline" className="text-xs h-7 gap-1" onClick={() => addBlock('volunteers')}>🙋 Volunteers</Button>
            <Button size="sm" variant="outline" className="text-xs h-7 gap-1" onClick={() => addBlock('location_time')}>📍 Location/Time</Button>
          </div>
        </div>
      )}

      <div className="flex gap-2 pt-2">
        <Button onClick={() => onSave(form)} className="flex-1 bg-[#7413dc] hover:bg-[#5c0fb0] text-white">Save Template</Button>
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  );
}

export default function WhatsAppTemplates() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['whatsapp-templates'],
    queryFn: () => base44.entities.WhatsAppTemplate.filter({})
  });

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const { id, ...rest } = data;
      const cleanBlocks = (rest.message_blocks || []).map(({ id: _bid, ...b }) => b);
      const saveData = { ...rest, message_blocks: cleanBlocks };
      return id ? base44.entities.WhatsAppTemplate.update(id, saveData) : base44.entities.WhatsAppTemplate.create(saveData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-templates'] });
      toast.success('Template saved');
      setShowForm(false);
      setEditingTemplate(null);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.WhatsAppTemplate.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-templates'] });
      toast.success('Template deleted');
    }
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <FloatingNav />
      <NavBarSpacer />

      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#7413dc] rounded-xl flex items-center justify-center shadow-sm">
              <Wand2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">WhatsApp Templates</h1>
              <p className="text-sm text-gray-500">Pre-built messages with smart timing and placeholders</p>
            </div>
          </div>
          <Button onClick={() => { setEditingTemplate(null); setShowForm(true); }} className="bg-[#7413dc] hover:bg-[#5c0fb0] text-white gap-1">
            <Plus className="w-4 h-4" /> New
          </Button>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm text-blue-800 mb-6">
          💡 When you apply a template to a meeting, placeholders like <code className="bg-blue-100 px-1 rounded">{'{{title}}'}</code> and <code className="bg-blue-100 px-1 rounded">{'{{date}}'}</code> are auto-filled, and the send time is calculated automatically.
        </div>

        {isLoading ? (
          <div className="flex justify-center py-8"><div className="animate-spin w-6 h-6 border-4 border-[#7413dc] border-t-transparent rounded-full" /></div>
        ) : templates.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Wand2 className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 mb-3">No templates yet. Create your first one!</p>
              <Button onClick={() => setShowForm(true)} variant="outline">Create Template</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {templates.map(t => (
              <Card key={t.id} className="border-gray-200 hover:border-[#7413dc] transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <p className="font-semibold text-gray-900">{t.template_name}</p>
                        <Badge className={t.schedule_type === 'risk_assessment_leaders' ? 'bg-blue-100 text-blue-700 text-xs' : 'bg-purple-100 text-purple-700 text-xs'}>
                          {t.schedule_type === 'risk_assessment_leaders' ? '📋 RA Link' : '💬 Reminder'}
                        </Badge>
                      </div>
                      <p className="text-sm text-[#7413dc] font-medium">{formatTiming(t.send_timing)}</p>
                      {t.message_blocks?.length > 0 && (
                        <p className="text-xs text-gray-400 mt-1">{t.message_blocks.length} message block{t.message_blocks.length !== 1 ? 's' : ''}</p>
                      )}
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => { setEditingTemplate(t); setShowForm(true); }}>Edit</Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-red-400 hover:text-red-600" onClick={() => deleteMutation.mutate(t.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={showForm} onOpenChange={v => { setShowForm(v); if (!v) setEditingTemplate(null); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTemplate ? 'Edit Template' : 'New Template'}</DialogTitle>
          </DialogHeader>
          <TemplateForm
            key={editingTemplate?.id || 'new'}
            initial={editingTemplate ? {
              ...editingTemplate,
              message_blocks: (editingTemplate.message_blocks || []).map(b => ({ ...b, id: crypto.randomUUID() }))
            } : undefined}
            onSave={(data) => saveMutation.mutate(editingTemplate ? { ...data, id: editingTemplate.id } : data)}
            onCancel={() => { setShowForm(false); setEditingTemplate(null); }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}