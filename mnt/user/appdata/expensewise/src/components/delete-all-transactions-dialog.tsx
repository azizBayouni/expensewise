
'use client';

import { useState } from 'react';
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
} from '@/components/ui/alert-dialog';
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
import { deleteAllTransactions } from '@/services/transaction-service';
import { useToast } from '@/hooks/use-toast';
import { TriangleAlert } from 'lucide-react';

interface DeleteAllTransactionsDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeleteAllTransactionsDialog({
  isOpen,
  onOpenChange,
}: DeleteAllTransactionsDialogProps) {
  const [isSecondConfirmOpen, setIsSecondConfirmOpen] = useState(false);
  const [confirmationText, setConfirmationText] = useState('');
  const { toast } = useToast();

  const handleFirstConfirm = () => {
    onOpenChange(false);
    setIsSecondConfirmOpen(true);
  };

  const handleFinalDelete = () => {
    if (confirmationText === 'DELETE') {
      deleteAllTransactions();
      toast({
        title: 'Success',
        description: 'All transactions have been permanently deleted.',
        variant: 'destructive',
      });
      setIsSecondConfirmOpen(false);
      setConfirmationText('');
    }
  };

  const closeAll = () => {
    onOpenChange(false);
    setIsSecondConfirmOpen(false);
    setConfirmationText('');
  }

  return (
    <>
      <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete all
              of your transaction records.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleFirstConfirm}
            >
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={isSecondConfirmOpen} onOpenChange={closeAll}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TriangleAlert className="text-destructive" />
              Final Confirmation
            </DialogTitle>
            <DialogDescription>
              This is your final warning. This action is irreversible. To
              proceed, please type <strong>DELETE</strong> into the box below.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="delete-confirm">Type DELETE to confirm</Label>
            <Input
              id="delete-confirm"
              value={confirmationText}
              onChange={(e) => setConfirmationText(e.target.value)}
              autoFocus
            />
          </div>
          <DialogFooter>
            <DialogClose asChild>
                <Button variant="secondary" onClick={closeAll}>Cancel</Button>
            </DialogClose>
            <Button
              variant="destructive"
              disabled={confirmationText !== 'DELETE'}
              onClick={handleFinalDelete}
            >
              Delete All Transactions
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
