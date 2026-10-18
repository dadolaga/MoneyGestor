'use client';

import { useFormatter, useTranslations } from 'next-intl';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';

import { ChartContainer } from '@/components/shared/chart-container';
import { Card } from '@/components/ui/card';

import type { TransactionPeriodProps } from './transaction-analytics';
import { transactionKind } from './transaction-kind';
import { categoryColors } from './TransactionDisplay';
import { useTransactionFormatting } from './useTransactionFormatting';

export function TransactionCategoriesCard({ rows, loading, failed }: TransactionPeriodProps) {
    const t = useTranslations('Movements');
    const format = useFormatter();
    const { money } = useTransactionFormatting();
    const expenses = rows.filter((row) => transactionKind(row) === 'Expense');
    const categories = new Map<number, { id: number; name: string; value: number; color: string }>();
    for (const row of expenses) {
        const category = categories.get(row.type.id) ?? {
            id: row.type.id,
            name: row.type.name,
            value: 0,
            color: categoryColors[row.type.id % categoryColors.length],
        };
        category.value += Math.abs(row.value);
        categories.set(row.type.id, category);
    }
    const distribution = [...categories.values()].sort((a, b) => b.value - a.value);
    const expenseTotal = expenses.reduce((total, row) => total + Math.abs(row.value), 0);
    const emptyLabel = loading ? t('states.loading') : failed ? t('states.error') : t('charts.empty');
    const canShow = !loading && !failed;

    return (
        <Card className="rounded-lg p-3.5 shadow-none" aria-busy={loading}>
            <h2 className="m-0 mb-3 text-base font-semibold">{t('charts.categories')}</h2>
            {canShow && distribution.length > 0 ? (
                <div className="flex items-center gap-4">
                    <ChartContainer
                        description={t('charts.categoriesDescription', { total: money(expenseTotal) })}
                        className="relative h-[180px] w-[45%] shrink-0"
                    >
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={distribution}
                                    dataKey="value"
                                    nameKey="name"
                                    innerRadius="66%"
                                    outerRadius="100%"
                                    paddingAngle={0}
                                    stroke="none"
                                    startAngle={90}
                                    endAngle={-270}
                                    isAnimationActive={false}
                                >
                                    {distribution.map((category) => (
                                        <Cell key={category.id} fill={category.color} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    formatter={(value: number) => money(value)}
                                    contentStyle={{
                                        background: 'var(--popover)',
                                        borderColor: 'var(--border)',
                                        borderRadius: 8,
                                        color: 'var(--foreground)',
                                    }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-1">
                            <strong className="text-base tabular-nums">{money(expenseTotal)}</strong>
                            <span className="text-xs text-muted-foreground">{t('filters.expense')}</span>
                        </div>
                    </ChartContainer>
                    <ul className="m-0 grid min-w-0 flex-1 list-none gap-1.5 p-0">
                        {distribution.map((category) => (
                            <li key={category.id} className="flex items-center gap-2 text-xs">
                                <span className="size-3 shrink-0 rounded-full" style={{ background: category.color }} />
                                <span className="truncate">{category.name}</span>
                                <span className="ml-auto tabular-nums">
                                    {format.number(category.value / expenseTotal, {
                                        style: 'percent',
                                        maximumFractionDigits: 0,
                                    })}
                                </span>
                            </li>
                        ))}
                    </ul>
                </div>
            ) : (
                <p
                    className="flex min-h-[180px] items-center justify-center text-center text-sm text-muted-foreground"
                    role="status"
                >
                    {emptyLabel}
                </p>
            )}
        </Card>
    );
}
