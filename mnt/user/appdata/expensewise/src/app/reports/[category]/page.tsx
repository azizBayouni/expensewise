
'use client';

import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useMemo, useState, useEffect, useCallback } from 'react';
import { getDefaultCurrency } from '@/services/settings-service';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  isWithinInterval,
  parseISO,
  differenceInDays,
  startOfDay,
  endOfDay,
  format,
} from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CategoryDonutChart } from '@/components/category-donut-chart';
import { CategoryExpenseList } from '@/components/category-expense-list';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { EditTransactionDialog } from '@/components/edit-transaction-dialog';
import { useAuth } from '@/components/auth-provider';
import { getAllTransactions } from '@/services/transaction-service';
import { getAllCategories } from '@/services/category-service';
import type { Transaction, Category } from '@/lib/data';

export default function CategoryReportDetails() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const [defaultCurrency, setDefaultCurrency] = useState('');
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [activeTab, setActiveTab] = useState('breakdown');
  const [selectedSubCategory, setSelectedSubCategory] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
        const [trans, cats, currency] = await Promise.all([
            getAllTransactions(user.uid),
            getAllCategories(user.uid),
            getDefaultCurrency(user.uid),
        ]);
        setTransactions(trans);
        setCategories(cats);
        setDefaultCurrency(currency);
    } catch (error) {
        console.error("Error fetching category report data:", error);
    } finally {
        setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
        fetchData();
    }
  }, [user, fetchData]);

  const { category: categoryName } = params;

  const dateRange = useMemo(() => {
    try {
      const from = searchParams.get('from');
      const to = searchParams.get('to');
      if (from && to) {
        return { from: parseISO(from), to: parseISO(to) };
      }
    } catch (e) {
      console.error('Invalid date params');
    }
    return { from: null, to: null };
  }, [searchParams]);

  const getCategoryDepth = (categoryId: string): number => {
    let depth = 0;
    let current = categories.find(c => c.id === categoryId);
    while (current?.parentId) {
        depth++;
        current = categories.find(c => c.id === current!.parentId);
        if (depth > 10) break; // Safety break for circular dependencies
    }
    return depth;
  };

  const { filteredTransactions, categoryHierarchy } = useMemo(() => {
    const decodedCategoryName = decodeURIComponent(categoryName as string);
    const topLevelCategory = categories.find(
      (c) => c.name === decodedCategoryName
    );

    if (!topLevelCategory)
      return { filteredTransactions: [], categoryHierarchy: [] };

    const hierarchy = [topLevelCategory.id];
    const getChildren = (parentId: string) => {
      categories
        .filter((c) => c.parentId === parentId)
        .forEach((child) => {
          hierarchy.push(child.id);
          getChildren(child.id);
        });
    };
    getChildren(topLevelCategory.id);
    
    const hierarchyNames = categories.filter(c => hierarchy.includes(c.id)).map(c => c.name);

    const filtered = transactions.filter((t) => {
      const dateFilterMatch =
        !dateRange.from ||
        !dateRange.to ||
        isWithinInterval(parseISO(t.date), {
          start: startOfDay(dateRange.from),
          end: endOfDay(dateRange.to),
        });
      if (!dateFilterMatch) return false;
      if (t.type !== 'expense') return false;

      if (decodedCategoryName === 'all-expense') return true;

      return hierarchyNames.includes(t.category);
    });

    return { filteredTransactions: filtered, categoryHierarchy: hierarchy };
  }, [categoryName, dateRange, transactions, categories]);

  const totalExpense = useMemo(() => {
    return filteredTransactions.reduce((sum, t) => sum + t.amount, 0);
  }, [filteredTransactions]);

  const dailyAverage = useMemo(() => {
    if (!dateRange.from || !dateRange.to || totalExpense === 0) return 0;
    const days = differenceInDays(dateRange.to, dateRange.from) + 1;
    return totalExpense / days;
  }, [dateRange, totalExpense]);

  const expensesBySubCategory = useMemo(() => {
    const breakdown: Record<string, { value: number; icon?: string }> = {};
     const directSubCategories = categories.filter(c => categoryHierarchy.includes(c.id) && c.id !== categoryHierarchy[0] && getCategoryDepth(c.id) === 1);

     directSubCategories.forEach(cat => {
        breakdown[cat.name] = { value: 0, icon: cat.icon };
    });

    filteredTransactions.forEach((t) => {
      const transactionCategory = categories.find(c => c.name === t.category);
      if (!transactionCategory) return;
      
      let parentCategory = transactionCategory;
      while(parentCategory.parentId && getCategoryDepth(parentCategory.id) > 1) {
          const parent = categories.find(c => c.id === parentCategory.parentId);
          if (!parent) break;
          parentCategory = parent;
      }
      
      if (breakdown[parentCategory.name] !== undefined) {
         breakdown[parentCategory.name].value += t.amount;
      }
    });

    return Object.entries(breakdown)
      .map(([name, data]) => ({ name, ...data }))
      .filter((item) => item.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [filteredTransactions, categoryHierarchy, categories]);
  
  const displayedTransactions = useMemo(() => {
    if (!selectedSubCategory) {
      return filteredTransactions;
    }
    return filteredTransactions.filter(t => {
      let current = categories.find(c => c.name === t.category);
      while(current) {
        if (current.name === selectedSubCategory) return true;
        if (!current.parentId) return false;
        current = categories.find(c => c.id === current?.parentId);
      }
      return false;
    });
  }, [filteredTransactions, selectedSubCategory, categories]);
  
  const formatCurrency = (value: number) => {
    if (!defaultCurrency) return '...';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: defaultCurrency,
    }).format(value);
  };
  
  const handleRowClick = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setIsEditDialogOpen(true);
  };

  const handleSubCategoryClick = (categoryName: string) => {
    setSelectedSubCategory(categoryName);
    setActiveTab('transactions');
  };

  if (isLoading) {
    return (
      <div className="flex-1 space-y-4 p-4 md:p-6">
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-6 w-40" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
        <Skeleton className="h-10 w-full" />
        <div className="space-y-2">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </div>
      </div>
    );
  }

  const decodedCategoryName = decodeURIComponent(categoryName as string);

  return (
    <>
      <div className="flex-1 space-y-4 p-4 md:p-6">
        <header className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h2 className="text-lg font-semibold">{decodedCategoryName}</h2>
        </header>

        <div className="grid grid-cols-2 gap-4">
          <Card className="p-4">
            <p className="text-sm text-muted-foreground">Total</p>
            <p className="text-xl font-bold text-destructive">
              {formatCurrency(totalExpense)}
            </p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-muted-foreground">Daily average</p>
            <p className="text-xl font-bold text-destructive">
              {formatCurrency(dailyAverage)}
            </p>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="breakdown">Breakdown</TabsTrigger>
            <TabsTrigger value="transactions">Transactions</TabsTrigger>
          </TabsList>
          <TabsContent value="breakdown">
            <Card>
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                  <CategoryDonutChart data={expensesBySubCategory} />
                  <CategoryExpenseList data={expensesBySubCategory} onCategoryClick={handleSubCategoryClick}/>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="transactions">
            <Card>
              <CardContent className="pt-6">
                {selectedSubCategory && (
                  <div className="mb-4">
                    <Button variant="secondary" onClick={() => setSelectedSubCategory(null)}>
                      Back to All Transactions
                    </Button>
                  </div>
                )}
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Wallet</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {displayedTransactions.map((transaction) => (
                        <TableRow
                          key={transaction.id}
                          onClick={() => handleRowClick(transaction)}
                          className="cursor-pointer"
                        >
                          <TableCell>
                            {format(parseISO(transaction.date), 'dd MMM yyyy')}
                          </TableCell>
                          <TableCell className="font-medium">
                            {transaction.description}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{transaction.category}</Badge>
                          </TableCell>
                          <TableCell>{transaction.wallet}</TableCell>
                          <TableCell className="text-right font-medium text-destructive">
                            {formatCurrency(transaction.amount)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      <EditTransactionDialog
        isOpen={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        transaction={selectedTransaction}
        onTransactionUpdated={fetchData}
      />
    </>
  );
}

    