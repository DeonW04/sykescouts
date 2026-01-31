import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronDown } from 'lucide-react';

export default function MobileTabSelector({ tabs, value, onValueChange }) {
  const currentTab = tabs.find(tab => tab.value === value);

  return (
    <div className="md:hidden mb-4">
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className="w-full h-14 bg-white border-2 shadow-sm hover:border-purple-300 transition-colors">
          <div className="flex items-center gap-3 flex-1">
            {currentTab?.icon && (
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                {React.cloneElement(currentTab.icon, { className: "w-5 h-5 text-white" })}
              </div>
            )}
            <p className="text-base font-semibold text-gray-900 flex-1">{currentTab?.label}</p>
            <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />
          </div>
        </SelectTrigger>
        <SelectContent className="w-[var(--radix-select-trigger-width)]">
          {tabs.map((tab) => (
            <SelectItem key={tab.value} value={tab.value} className="py-3">
              <div className="flex items-center gap-3">
                {tab.icon && (
                  <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center flex-shrink-0">
                    {React.cloneElement(tab.icon, { className: "w-4 h-4 text-purple-600" })}
                  </div>
                )}
                <span className="font-medium">{tab.label}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}