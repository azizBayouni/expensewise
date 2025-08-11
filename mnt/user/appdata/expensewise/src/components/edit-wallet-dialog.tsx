

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
import { emojiIcons, type Wallet, currencies, type Category } from '@/lib/data';
import { updateWallet } from '@/services/wallet-service';
import { useEffect, useState, useMemo, useCallback } from 'react';
import { useToast } from "@/hooks/use-toast";
import { MultiSelect, type MultiSelectOption } from './ui/multi-select';
import { ScrollArea } from './ui/scroll-area';
import { cn } from '@/lib/utils';
import { getCategoryDepth, getAllCategories } from '@/services/category-service';
import { useAuth } from './auth-provider';

interface EditWalletDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  wallet: Wallet | null;
}

export function EditWalletDialog({
  isOpen,
  onOpenChange,
  wallet,
}: EditWalletDialogProps) {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [icon, setIcon] = useState<string | undefined>(undefined);
  const [currency, setCurrency] = useState('');
  const [linkedCategoryIds, setLinkedCategoryIds] = useState<string[]>([]);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [iconSearch, setIconSearch] = useState('');
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    if (!user) return;
    const cats = await getAllCategories(user.uid);
    setAllCategories(cats);
  }, [user]);

  useEffect(() => {
    if (isOpen) {
        fetchData();
        if (wallet) {
          setName(wallet.name);
          setIcon(wallet.icon);
          setCurrency(wallet.currency);
          setLinkedCategoryIds(wallet.linkedCategoryIds || []);
        }
        setIconSearch('');
    }
  }, [wallet, isOpen, fetchData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (wallet && user) {
      const updatedWallet: Wallet = {
        ...wallet,
        name,
        icon,
        currency,
        linkedCategoryIds,
      };
      updateWallet(user.uid, updatedWallet);
      toast({
          title: "Wallet Updated",
          description: `The wallet "${name}" has been saved.`,
      });
      onOpenChange(false);
    }
  };
  
  const categoryOptions = useMemo(() => {
     return allCategories.map(c => ({
        label: c.name,
        value: c.id,
        depth: getCategoryDepth(c.id, allCategories)
     }));
  }, [allCategories]);

  const filteredIcons = useMemo(() => {
    if (!iconSearch) return emojiIcons;
    return emojiIcons.filter(emoji => 
        emoji.name.toLowerCase().includes(iconSearch.toLowerCase())
    );
  }, [iconSearch]);
  
  if (!wallet) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] flex flex-col">
        <form onSubmit={handleSubmit}>
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>Edit Wallet</DialogTitle>
            <DialogDescription>
              Update the details and linked categories for your wallet.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4 flex-1 overflow-y-auto pr-4 -mr-4">
            <div className="flex items-end gap-4">
              <div className="space-y-2">
                <Label htmlFor="icon">Icon</Label>
                <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-16 h-16 text-2xl">
                      {icon || '...'}
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
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
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
                 <p className="text-xs text-muted-foreground">
                    Changing the currency will not convert the balance.
                </p>
            </div>
             <div className="space-y-2">
                <Label htmlFor="linked-categories">Linked Categories</Label>
                <MultiSelect
                    options={categoryOptions}
                    selected={linkedCategoryIds}
                    onChange={setLinkedCategoryIds}
                    placeholder="All categories"
                />
                 <p className="text-xs text-muted-foreground">
                    If no categories are selected, all will be available for transactions with this wallet.
                </p>
            </div>
          </div>
          <DialogFooter className="border-t pt-4 flex-shrink-0">
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
