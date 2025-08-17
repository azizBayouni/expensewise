
'use client';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useEffect, useState, useMemo, useCallback } from 'react';
import { getDefaultCurrency } from '@/services/settings-service';
import type { DateRange } from 'react-day-picker';
import { 
  parseISO, isWithinInterval, endOfDay, startOfDay, 
  startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, 
  subMonths, subYears,
  format,
  isSameDay,
  isSameWeek,
  isSameMonth,
  isSameYear,
  addDays,
  addWeeks,
  addMonths,
  addYears,
  subDays
} from 'date-fns';
import { ArrowRight, CalendarIcon, HelpCircle, Globe, ChevronLeft, ChevronRight, BarChartHorizontalBig } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MultiSelect, type MultiSelectOption } from '@/components/ui/multi-select';
import { Progress } from '@/components/ui/progress';
import { CategoryExpenseList } from '@/components/category-expense-list';
import { TimeRangePicker } from '@/components/time-range-picker';
import { useSearchParams, useRouter } from 'next/navigation';
import { CategoryDonutChart } from '@/components/category-donut-chart';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { useAuth } from './auth-provider';
import { getAllTransactions } from '@/services/transaction-service';
import { getAllCategories } from '@/services/category-service';
import { getAllWallets } from '@/services/wallet-service';
import type { Transaction, Category, Wallet } from '@/lib/data';

