
'use client';

import Link from 'next/link';
import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { DollarSign, Wallet, TrendingUp, TrendingDown, PlusCircle } from 'lucide-react';
import { Overview } from '@/components/overview';
import { Button } from '@/components/ui/button';
import { NewTransactionDialog } from '@/app/new-transaction-dialog';
import { getDefaultCurrency } from '@/services/settings-service';
import { MonthlyReportCard } from '@/components/monthly-report-card';
import { TrendingReportCard } from '@/components/trending-report-card';
import { EditTransactionDialog } from '@/components/edit-transaction-dialog';
import { isThisMonth, parseISO, startOfMonth, endOfMonth, format } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getAllTransactions } from '@/services/transaction-service';
import { getAllWallets } from '@/services/wallet-service';
import { getAllDebts } from '@/services/debt-service';
import { getWalletBalance } from '@/lib/data';
import type { Transaction, Wallet as WalletType, Debt } from '@/lib/data';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/components/auth-provider';

export default function Dashboard() {
  const { user } = useAuth();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [defaultCurrency, setDefaultCurrency] = useState('SAR');
  const [overviewTimespan, setOverviewTimespan] = useState<'6m' | '12m' | 'ytd'>('6m');
  const [isLoading, setIsLoading] = useState(true);
  
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [wallets, setWallets] = useState<WalletType[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
        const [trans, wals, dts, currency] = await Promise.all([
            getAllTransactions(user.uid),
            getAllWallets(user.uid),
            getAllDebts(user.uid),
            getDefaultCurrency(user.uid),
        ]);
        setTransactions(trans);
        setWallets(wals);
        setDebts(dts);
        setDefaultCurrency(currency);
    } catch (error) {
        console.error("Error fetching dashboard data:", error);
    } finally {
        setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user, fetchData]);
  
  useEffect(() => {
    const handleDataChange = () => {
        if (user) fetchData();
    };
    window.addEventListener('transactionsUpdated', handleDataChange);
    window.addEventListener('walletsUpdated', handleDataChange);
    window.addEventListener('debtsUpdated', handleDataChange);
    window.addEventListener('storage', handleDataChange);

    return () => {
        window.removeEventListener('transactionsUpdated', handleDataChange);
        window.removeEventListener('walletsUpdated', handleDataChange);
        window.removeEventListener('debtsUpdated', handleDataChange);
        window.removeEventListener('storage', handleDataChange);
    };
  }, [fetchData, user]);


  const dashboardData = useMemo(() => {
    const reportableTransactions = transactions.filter(t => !t.excludeFromReport);
    const thisMonthTransactions = reportableTransactions.filter(t => isThisMonth(parseISO(t.date)));

    const totalBalance = wallets.reduce((sum, wallet) => {
        const walletTransactions = transactions.filter(t => t.wallet === wallet.name);
        return sum + getWalletBalance(wallet, walletTransactions);
    }, 0);

    const monthlyIncome = thisMonthTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
    const monthlyExpense = thisMonthTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const activePayables = debts.filter(d => d.type === 'payable' && d.status !== 'paid');
    const activeReceivables = debts.filter(d => d.type === 'receivable' && d.status !== 'paid');
    
    const activeDebtsAmount = activePayables.reduce((sum, d) => {
        const totalPaid = d.payments.reduce((paidSum, p) => paidSum + p.amount, 0);
        return sum + (d.amount - totalPaid);
    }, 0);

    const now = new Date();
    const monthStart = format(startOfMonth(now), 'yyyy-MM-dd');
    const monthEnd = format(endOfMonth(now), 'yyyy-MM-dd');


    return {
        totalBalance,
        monthlyIncome,
        monthlyExpense,
        activeDebtsAmount,
        activePayablesCount: activePayables.length,
        activeReceivablesCount: activeReceivables.length,
        recentTransactions: [...transactions].sort((a,b) => parseISO(b.date).getTime() - parseISO(a.date).getTime()).slice(0, 5),
        totalTransactionsThisMonth: thisMonthTransactions.length,
        thisMonthQuery: `from=${monthStart}&to=${monthEnd}`
    }
  }, [transactions, wallets, debts]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: defaultCurrency,
    }).format(amount);
  };

  const formatTransactionAmount = (amount: number, currency: string) => {
     return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  }

  const handleRowClick = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setIsEditDialogOpen(true);
  };
  
  if (isLoading) {
    return (
       <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between space-y-2 md:space-y-0">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-10 w-36" />
        </div>
        <div className="space-y-4">
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
             <div className="col-span-full grid gap-4 lg:grid-cols-2">
                <Skeleton className="h-80" />
                <Skeleton className="h-80" />
            </div>
            <Skeleton className="lg:col-span-4 h-96" />
            <Skeleton className="lg:col-span-3 h-96" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between space-y-2 md:space-y-0">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
            <p className="text-muted-foreground">
              An overview of your financial status.
            </p>
          </div>
          <div className="flex items-center space-x-2">
              <Button onClick={() => setIsAddDialogOpen(true)}>
                  <PlusCircle className="mr-2 h-4 w-4" /> New Transaction
              </Button>
          </div>
        </div>
        <div className="space-y-4">
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Balance</CardTitle>
                <Wallet className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(dashboardData.totalBalance)}</div>
                <p className="text-xs text-muted-foreground">
                  Across all wallets
                </p>
              </CardContent>
            </Card>
            <Link href={`/reports?${dashboardData.thisMonthQuery}`}>
              <Card className="hover:bg-muted/50 transition-colors">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">This Month's Income</CardTitle>
                  <TrendingUp className="h-4 w-4 text-accent" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-accent">+{formatCurrency(dashboardData.monthlyIncome)}</div>
                  <p className="text-xs text-muted-foreground">
                    Based on reportable transactions
                  </p>
                </CardContent>
              </Card>
            </Link>
            <Link href={`/reports?${dashboardData.thisMonthQuery}`}>
              <Card className="hover:bg-muted/50 transition-colors">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">This Month's Expenses</CardTitle>
                  <TrendingDown className="h-4 w-4 text-destructive" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-destructive">-{formatCurrency(dashboardData.monthlyExpense)}</div>
                  <p className="text-xs text-muted-foreground">
                    Based on reportable transactions
                  </p>
                </CardContent>
              </Card>
            </Link>
            <Link href="/debts">
              <Card className="hover:bg-muted/50 transition-colors">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Debts</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(dashboardData.activeDebtsAmount)}</div>
                  <p className="text-xs text-muted-foreground">
                    {dashboardData.activePayablesCount} Payable, {dashboardData.activeReceivablesCount} Receivable
                  </p>
                </CardContent>
              </Card>
            </Link>
          </div>
          <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-7">
             <div className="col-span-full grid gap-4 lg:grid-cols-2">
                <MonthlyReportCard />
                <TrendingReportCard />
            </div>
            <Card className="xl:col-span-4">
              <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <CardTitle>Overview</CardTitle>
                 <Select value={overviewTimespan} onValueChange={(v) => setOverviewTimespan(v as '6m' | '12m' | 'ytd')}>
                    <SelectTrigger className="w-full sm:w-[180px]">
                        <SelectValue placeholder="Select timespan" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="6m">Last 6 months</SelectItem>
                        <SelectItem value="12m">Last 12 months</SelectItem>
                        <SelectItem value="ytd">Year-to-date</SelectItem>
                    </SelectContent>
                </Select>
              </CardHeader>
              <CardContent className="pl-2">
                <Overview timespan={overviewTimespan} />
              </CardContent>
            </Card>
            <Card className="lg:col-span-1 xl:col-span-3">
              <CardHeader>
                <CardTitle>Recent Transactions</CardTitle>
                <CardDescription>
                  You have {dashboardData.recentTransactions.length} recent transactions.
                </CardDescription>
              </CardHeader>
              <CardContent>
                 <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Category</TableHead>
                      <TableHead className="hidden sm:table-cell">Wallet</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dashboardData.recentTransactions.map((transaction) => (
                       <TableRow key={transaction.id} onClick={() => handleRowClick(transaction)} className="cursor-pointer">
                         <TableCell>
                           <div className="font-medium">{transaction.category}</div>
                           <div className="hidden text-sm text-muted-foreground md:inline">{transaction.description}</div>
                         </TableCell>
                         <TableCell className="hidden sm:table-cell">{transaction.wallet}</TableCell>
                         <TableCell className={`text-right font-medium ${transaction.type === 'income' ? 'text-accent' : 'text-destructive'}`}>
                            {transaction.type === 'income' ? '+' : ''}{formatTransactionAmount(transaction.amount, transaction.currency)}
                         </TableCell>
                       </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      <NewTransactionDialog 
        isOpen={isAddDialogOpen} 
        onOpenChange={setIsAddDialogOpen}
        onTransactionAdded={fetchData}
      />
      {selectedTransaction && (
        <EditTransactionDialog 
            isOpen={isEditDialogOpen} 
            onOpenChange={setIsEditDialogOpen} 
            transaction={selectedTransaction}
            onTransactionUpdated={fetchData}
        />
      )}
    </>
  );
}
