
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from '@/components/ui/carousel';
import { startOfMonth, isWithinInterval, parseISO } from 'date-fns';
import { TrendingUp, TrendingDown, Wallet, HelpCircle } from 'lucide-react';
import { getDefaultCurrency } from '@/services/settings-service';
import { useAuth } from './auth-provider';
import { getAllTransactions } from '@/services/transaction-service';
import type { Transaction } from '@/lib/data';
import { Skeleton } from './ui/skeleton';

export function TrendingReportCard() {
  const { user } = useAuth();
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const [defaultCurrency, setDefaultCurrency] = useState('USD');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(() => {
    if (!user) return;
    setIsLoading(true);
    try {
        const trans = getAllTransactions(user.uid);
        const currency = getDefaultCurrency(user.uid);
        setTransactions(trans);
        setDefaultCurrency(currency);
    } catch (error) {
        console.error("Error fetching trending report data:", error);
    } finally {
        setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if(user) {
        fetchData();
    }
     const handleDataChange = () => {
        if(user) fetchData();
    };
    window.addEventListener('transactionsUpdated', handleDataChange);
    return () => window.removeEventListener('transactionsUpdated', handleDataChange);
  }, [user, fetchData]);

  useEffect(() => {
    if (!api) {
      return;
    }
    setCurrent(api.selectedScrollSnap());
    api.on('select', () => {
      setCurrent(api.selectedScrollSnap());
    });
  }, [api]);

  const monthlyTransactions = useMemo(() => {
    const now = new Date();
    const start = startOfMonth(now);
    const reportableTransactions = transactions.filter(t => !t.excludeFromReport);
    return reportableTransactions.filter(t => isWithinInterval(parseISO(t.date), { start, end: now }));
  }, [transactions]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: defaultCurrency,
    }).format(amount);
  };
  
  const trendingData = useMemo(() => {
    if (monthlyTransactions.length === 0) {
      return [
        { title: "No data available for this month.", value: "", icon: <HelpCircle className="h-8 w-8 text-muted-foreground" /> }
      ];
    }
    
    // 1. Highest Spending Category
    const expenseByCategory = monthlyTransactions
      .filter(t => t.type === 'expense')
      .reduce((acc, t) => {
        acc[t.category] = (acc[t.category] || 0) + t.amount;
        return acc;
      }, {} as Record<string, number>);
      
    const topCategory = Object.keys(expenseByCategory).length > 0 
        ? Object.entries(expenseByCategory).sort((a, b) => b[1] - a[1])[0]
        : null;
    
    // 2. Largest Transaction
    const largestTransaction = monthlyTransactions
        .filter(t => t.type === 'expense')
        .sort((a,b) => b.amount - a.amount)[0];

    // 3. Most Used Wallet
    const walletUsage = monthlyTransactions.reduce((acc, t) => {
        acc[t.wallet] = (acc[t.wallet] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const topWallet = Object.keys(walletUsage).length > 0
        ? Object.entries(walletUsage).sort((a,b) => b[1] - a[1])[0]
        : null;

    let trends = [];
    if (topCategory) {
        trends.push({ 
            title: "Top Spending Category", 
            value: `${topCategory[0]}: ${formatCurrency(topCategory[1])}`,
            icon: <TrendingDown className="h-8 w-8 text-destructive" />
        });
    }
    if(largestTransaction) {
         trends.push({
            title: "Largest Transaction",
            value: `${largestTransaction.category}: ${formatCurrency(largestTransaction.amount)}`,
            icon: <TrendingUp className="h-8 w-8 text-accent" />
        });
    }
    if (topWallet) {
        trends.push({
            title: "Most Used Wallet",
            value: `${topWallet[0]} (${topWallet[1]} times)`,
            icon: <Wallet className="h-8 w-8 text-primary" />
        });
    }

    return trends.length > 0 ? trends : [
        { title: "No trends available for this month.", value: "", icon: <HelpCircle className="h-8 w-8 text-muted-foreground" /> }
    ];

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthlyTransactions, defaultCurrency]);

  if (isLoading) {
      return (
        <Card className="flex items-center justify-center p-4">
            <Skeleton className="h-40 w-full" />
        </Card>
      )
  }


  return (
    <Card className="flex items-center justify-center">
      <CardContent className="p-4 w-full">
        <Carousel setApi={setApi} className="w-full">
          <CarouselContent>
            {trendingData.map((item, index) => (
              <CarouselItem key={index}>
                <div className="p-1">
                    <div className="flex flex-col items-center justify-center gap-2 h-32">
                        {item.icon}
                       <p className="text-sm font-semibold text-center">{item.title}</p>
                       <p className="text-lg font-bold text-center text-muted-foreground">{item.value}</p>
                    </div>
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          {trendingData.length > 1 && (
            <div className="flex items-center justify-center gap-8 mt-2">
                <CarouselPrevious className="static translate-y-0" />
                <div className="flex items-center gap-2">
                  {trendingData.map((_, i) => (
                     <div key={i} className={`w-2 h-2 rounded-full ${i === current ? 'bg-primary' : 'bg-muted'}`} />
                  ))}
                </div>
                <CarouselNext className="static translate-y-0" />
            </div>
          )}
        </Carousel>
      </CardContent>
    </Card>
  );
}
