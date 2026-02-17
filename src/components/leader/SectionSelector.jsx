import React from 'react';
import { useSectionContext } from './SectionContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function SectionSelector() {
  const { selectedSection, setSelectedSection, availableSections, loading } = useSectionContext();

  // Only show selector if there are multiple sections available
  if (loading || availableSections.length <= 1) {
    return null;
  }

  return (
    <div className="bg-white border-b border-gray-200 py-3 px-4">
      <div className="max-w-7xl mx-auto flex items-center gap-3">
        <label className="text-sm font-medium text-gray-700 whitespace-nowrap">
          Viewing Section:
        </label>
        <Select value={selectedSection} onValueChange={setSelectedSection}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Select section" />
          </SelectTrigger>
          <SelectContent>
            {availableSections.map((section) => (
              <SelectItem key={section.id} value={section.id}>
                {section.display_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}