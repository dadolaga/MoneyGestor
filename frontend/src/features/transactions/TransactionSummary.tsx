'use client';

import dayjs from 'dayjs';
import { useFormatter, useTranslations } from 'next-intl';
import { Area, AreaChart, Bar, BarChart, ResponsiveContainer } from 'recharts';

import { Card } from '@/components/ui/card';
import { ArrowDown, ArrowLeftRight, ArrowUp, List, TrendingDown, TrendingUp } from '@/components/ui/icons';
import type { IconComponent } from '@/components/ui/icons';

import { emptyTransactionTotals } from './transaction-analytics';
import type { TransactionAnalyticsProps } from './transaction-analytics';
import { useTransactionFormatting } from './useTransactionFormatting';

export function TransactionSummary({ overview, from, to, loading, failed }: TransactionAnalyticsProps) {
    const t = useTranslations('Movements');
    const format = useFormatter();
    const { money } = useTransactionFormatting();
    const current = overview?.totals ?? emptyTransactionTotals;
    const past = overview?.previous.totals ?? emptyTransactionTotals;
    const isCurrentMonth =
        from === dayjs().startOf('month').format('YYYY-MM-DD') && to === dayjs().endOf('month').format('YYYY-MM-DD');
    const buckets = Array.from({ length: 12 }, (_, index) => ({
        income: 0,
        expense: 0,
        transfers: 0,
        count: 0,
        index,
    }));
    const days = Math.max(1, dayjs(to).diff(dayjs(from), 'day') + 1);
    for (const day of overview?.daily ?? []) {
        const bucket = buckets[Math.min(11, Math.max(0, Math.floor((dayjs(day.date).diff(dayjs(from), 'day') / days) * 12)))];
        bucket.income += day.income;
        bucket.expense += day.expense;
        bucket.transfers += day.transfers;
        bucket.count += day.movementCount;
    }
    const cards: {
        key: 'income' | 'expense' | 'transfers' | 'count';
        label: string;
        value: string;
        icon: IconComponent;
        color: string;
        comparison?: number;
    }[] = [
        {
            key: 'income',
            label: t(isCurrentMonth ? 'summary.income' : 'summary.periodIncome'),
            value: money(current.income),
            icon: ArrowUp,
            color: 'var(--income)',
            comparison: past.income > 0 ? (current.income - past.income) / past.income : undefined,
        },
        {
            key: 'expense',
            label: t(isCurrentMonth ? 'summary.expenses' : 'summary.periodExpenses'),
            value: money(current.expense),
            icon: ArrowDown,
            color: 'var(--expense)',
            comparison: past.expense > 0 ? (current.expense - past.expense) / past.expense : undefined,
        },
        {
            key: 'transfers',
            label: t('summary.transfers'),
            value: money(current.transfers),
            icon: ArrowLeftRight,
            color: 'var(--transfer)',
        },
        {
            key: 'count',
            label: t('summary.total'),
            value: format.number(current.movementCount),
            icon: List,
            color: 'var(--chart-5)',
        },
    ];
    return (
        <section
            className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4"
            aria-label={t('summary.title')}
            aria-busy={loading}
        >
            {cards.map(({ key, label, value, icon: Icon, color, comparison }) => {
                const displayValue = loading || failed ? '—' : value;
                const comparisonLabel = loading
                    ? t('states.loading')
                    : failed
                      ? '—'
                      : key === 'transfers'
                        ? t('summary.transferCount', { count: current.transferCount })
                        : key === 'count'
                          ? t('summary.selectedPeriod')
                          : comparison === undefined
                            ? t('summary.noComparison')
                            : t('summary.comparison');
                const ComparisonIcon = (comparison ?? 0) >= 0 ? TrendingUp : TrendingDown;
                return (
                    <Card key={key} className="relative overflow-hidden rounded-lg p-3.5 shadow-none sm:p-4">
                        <div className="flex items-center gap-4">
                            <span
                                className="flex size-14 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_oklch,currentColor_20%,transparent)]"
                                style={{ color }}
                            >
                                <Icon aria-hidden="true" className="size-8" />
                            </span>
                            <div className="relative z-10 min-w-0 flex-1">
                                <p className="m-0 text-[13px] text-muted-foreground">{label}</p>
                                <p className="m-0 mt-1 text-[25px] font-semibold leading-tight tabular-nums">
                                    {displayValue}
                                </p>
                            </div>
                            <div className="hidden h-12 w-[25%] shrink-0 min-[1450px]:block" aria-hidden="true">
                                {!loading && !failed && (
                                    <ResponsiveContainer width="100%" height="100%">
                                        {key === 'income' || key === 'expense' ? (
                                            <AreaChart data={buckets}>
                                                <Area
                                                    type="monotone"
                                                    dataKey={key}
                                                    stroke={color}
                                                    fill={color}
                                                    fillOpacity={0.12}
                                                    strokeWidth={1.8}
                                                    isAnimationActive={false}
                                                />
                                            </AreaChart>
                                        ) : (
                                            <BarChart data={buckets}>
                                                <Bar
                                                    dataKey={key}
                                                    fill={color}
                                                    radius={[1, 1, 0, 0]}
                                                    isAnimationActive={false}
                                                />
                                            </BarChart>
                                        )}
                                    </ResponsiveContainer>
                                )}
                            </div>
                        </div>
                        <div className="mt-2 flex min-h-4 items-center gap-1.5 pl-[72px] text-xs text-muted-foreground">
                            {!loading && !failed && comparison !== undefined && (
                                <>
                                    <ComparisonIcon aria-hidden="true" className="size-3.5" style={{ color }} />
                                    <span className="font-semibold" style={{ color }}>
                                        {format.number(comparison, {
                                            style: 'percent',
                                            maximumFractionDigits: 1,
                                            signDisplay: 'exceptZero',
                                        })}
                                    </span>
                                </>
                            )}
                            <span>{comparisonLabel}</span>
                        </div>
                    </Card>
                );
            })}
        </section>
    );
}
