'use client';

import { useEffect, useState } from 'react';

import { useTranslations } from 'next-intl';
import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts';

import { Card } from '@/components/ui/card';
import { Banknote, CreditCard, Landmark } from '@/components/ui/icons';
import { cn } from '@/lib/utils';

import { useWalletFormatting } from './useWalletFormatting';
import { walletColor } from './wallet-model';
import type { DashboardWallet } from './wallet-model';

interface WalletDistributionsProps {
    wallets: DashboardWallet[];
    total: number;
    isLoading: boolean;
    isReady: boolean;
}

export function WalletDistributions({ wallets, total, isLoading, isReady }: WalletDistributionsProps) {
    const t = useTranslations('WalletsDashboard');

    // A pie cannot represent debt faithfully; keep signed balances in cards and the table.
    const distribution = wallets
        .filter((wallet) => wallet.currentValue !== undefined && wallet.includedInTotal !== false)
        .sort((a, b) => (b.currentValue ?? 0) - (a.currentValue ?? 0));
    const canShowDistribution =
        distribution.length > 0 && total > 0 && distribution.every((wallet) => (wallet.currentValue ?? 0) >= 0);

    return (
        <aside
            className="grid min-w-0 gap-5 min-[701px]:max-[1301px]:grid-cols-2 min-[1301px]:grid-rows-[minmax(min-content,1fr)_auto]"
            aria-label={t('distribution.title')}
        >
            <WealthDistribution
                distribution={distribution}
                total={total}
                canShowDistribution={canShowDistribution}
                isLoading={isLoading}
                isReady={isReady}
            />
            <TypeDistribution
                wallets={wallets}
                total={total}
                canShowDistribution={canShowDistribution}
                isLoading={isLoading}
                isReady={isReady}
            />
        </aside>
    );
}

interface WealthDistributionProps {
    distribution: DashboardWallet[];
    total: number;
    canShowDistribution: boolean;
    isLoading: boolean;
    isReady: boolean;
    className?: string;
}

