

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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { emojiIcons, type Event } from '@/lib/data';
import { updateEvent } from '@/services/event-service';
import { useEffect, useState, useMemo } from 'react';
import { useToast } from "@/hooks/use-toast"
import { ScrollArea } from './ui/scroll-area';
import { useAuth } from './auth-provider';

interface EditEventDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  event: Event | null;
}

export function EditEventDialog({
  isOpen,
  onOpenChange,
  event,
}: EditEventDialogProps) {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('🎉');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [iconSearch, setIconSearch] = useState('');
  const { toast } = useToast()

  useEffect(() => {
    if (event) {
      setName(event.name);
      setIcon(event.icon);
      setStatus(event.status);
    }
    setIconSearch('');
  }, [event, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (event && user) {
      const updatedEvent: Event = {
        ...event,
        name,
        icon,
        status,
      };
      updateEvent(user.uid, updatedEvent);
      toast({
          title: "Event Updated",
          description: `The event "${name}" has been saved.`,
      })
      onOpenChange(false);
    }
  };

  const filteredIcons = useMemo(() => {
    if (!iconSearch) return emojiIcons;
    return emojiIcons.filter(emoji => 
        emoji.name.toLowerCase().includes(iconSearch.toLowerCase())
    );
  }, [iconSearch]);
  
  if (!event) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Edit Event</DialogTitle>
            <DialogDescription>
              Update the details for your event.
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
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
            </div>
             <div className="space-y-2">
              <Label>Status</Label>
              <RadioGroup value={status} onValueChange={(value) => setStatus(value as 'active' | 'inactive')} className="flex gap-4">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="active" id="active" />
                  <Label htmlFor="active">Active</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="inactive" id="inactive" />
                  <Label htmlFor="inactive">Inactive</Label>
                </div>
              </RadioGroup>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="secondary">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit">Save Changes</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
