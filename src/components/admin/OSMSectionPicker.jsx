/**
 * Searchable OSM section picker.
 * Fetches the authenticated user's OSM sections and presents them as a dropdown.
 * Falls back to a plain text input if the API call fails.
 */
import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandInput, CommandList, CommandItem, CommandEmpty } from '@/components/ui/command';
import { ChevronDown, Loader2, AlertCircle } from 'lucide-react';

export default function OSMSectionPicker({ value, sectionType, onChange, className }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sections, setSections] = useState([]);
  const [fallbackText, setFallbackText] = useState(value || '');

  useEffect(() => {
    base44.functions.invoke('getOSMUserSections', {})
      .then(res => {
        if (res?.data?.success && Array.isArray(res.data.sections)) {
          setSections(res.data.sections);
          setError(null);
        } else {
          setError('Could not load sections from OSM.');
        }
      })
      .catch(() => setError('Could not reach OSM API.'))
      .finally(() => setLoading(false));
  }, []);

  const selected = sections.find(s => s.sectionid === value);

  if (loading) {
    return (
      <div className={`flex items-center gap-2 h-8 text-sm text-gray-500 ${className}`}>
        <Loader2 className="w-3 h-3 animate-spin" />
        <span>Loading OSM sections…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-1">
        <Input
          value={fallbackText}
          onChange={e => { setFallbackText(e.target.value); onChange(e.target.value, null); }}
          placeholder="e.g. 12345"
          className={`h-8 text-sm ${className}`}
        />
        <p className="text-[10px] text-amber-600 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />{error} Enter ID manually.
        </p>
      </div>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          className={`h-8 text-sm justify-between font-normal w-full ${className}`}
        >
          <span className={selected ? 'text-gray-900' : 'text-gray-400'}>
            {selected ? `${selected.sectionname} (${selected.sectionType})` : 'Select OSM section…'}
          </span>
          <ChevronDown className="w-3 h-3 ml-1 text-gray-400" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start">
        <Command
          filter={(value, search) => {
            const s = sections.find(sec => sec.sectionid === value);
            if (!s) return 0;
            const text = `${s.sectionname} ${s.sectionType} ${s.groupname || ''}`.toLowerCase();
            return text.includes(search.toLowerCase()) ? 1 : 0;
          }}
        >
          <CommandInput placeholder="Search sections…" className="text-sm" />
          <CommandList className="max-h-52 overflow-y-auto">
            <CommandEmpty>No sections found.</CommandEmpty>
            {sections.map(s => (
              <CommandItem
                key={s.sectionid}
                value={s.sectionid}
                onSelect={(val) => {
                  const found = sections.find(sec => sec.sectionid === val);
                  if (found) onChange(found.sectionid, found.sectionType);
                  setOpen(false);
                }}
                className="text-sm cursor-pointer"
              >
                <div>
                  <p className="font-medium">{s.sectionname}</p>
                  <p className="text-xs text-gray-500 capitalize">{s.sectionType}{s.groupname ? ` · ${s.groupname}` : ''}</p>
                </div>
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}