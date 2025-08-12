
'use client';

import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import { ChartTooltipContent, ChartContainer, ChartConfig } from '@/components/ui/chart';
import { eachDayOfInterval, endOfMonth, format, parseISO, startOfMonth } from 'date-fns';
import { useMemo } from 'react';
import type { Transaction } from '@/lib/data';

interface MonthlyReportChartProps {
    data: Transaction[];
    currency: string;
}

const chartConfig = {
  expense: {
    label: 'Expense',
    color: 'hsl(var(--destructive))',
  },
} satisfies ChartConfig;

export function MonthlyReportChart({ data, currency }: MonthlyReportChartProps) {

  const chartData = useMemo(() => {
    if (data.length === 0) return [];
    
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    
    const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
    
    const dailyData = daysInMonth.map(day => {
        const dayString = format(day, 'yyyy-MM-dd');
        const dailyExpenses = data
            .filter(t => t.type === 'expense' && format(parseISO(t.date), 'yyyy-MM-dd') === dayString)
            .reduce((sum, t) => sum + t.amount, 0);
        
        return {
            date: format(day, 'dd/MM'),
            expense: dailyExpenses > 0 ? dailyExpenses : null,
        };
    });

    return dailyData;

  }, [data]);

  const yDomainMax = Math.max(...chartData.map(d => d.expense || 0)) * 1.2;

  const formatCurrency = (value: number | string) => {
    if (typeof value !== 'number') return value;
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency,
        notation: 'compact',
        compactDisplay: 'short'
    }).format(value);
  }

  return (
    <ChartContainer config={chartConfig} className="w-full h-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={chartData}
          margin={{
            top: 5,
            right: 10,
            left: -20,
            bottom: -10,
          }}
        >
          <XAxis
            dataKey="date"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            fontSize={12}
            tickFormatter={(value, index) => {
                 if (index === 0 || index === chartData.length - 1) return value;
                 return '';
            }}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            fontSize={12}
            tickFormatter={(value) => formatCurrency(value)}
            domain={[0, yDomainMax > 0 ? yDomainMax : 100]}
          />
          <Tooltip
            cursor={{ stroke: 'hsl(var(--foreground))', strokeWidth: 1, strokeDasharray: '3 3' }}
            content={({ active, payload, label }) => (
                 active && payload && payload.length ? (
                <div className="bg-background border rounded-lg p-2 shadow-lg">
                    <p className="text-sm text-muted-foreground">{label}</p>
                    <p className="font-bold text-lg">
                        {payload[0].value ? new Intl.NumberFormat('en-US', { style: 'currency', currency: currency }).format(payload[0].value as number) : 'N/A'}
                    </p>
                </div>
                ) : null
            )}
            
          />
          <defs>
             <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--color-expense)" stopOpacity={0.4}/>
              <stop offset="95%" stopColor="var(--color-expense)" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="expense"
            stroke="var(--color-expense)"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorExpense)"
            connectNulls
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}
