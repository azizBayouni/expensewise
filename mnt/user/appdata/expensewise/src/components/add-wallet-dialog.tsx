
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { emojiIcons, currencies } from '@/lib/data';
import { addWallet } from '@/services/wallet-service';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useToast } from "@/hooks/use-toast";
import { getDefaultCurrency } from '@/services/settings-service';
import { ScrollArea } from './ui/scroll-area';
import { useAuth } from './auth-provider';

interface AddWalletDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onWalletAdded: () => void;
}

export function AddWalletDialog({
  isOpen,
  onOpenChange,
  onWalletAdded,
}: AddWalletDialogProps) {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('🏦');
  const [currency, setCurrency] = useState('');
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [iconSearch, setIconSearch] = useState('');
  const { toast } = useToast();
  
  useEffect(() => {
    async function fetchDefaultData() {
        if (user) {
            const defaultCurrency = await getDefaultCurrency(user.uid);
            setCurrency(defaultCurrency);
        }
    }

    if (isOpen) {
      // Reset form when dialog opens
      setName('');
      setIcon('🏦');
      fetchDefaultData();
      setIconSearch('');
    }
  }, [isOpen, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (name) {
      await addWallet(user.uid, {
        name,
        icon,
        currency,
      });
      toast({
          title: "Wallet Added",
          description: `The wallet "${name}" has been created.`,
      });
      onWalletAdded();
      onOpenChange(false);
    }
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
            <DialogTitle>Add New Wallet</DialogTitle>
            <DialogDescription>
              Create a new wallet to manage your funds.
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
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required placeholder="e.g. Vacation Fund" />
              </div>
            </div>
             <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a currency" />
                  </SelectTrigger>
                  <SelectContent>
                    <ScrollArea className="h-48">
                        {currencies.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </ScrollArea>
                  </SelectContent>
                </Select>
              </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="secondary">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit">Save Wallet</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
