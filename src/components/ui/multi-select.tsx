

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
import { getCategoryDepth } from '@/services/category-service';
import { categories } from '@/lib/data';
import { Separator } from './separator';

export type MultiSelectOption = {
  value: string;
  label: string;
  depth?: number;
};

interface MultiSelectProps {
  options: MultiSelectOption[];
  selected: string[];
  onChange: React.Dispatch<React.SetStateAction<string[]>>;
  className?: string;
  placeholder?: string;
}

export function MultiSelect({
  options,
  selected,
  onChange,
  className,
  placeholder = 'Select...',
  ...props
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false);
  const selectedOptions = options.filter(o => selected.includes(o.value));

  const handleUnselect = (item: string) => {
    onChange(selected.filter((i) => i !== item));
  };
  
  const handleSelect = (value: string) => {
     onChange(
        selected.includes(value)
            ? selected.filter((item) => item !== value)
            : [...selected, value]
    );
  }

  const allSelected = options.length > 0 && options.length === selected.length;

  const handleToggleAll = () => {
    if (allSelected) {
      onChange([]);
    } else {
      onChange(options.map((option) => option.value));
    }
  };


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
                            handleUnselect(option.value);
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
                <CommandItem
                    onSelect={handleToggleAll}
                    className="text-sm font-medium"
                >
                    <div
                        className={cn(
                        'mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary',
                        allSelected
                            ? 'bg-primary text-primary-foreground'
                            : 'opacity-50 [&_svg]:invisible'
                        )}
                    >
                        <Check className="h-4 w-4" />
                    </div>
                    <span>{allSelected ? 'Deselect All' : 'Select All'}</span>
                </CommandItem>
                <Separator className="my-1" />
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  onSelect={() => handleSelect(option.value)}
                  className={cn(
                    option.depth === 0 ? 'font-bold' : '',
                    option.depth === 1 ? 'pl-6' : '',
                    option.depth === 2 ? 'pl-10' : ''
                  )}
                >
                  <div
                    className={cn(
                      'mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary',
                      selected.includes(option.value)
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
