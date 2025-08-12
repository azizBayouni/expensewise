

'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { type Debt } from '@/lib/data';
import { PlusCircle, Info } from 'lucide-react';
import { getDefaultCurrency } from '@/services/settings-service';
import { AddDebtDialog } from '@/components/add-debt-dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { EditDebtDialog } from '@/components/edit-debt-dialog';
import { getAllDebts } from '@/services/debt-service';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/components/auth-provider';

export default function DebtsPage() {
  const { user } = useAuth();
  const [defaultCurrency, setDefaultCurrency] = useState('USD');
  const [debts, setDebts] = useState<Debt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedDebt, setSelectedDebt] = useState<Debt | null>(null);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
        const [userDebts, currency] = await Promise.all([
            getAllDebts(user.uid),
            getDefaultCurrency(user.uid),
        ]);
        setDebts(userDebts);
        setDefaultCurrency(currency);
    } catch (error) {
        console.error("Error fetching debts data:", error);
    } finally {
        setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchData();
    }
    const handleDataChange = () => {
        if (user) fetchData();
    }
    window.addEventListener('debtsUpdated', handleDataChange);
    return () => window.removeEventListener('debtsUpdated', handleDataChange);
  }, [user, fetchData]);

  const payables = debts.filter((d) => d.type === 'payable');
  const receivables = debts.filter((d) => d.type === 'receivable');

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };
  
  const handleRowClick = (debt: Debt) => {
    setSelectedDebt(debt);
    setIsEditDialogOpen(true);
  };

  const getRemainingAmount = (debt: Debt) => {
    const totalPaid = debt.payments.reduce((sum, p) => sum + p.amount, 0);
    return debt.amount - totalPaid;
  };
  
  const getStatusBadgeVariant = (status: Debt['status'], type: Debt['type']) => {
    if (status === 'paid') return 'secondary';
    if (status === 'partial') return 'default';
    return type === 'payable' ? 'destructive' : 'default';
  }

  const renderDebtRow = (debt: Debt) => {
    const remainingAmount = getRemainingAmount(debt);
    
    return (
    <TableRow key={debt.id} onClick={() => handleRowClick(debt)} className="cursor-pointer">
      <TableCell className="font-medium flex items-center gap-2">
        {debt.person}
        {debt.note && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-4 w-4 text-muted-foreground cursor-pointer" />
              </TooltipTrigger>
              <TooltipContent>
                <p>{debt.note}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </TableCell>
      <TableCell className="hidden sm:table-cell">{debt.dueDate}</TableCell>
      <TableCell>
        <Badge variant={getStatusBadgeVariant(debt.status, debt.type)} className={debt.status === 'partial' ? 'bg-primary/80' : ''}>
          {debt.status}
        </Badge>
      </TableCell>
      <TableCell className={`text-right font-medium`}>
        <div className="flex flex-col items-end">
            <span className={`${debt.type === 'payable' ? 'text-destructive' : 'text-accent'}`}>
                 {debt.type === 'payable' ? '-' : '+'}{formatCurrency(remainingAmount, debt.currency)}
            </span>
            {debt.status === 'partial' && (
                <span className="text-xs text-muted-foreground">
                    of {formatCurrency(debt.amount, debt.currency)}
                </span>
            )}
        </div>
      </TableCell>
    </TableRow>
  )};

  if (isLoading) {
    return (
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
            <div className="flex items-center justify-between">
                <Skeleton className="h-10 w-64" />
                <Skeleton className="h-10 w-36" />
            </div>
            <Skeleton className="h-10 w-48" />
            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead><Skeleton className="h-6 w-32" /></TableHead>
                            <TableHead><Skeleton className="h-6 w-24" /></TableHead>
                            <TableHead><Skeleton className="h-6 w-24" /></TableHead>
                            <TableHead className="text-right"><Skeleton className="h-6 w-32" /></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {[...Array(3)].map((_, i) => (
                        <TableRow key={i}>
                            <TableCell><Skeleton className="h-6 w-full" /></TableCell>
                            <TableCell><Skeleton className="h-6 w-full" /></TableCell>
                            <TableCell><Skeleton className="h-6 w-full" /></TableCell>
                            <TableCell><Skeleton className="h-6 w-full" /></TableCell>
                        </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
  }

  return (
    <>
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
       <div className="flex flex-col md:flex-row items-start md:items-center justify-between space-y-2 md:space-y-0">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Debts</h2>
          <p className="text-muted-foreground">
            Track your payables and receivables.
          </p>
        </div>
        <div className="flex items-center space-x-2">
            <Button onClick={() => setIsAddDialogOpen(true)}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add Debt
            </Button>
        </div>
      </div>

      <Tabs defaultValue="payable" className="space-y-4">
        <TabsList>
          <TabsTrigger value="payable">Payable</TabsTrigger>
          <TabsTrigger value="receivable">Receivable</TabsTrigger>
        </TabsList>
        <TabsContent value="payable" className="space-y-4">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Person/Entity</TableHead>
                  <TableHead className="hidden sm:table-cell">Due Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payables.map(renderDebtRow)}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
        <TabsContent value="receivable" className="space-y-4">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Person/Entity</TableHead>
                  <TableHead className="hidden sm:table-cell">Due Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {receivables.map(renderDebtRow)}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
     <AddDebtDialog
        isOpen={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onDebtAdded={fetchData}
     />
     {selectedDebt && (
        <EditDebtDialog
            isOpen={isEditDialogOpen}
            onOpenChange={setIsEditDialogOpen}
            debt={selectedDebt}
            onDebtUpdated={fetchData}
        />
     )}
    </>
  );
}
