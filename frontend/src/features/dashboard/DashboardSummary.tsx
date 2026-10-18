'use client';

import { useFormatter, useTranslations } from 'next-intl';
import { Area, AreaChart, ResponsiveContainer } from 'recharts';

import { Card } from '@/components/ui/card';
import { ArrowDown, ArrowUp, ChartNoAxesColumnIncreasing, TrendingDown, TrendingUp, Wallet } from '@/components/ui/icons';
import { useTransactionFormatting } from '@/features/transactions/useTransactionFormatting';
import type { TransactionOverview } from '@/lib/api/client';

interface DashboardSummaryProps {
    overview?: TransactionOverview;
    total?: number;
    periodLoading: boolean;
    walletsLoading: boolean;
}

export function DashboardSummary({ overview, total, periodLoading, walletsLoading }: DashboardSummaryProps) {
    const t = useTranslations('ApiFinance.dashboard');
    const format = useFormatter();
    const { money } = useTransactionFormatting();
    const current = overview?.totals;
    const previous = overview?.previous.totals;
    const savings = current ? current.income - current.expense : undefined;
    const previousSavings = previous ? previous.income - previous.expense : undefined;
    const cards = [
        { key: 'wealth', value: total, icon: Wallet, color: 'var(--transfer)', loading: walletsLoading },
        { key: 'income', value: current?.income, previous: previous?.income, icon: ArrowUp, color: 'var(--income)', loading: periodLoading },
        { key: 'expense', value: current?.expense, previous: previous?.expense, icon: ArrowDown, color: 'var(--expense)', loading: periodLoading },
        { key: 'savings', value: savings, previous: previousSavings, icon: ChartNoAxesColumnIncreasing, color: 'var(--chart-5)', loading: periodLoading },
    ] as const;
    const series = overview?.daily.map((day) => ({ income: day.income, expense: day.expense, savings: day.income - day.expense }));

    return (
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label={t('summary')}>
            {cards.map(({ key, value, icon: Icon, color, loading, ...card }) => {
                const past = 'previous' in card ? card.previous : undefined;
                const comparison = value !== undefined && past !== undefined && past > 0 ? (value - past) / past : undefined;
                const favorable = comparison !== undefined && (key === 'expense' ? comparison <= 0 : comparison >= 0);
                const ComparisonIcon = (comparison ?? 0) < 0 ? TrendingDown : TrendingUp;
                const displayValue = loading || value === undefined ? '—' : money(value);
                const comparisonLabel = loading ? t('loading')
                    : value === undefined ? t('unavailable')
                    : key === 'wealth' ? t('currentBalances')
                    : comparison === undefined ? t('noComparison') : t('comparison');
                return (
                    <Card key={key} aria-busy={loading} className="min-w-0 rounded-lg p-4 shadow-none">
                        <div className="flex items-center gap-3">
                            <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_oklch,currentColor_18%,transparent)]" style={{ color }}>
                                <Icon aria-hidden="true" className="size-7" />
                            </span>
                            <div className="min-w-0 flex-1">
                                <p className="m-0 text-xs text-muted-foreground">{t(key)}</p>
                                <p className="m-0 mt-1 whitespace-nowrap text-[22px] font-semibold leading-tight tabular-nums">
                                    {displayValue}
                                </p>
                            </div>
                            {key !== 'wealth' && !!series && !loading && (
                                <div className="hidden h-11 w-16 shrink-0 min-[1650px]:block" aria-hidden="true">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={series}>
                                            <Area dataKey={key} type="monotone" stroke={color} fill={color} fillOpacity={0.12} strokeWidth={1.5} isAnimationActive={false} />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            )}
                        </div>
                        <div className="mt-2 flex min-h-4 flex-wrap items-center gap-1 pl-[60px] text-[11px] text-muted-foreground">
                            {comparison !== undefined && !loading && (
                                <span className={favorable ? 'inline-flex items-center gap-1 font-semibold text-income' : 'inline-flex items-center gap-1 font-semibold text-expense'}>
                                    <ComparisonIcon aria-hidden="true" className="size-3" />
                                    {format.number(comparison, { style: 'percent', maximumFractionDigits: 1, signDisplay: 'exceptZero' })}
                                </span>
                            )}
                            <span>{comparisonLabel}</span>
                        </div>
                    </Card>
                );
            })}
        </section>
    );
}
