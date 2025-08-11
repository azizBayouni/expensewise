

'use client';

import * as React from 'react';
import { X, ChevronsUpDown, Check } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Separator } from './separator';
import type { Category } from '@/lib/data';

export type MultiSelectOption = {
  value: string;
  label: string;
  depth?: number;
};

interface MultiSelectProps {
  options: MultiSelectOption[];
  selected: string[];
  onChange: (selected: string[]) => void;
  className?: string;
  placeholder?: string;
  // Pass all categories to handle hierarchy logic internally
  allCategories?: Category[]; 
}

export function MultiSelect({
  options,
  selected,
  onChange,
  className,
  placeholder = 'Select...',
  allCategories = [],
  ...props
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false);

  const handleUnselect = (item: string) => {
    onChange(selected.filter((i) => i !== item));
  };

  const handleSelect = (optionValue: string) => {
    // If allCategories is not provided, do a simple toggle.
    if (allCategories.length === 0) {
        const newSelected = selected.includes(optionValue)
            ? selected.filter((item) => item !== optionValue)
            : [...selected, optionValue];
        onChange(newSelected);
        return;
    }
    
    // Logic to handle category hierarchy selection
    const category = allCategories.find(c => c.name === optionValue);
    if (!category) return;
    
    const getDescendants = (id: string): string[] => {
        const children = allCategories.filter(c => c.parentId === id);
        return [
            allCategories.find(c => c.id === id)!.name, 
            ...children.flatMap(c => getDescendants(c.id))
        ];
    };

    const descendants = getDescendants(category.id);
    const isSelected = selected.includes(category.name);
    
    if (isSelected) {
      // Deselect the category and all its descendants
      onChange(selected.filter(s => !descendants.includes(s)));
    } else {
      // Select the category and all its descendants
      const newSelected = [...new Set([...selected, ...descendants])];
      onChange(newSelected);
    }
  };


  const selectedOptions = options.filter(o => selected.includes(o.label));

  return (
    <Popover open={open} onOpenChange={setOpen} {...props}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between h-auto min-h-10", className)}
          onClick={() => setOpen(!open)}
        >
          <div className="flex gap-1 flex-wrap">
            {selectedOptions.length > 0 ? (
                selectedOptions.map((option) => (
                    <Badge
                        variant="secondary"
                        key={option.value}
                        className="mr-1"
                        onClick={(e) => {
                            e.stopPropagation();
                            handleUnselect(option.label);
                        }}
                    >
                        {option.label}
                        <X className="ml-1 h-3 w-3" />
                    </Badge>
                ))
            ) : (
                <span className="text-muted-foreground">{placeholder}</span>
            )}
          </div>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command>
          <CommandInput placeholder="Search ..." />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  onSelect={() => handleSelect(option.label)}
                  className={cn(
                    option.depth === 0 ? 'font-bold' : '',
                    option.depth === 1 ? 'pl-6' : '',
                    option.depth === 2 ? 'pl-10' : ''
                  )}
                >
                  <div
                    className={cn(
                      'mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary',
                      selected.includes(option.label)
                        ? 'bg-primary text-primary-foreground'
                        : 'opacity-50 [&_svg]:invisible'
                    )}
                  >
                     <Check className="h-4 w-4" />
                  </div>
                  {option.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
