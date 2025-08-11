

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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { emojiIcons, type Category, type EmojiIcon } from '@/lib/data';
import { addCategory, getCategoryDepth } from '@/services/category-service';
import { useState, useMemo, useEffect } from 'react';
import { useToast } from "@/hooks/use-toast"
import { cn } from '@/lib/utils';
import { ScrollArea } from './ui/scroll-area';
import { useAuth } from './auth-provider';

interface AddCategoryDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  allCategories: Category[];
}

export function AddCategoryDialog({
  isOpen,
  onOpenChange,
  allCategories
}: AddCategoryDialogProps) {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [parentId, setParentId] = useState<string | null>(null);
  const [icon, setIcon] = useState<string>('🤔');
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [iconSearch, setIconSearch] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
        // Reset form when dialog opens
        setName('');
        setType('expense');
        setParentId(null);
        setIcon('🤔');
        setIconSearch('');
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    try {
      await addCategory(user.uid, {
        name,
        type,
        parentId,
        icon,
      });
      toast({
          title: "Category Added",
          description: `The category "${name}" has been created.`,
      })
      onOpenChange(false);
    } catch (error: any) {
       toast({
        title: "Failed to Add Category",
        description: error.message,
        variant: "destructive",
      });
    }
  };
  
  const parentCategoryOptions = useMemo(async () => {
    const categoriesWithDepth = await Promise.all(allCategories.map(async c => ({
        ...c,
        depth: await getCategoryDepth(c.id, allCategories)
    })));
    return categoriesWithDepth.filter(c => c.depth < 2);
  }, [allCategories]);

  const renderParentCategoryOptions = () => {
    const topLevelCategories = allCategories.filter(c => c.parentId === null);

    const getOptionsForParent = (pId: string | null, level: number): JSX.Element[] => {
        return allCategories
            .filter(c => c.parentId === pId)
            .flatMap(c => {
                const option = (
                    <SelectItem
                        key={c.id}
                        value={c.id}
                        className={cn(`pl-${4 + level * 4}`)}
                    >
                        {c.name}
                    </SelectItem>
                );
                const children = getOptionsForParent(c.id, level + 1);
                return [option, ...children];
            });
    };

    return topLevelCategories.flatMap(c => {
       const option = (
           <SelectItem
                key={c.id}
                value={c.id}
                className="font-semibold"
            >
                {c.name}
            </SelectItem>
       );
       const children = getOptionsForParent(c.id, 1);
       return [option, ...children];
    });
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
            <DialogTitle>Add New Category</DialogTitle>
            <DialogDescription>
              Create a new category for your transactions.
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
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Coffee" required />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <RadioGroup value={type} onValueChange={(value) => setType(value as 'income' | 'expense')} className="flex gap-4">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="expense" id="add-expense" />
                  <Label htmlFor="add-expense">Expense</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="income" id="add-income" />
                  <Label htmlFor="add-income">Income</Label>
                </div>
              </RadioGroup>
            </div>
            <div className="space-y-2">
              <Label htmlFor="parent-category">Parent Category (Optional)</Label>
              <Select value={parentId || 'none'} onValueChange={(value) => setParentId(value === 'none' ? null : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a parent category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None (Top Level)</SelectItem>
                  {renderParentCategoryOptions()}
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
            <Button type="submit">Save Category</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
