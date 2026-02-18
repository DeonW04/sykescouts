import React, { useState } from 'react';
import { useSectionContext } from './SectionContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectSeparator } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { Star } from 'lucide-react';

export default function SectionSelector() {
  const { selectedSection, setSelectedSection, availableSections, loading, user } = useSectionContext();
  const [showDefaultDialog, setShowDefaultDialog] = useState(false);
  const [defaultSection, setDefaultSection] = useState(null);
  const [saving, setSaving] = useState(false);

  if (loading || availableSections.length <= 1) return null;

  const currentDefault = user?.default_section_id;

  const handleSaveDefault = async () => {
    setSaving(true);
    try {
      await base44.auth.updateMe({ default_section_id: defaultSection });
      toast.success('Default section saved');
      setShowDefaultDialog(false);
    } catch (err) {
      toast.error('Failed to save default section');
    } finally {
      setSaving(false);
    }
  };

  const openDefaultDialog = () => {
    setDefaultSection(currentDefault || selectedSection || availableSections[0]?.id);
    setShowDefaultDialog(true);
  };

  return (
    <>
      <div className="bg-white border-b border-gray-200 py-3 px-4">
        <div className="max-w-7xl mx-auto flex items-center gap-3">
          <label className="text-sm font-medium text-gray-700 whitespace-nowrap">
            Viewing Section:
          </label>
          <Select value={selectedSection} onValueChange={(val) => {
            if (val === '__set_default__') {
              openDefaultDialog();
            } else {
              setSelectedSection(val);
            }
          }}>
            <SelectTrigger className="w-56">
              <SelectValue placeholder="Select section" />
            </SelectTrigger>
            <SelectContent>
              {availableSections.map((section) => (
                <SelectItem key={section.id} value={section.id}>
                  <span className="flex items-center gap-1.5">
                    {section.display_name}
                    {section.id === currentDefault && (
                      <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                    )}
                  </span>
                </SelectItem>
              ))}
              <SelectSeparator />
              <SelectItem value="__set_default__">
                <span className="flex items-center gap-1.5 text-gray-500">
                  <Star className="w-3.5 h-3.5" />
                  Set default section…
                </span>
              </SelectItem>
            </SelectContent>
          </Select>
          {currentDefault && (
            <span className="text-xs text-gray-400 hidden sm:block">
              Default: {availableSections.find(s => s.id === currentDefault)?.display_name}
            </span>
          )}
        </div>
      </div>

      <Dialog open={showDefaultDialog} onOpenChange={setShowDefaultDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-400" />
              Set Default Section
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-500">Choose which section opens by default when you log in.</p>
          <div className="space-y-2 mt-2">
            {availableSections.map(section => (
              <button
                key={section.id}
                onClick={() => setDefaultSection(section.id)}
                className={`w-full text-left px-4 py-2.5 rounded-lg border text-sm font-medium transition-all flex items-center justify-between ${
                  defaultSection === section.id
                    ? 'border-amber-400 bg-amber-50 text-amber-800'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                {section.display_name}
                {defaultSection === section.id && <Star className="w-4 h-4 text-amber-400 fill-amber-400" />}
              </button>
            ))}
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setShowDefaultDialog(false)}>Cancel</Button>
            <Button
              onClick={handleSaveDefault}
              disabled={saving}
              className="bg-amber-500 hover:bg-amber-600 text-white"
            >
              {saving ? 'Saving…' : 'Save Default'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}