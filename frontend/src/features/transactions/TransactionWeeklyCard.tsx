'use client';

import dayjs from 'dayjs';
import { useFormatter, useTranslations } from 'next-intl';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import { ChartContainer } from '@/components/shared/chart-container';
import { Card } from '@/components/ui/card';

import { transactionTotals } from './transaction-analytics';
import type { TransactionAnalyticsProps } from './transaction-analytics';
import { useTransactionFormatting } from './useTransactionFormatting';

export function TransactionWeeklyCard({ rows, from, to, loading, failed }: TransactionAnalyticsProps) {
    const t = useTranslations('Movements');
    const format = useFormatter();
    const { money } = useTransactionFormatting();
    const weeks = [];
    for (let start = dayjs(from); !start.isAfter(dayjs(to), 'day'); start = start.add(7, 'day')) {
        const end = start.add(6, 'day').isAfter(dayjs(to), 'day') ? dayjs(to) : start.add(6, 'day');
        const values = transactionTotals(
            rows.filter((row) => !dayjs(row.date).isBefore(start, 'day') && !dayjs(row.date).isAfter(end, 'day')),
        );
        const dateLabel = (date: dayjs.Dayjs) => format.dateTime(date.toDate(), { day: 'numeric', month: 'short' });
        weeks.push({ name: `${dateLabel(start)} – ${dateLabel(end)}`, income: values.income, expense: values.expense });
    }
    const emptyLabel = loading ? t('states.loading') : failed ? t('states.error') : t('charts.empty');
    const canShow = !loading && !failed;

    return (
        <Card className="rounded-lg p-3.5 shadow-none" aria-busy={loading}>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h2 className="m-0 text-base font-semibold">{t('charts.weekly')}</h2>
                <div className="flex gap-4 text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                        <span className="size-3 rounded-sm bg-income" />
                        {t('charts.income')}
                    </span>
                    <span className="flex items-center gap-1.5">
                        <span className="size-3 rounded-sm bg-expense" />
                        {t('charts.expenses')}
                    </span>
                </div>
            </div>
            {canShow && rows.some((row) => row.destination === null) ? (
                <ChartContainer description={t('charts.weeklyDescription')} className="h-[140px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={weeks} margin={{ top: 4, right: 2, left: -22, bottom: 0 }} barGap={5}>
                            <CartesianGrid stroke="var(--border)" strokeOpacity={0.5} vertical={false} />
                            <XAxis
                                dataKey="name"
                                tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }}
                                axisLine={{ stroke: 'var(--border)' }}
                                tickLine={false}
                                interval="preserveStartEnd"
                                minTickGap={12}
                            />
                            <YAxis
                                tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }}
                                axisLine={false}
                                tickLine={false}
                                tickFormatter={(value: number) => format.number(value, { notation: 'compact' })}
                            />
                            <Tooltip
                                formatter={(value: number, name: string) => [
                                    money(value),
                                    name === 'income' ? t('charts.income') : t('charts.expenses'),
                                ]}
                                contentStyle={{
                                    background: 'var(--popover)',
                                    borderColor: 'var(--border)',
                                    borderRadius: 8,
                                    color: 'var(--foreground)',
                                }}
                                cursor={{ fill: 'var(--muted)', opacity: 0.4 }}
                            />
                            <Bar
                                dataKey="income"
                                fill="var(--income)"
                                radius={[3, 3, 0, 0]}
                                maxBarSize={24}
                                isAnimationActive={false}
                            />
                            <Bar
                                dataKey="expense"
                                fill="var(--expense)"
                                radius={[3, 3, 0, 0]}
                                maxBarSize={24}
                                isAnimationActive={false}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                </ChartContainer>
            ) : (
                <p
                    className="flex min-h-[140px] items-center justify-center text-center text-sm text-muted-foreground"
                    role="status"
                >
                    {emptyLabel}
                </p>
            )}
        </Card>
    );
}