export function ReportsPageContent() {
  const { user } = useAuth();
  const [defaultCurrency, setDefaultCurrency] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const searchParams = useSearchParams();
  const router = useRouter();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [allWallets, setAllWallets] = useState<Wallet[]>([]);
  
  // State for filters
  const [selectedWallets, setSelectedWallets] = useState<string[]>([]);
  const [timeRange, setTimeRange] = useState('month');
  const [customDateRange, setCustomDateRange] = useState<DateRange | undefined>(undefined);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [dateOffset, setDateOffset] = useState(0);

  const fetchData = useCallback(() => {
    if (!user) return;
    setIsLoading(true);
    try {
        const trans = getAllTransactions(user.uid);
        const cats = getAllCategories(user.uid);
        const wals = getAllWallets(user.uid);
        const currency = getDefaultCurrency(user.uid);
        setTransactions(trans);
        setCategories(cats);
        setAllWallets(wals);
        setDefaultCurrency(currency);
    } catch (error) {
        console.error("Error fetching reports data:", error);
    } finally {
        setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    // Initialize state from URL params
    const walletsParam = searchParams.get('wallets');
    if (walletsParam) {
        setSelectedWallets(walletsParam.split(','));
    }
    
    const timeRangeParam = searchParams.get('timeRange');
    if (timeRangeParam) {
        setTimeRange(timeRangeParam);
    }
    
    const offsetParam = searchParams.get('offset');
    if (offsetParam) {
        setDateOffset(parseInt(offsetParam, 10));
    }

    const fromParam = searchParams.get('from');
    const toParam = searchParams.get('to');
    if(fromParam && toParam) {
        try {
            const fromDate = parseISO(fromParam);
            const toDate = parseISO(toParam);
            if (!isNaN(fromDate.getTime()) && !isNaN(toDate.getTime())) {
                setCustomDateRange({ from: fromDate, to: toDate });
                 setTimeRange('custom');
            }
        } catch (e) {
            console.error("Invalid date in search params", e);
        }
    }

  }, [searchParams]);

  useEffect(() => {
    if (user) {
        fetchData();
    }
  }, [user, fetchData]);
  
  useEffect(() => {
    if (isLoading) return; // Don't update URL while loading initial data
    const params = new URLSearchParams(searchParams);
    
    if (selectedWallets.length > 0) {
        params.set('wallets', selectedWallets.join(','));
    } else {
        params.delete('wallets');
    }

    params.set('timeRange', timeRange);

    if (dateOffset !== 0) {
        params.set('offset', dateOffset.toString());
    } else {
        params.delete('offset');
    }

    if (timeRange === 'custom' && customDateRange?.from) {
         params.set('from', customDateRange.from.toISOString());
         if (customDateRange.to) {
            params.set('to', customDateRange.to.toISOString());
         } else {
            params.delete('to');
         }
    } else {
        params.delete('from');
        params.delete('to');
    }
    
    router.replace(`/reports?${params.toString()}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedWallets, timeRange, customDateRange, dateOffset, isLoading]);

  const dateRange = useMemo(() => {
    const now = new Date();
    let baseDate: Date;

    switch (timeRange) {
      case 'day':
        baseDate = addDays(now, dateOffset);
        return { from: startOfDay(baseDate), to: endOfDay(baseDate) };
      case 'week':
        baseDate = addWeeks(now, dateOffset);
        return { from: startOfWeek(baseDate), to: endOfWeek(baseDate) };
      case 'last-month':
        const lastMonth = subMonths(now, 1);
        return { from: startOfMonth(lastMonth), to: endOfMonth(lastMonth) };
      case 'year':
        baseDate = addYears(now, dateOffset);
        return { from: startOfYear(baseDate), to: endOfYear(baseDate) };
      case 'all':
        return { from: undefined, to: undefined };
      case 'custom':
        return customDateRange ? {
            from: customDateRange.from ? startOfDay(customDateRange.from) : undefined,
            to: customDateRange.to ? endOfDay(customDateRange.to) : undefined
        } : {from: undefined, to: undefined};
      case 'month':
      default:
         baseDate = addMonths(now, dateOffset);
        return { from: startOfMonth(baseDate), to: endOfMonth(baseDate) };
    }
  }, [timeRange, customDateRange, dateOffset]);
  
  const reportableTransactions = useMemo(() => {
    return transactions.filter(t => {
      if (t.excludeFromReport) return false;

      const walletFilterMatch = selectedWallets.length === 0 || selectedWallets.includes(t.wallet);
      
      const dateFilterMatch = !dateRange || !dateRange.from || (isWithinInterval(
        parseISO(t.date),
        { start: dateRange.from, end: dateRange.to ? endOfDay(dateRange.to) : new Date() }
      ));
      
      return walletFilterMatch && dateFilterMatch;
    });
  }, [selectedWallets, dateRange, transactions]);

  const summary = useMemo(() => {
    const totalIncome = reportableTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalExpense = reportableTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    const netIncome = totalIncome - totalExpense;
    
    const allTransactionsBeforeRange = transactions.filter(t => 
        dateRange?.from && parseISO(t.date) < startOfDay(dateRange.from)
    );
    const openingBalance = allTransactionsBeforeRange.reduce((bal, t) => bal + (t.type === 'income' ? t.amount : -t.amount), 0);
    const endingBalance = openingBalance + netIncome;


    return { totalIncome, totalExpense, netIncome, openingBalance, endingBalance };
  }, [reportableTransactions, dateRange, transactions]);


  const formatCurrency = (amount: number) => {
    if (!defaultCurrency) return '...';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: defaultCurrency,
      signDisplay: 'never',
    }).format(Math.abs(amount));
  };
  
  const getSign = (amount: number) => (amount < 0 ? '-' : '');

  const walletOptions: MultiSelectOption[] = allWallets.map((w) => ({
    value: w.name,
    label: w.name,
  }));
  
  const expenseByCategory = useMemo(() => {
    const expenses = reportableTransactions.filter(t => t.type === 'expense');
    
    const categoryMap = new Map(categories.map(c => [c.name, c]));

    const getTopLevelParent = (categoryName: string) => {
      let current = categoryMap.get(categoryName);
      if (!current) return null;

      while (current.parentId) {
        const parent = categories.find(c => c.id === current!.parentId);
        if (!parent) break;
        current = parent;
      }
      return current;
    };
    
    const byCategory = expenses.reduce((acc, curr) => {
      const topLevelParent = getTopLevelParent(curr.category);
        
        if (topLevelParent) {
            if (!acc[topLevelParent.name]) {
              acc[topLevelParent.name] = { value: 0, icon: topLevelParent.icon || '💸' };
            }
            acc[topLevelParent.name].value += curr.amount;
        }
        return acc;
    }, {} as Record<string, { value: number, icon: string }>);

    return Object.entries(byCategory).map(([name, data]) => ({
      name,
      value: data.value,
      icon: data.icon,
    }));
  }, [reportableTransactions, categories]);
  
  const handleTimeRangeChange = (value: string) => {
    setTimeRange(value);
    setDateOffset(0); 
  };
  
  const handleCustomDateChange = (newDateRange?: DateRange) => {
     setCustomDateRange(newDateRange);
     setTimeRange('custom');
     setDateOffset(0);
  }

  const getDateRangeLabel = () => {
    if (!dateRange || !dateRange.from) return 'All Time';

    const now = new Date();
    const from = dateRange.from;
    const to = dateRange.to || from;

    if (timeRange === 'day') {
        if (isSameDay(now, from)) return 'Today';
        if (isSameDay(subDays(now, 1), from)) return 'Yesterday';
    }
    if (timeRange === 'week') {
        if (isSameWeek(now, from, { weekStartsOn: 1 })) return 'This Week';
        if (isSameWeek(subDays(now, 7), from, { weekStartsOn: 1 })) return 'Last Week';
    }
    if (timeRange === 'month') {
        if (isSameMonth(now, from)) return 'This Month';
        if (isSameMonth(subMonths(now, 1), from)) return 'Last Month';
    }
    if (timeRange === 'year') {
        if (isSameYear(now, from)) return 'This Year';
        if (isSameYear(subYears(now, 1), from)) return 'Last Year';
    }
    
    if (!isSameDay(from, to)) {
        return `${format(from, 'dd MMM yy')} - ${format(to, 'dd MMM yy')}`;
    }
    return format(from, 'dd MMM yyyy');
  };
  
  const canNavigate = useMemo(() => {
    return !['all', 'custom'].includes(timeRange);
  }, [timeRange]);

  const handleDateNavigation = (direction: 'next' | 'prev') => {
    const offset = direction === 'next' ? 1 : -1;
    setDateOffset(d => d + offset);
  }


  if (isLoading) {
    return (
        <div className="flex-1 space-y-4 p-4 md:p-6">
            <Skeleton className="h-10 w-48" />
            <Skeleton className="h-8 w-full" />
            <Card>
                <CardHeader>
                    <Skeleton className="h-6 w-32" />
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-10 w-40 mb-2" />
                    <Skeleton className="h-4 w-full" />
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <Skeleton className="h-6 w-40" />
                </CardHeader>
                 <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                        <Skeleton className="h-20 w-full" />
                        <Skeleton className="h-20 w-full" />
                    </div>
                 </CardContent>
            </Card>
        </div>
    )
  }

  return (
    <>
    <div className="flex-1 space-y-4 p-4 md:p-6">
       <header className="space-y-1">
          <div className="flex items-center justify-between">
            <h2 className="text-sm text-muted-foreground">Balance</h2>
            <Button variant="ghost" size="icon" onClick={() => setIsPickerOpen(true)}>
                <CalendarIcon className="h-5 w-5" />
            </Button>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-2xl font-semibold">
                {getSign(summary.endingBalance)}{formatCurrency(summary.endingBalance)}
            </p>
          </div>
           <MultiSelect
                options={walletOptions}
                selected={selectedWallets}
                onChange={setSelectedWallets}
                className="w-full sm:w-auto"
                placeholder="Total"
            />
       </header>

      <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
        <Button variant="ghost" size="icon" onClick={() => handleDateNavigation('prev')} disabled={!canNavigate}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div className="text-center font-semibold text-foreground">
          {getDateRangeLabel()}
        </div>
        <Button variant="ghost" size="icon" onClick={() => handleDateNavigation('next')} disabled={!canNavigate || dateOffset >= 0}>
            <ChevronRight className="h-5 w-5" />
        </Button>
      </div>
      
      <div className="space-y-4">
        <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Opening balance</span>
            <span>{getSign(summary.openingBalance)}{formatCurrency(summary.openingBalance)}</span>
        </div>
         <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Ending balance</span>
            <span>{getSign(summary.endingBalance)}{formatCurrency(summary.endingBalance)}</span>
        </div>
      </div>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-1">Net Income</CardTitle>
        </CardHeader>
        <CardContent>
            <p className="text-2xl font-bold">{getSign(summary.netIncome)}{formatCurrency(summary.netIncome)}</p>
            <div className="flex justify-between text-sm text-muted-foreground mt-2">
                <span>Income</span>
                <span className="text-accent">{formatCurrency(summary.totalIncome)}</span>
            </div>
             <div className="flex justify-between text-sm text-muted-foreground mt-1">
                <span>Expense</span>
                <span className="text-destructive">{formatCurrency(summary.totalExpense)}</span>
            </div>
            <Progress value={summary.totalIncome + summary.totalExpense > 0 ? (summary.totalIncome / (summary.totalIncome + summary.totalExpense)) * 100 : 0} className="mt-2 h-2" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
            <CardTitle className="text-sm font-medium">Category Report</CardTitle>
        </CardHeader>
        <CardContent>
            <Tabs defaultValue="breakdown" className="space-y-4">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="breakdown">Breakdown</TabsTrigger>
                    <TabsTrigger value="chart">Chart</TabsTrigger>
                </TabsList>
                <TabsContent value="breakdown" className="space-y-4">
                     <Link href={`/reports/all-expense?${searchParams.toString()}`}>
                        <Card className="p-4 hover:bg-muted/50">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-sm text-muted-foreground">Total Expense</p>
                                    <p className="font-semibold text-destructive">{formatCurrency(summary.totalExpense)}</p>
                                </div>
                                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                            </div>
                        </Card>
                    </Link>
                    {expenseByCategory.length > 0 && (
                        <div>
                            <CategoryExpenseList data={expenseByCategory} currency={defaultCurrency}/>
                        </div>
                    )}
                </TabsContent>
                <TabsContent value="chart">
                     <div className="w-full h-80 flex items-center justify-center">
                        {expenseByCategory.length > 0 ? (
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center w-full">
                                <CategoryDonutChart data={expenseByCategory} currency={defaultCurrency}/>
                                <CategoryExpenseList data={expenseByCategory} currency={defaultCurrency}/>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center text-center p-8 text-muted-foreground">
                                <BarChartHorizontalBig className="h-10 w-10 mb-2" />
                                <p>No expense data for this period.</p>
                            </div>
                        )}
                    </div>
                </TabsContent>
            </Tabs>
        </CardContent>
      </Card>
    </div>
    <TimeRangePicker 
      isOpen={isPickerOpen} 
      onOpenChange={setIsPickerOpen}
      value={timeRange}
      onChange={handleTimeRangeChange}
      onCustomDateChange={handleCustomDateChange}
    />
    </>
  );
}
