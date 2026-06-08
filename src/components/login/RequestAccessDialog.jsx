import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, CheckCircle2 } from 'lucide-react';

export default function RequestAccessDialog({ open, onOpenChange }) {
  const [sections, setSections] = useState([]);
  const [sectionId, setSectionId] = useState('');
  const [childName, setChildName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!open) return;
    base44.entities.Section.filter({ active: true })
      .then((secs) => setSections(secs || []))
      .catch(() => setSections([]));
    // reset on open
    setDone(false);
    setError('');
    setSectionId('');
    setChildName('');
    setEmail('');
  }, [open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!childName.trim() || !email.trim()) {
      setError('Please enter your child\'s name and your email address.');
      return;
    }
    setLoading(true);
    try {
      const selected = sections.find((s) => s.id === sectionId);
      await base44.functions.invoke('requestAccess', {
        sectionId: sectionId || '',
        sectionName: selected?.display_name || '',
        childName: childName.trim(),
        parentEmail: email.trim(),
      });
      setDone(true);
    } catch (err) {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {done ? (
          <div className="text-center py-6">
            <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Request sent!</h3>
            <p className="text-sm text-gray-600 mb-5">
              We've let the section leader know. Once they approve, you'll receive an email with a link to set up your account.
            </p>
            <Button onClick={() => onOpenChange(false)} className="bg-[#7413dc] hover:bg-[#5c0fb0]">Done</Button>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Request Access</DialogTitle>
              <DialogDescription>
                Tell us a little about your child and we'll ask the section leader to set you up.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4 mt-2">
              <div>
                <Label className="mb-1.5 block">Section</Label>
                <Select value={sectionId} onValueChange={setSectionId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a section" />
                  </SelectTrigger>
                  <SelectContent>
                    {sections.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.display_name || s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="mb-1.5 block">Child's name</Label>
                <Input
                  value={childName}
                  onChange={(e) => setChildName(e.target.value)}
                  placeholder="e.g. Alex Smith"
                />
              </div>

              <div>
                <Label className="mb-1.5 block">Your email address</Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                />
              </div>

              {error && <p className="text-sm text-red-600 font-medium">{error}</p>}

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-[#7413dc] hover:bg-[#5c0fb0] text-white"
              >
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {loading ? 'Sending…' : 'Request Access'}
              </Button>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}