export function WealthDistribution({ distribution, total, canShowDistribution, isLoading, isReady, className }: WealthDistributionProps) {
    const t = useTranslations('WalletsDashboard');
    const { money, percentage, walletBalance } = useWalletFormatting();
    const [isAnimationActive, setIsAnimationActive] = useState(false);

    useEffect(() => {
        const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
        function updateAnimationPreference() {
            setIsAnimationActive(!mediaQuery.matches);
        }
        updateAnimationPreference();
        mediaQuery.addEventListener('change', updateAnimationPreference);
        return () => mediaQuery.removeEventListener('change', updateAnimationPreference);
    }, []);

    return (
        <Card aria-busy={isLoading} className={cn('@container flex min-h-[260px] min-w-0 flex-col p-5 shadow-none', className)}>
            <h2 className="mt-0 mb-4 shrink-0 text-lg font-[650]">{t('distribution.title')}</h2>
            {!!(isLoading || !isReady) && (
                <p role="status" className="m-0 flex flex-1 items-center justify-center py-10 text-center text-sm text-muted-foreground">
                    {t(isLoading ? 'states.loading' : 'states.error')}
                </p>
            )}
            {!!isReady &&
                (canShowDistribution ? (
                    <div className="wallet-content-enter grid grow shrink-0 grid-cols-1 items-center gap-5 @min-[300px]:grid-cols-[minmax(156px,1fr)_minmax(0,1fr)] @min-[500px]:grid-cols-[minmax(156px,0.85fr)_minmax(0,1.15fr)]">
                        <div
                            className="relative h-[200px] w-full max-w-[240px] min-w-0 justify-self-center @min-[440px]:h-[220px]"
                            role="img"
                            aria-label={t('distribution.description')}
                        >
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart accessibilityLayer={false}>
                                    <Pie
                                        data={distribution}
                                        dataKey="currentValue"
                                        nameKey="name"
                                        innerRadius="70%"
                                        outerRadius="98%"
                                        stroke="none"
                                        isAnimationActive={isAnimationActive}
                                        animationBegin={0}
                                        animationDuration={700}
                                        animationEasing="ease-out"
                                    >
                                        {distribution.map((wallet) => (
                                            <Cell key={wallet.id} fill={walletColor(wallet)} />
                                        ))}
                                    </Pie>
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-[5px]">
                                <strong className="text-sm tabular-nums @min-[500px]:text-lg">{money(total)}</strong>
                                <span className="text-xs text-muted-foreground">{t('distribution.total')}</span>
                            </div>
                        </div>
                        <ul className="m-0 grid list-none gap-4 p-0">
                            {distribution.map((wallet) => (
                                <li
                                    key={wallet.id}
                                    className="grid grid-cols-[10px_minmax(0,1fr)_auto] items-center gap-x-2 gap-y-1 text-xs @min-[500px]:grid-cols-[12px_minmax(0,1fr)_auto_auto]"
                                >
                                    <span
                                        className="size-2.5 rounded-full"
                                        style={{ backgroundColor: walletColor(wallet) }}
                                    />
                                    <span className="col-span-2 truncate @min-[500px]:col-span-1" title={wallet.name}>
                                        {wallet.name}
                                    </span>
                                    <strong className="col-start-2 font-semibold tabular-nums [overflow-wrap:anywhere] @min-[500px]:col-start-auto">
                                        {walletBalance(wallet)}
                                    </strong>
                                    <span className="text-right text-muted-foreground">
                                        {percentage((wallet.currentValue ?? 0) / total)}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </div>
                ) : (
                    <p className="m-0 flex flex-1 items-center justify-center px-4 py-10 text-center text-sm text-muted-foreground">
                        {t('distribution.unavailable')}
                    </p>
                ))}
        </Card>
    );
}

interface TypeDistributionProps extends WalletDistributionsProps {
    canShowDistribution: boolean;
}

function TypeDistribution({ wallets, total, canShowDistribution, isLoading, isReady }: TypeDistributionProps) {
    const t = useTranslations('WalletsDashboard');
    const { money } = useWalletFormatting();

    return (
        <Card aria-busy={isLoading} className="min-h-[256px] min-w-0 p-5 shadow-none">
            <h2 className="mt-0 mb-5 text-lg font-[650]">{t('distribution.byType')}</h2>
            {!!isReady && (
                <div className="wallet-content-enter grid gap-5">
                    {[
                        {
                            key: 'accounts',
                            kind: 'bank',
                            icon: Landmark,
                            colorClassName: 'text-transfer',
                        },
                        {
                            key: 'prepaid',
                            kind: 'prepaid',
                            icon: CreditCard,
                            colorClassName: 'text-warning',
                        },
                        {
                            key: 'cash',
                            kind: 'cash',
                            icon: Banknote,
                            colorClassName: 'text-[var(--chart-5)]',
                        },
                    ].map(({ key, kind, icon: Icon, colorClassName }) => {
                        const value = wallets
                            .filter((wallet) => wallet.draft?.kind === kind && wallet.includedInTotal !== false)
                            .reduce((sum, wallet) => sum + (wallet.currentValue ?? 0), 0);
                        const ratio = canShowDistribution ? value / total : 0;
                        return (
                            <div
                                key={key}
                                className="grid grid-cols-[20px_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 text-sm"
                            >
                                <Icon aria-hidden="true" className={cn('size-5', colorClassName)} />
                                <span>{t(`distribution.${key}`)}</span>
                                <span className="text-right font-medium tabular-nums">{money(value)}</span>
                                <span
                                    className="col-span-2 col-start-2 h-2.5 overflow-hidden rounded-full bg-muted"
                                    aria-hidden="true"
                                >
                                    <span
                                        className={cn(
                                            'wallet-distribution-bar block h-full rounded bg-current',
                                            colorClassName,
                                        )}
                                        style={{ width: `${Math.max(0, Math.min(1, ratio)) * 100}%` }}
                                    />
                                </span>
                            </div>
                        );
                    })}
                </div>
            )}
        </Card>
    );
}
