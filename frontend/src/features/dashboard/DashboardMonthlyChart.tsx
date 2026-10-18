'use client';

import { useId } from 'react';

import dayjs from 'dayjs';
import { useFormatter, useTranslations } from 'next-intl';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import { ChartContainer } from '@/components/shared/chart-container';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useTransactionFormatting } from '@/features/transactions/useTransactionFormatting';
import type { TransactionOverview } from '@/lib/api/client';

interface DashboardMonthlyChartProps {
    month: string;
    onMonthChange: (month: string) => void;
    overview?: TransactionOverview;
    loading: boolean;
    failed: boolean;
}

export function DashboardMonthlyChart({ month, onMonthChange, overview, loading, failed }: DashboardMonthlyChartProps) {
    const t = useTranslations('ApiFinance.dashboard');
    const format = useFormatter();
    const { money, date } = useTransactionFormatting();
    const id = useId();
    const hasData = !!overview?.daily.some((day) => day.income > 0 || day.expense > 0);

    return (
        <Card className="flex min-h-[310px] min-w-0 flex-col rounded-lg p-4 shadow-none" aria-busy={loading}>
            <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="m-0 text-lg font-semibold">{t('monthlyTrend')}</h2>
                <Input type="month" aria-label={t('month')} value={month} min="0001-02" max="9999-12"
                    className="h-9 w-auto max-w-full text-sm" onChange={(event) => onMonthChange(event.target.value)} />
            </div>
            <div className="mt-3 mb-4 flex flex-wrap gap-x-6 gap-y-2 text-sm">
                {(['income', 'expense'] as const).map((key) => (
                    <span key={key} className="inline-flex items-center gap-2">
                        <span className="size-3.5 rounded-full" style={{ background: `var(--${key})` }} />
                        {t(key === 'income' ? 'incoming' : 'expenses')}
                        <span className="tabular-nums">{overview ? money(overview.totals[key]) : '—'}</span>
                    </span>
                ))}
            </div>
            {!loading && !failed && hasData ? (
                <ChartContainer description={t('monthlyDescription')} className="relative min-h-[210px] flex-1">
                    <ResponsiveContainer width="100%" height="100%" style={{ position: 'absolute', inset: 0 }}>
                        <AreaChart data={overview?.daily} accessibilityLayer margin={{ top: 6, right: 6, left: -12, bottom: 0 }}>
                            <defs>
                                {(['income', 'expense'] as const).map((key) => (
                                    <linearGradient id={`${id}-${key}`} key={key} x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor={`var(--${key})`} stopOpacity={0.3} />
                                        <stop offset="100%" stopColor={`var(--${key})`} stopOpacity={0.02} />
                                    </linearGradient>
                                ))}
                            </defs>
                            <CartesianGrid stroke="var(--border)" strokeOpacity={0.5} />
                            <XAxis dataKey="date" tickFormatter={(value: string) => format.dateTime(dayjs(value).toDate(), { day: 'numeric', month: 'short' })}
                                tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }} minTickGap={35}
                                axisLine={{ stroke: 'var(--border)' }} tickLine={false} />
                            <YAxis tickFormatter={(value: number) => format.number(value, { notation: 'compact' })}
                                tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }} axisLine={false} tickLine={false} />
                            <Tooltip labelFormatter={(value: string) => date(value)}
                                formatter={(value: number, name: string) => [money(value), t(name === 'income' ? 'incoming' : 'expenses')]}
                                contentStyle={{ background: 'var(--popover)', borderColor: 'var(--border)', borderRadius: 8, color: 'var(--foreground)' }} />
                            {(['income', 'expense'] as const).map((key) => (
                                <Area key={key} type="monotone" dataKey={key} stroke={`var(--${key})`} fill={`url(#${id}-${key})`}
                                    strokeWidth={2} dot={false} activeDot={{ r: 4 }} isAnimationActive={false} />
                            ))}
                        </AreaChart>
                    </ResponsiveContainer>
                </ChartContainer>
            ) : (
                <p role="status" className="m-0 flex min-h-[210px] flex-1 items-center justify-center text-center text-sm text-muted-foreground">
                    {t(loading ? 'loading' : failed ? 'requestFailed' : 'empty')}
                </p>
            )}
        </Card>
    );
}
