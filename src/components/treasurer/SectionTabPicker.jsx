import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, ChevronDown } from 'lucide-react';

/**
 * A button that opens a dialog with section tabs across the top and a list of
 * items in the selected section, plus a live search box that searches across
 * all sections and shows each item's section badge.
 *
 * Props:
 *  - sections: [{ id, display_name }]
 *  - items: [{ id, label, sublabel?, sectionIds: string[], searchText, sortKey }]
 *      sectionIds — which section tabs this item belongs to (items can appear in more than one)
 *      sortKey — optional; when provided the list is sorted by it descending (used for date order)
 *  - value: currently selected item id
 *  - onChange: (id) => void
 *  - placeholder: button placeholder text when nothing selected
 *  - triggerLabel: label shown on the button (usually the selected item's label)
 *  - title: dialog title
 *  - icon: optional lucide icon component for the button
 */
export default function SectionTabPicker({
  sections = [],
  items = [],
  value,
  onChange,
  placeholder = 'Select…',
  triggerLabel,
  title = 'Select',
  icon: Icon,
}) {
  const [open, setOpen] = useState(false);
  const [activeSection, setActiveSection] = useState(sections[0]?.id || '');
  const [search, setSearch] = useState('');

  const sectionName = (id) => sections.find(s => s.id === id)?.display_name || '';

  const sortItems = (list) => {
    const hasSortKey = list.some(i => i.sortKey != null);
    if (hasSortKey) {
      return [...list].sort((a, b) => String(b.sortKey || '').localeCompare(String(a.sortKey || '')));
    }
    return [...list].sort((a, b) => a.label.localeCompare(b.label));
  };

  const searchResults = useMemo(() => {
    if (!search.trim()) return null;
    const q = search.toLowerCase();
    return sortItems(items.filter(i => (i.searchText || i.label).toLowerCase().includes(q)));
  }, [search, items]);

  const sectionItems = useMemo(() => {
    return sortItems(items.filter(i => (i.sectionIds || []).includes(activeSection)));
  }, [items, activeSection]);

  const handleSelect = (id) => {
    onChange(id);
    setOpen(false);
    setSearch('');
  };

  const openDialog = () => {
    // default the active tab to a section that has items, if the first has none
    if (!items.some(i => (i.sectionIds || []).includes(activeSection))) {
      const firstWithItems = sections.find(s => items.some(i => (i.sectionIds || []).includes(s.id)));
      if (firstWithItems) setActiveSection(firstWithItems.id);
    }
    setOpen(true);
  };

  const renderRow = (item, showSection) => (
    <button
      key={item.id}
      onClick={() => handleSelect(item.id)}
      className={`w-full text-left px-4 py-3 rounded-lg border transition-colors flex items-center justify-between gap-3 ${
        item.id === value ? 'border-[#1a472a] bg-green-50' : 'border-gray-200 hover:bg-gray-50'
      }`}
    >
      <div className="min-w-0">
        <p className="font-medium text-sm truncate">{item.label}</p>
        {item.sublabel && <p className="text-xs text-gray-500 truncate">{item.sublabel}</p>}
      </div>
      {showSection && (
        <div className="flex flex-wrap gap-1 justify-end flex-shrink-0">
          {(item.sectionIds || []).map(sid => (
            <Badge key={sid} variant="outline" className="text-[10px] whitespace-nowrap">{sectionName(sid)}</Badge>
          ))}
        </div>
      )}
    </button>
  );

  return (
    <>
      <Button variant="outline" onClick={openDialog} className="justify-between min-w-[16rem] max-w-md">
        <span className="flex items-center gap-2 truncate">
          {Icon && <Icon className="w-4 h-4 text-gray-500 flex-shrink-0" />}
          <span className="truncate">{triggerLabel || placeholder}</span>
        </span>
        <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              className="pl-9"
              placeholder="Search…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              autoFocus
            />
          </div>

          {searchResults ? (
            <div className="space-y-2 max-h-[55vh] overflow-y-auto pr-1">
              {searchResults.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-8">No matches found.</p>
              ) : (
                searchResults.map(item => renderRow(item, true))
              )}
            </div>
          ) : (
            <>
              <div className="flex gap-1 border-b border-gray-200">
                {sections.map(s => {
                  const count = items.filter(i => (i.sectionIds || []).includes(s.id)).length;
                  return (
                    <button
                      key={s.id}
                      onClick={() => setActiveSection(s.id)}
                      className={`px-4 py-2 text-sm font-semibold border-b-2 -mb-px transition-colors ${
                        activeSection === s.id
                          ? 'border-[#1a472a] text-[#1a472a]'
                          : 'border-transparent text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      {s.display_name} <span className="text-xs text-gray-400">({count})</span>
                    </button>
                  );
                })}
              </div>
              <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
                {sectionItems.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-8">Nothing in this section.</p>
                ) : (
                  sectionItems.map(item => renderRow(item, false))
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}