'use client';

import dayjs from 'dayjs';
import { useFormatter, useTranslations } from 'next-intl';
import {
    Area,
    AreaChart,
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';

import { ChartContainer } from '@/components/shared/chart-container';
import { Card } from '@/components/ui/card';
import { ArrowDown, ArrowLeftRight, ArrowUp, List, TrendingDown, TrendingUp } from '@/components/ui/icons';
import type { IconComponent } from '@/components/ui/icons';
import type { ApiTransaction } from '@/lib/api/client';
import { cn } from '@/lib/utils';

import { categoryColors } from './transaction-display';
import { transactionKind } from './use-transactions-dashboard';

interface AnalyticsProps {
    rows: ApiTransaction[];
    previous: ApiTransaction[];
    from: string;
    to: string;
    loading: boolean;
    failed: boolean;
}

function totals(rows: ApiTransaction[]) {
    return rows.reduce(
        (result, row) => {
            const kind = transactionKind(row);
            if (kind === 'Income') result.income += row.value;
            else if (kind === 'Expense') result.expense += Math.abs(row.value);
            else {
                result.transfers += Math.abs(row.value);
                result.transferCount++;
            }
            return result;
        },
        { income: 0, expense: 0, transfers: 0, transferCount: 0 },
    );
}

export function TransactionSummary({ rows, previous, from, to, loading, failed }: AnalyticsProps) {
    const t = useTranslations('Movements');
    const format = useFormatter();
    const current = totals(rows);
    const past = totals(previous);
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
    for (const row of rows) {
        const bucket =
            buckets[Math.min(11, Math.max(0, Math.floor((dayjs(row.date).diff(dayjs(from), 'day') / days) * 12)))];
        const kind = transactionKind(row);
        if (kind === 'Income') bucket.income += row.value;
        else if (kind === 'Expense') bucket.expense += Math.abs(row.value);
        else bucket.transfers += Math.abs(row.value);
        bucket.count++;
    }
    const money = (value: number) => format.number(value, { style: 'currency', currency: 'EUR' });
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
            value: format.number(rows.length),
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

export function TransactionCharts({ rows, from, to, loading, failed }: Omit<AnalyticsProps, 'previous'>) {
    const t = useTranslations('Movements');
    const format = useFormatter();
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
    const weeks = [];
    for (let start = dayjs(from); !start.isAfter(dayjs(to), 'day'); start = start.add(7, 'day')) {
        const end = start.add(6, 'day').isAfter(dayjs(to), 'day') ? dayjs(to) : start.add(6, 'day');
        const values = totals(
            rows.filter((row) => !dayjs(row.date).isBefore(start, 'day') && !dayjs(row.date).isAfter(end, 'day')),
        );
        const dateLabel = (date: dayjs.Dayjs) => format.dateTime(date.toDate(), { day: 'numeric', month: 'short' });
        weeks.push({ name: `${dateLabel(start)} – ${dateLabel(end)}`, income: values.income, expense: values.expense });
    }
    const money = (value: number) => format.number(value, { style: 'currency', currency: 'EUR' });
    const emptyLabel = loading ? t('states.loading') : failed ? t('states.error') : t('charts.empty');
    const canShow = !loading && !failed;
    return (
        <>
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
                                    <span
                                        className="size-3 shrink-0 rounded-full"
                                        style={{ background: category.color }}
                                    />
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
                        className={cn(
                            'flex min-h-[140px] items-center justify-center text-center text-sm text-muted-foreground',
                        )}
                        role="status"
                    >
                        {emptyLabel}
                    </p>
                )}
            </Card>
        </>
    );
}
