import React from 'react';

export default function ConsentChoiceOptions({ block, value, onChange, disabled = false, required = false }) {
  // Keep previously saved single answers selected when opening older submissions.
  const selected = Array.isArray(value) ? value : value ? [value] : [];
  return <fieldset id={block.id} disabled={disabled} aria-label={block.label} className="space-y-2">
    <p className="text-xs text-muted-foreground">Select all that apply.</p>
    {(block.options || []).map((option, index) => <label key={`${index}-${option}`} className="flex cursor-pointer items-start gap-3 rounded-md border bg-background p-3 text-sm">
      <input
        type="checkbox"
        className="mt-0.5 h-4 w-4 shrink-0"
        name={block.id}
        value={option}
        checked={selected.includes(option)}
        required={required && selected.length === 0 && index === 0}
        onChange={event => onChange(event.target.checked ? [...selected, option] : selected.filter(item => item !== option))}
      />
      <span className="min-w-0 break-words">{option}</span>
    </label>)}
  </fieldset>;
}