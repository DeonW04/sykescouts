import React, { useState } from 'react';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, parse } from 'date-fns';

export default function SearchableEventSelect({ 
  items, 
  value, 
  onValueChange, 
  placeholder = "Search...",
  type = "event" // 'event' or 'programme'
}) {
  const [open, setOpen] = useState(false);
  
  const selectedItem = items.find(item => item.id === value);
  
  const formatDate = (dateStr) => {
    try {
      return format(new Date(dateStr), 'dd/MM/yyyy');
    } catch {
      return dateStr;
    }
  };
  
  const formatMonth = (dateStr) => {
    try {
      return format(new Date(dateStr), 'MMMM yyyy');
    } catch {
      return dateStr;
    }
  };
  
  const matchesSearch = (item, search) => {
    const searchLower = search.toLowerCase();
    const dateField = type === 'event' ? item.start_date : item.date;
    
    // Match by title
    if (item.title.toLowerCase().includes(searchLower)) return true;
    
    // Match by dd/mm/yyyy
    if (dateField && formatDate(dateField).includes(search)) return true;
    
    // Match by MMMM yyyy
    if (dateField && formatMonth(dateField).toLowerCase().includes(searchLower)) return true;
    
    return false;
  };
  
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          {selectedItem ? (
            <span className="truncate">
              {selectedItem.title} - {formatDate(type === 'event' ? selectedItem.start_date : selectedItem.date)}
            </span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[calc(100vw-2rem)] sm:w-[400px] md:w-[500px] p-0" align="start">
        <Command filter={(value, search) => {
          const item = items.find(i => i.id === value);
          if (!item) return 0;
          return matchesSearch(item, search) ? 1 : 0;
        }}>
          <CommandInput placeholder={`Search by name, date (dd/mm/yyyy), or month...`} />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup>
              {items.map((item) => (
                <CommandItem
                  key={item.id}
                  value={item.id}
                  onSelect={() => {
                    onValueChange(item.id);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === item.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="flex-1 truncate">
                    <span>{item.title}</span>
                    <span className="text-muted-foreground ml-2">
                      {formatDate(type === 'event' ? item.start_date : item.date)}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}