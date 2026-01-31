import React from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function MobileTabCarousel({ tabs, value, onValueChange }) {
  const currentIndex = tabs.findIndex(tab => tab.value === value);
  const currentTab = tabs[currentIndex];

  const handlePrevious = () => {
    const newIndex = currentIndex > 0 ? currentIndex - 1 : tabs.length - 1;
    onValueChange(tabs[newIndex].value);
  };

  const handleNext = () => {
    const newIndex = currentIndex < tabs.length - 1 ? currentIndex + 1 : 0;
    onValueChange(tabs[newIndex].value);
  };

  return (
    <div className="md:hidden mb-4">
      <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 p-[2px] rounded-xl">
        <div className="bg-white rounded-[10px] p-4">
          <div className="flex items-center justify-between gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={handlePrevious}
              className="flex-shrink-0 h-10 w-10 rounded-full hover:bg-purple-50"
            >
              <ChevronLeft className="w-5 h-5 text-purple-600" />
            </Button>
            
            <div className="flex flex-col items-center flex-1 min-w-0">
              {currentTab?.icon && (
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center mb-2 shadow-lg">
                  {React.cloneElement(currentTab.icon, { className: "w-6 h-6 text-white" })}
                </div>
              )}
              <p className="text-base font-bold text-gray-900 truncate w-full text-center">
                {currentTab?.label}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                {currentIndex + 1} of {tabs.length}
              </p>
            </div>
            
            <Button
              variant="ghost"
              size="icon"
              onClick={handleNext}
              className="flex-shrink-0 h-10 w-10 rounded-full hover:bg-purple-50"
            >
              <ChevronRight className="w-5 h-5 text-purple-600" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}