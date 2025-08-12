
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
import { Calendar } from '@/components/ui/calendar';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { useState, useEffect, useCallback } from 'react';
import { useToast } from "@/hooks/use-toast";
import { getDefaultCurrency } from '@/services/settings-service';
import { addDebt } from '@/services/debt-service';
import { Textarea } from './ui/textarea';
import { useAuth } from './auth-provider';

interface AddDebtDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onDebtAdded: () => void;
}

export function AddDebtDialog({
  isOpen,
  onOpenChange,
  onDebtAdded,
}: AddDebtDialogProps) {
  const { user } = useAuth();
  const [type, setType] = useState<'payable' | 'receivable'>('payable');
  const [person, setPerson] = useState('');
  const [amount, setAmount] = useState<number | ''>('');
  const [currency, setCurrency] = useState('USD');
  const [dueDate, setDueDate] = useState<Date | undefined>(new Date());
  const [note, setNote] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    async function fetchDefaultCurrency() {
        if (user) {
            const defaultCurrency = await getDefaultCurrency(user.uid);
            setCurrency(defaultCurrency);
        }
    }
    
    if (isOpen) {
      // Reset form when dialog opens
      setType('payable');
      setPerson('');
      setAmount('');
      fetchDefaultCurrency();
      setDueDate(new Date());
      setNote('');
    }
  }, [isOpen, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!person || !amount || !dueDate) {
        toast({
            title: "Missing Fields",
            description: "Please fill out all required fields.",
            variant: "destructive"
        });
        return;
    }

    await addDebt(user.uid, {
      type,
      person,
      amount: Number(amount),
      currency,
      dueDate: format(dueDate, 'yyyy-MM-dd'),
      note,
    });
    
    toast({
        title: "Debt Added",
        description: `The debt for "${person}" has been created.`,
    });

    onDebtAdded();
    onOpenChange(false);
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add New Debt</DialogTitle>
            <DialogDescription>
              Record a new payable or receivable debt.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
             <div className="space-y-2">
              <Label>Type</Label>
              <RadioGroup value={type} onValueChange={(value) => setType(value as 'payable' | 'receivable')} className="flex gap-4">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="payable" id="payable" />
                  <Label htmlFor="payable">Payable (I owe)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="receivable" id="receivable" />
                  <Label htmlFor="receivable">Receivable (I am owed)</Label>
                </div>
              </RadioGroup>
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Person / Entity</Label>
              <Input id="name" value={person} onChange={(e) => setPerson(e.target.value)} required placeholder="e.g. John Doe, Car Loan" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount">Amount</Label>
              <div className="flex items-center gap-2">
                <Input id="amount" type="number" value={amount} onChange={(e) => setAmount(e.target.value ? parseFloat(e.target.value) : '')} required placeholder="100.00" />
                 <div className="flex h-10 items-center justify-center rounded-md border border-input bg-background px-3 text-sm text-muted-foreground">
                    {currency}
                </div>
              </div>
            </div>
            <div className="space-y-2">
                <Label htmlFor="due-date">Due Date</Label>
                <Popover>
                    <PopoverTrigger asChild>
                        <Button
                        id="due-date"
                        variant={'outline'}
                        className={cn(
                            'w-full justify-start text-left font-normal',
                            !dueDate && 'text-muted-foreground'
                        )}
                        >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dueDate ? format(dueDate, 'PPP') : <span>Pick a date</span>}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                        <Calendar
                        mode="single"
                        selected={dueDate}
                        onSelect={setDueDate}
                        initialFocus
                        />
                    </PopoverContent>
                </Popover>
            </div>
            <div className="space-y-2">
                <Label htmlFor="note">Note (Optional)</Label>
                <Textarea id="note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. For concert tickets" />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="secondary">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit">Save Debt</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
