import React from 'react';
import { ChevronDown } from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// Top-level admin navigation bar — one button per section, each opening a
// dropdown menu of its sub-pages. Sections without sub-pages (Dashboard)
// act as a direct link. Sub-pages with a `navigate` property leave the
// admin app entirely (handled by the caller via onSelectPage).
export default function AdminTopNav({ sections, selectedSection, selectedPage, onSelectSection, onSelectPage }) {
  return (
    <div className="bg-white border-b border-gray-100 sticky top-0 z-30">
      <div className="max-w-6xl mx-auto px-4 md:px-6 overflow-x-auto scrollbar-hide">
        <div className="flex items-center gap-1.5 py-2.5 min-w-max">
          {sections.map((section) => {
            const Icon = section.icon;
            const isSectionActive = selectedSection === section.key;

            if (section.isDashboard) {
              return (
                <button
                  key={section.key}
                  onClick={() => onSelectSection(section.key)}
                  className={`flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-full whitespace-nowrap transition-colors ${
                    isSectionActive ? 'bg-[#7413dc] text-white' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-800'
                  }`}
                >
                  <Icon className="w-4 h-4" /> {section.label}
                </button>
              );
            }

            return (
              <DropdownMenu key={section.key}>
                <DropdownMenuTrigger asChild>
                  <button
                    className={`flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-full whitespace-nowrap transition-colors ${
                      isSectionActive ? 'bg-[#7413dc]/10 text-[#7413dc]' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-800'
                    }`}
                  >
                    <Icon className="w-4 h-4" /> {section.label} <ChevronDown className="w-3.5 h-3.5 opacity-50" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  {section.pages.map((page) => {
                    const PageIcon = page.icon;
                    const isPageActive = isSectionActive && selectedPage === page.key;
                    return (
                      <DropdownMenuItem
                        key={page.key}
                        onClick={() => onSelectPage(section, page)}
                        className={`flex items-center gap-2 cursor-pointer ${isPageActive ? 'bg-[#7413dc]/10 text-[#7413dc]' : ''}`}
                      >
                        <PageIcon className="w-4 h-4" /> {page.label}
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            );
          })}
        </div>
      </div>
    </div>
  );
}