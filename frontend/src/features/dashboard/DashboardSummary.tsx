'use client';

import { useFormatter, useTranslations } from 'next-intl';
import { Area, AreaChart, ResponsiveContainer } from 'recharts';

import { Card } from '@/components/ui/card';
import { ArrowDown, ArrowUp, ChartNoAxesColumnIncreasing, TrendingDown, TrendingUp, Wallet } from '@/components/ui/icons';
import { useTransactionFormatting } from '@/features/transactions/useTransactionFormatting';
import type { TransactionOverview } from '@/lib/api/client';
import { cn } from '@/lib/utils';

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
        <section className="grid grid-cols-3 gap-2 sm:grid-cols-2 sm:gap-3 xl:grid-cols-4" aria-label={t('summary')}>
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
                    <Card key={key} aria-busy={loading} className={cn(
                        'min-w-0 rounded-xl p-2.5 shadow-none sm:rounded-lg sm:p-4',
                        key === 'wealth' && 'col-span-3 border-transfer/40 bg-linear-to-br from-transfer/10 to-card p-4 sm:col-span-1 sm:border-border sm:bg-none',
                    )}>
                        <div className={cn('flex flex-col items-start gap-1.5 sm:flex-row sm:items-center sm:gap-3', key === 'wealth' && 'flex-row items-center gap-3')}>
                            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_oklch,currentColor_18%,transparent)] sm:size-12" style={{ color }}>
                                <Icon aria-hidden="true" className="size-4 sm:size-7" />
                            </span>
                            <div className="min-w-0 w-full flex-1 sm:w-auto">
                                <p className="m-0 text-[11px] text-muted-foreground sm:text-xs">
                                    <span className="sm:hidden">{t(`mobileSummary.${key}`)}</span>
                                    <span className="hidden sm:inline">{t(key)}</span>
                                </p>
                                <p className={cn('m-0 mt-1 break-all text-[clamp(.7rem,3.3vw,1rem)] font-semibold leading-tight tabular-nums sm:whitespace-nowrap sm:text-[22px]',
                                    key === 'wealth' && 'text-[clamp(1.5rem,8vw,2.5rem)]')}>
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
                        <div className={cn('mt-2 hidden min-h-4 flex-wrap items-center gap-1 text-[11px] text-muted-foreground sm:flex sm:pl-[60px]',
                            key === 'wealth' && 'flex pl-10')}>
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
