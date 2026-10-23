import React from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import ConsentChoiceOptions from '@/components/consent/ConsentChoiceOptions';

export default function PublicConsentFields({ blocks, responses, onChange, disabled }) {
  return <div className="space-y-5">{blocks.map(block => {
    if (block.type === 'heading') return <h2 key={block.id} className="text-lg font-semibold border-b pb-2">{block.label}</h2>;
    if (block.type === 'text') return <p key={block.id} className="text-sm whitespace-pre-wrap text-muted-foreground">{block.content}</p>;
    const props = { id: block.id, value: responses[block.id] ?? '', disabled, required: block.required, onChange: e => onChange(block.id, e.target.value) };
    return <div key={block.id} className="space-y-2">
      <label htmlFor={block.id} className="block text-sm font-semibold">{block.label}{block.required ? ' *' : ''}</label>
      {block.type === 'multiple_choice' ? <ConsentChoiceOptions block={block} value={responses[block.id]} disabled={disabled} required={block.required} onChange={value => onChange(block.id, value)} />
        : block.type === 'multi_line' ? <Textarea {...props} rows={3} maxLength={10000} />
        : <Input {...props} type={block.type === 'number' ? 'number' : 'text'} min={block.min} max={block.max} maxLength={10000} />}
    </div>;
  })}</div>;
}