
'use client';

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { ChartTooltipContent, ChartContainer, ChartConfig } from '@/components/ui/chart';
import { useMemo, useState, useEffect, useCallback } from 'react';
import type { Transaction } from '@/lib/data';
import { subMonths, format, startOfMonth, endOfMonth, parseISO, isWithinInterval, startOfYear, eachMonthOfInterval, endOfYear } from 'date-fns';
import { getDefaultCurrency } from '@/services/settings-service';
import { useRouter } from 'next/navigation';
import { getAllTransactions } from '@/services/transaction-service';
import { Skeleton } from './ui/skeleton';
import { useAuth } from './auth-provider';

const chartConfig = {
  income: {
    label: 'Income',
    color: 'hsl(var(--accent))',
  },
  expense: {
    label: 'Expense',
    color: 'hsl(var(--destructive))',
  },
} satisfies ChartConfig;

type OverviewProps = {
    timespan: '6m' | '12m' | 'ytd';
}

export function Overview({ timespan }: OverviewProps) {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [defaultCurrency, setDefaultCurrency] = useState('USD');
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

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
        console.error("Error fetching overview data:", error);
    } finally {
        setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
        fetchData();
    }
    const handleDataChange = () => {
        if(user) fetchData();
    };
    window.addEventListener('transactionsUpdated', handleDataChange);
    window.addEventListener('storage', handleDataChange);

    return () => {
        window.removeEventListener('transactionsUpdated', handleDataChange);
        window.removeEventListener('storage', handleDataChange);
    };
  }, [user, fetchData]);


  const data = useMemo(() => {
    const reportableTransactions = transactions.filter(t => !t.excludeFromReport);
    const monthlyData: { name: string; income: number; expense: number; monthStart: string; monthEnd: string; }[] = [];
    const now = new Date();

    let startDate: Date;
    if (timespan === 'ytd') {
        startDate = startOfYear(now);
    } else {
        const monthsToSubtract = timespan === '6m' ? 5 : 11;
        startDate = subMonths(startOfMonth(now), monthsToSubtract);
    }
    
    const months = eachMonthOfInterval({
        start: startDate,
        end: now
    });


    for (const month of months) {
      const monthStart = startOfMonth(month);
      const monthEnd = endOfMonth(month);
      const monthName = format(month, 'MMM');

      const income = reportableTransactions
        .filter(t => t.type === 'income' && isWithinInterval(parseISO(t.date), { start: monthStart, end: monthEnd }))
        .reduce((sum, t) => sum + t.amount, 0);

      const expense = reportableTransactions
        .filter(t => t.type === 'expense' && isWithinInterval(parseISO(t.date), { start: monthStart, end: monthEnd }))
        .reduce((sum, t) => sum + t.amount, 0);
        
      monthlyData.push({ 
          name: monthName, 
          income, 
          expense,
          monthStart: format(monthStart, 'yyyy-MM-dd'),
          monthEnd: format(monthEnd, 'yyyy-MM-dd')
      });
    }

    return monthlyData;
  }, [transactions, timespan]);
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: defaultCurrency,
      notation: 'compact',
      compactDisplay: 'short',
    }).format(value);
  }

  const handleBarClick = (payload: any) => {
    if (payload && payload.activePayload && payload.activePayload.length > 0) {
      const { monthStart, monthEnd } = payload.activePayload[0].payload;
      router.push(`/reports?from=${monthStart}&to=${monthEnd}`);
    }
  };

  if (isLoading) {
    return <Skeleton className="w-full h-[350px]" />;
  }

  return (
    <ChartContainer config={chartConfig} className="min-h-[200px] w-full">
      <ResponsiveContainer width="100%" height={350}>
        <BarChart data={data} onClick={handleBarClick}>
          <XAxis
            dataKey="name"
            stroke="hsl(var(--muted-foreground))"
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            stroke="hsl(var(--muted-foreground))"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => formatCurrency(value as number)}
          />
          <Tooltip
              cursor={{fill: 'hsl(var(--muted))'}}
              content={<ChartTooltipContent indicator="dot" formatter={(value, name) => {
                 const formattedValue = new Intl.NumberFormat('en-US', { style: 'currency', currency: defaultCurrency }).format(value as number);
                 const itemConfig = chartConfig[name.toLowerCase() as keyof typeof chartConfig];
                 if (!itemConfig) return null;
                 return (
                     <div className="flex items-center gap-2">
                         <div className="w-2.5 h-2.5 rounded-full" style={{backgroundColor: itemConfig.color}}/>
                         <div className="flex flex-col">
                            <span className="text-xs text-muted-foreground">{itemConfig.label}</span>
                            <span className="font-bold">{formattedValue}</span>
                         </div>
                     </div>
                 )
              }}/>}
          />
          <Legend content={({ payload }) => {
              return (
                  <div className="flex justify-center gap-4 mt-4">
                      {payload?.map((entry) => {
                           const itemConfig = chartConfig[entry.value?.toLowerCase() as keyof typeof chartConfig];
                           if (!itemConfig) return null;
                           return (
                               <div key={entry.value} className="flex items-center gap-2 text-sm">
                                   <div className="w-2.5 h-2.5 rounded-full" style={{backgroundColor: entry.color}}/>
                                   <span>{itemConfig.label}</span>
                               </div>
                           )
                      })}
                  </div>
              )
          }}/>
          <Bar dataKey="income" fill="hsl(var(--accent))" name="Income" radius={[4, 4, 0, 0]} className="cursor-pointer" />
          <Bar dataKey="expense" fill="hsl(var(--destructive))" name="Expense" radius={[4, 4, 0, 0]} className="cursor-pointer" />
        </BarChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}
