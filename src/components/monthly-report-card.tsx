
'use client';

import Link from 'next/link';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { MonthlyReportChart } from './monthly-report-chart';
import { useState, useEffect, useMemo, useCallback } from 'react';
import type { Transaction } from '@/lib/data';
import { isThisMonth, parseISO } from 'date-fns';
import { getDefaultCurrency } from '@/services/settings-service';
import { getAllTransactions } from '@/services/transaction-service';
import { useAuth } from './auth-provider';
import { Skeleton } from './ui/skeleton';

export function MonthlyReportCard() {
    const { user } = useAuth();
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [defaultCurrency, setDefaultCurrency] = useState('USD');
    const [isLoading, setIsLoading] = useState(true);

    const fetchData = useCallback(async () => {
        if (!user) return;
        setIsLoading(true);
        try {
            const [trans, currency] = await Promise.all([
                getAllTransactions(user.uid),
                getDefaultCurrency(user.uid),
            ]);
            setTransactions(trans);
            setDefaultCurrency(currency);
        } catch (error) {
            console.error("Error fetching monthly report data:", error);
        } finally {
            setIsLoading(false);
        }
    }, [user]);

    useEffect(() => {
        if(user) {
            fetchData();
        }
    }, [user, fetchData]);

    useEffect(() => {
        const handleDataChange = () => fetchData();
        window.addEventListener('transactionsUpdated', handleDataChange);
        window.addEventListener('storage', handleDataChange);
        return () => {
            window.removeEventListener('transactionsUpdated', handleDataChange);
            window.removeEventListener('storage', handleDataChange);
        };
    }, [fetchData]);

    const monthlyData = useMemo(() => {
        const reportableTransactions = transactions.filter(t => !t.excludeFromReport);
        const thisMonthTransactions = reportableTransactions.filter(t => isThisMonth(parseISO(t.date)));

        const totalSpent = thisMonthTransactions
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + t.amount, 0);

        const totalIncome = thisMonthTransactions
            .filter(t => t.type === 'income')
            .reduce((sum, t) => sum + t.amount, 0);

        return { totalSpent, totalIncome, transactions: thisMonthTransactions };
    }, [transactions]);
    
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: defaultCurrency }).format(amount);
    }

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <Skeleton className="h-6 w-3/4" />
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                        <Skeleton className="h-12 w-full" />
                        <Skeleton className="h-12 w-full" />
                    </div>
                    <Separator className="my-4" />
                    <Skeleton className="h-48 w-full" />
                </CardContent>
            </Card>
        );
    }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium">Report this month</CardTitle>
          <Link href="/reports" className="text-sm font-medium text-primary hover:underline">
            See reports
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 text-center">
          <div>
            <p className="text-sm text-muted-foreground">Total spent</p>
            <p className="text-2xl font-bold text-destructive">
                {formatCurrency(monthlyData.totalSpent)}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Total income</p>
            <p className="text-2xl font-bold text-accent">
              {formatCurrency(monthlyData.totalIncome)}
            </p>
          </div>
        </div>
        <Separator className="my-4" />
        <div className="h-48">
            <MonthlyReportChart data={monthlyData.transactions} />
        </div>
      </CardContent>
    </Card>
  );
}
