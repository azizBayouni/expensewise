
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
import { Calendar } from '@/components/ui/calendar';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { CalendarIcon, Paperclip, X, Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { currencies, type Category, type Wallet, type Event, getCategoryDepth } from '@/lib/data';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { addTransaction, convertAmount as convertAmountService } from '@/services/transaction-service';
import { useToast } from "@/hooks/use-toast"
import type { Transaction } from '@/lib/data';
import { getDefaultCurrency } from '@/services/settings-service';
import { getTravelMode } from '@/services/travel-mode-service';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { getDefaultWallet } from '@/services/wallet-service';
import { Checkbox } from '@/components/ui/checkbox';
import { getAllCategories } from '@/services/category-service';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { getExchangeRateApiKey } from '@/services/api-key-service';
import { useAuth } from './auth-provider';
import { getAllWallets } from '@/services/wallet-service';
import { getAllEvents } from '@/services/event-service';

interface NewTransactionDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onTransactionAdded: () => void;
}

export function NewTransactionDialog({
  isOpen,
  onOpenChange,
  onTransactionAdded,
}: NewTransactionDialogProps) {
  const { user } = useAuth();
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [amount, setAmount] = useState<number | ''>('');
  const [originalAmount, setOriginalAmount] = useState<number | ''>('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [wallet, setWallet] = useState('');
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [attachments, setAttachments] = useState<File[]>([]);
  const [transactionCurrency, setTransactionCurrency] = useState('');
  const [isConverting, setIsConverting] = useState(false);
  const [isTravelMode, setIsTravelMode] = useState(false);
  const [defaultCurrency, setDefaultCurrency] = useState('');
  const [eventId, setEventId] = useState<string | undefined>(undefined);
  const [excludeFromReport, setExcludeFromReport] = useState(false);
  const [isCategoryPopoverOpen, setIsCategoryPopoverOpen] = useState(false);
  const { toast } = useToast();

  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [allWallets, setAllWallets] = useState<Wallet[]>([]);
  const [allEvents, setAllEvents] = useState<Event[]>([]);

  const convertAmount = useCallback(async (
    amountToConvert: number,
    from: string,
    to: string
  ) => {
    if (!user) return;
    if (!amountToConvert || !to || from === to) {
        setAmount(amountToConvert);
        return;
    }
    const apiKey = await getExchangeRateApiKey(user.uid);
    if (!apiKey) {
      toast({
        title: 'API Key Missing',
        description: 'An ExchangeRate-API key is required for conversion. Please add one in the settings.',
        variant: 'destructive',
      });
      setAmount(amountToConvert);
      return;
    }
    setIsConverting(true);
    try {
      const converted = await convertAmountService(user.uid, amountToConvert, from, to);
      setAmount(converted);
       if (from !== to) {
        toast({
            title: 'Amount Converted',
            description: `${amountToConvert.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} ${from} is ≈ ${converted.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} ${to}.`,
        });
      }
    } catch (error: any) {
      console.error('Currency conversion failed:', error);
      toast({
        title: 'Conversion Failed',
        description: error.message || 'Could not convert currency. Please try again.',
        variant: 'destructive',
      });
       setAmount(amountToConvert); // Fallback to original amount on error
    } finally {
      setIsConverting(false);
    }
  }, [toast, user]);


  const resetForm = useCallback(async () => {
    if (!user) return;
    const [cats, wals, evs, defCurrency, defWalletId] = await Promise.all([
        getAllCategories(user.uid),
        getAllWallets(user.uid),
        getAllEvents(user.uid),
        getDefaultCurrency(user.uid),
        getDefaultWallet(user.uid),
    ]);
    setAllCategories(cats);
    setAllWallets(wals);
    setAllEvents(evs);
    setDefaultCurrency(defCurrency);

    const travelMode = getTravelMode();
    setIsTravelMode(travelMode.isActive);
    
    setType('expense');
    setAmount('');
    setOriginalAmount('');
    setDescription('');
    setCategory('');
    setEventId(undefined);
    setExcludeFromReport(false);
    
    const defaultWallet = wals.find(w => w.id === defWalletId);
    setWallet(defaultWallet ? defaultWallet.name : (wals.length > 0 ? wals[0].name : ''));

    setDate(new Date());
    setAttachments([]);

    if (travelMode.isActive && travelMode.currency) {
      setTransactionCurrency(travelMode.currency);
      setEventId(travelMode.eventId || undefined);
    } else {
      setTransactionCurrency(defCurrency);
    }
  }, [user]);

  useEffect(() => {
    if (isOpen) {
      resetForm();
    }
  }, [isOpen, resetForm]);

  const handleAmountChange = (value: string) => {
    const numericValue = value === '' ? '' : parseFloat(value);
    setOriginalAmount(numericValue);
  };

  const handleAmountBlur = () => {
    if (originalAmount && transactionCurrency && defaultCurrency) {
      convertAmount(Number(originalAmount), transactionCurrency, defaultCurrency);
    }
  };

  const handleCurrencyChange = (newCurrency: string) => {
    setTransactionCurrency(newCurrency);
    if (originalAmount && defaultCurrency) {
      convertAmount(Number(originalAmount), newCurrency, defaultCurrency);
    }
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    const finalAmount = amount || originalAmount;

    if (!finalAmount || !category || !wallet || !date) {
        toast({
            title: "Missing Fields",
            description: "Please fill out all required fields.",
            variant: "destructive",
        })
        return;
    }

    const newTransaction: Omit<Transaction, 'id' | 'userId'> = {
        amount: Number(finalAmount),
        type,
        description,
        category: category,
        wallet,
        date: format(date, 'yyyy-MM-dd'),
        currency: defaultCurrency,
        attachments: attachments as any,
        eventId: eventId,
        excludeFromReport: excludeFromReport,
    };

    await addTransaction(user.uid, newTransaction, attachments);

    toast({
      title: 'Transaction Saved',
      description: 'Your new transaction has been successfully recorded.',
    });
    
    onTransactionAdded();
    onOpenChange(false);
  };


  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setAttachments(prev => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };
  
  const selectableCategories = useMemo(() => {
    const selectedWallet = allWallets.find(w => w.name === wallet);
    if (!selectedWallet || !selectedWallet.linkedCategoryIds || selectedWallet.linkedCategoryIds.length === 0) {
      return allCategories;
    }
    
    const linkedIds = new Set(selectedWallet.linkedCategoryIds);
    const availableCategories: Category[] = [];

    allCategories.forEach(c => {
        let isLinked = linkedIds.has(c.id);
        let current: Category | undefined = c;
        while(current && current.parentId) {
            if(linkedIds.has(current.parentId)) {
                isLinked = true;
                break;
            }
            current = allCategories.find(p => p.id === current?.parentId)
        }

        if(isLinked) {
            availableCategories.push(c);
        }
    })

    return availableCategories;
  }, [wallet, allCategories]);

  const renderCategoryOptions = () => {
    const categoriesWithDepth = selectableCategories.map(c => ({...c, depth: getCategoryDepth(c.id, selectableCategories)}));
    const sortedCategories = categoriesWithDepth.sort((a,b) => {
        if(a.depth < b.depth) return -1;
        if(a.depth > b.depth) return 1;
        return a.name.localeCompare(b.name);
    });

    const options: JSX.Element[] = [];
    const buildHierarchy = (parentId: string | null = null, level: number = 0) => {
      const children = sortedCategories.filter(c => c.parentId === parentId);
      children.forEach(c => {
        options.push(
           <CommandItem
                key={c.id}
                value={c.name}
                onSelect={(currentValue) => {
                    setCategory(currentValue === category ? "" : currentValue)
                    setIsCategoryPopoverOpen(false)
                }}
                style={{ paddingLeft: `${1 + level * 1.5}rem` }}
                className={cn(c.depth === 0 && 'font-bold')}
            >
                <Check
                    className={cn(
                        "mr-2 h-4 w-4",
                        category.toLowerCase() === c.name.toLowerCase() ? "opacity-100" : "opacity-0"
                    )}
                />
                {c.name}
            </CommandItem>
        );
        buildHierarchy(c.id, level + 1);
      });
    };
    buildHierarchy();
    return options;
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
            <DialogHeader>
            <DialogTitle>New Transaction</DialogTitle>
            <DialogDescription>
                Add a new income or expense record.
            </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
             {isTravelMode && (
              <Alert>
                <AlertTitle>Travel Mode Active</AlertTitle>
                <AlertDescription>
                  Amounts entered in {transactionCurrency} will be saved in {defaultCurrency}.
                </AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
                <Label>Type</Label>
                <RadioGroup value={type} onValueChange={(v) => setType(v as 'income' | 'expense')} className="flex gap-4">
                <div className="flex items-center space-x-2">
                    <RadioGroupItem value="expense" id="expense" />
                    <Label htmlFor="expense">Expense</Label>
                </div>
                <div className="flex items-center space-x-2">
                    <RadioGroupItem value="income" id="income" />
                    <Label htmlFor="income">Income</Label>
                </div>
                </RadioGroup>
            </div>
             <div className="space-y-2">
                <Label htmlFor="wallet">Wallet</Label>
                <Select value={wallet} onValueChange={setWallet}>
                <SelectTrigger>
                    <SelectValue placeholder="Select a wallet" />
                </SelectTrigger>
                <SelectContent>
                    {allWallets.map((w) => (
                    <SelectItem key={w.id} value={w.name}>
                        {w.name} ({w.currency})
                    </SelectItem>
                    ))}
                </SelectContent>
                </Select>
            </div>
            <div className="space-y-2">
                <Label htmlFor="amount">Amount</Label>
                <div className="flex items-center gap-2">
                    <Input id="amount" type="number" placeholder="0.00" value={originalAmount} onChange={(e) => handleAmountChange(e.target.value)} onBlur={handleAmountBlur} required className="flex-1" disabled={isConverting} />
                     <Select value={transactionCurrency} onValueChange={handleCurrencyChange}>
                        <SelectTrigger className="w-32">
                            <SelectValue placeholder="Currency" />
                        </SelectTrigger>
                        <SelectContent>
                            {currencies.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                 {amount && transactionCurrency !== defaultCurrency && (
                    <p className="text-sm text-muted-foreground">
                        Will be saved as ≈ {Number(amount).toLocaleString(undefined, { style: 'currency', currency: defaultCurrency })}
                    </p>
                )}
            </div>
            <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Input id="description" placeholder="e.g. Lunch with friends" value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Popover open={isCategoryPopoverOpen} onOpenChange={setIsCategoryPopoverOpen}>
                    <PopoverTrigger asChild>
                        <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={isCategoryPopoverOpen}
                        className="w-full justify-between"
                        >
                        {category
                            ? selectableCategories.find((c) => c.name.toLowerCase() === category.toLowerCase())?.name
                            : "Select a category"}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0">
                        <Command>
                        <CommandInput placeholder="Search category..." />
                         <CommandList>
                            <CommandEmpty>No category found.</CommandEmpty>
                            <CommandGroup>
                                {renderCategoryOptions()}
                            </CommandGroup>
                        </CommandList>
                        </Command>
                    </PopoverContent>
                </Popover>
            </div>
            <div className="space-y-2">
              <Label htmlFor="event">Event (Optional)</Label>
              <Select value={eventId} onValueChange={(value) => setEventId(value === 'none' ? undefined : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an event" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {allEvents.map((event) => (
                    <SelectItem key={event.id} value={event.id}>
                      {event.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Popover>
                    <PopoverTrigger asChild>
                        <Button
                        variant={'outline'}
                        className={cn(
                            'w-full justify-start text-left font-normal',
                            !date && 'text-muted-foreground'
                        )}
                        >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {date ? format(date, 'PPP') : <span>Pick a date</span>}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                        <Calendar
                        mode="single"
                        selected={date}
                        onSelect={setDate}
                        initialFocus
                        />
                    </PopoverContent>
                    </Popover>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="attachments">Attachments</Label>
                    <Button asChild variant="outline" className="w-full">
                        <label htmlFor="file-upload" className="cursor-pointer">
                        <Paperclip className="mr-2 h-4 w-4" />
                        Add Attachments
                        </label>
                    </Button>
                    <Input id="file-upload" type="file" multiple className="hidden" onChange={handleFileChange} />
                    {attachments.length > 0 && (
                        <div className="space-y-2 pt-2">
                        {attachments.map((file, index) => (
                            <div key={`${file.name}-${index}`} className="flex items-center justify-between text-sm p-2 bg-muted rounded-md">
                            <span className="truncate">{file.name}</span>
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeAttachment(index)}>
                                <X className="h-4 w-4" />
                            </Button>
                            </div>
                        ))}
                        </div>
                    )}
                </div>
                <div className="flex items-center space-x-2">
                    <Checkbox id="exclude-report" checked={excludeFromReport} onCheckedChange={(checked) => setExcludeFromReport(Boolean(checked))} />
                    <Label htmlFor="exclude-report">Exclude from report</Label>
                </div>
            </div>
            <DialogFooter>
            <DialogClose asChild>
                <Button type="button" variant="secondary">
                Cancel
                </Button>
            </DialogClose>
            <Button type="submit" disabled={isConverting}>
                {isConverting ? 'Converting...' : 'Save Transaction'}
            </Button>
            </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

    