'use client';

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';

import { ChartContainer } from '@/components/shared/chart-container';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import type { WalletViewModel } from './model';

interface WalletDistributionChartProps {
    wallets: WalletViewModel[];
    title: string;
    totalLabel: string;
    description: string;
    formatMoney: (value: number) => string;
    formatPercentage: (value: number) => string;
}

export function WalletDistributionChart({
    wallets,
    title,
    totalLabel,
    description,
    formatMoney,
    formatPercentage,
}: WalletDistributionChartProps) {
    const total = wallets.reduce((sum, wallet) => sum + wallet.currentValue, 0);

    return (
        <Card className="min-w-0">
            <CardHeader className="pb-2">
                <CardTitle>{title}</CardTitle>
            </CardHeader>
            <CardContent className="grid items-center gap-6 pt-2 md:grid-cols-[minmax(13rem,0.9fr)_minmax(16rem,1.1fr)]">
                <ChartContainer className="relative h-64" description={description}>
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart className="[&_.recharts-sector:focus]:outline-none">
                            <Pie
                                data={wallets}
                                dataKey="currentValue"
                                nameKey="name"
                                innerRadius="58%"
                                outerRadius="82%"
                                paddingAngle={1}
                                stroke="var(--card)"
                                strokeWidth={2}
                            >
                                {wallets.map((wallet) => (
                                    <Cell key={wallet.id} fill={wallet.color ?? 'var(--chart-6)'} />
                                ))}
                            </Pie>
                            <Tooltip
                                content={({ active, payload }) =>
                                    active === true && payload?.[0] !== undefined ? (
                                        <div className="rounded-lg border border-border bg-popover px-3 py-2 text-sm text-popover-foreground shadow-md">
                                            <p className="m-0 font-medium">{payload[0].name}</p>
                                            <p className="m-0 mt-1 tabular-nums">
                                                {formatMoney(Number(payload[0].value))}
                                            </p>
                                        </div>
                                    ) : null
                                }
                            />
                        </PieChart>
                    </ResponsiveContainer>
                    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-lg font-bold tabular-nums">{formatMoney(total)}</span>
                        <span className="text-xs text-muted-foreground">{totalLabel}</span>
                    </div>
                </ChartContainer>
                <div className="grid gap-1">
                    {wallets.map((wallet) => (
                        <div
                            key={wallet.id}
                            className="grid grid-cols-[auto_1fr_auto] items-center gap-3 border-b border-border py-2 last:border-0"
                        >
                            <span
                                aria-hidden="true"
                                className="size-3 rounded-full"
                                style={{ backgroundColor: wallet.color ?? 'var(--chart-6)' }}
                            />
                            <span className="min-w-0 truncate text-sm">{wallet.name}</span>
                            <span className="text-right text-xs tabular-nums text-muted-foreground">
                                {formatPercentage(total === 0 ? 0 : wallet.currentValue / total)} ·{' '}
                                {formatMoney(wallet.currentValue)}
                            </span>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
