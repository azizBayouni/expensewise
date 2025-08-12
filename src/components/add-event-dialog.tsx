

'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { emojiIcons } from '@/lib/data';
import { addEvent } from '@/services/event-service';
import { useState, useMemo, useEffect } from 'react';
import { useToast } from "@/hooks/use-toast"
import { ScrollArea } from './ui/scroll-area';
import { useAuth } from './auth-provider';

interface AddEventDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddEventDialog({
  isOpen,
  onOpenChange,
}: AddEventDialogProps) {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('🎉');
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [iconSearch, setIconSearch] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
        // Reset form when dialog opens
        setName('');
        setIcon('🎉');
        setIconSearch('');
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!name) {
        toast({
            title: "Name is required",
            description: "Please enter a name for the event.",
            variant: "destructive"
        });
        return;
    }

    addEvent(user.uid, {
      name,
      icon,
    });
    toast({
        title: "Event Added",
        description: `The event "${name}" has been created.`,
    })
    onOpenChange(false);
  };
  
  const filteredIcons = useMemo(() => {
    if (!iconSearch) return emojiIcons;
    return emojiIcons.filter(emoji => 
        emoji.name.toLowerCase().includes(iconSearch.toLowerCase())
    );
  }, [iconSearch]);
  
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add New Event</DialogTitle>
            <DialogDescription>
              Create a new event to track expenses for a trip or occasion.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-end gap-4">
              <div className="space-y-2">
                <Label htmlFor="icon">Icon</Label>
                <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-16 h-16 text-2xl">
                      {icon}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                     <div className="p-2">
                       <Input 
                          placeholder="Search icons..."
                          value={iconSearch}
                          onChange={(e) => setIconSearch(e.target.value)}
                          className="w-full"
                        />
                    </div>
                    <ScrollArea className="h-48">
                      <div className="grid grid-cols-5 gap-2 p-2">
                        {filteredIcons.map((emoji, index) => (
                          <Button
                            key={`${emoji.icon}-${index}`}
                            variant="ghost"
                            className="text-lg p-2"
                            onClick={() => {
                              setIcon(emoji.icon);
                              setIsPopoverOpen(false);
                            }}
                          >
                            {emoji.icon}
                          </Button>
                        ))}
                      </div>
                    </ScrollArea>
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2 flex-1">
                <Label htmlFor="name">Name</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Summer Vacation" required />
              </div>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="secondary">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit">Save Event</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
