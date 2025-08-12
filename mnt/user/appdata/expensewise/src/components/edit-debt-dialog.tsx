

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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { CalendarIcon, Trash2, PlusCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useToast } from "@/hooks/use-toast";
import { updateDebt, deleteDebt, addPaymentToDebt } from '@/services/debt-service';
import { Textarea } from './ui/textarea';
import type { Debt, Payment } from '@/lib/data';
import { Separator } from './ui/separator';
import { useAuth } from './auth-provider';

interface EditDebtDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  debt: Debt | null;
  onDebtUpdated: () => void;
}

export function EditDebtDialog({
  isOpen,
  onOpenChange,
  debt,
  onDebtUpdated,
}: EditDebtDialogProps) {
  const { user } = useAuth();
  const [type, setType] = useState<'payable' | 'receivable'>('payable');
  const [person, setPerson] = useState('');
  const [amount, setAmount] = useState<number | ''>('');
  const [currency, setCurrency] = useState('');
  const [dueDate, setDueDate] = useState<Date | undefined>();
  const [note, setNote] = useState('');
  const [status, setStatus] = useState<'paid' | 'unpaid' | 'partial'>('unpaid');
  const [payments, setPayments] = useState<Payment[]>([]);
  const [newPaymentAmount, setNewPaymentAmount] = useState<number | ''>('');
  const { toast } = useToast();

  const totalPaid = useMemo(() => {
    return payments.reduce((sum, p) => sum + p.amount, 0);
  }, [payments]);

  const remainingAmount = useMemo(() => {
    const originalAmount = Number(amount) || 0;
    return originalAmount - totalPaid;
  }, [amount, totalPaid]);

  const updateLocalState = useCallback((updatedDebt: Debt) => {
      setType(updatedDebt.type);
      setPerson(updatedDebt.person);
      setAmount(updatedDebt.amount);
      setCurrency(updatedDebt.currency);
      setDueDate(parseISO(updatedDebt.dueDate));
      setNote(updatedDebt.note || '');
      setStatus(updatedDebt.status);
      setPayments(updatedDebt.payments || []);
  }, []);

  useEffect(() => {
    if (debt) {
      updateLocalState(debt);
    }
    setNewPaymentAmount('');
  }, [debt, isOpen, updateLocalState]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!debt || !user || !person || !amount || !dueDate) {
        toast({
            title: "Missing Fields",
            description: "Please fill out all required fields.",
            variant: "destructive"
        });
        return;
    }

    const updatedDebt: Debt = {
      ...debt,
      type,
      person,
      amount: Number(amount),
      currency,
      dueDate: format(dueDate, 'yyyy-MM-dd'),
      note,
      status,
      payments,
    };
    
    await updateDebt(user.uid, updatedDebt);
    
    toast({
        title: "Debt Updated",
        description: `The debt for "${person}" has been updated.`,
    });
    
    onDebtUpdated();
    onOpenChange(false);
  };
  
  const handleDelete = async () => {
    if (debt && user) {
      await deleteDebt(user.uid, debt.id);
      toast({
          title: 'Debt Deleted',
          description: 'The debt has been successfully deleted.',
          variant: 'destructive'
      });
      onDebtUpdated();
      onOpenChange(false);
    }
  };

  const handleAddPayment = async () => {
    if (debt && user && newPaymentAmount) {
      const paymentValue = Number(newPaymentAmount);
      if (paymentValue <= 0) {
        toast({ title: "Invalid Amount", description: "Payment must be positive.", variant: "destructive" });
        return;
      }
      if (paymentValue > remainingAmount) {
        toast({ title: "Overpayment", description: "Payment cannot exceed remaining amount.", variant: "destructive" });
        return;
      }
      const updatedDebt = await addPaymentToDebt(user.uid, debt, paymentValue);
      if (updatedDebt) {
        updateLocalState(updatedDebt);
        setNewPaymentAmount('');
        toast({ title: "Payment Added", description: "The partial payment has been recorded." });
      }
    }
  };

  const formatCurrency = (value: number) => {
    if (!currency) return '...';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(value);
  }

  if (!debt) return null;
  
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Edit Debt</DialogTitle>
          <DialogDescription>
            Update details or add payments for this debt.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto pr-4 -mr-4 space-y-4">
            <div className="space-y-2">
              <Label>Remaining Balance</Label>
              <p className="text-2xl font-bold">{formatCurrency(remainingAmount)}</p>
              <p className="text-sm text-muted-foreground">
                Originally {formatCurrency(Number(amount))}
              </p>
            </div>

            <Separator />
            
            {status !== 'paid' && (
                <div className="space-y-3 p-3 bg-muted/50 rounded-lg">
                    <Label>Add a Payment</Label>
                    <div className="flex items-center gap-2">
                        <Input 
                            type="number" 
                            placeholder="Enter amount" 
                            value={newPaymentAmount}
                            onChange={(e) => setNewPaymentAmount(e.target.value ? parseFloat(e.target.value) : '')}
                            max={remainingAmount}
                        />
                        <Button type="button" onClick={handleAddPayment}>
                            <PlusCircle className="mr-2 h-4 w-4"/> Add
                        </Button>
                    </div>
                </div>
            )}
            
            {payments.length > 0 && (
                <div className="space-y-2">
                    <Label>Payment History</Label>
                    <div className="space-y-2 rounded-md border p-2">
                        {payments.map(p => (
                            <div key={p.id} className="flex justify-between items-center text-sm">
                                <span>{format(parseISO(p.date), 'dd MMM yyyy')}</span>
                                <span className="font-medium">{formatCurrency(p.amount)}</span>
                            </div>
                        ))}
                         <Separator />
                         <div className="flex justify-between items-center text-sm font-semibold">
                            <span>Total Paid</span>
                            <span>{formatCurrency(totalPaid)}</span>
                        </div>
                    </div>
                </div>
            )}

            <Separator />

             <div className="space-y-2">
              <Label>Type</Label>
              <RadioGroup value={type} onValueChange={(value) => setType(value as 'payable' | 'receivable')} className="flex gap-4">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="payable" id="edit-payable" />
                  <Label htmlFor="edit-payable">Payable (I owe)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="receivable" id="edit-receivable" />
                  <Label htmlFor="edit-receivable">Receivable (I am owed)</Label>
                </div>
              </RadioGroup>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-name">Person / Entity</Label>
              <Input id="edit-name" value={person} onChange={(e) => setPerson(e.target.value)} required placeholder="e.g. John Doe, Car Loan" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-amount">Original Amount</Label>
              <div className="flex items-center gap-2">
                <Input id="edit-amount" type="number" value={amount} onChange={(e) => setAmount(e.target.value ? parseFloat(e.target.value) : '')} required placeholder="100.00" />
                 <div className="flex h-10 items-center justify-center rounded-md border border-input bg-background px-3 text-sm text-muted-foreground">
                    {currency}
                </div>
              </div>
            </div>
            <div className="space-y-2">
                <Label htmlFor="edit-due-date">Due Date</Label>
                <Popover>
                    <PopoverTrigger asChild>
                        <Button
                        id="edit-due-date"
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
                <Label htmlFor="edit-note">Note (Optional)</Label>
                <Textarea id="edit-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. For concert tickets" />
            </div>
             <div className="space-y-2">
              <Label>Status</Label>
              <RadioGroup value={status} onValueChange={(value) => setStatus(value as 'paid' | 'unpaid' | 'partial')} className="flex gap-4">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="unpaid" id="unpaid" />
                  <Label htmlFor="unpaid">Unpaid</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="partial" id="partial" />
                  <Label htmlFor="partial">Partial</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="paid" id="paid" />
                  <Label htmlFor="paid">Paid</Label>
                </div>
              </RadioGroup>
            </div>
        </div>
        <DialogFooter className="sm:justify-between pt-4 border-t flex-shrink-0">
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
                        debt record.
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
                <Button type="submit" onClick={handleSubmit}>Save Changes</Button>
            </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

