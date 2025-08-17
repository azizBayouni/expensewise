

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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
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
import { CalendarIcon, Download, Paperclip, Trash2, X, Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { currencies, type Category, type Wallet, type Event, getCategoryDepth } from '@/lib/data';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { updateTransaction, deleteTransaction, convertAmount as convertAmountService } from '@/services/transaction-service';
import { useToast } from "@/hooks/use-toast"
import type { Transaction } from '@/lib/data';
import { getDefaultCurrency } from '@/services/settings-service';
import { getTravelMode } from '@/services/travel-mode-service';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { getAllCategories } from '@/services/category-service';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { getExchangeRateApiKey } from '@/services/api-key-service';
import { useAuth } from './auth-provider';
import { getAllWallets } from '@/services/wallet-service';
import { getAllEvents } from '@/services/event-service';

interface EditTransactionDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: Transaction | null;
  onTransactionUpdated: () => void;
}

export function EditTransactionDialog({
  isOpen,
  onOpenChange,
  transaction,
  onTransactionUpdated
}: EditTransactionDialogProps) {
  const { user } = useAuth();
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [amount, setAmount] = useState<number | ''>('');
  const [originalAmount, setOriginalAmount] = useState<number | ''>('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [wallet, setWallet] = useState('');
  const [date, setDate] = useState<Date | undefined>();
  const [attachments, setAttachments] = useState<{name: string, url: string}[]>([]);
  const [newAttachments, setNewAttachments] = useState<File[]>([]);
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
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(() => {
    if (!user) return;
    setIsLoading(true);
    try {
        const cats = getAllCategories(user.uid);
        const wals = getAllWallets(user.uid);
        const evs = getAllEvents(user.uid);
        const defCurrency = getDefaultCurrency(user.uid);
        setAllCategories(cats);
        setAllWallets(wals);
        setAllEvents(evs);
        setDefaultCurrency(defCurrency);
    } catch (error) {
        console.error("Error fetching data for dialog", error);
        toast({ title: "Error", description: "Could not load data for editing.", variant: "destructive"});
    } finally {
        setIsLoading(false);
    }
  }, [user, toast]);

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
    const apiKey = getExchangeRateApiKey(user.uid);
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

  const resetAndInitialize = useCallback(() => {
    if (!user) return;
    fetchData();
    const travelMode = getTravelMode();
    setIsTravelMode(travelMode.isActive);

    if (transaction) {
      setType(transaction.type);
      
      setDescription(transaction.description || '');
      setCategory(transaction.category);
      setWallet(transaction.wallet);
      setDate(parseISO(transaction.date));
      setAttachments(transaction.attachments || []);
      setEventId(transaction.eventId);
      setExcludeFromReport(transaction.excludeFromReport || false);
      
      const savedAmount = transaction.amount;
      
      setAmount(savedAmount);
      setTransactionCurrency(transaction.currency);
      setOriginalAmount(transaction.amount);
    }
    setNewAttachments([]);
  }, [transaction, user, fetchData]);

  useEffect(() => {
    if (isOpen) {
      resetAndInitialize();
    }
  }, [isOpen, resetAndInitialize]);
  
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


  const handleAmountChange = (value: string) => {
    const numericValue = value === '' ? '' : parseFloat(value);
    setOriginalAmount(numericValue);
  };
  
  const handleAmountBlur = () => {
    if (originalAmount) {
       convertAmount(Number(originalAmount), transactionCurrency, defaultCurrency);
    }
  };

  const handleCurrencyChange = (newCurrency: string) => {
    setTransactionCurrency(newCurrency);
    if (originalAmount) {
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

    if (transaction) {
      const updatedTransaction: Transaction = {
          ...transaction,
          amount: Number(finalAmount),
          type,
          description,
          category,
          wallet,
          date: format(date, 'yyyy-MM-dd'),
          currency: defaultCurrency, // Always save in default currency
          attachments: [...attachments, ...(newAttachments as any)], // a bit of a hack for the service
          eventId: eventId,
          excludeFromReport: excludeFromReport,
      };

      await updateTransaction(user.uid, updatedTransaction, newAttachments);

      toast({
        title: 'Transaction Updated',
        description: 'Your transaction has been successfully updated.',
      });
      
      onTransactionUpdated();
      onOpenChange(false);
    }
  };

  const handleDelete = () => {
    if (transaction && user) {
        deleteTransaction(user.uid, transaction.id);
        toast({
            title: 'Transaction Deleted',
            description: 'The transaction has been successfully deleted.',
            variant: 'destructive'
        });
        onTransactionUpdated();
        onOpenChange(false);
    }
  }


  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setNewAttachments(prev => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const removeAttachment = (index: number, type: 'existing' | 'new') => {
    if (type === 'existing') {
        setAttachments(prev => prev.filter((_, i) => i !== index));
    } else {
        setNewAttachments(prev => prev.filter((_, i) => i !== index));
    }
  };
  
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

  const handleDownload = (url: string, name: string) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
  
  if (!transaction) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
            <DialogHeader>
            <DialogTitle>Edit Transaction</DialogTitle>
            <DialogDescription>
                Update the details of your transaction.
            </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
            {isTravelMode && (
              <Alert>
                <AlertTitle>Travel Mode Active</AlertTitle>
                <AlertDescription>
                  Amounts entered in {transactionCurrency} will be saved in{' '}
                  {defaultCurrency}.
                </AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
                <Label>Type</Label>
                <RadioGroup value={type} onValueChange={(v) => setType(v as 'income' | 'expense')} className="flex gap-4">
                <div className="flex items-center space-x-2">
                    <RadioGroupItem value="expense" id="edit-expense" />
                    <Label htmlFor="edit-expense">Expense</Label>
                </div>
                <div className="flex items-center space-x-2">
                    <RadioGroupItem value="income" id="edit-income" />
                    <Label htmlFor="edit-income">Income</Label>
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
                        {w.name}
                    </SelectItem>
                    ))}
                </SelectContent>
                </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount">Amount</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="amount"
                  type="number"
                  placeholder="0.00"
                  value={originalAmount}
                  onChange={(e) => handleAmountChange(e.target.value)}
                  onBlur={handleAmountBlur}
                  required
                  className="flex-1"
                  disabled={isConverting}
                />
                <Select
                  value={transactionCurrency}
                  onValueChange={handleCurrencyChange}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Currency" />
                  </SelectTrigger>
                  <SelectContent>
                    {currencies.map((c, index) => (
                      <SelectItem key={`${c}-${index}`} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {amount && transactionCurrency !== defaultCurrency && (
                <p className="text-sm text-muted-foreground">
                  Will be saved as ≈{' '}
                  {Number(amount).toLocaleString(undefined, {
                    style: 'currency',
                    currency: defaultCurrency,
                  })}
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
                 <div className="space-y-2 pt-2">
                    {attachments.map((file, index) => (
                        <div key={index} className="flex items-center justify-between text-sm p-2 bg-muted rounded-md">
                            <a 
                                href="#"
                                onClick={(e) => {
                                    e.preventDefault();
                                    handleDownload(file.url, file.name);
                                }}
                                className="truncate flex items-center gap-2 hover:underline"
                            >
                                <Download className="h-4 w-4"/>
                                {file.name}
                            </a>
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeAttachment(index, 'existing')}>
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    ))}
                    {newAttachments.map((file, index) => (
                         <div key={`${file.name}-${index}`} className="flex items-center justify-between text-sm p-2 bg-muted rounded-md">
                            <span className="truncate flex items-center gap-2">
                                <Paperclip className="h-4 w-4"/>
                                {file.name}
                            </span>
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeAttachment(index, 'new')}>
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    ))}
                </div>
                <Button asChild variant="outline" className="w-full">
                    <label htmlFor="edit-file-upload" className="cursor-pointer">
                    <Paperclip className="mr-2 h-4 w-4" />
                    Add Attachments
                    </label>
                </Button>
                <Input id="edit-file-upload" type="file" multiple className="hidden" onChange={handleFileChange} />
                </div>
                 <div className="flex items-center space-x-2">
                    <Checkbox id="edit-exclude-report" checked={excludeFromReport} onCheckedChange={(checked) => setExcludeFromReport(Boolean(checked))} />
                    <Label htmlFor="edit-exclude-report">Exclude from report</Label>
                </div>
            </div>
            <DialogFooter className="sm:justify-between">
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button type="button" variant="destructive">
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete this
                            transaction from our servers.
                        </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete}>Continue</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
                <div className="flex gap-2">
                    <DialogClose asChild>
                        <Button type="button" variant="secondary">
                        Cancel
                        </Button>
                    </DialogClose>
                    <Button type="submit" disabled={isConverting}>
                        {isConverting ? 'Converting...' : 'Save Changes'}
                    </Button>
                </div>
            </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
