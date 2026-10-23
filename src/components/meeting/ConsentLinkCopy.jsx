import React, { useId, useRef, useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function ConsentLinkCopy({ url }) {
  const id = useId();
  const input = useRef(null);
  const [message, setMessage] = useState('');
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setMessage('Link copied. Ready to send to the parent.');
    } catch {
      input.current?.focus();
      input.current?.select();
      setCopied(false);
      setMessage('Select and copy the link above to send it to the parent.');
    }
  };
  return <div className="space-y-2 text-left">
    <label htmlFor={id} className="text-sm font-medium">Consent link</label>
    <div className="flex gap-2">
      <Input id={id} ref={input} value={url} readOnly onFocus={event => event.target.select()} className="min-w-0 text-xs" />
      <Button type="button" variant="outline" onClick={copy}>{copied ? <Check /> : <Copy />}{copied ? 'Copied' : 'Copy'}</Button>
    </div>
    {message && <p role="status" className="text-xs text-muted-foreground">{message}</p>}
  </div>;
}