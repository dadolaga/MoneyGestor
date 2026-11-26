'use client';

import { useFormatter, useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowDown, ArrowUp, Wallet, WalletCards } from '@/components/ui/icons';
import type { IconComponent } from '@/components/ui/icons';
import type { ApiDashboard } from '@/lib/api/client';
import { cn } from '@/lib/utils';

import { useWalletFormatting } from './useWalletFormatting';
import type { LoadState } from './wallet-model';

interface WalletsSummaryProps {
    total: number;
    walletCount: number;
    isWalletsReady: boolean;
    isWalletsLoading: boolean;
    summaryState: LoadState<ApiDashboard>;
    onRetry: () => void;
}

export function WalletsSummary({
    total,
    walletCount,
    isWalletsReady,
    isWalletsLoading,
    summaryState,
    onRetry,
}: WalletsSummaryProps) {
    const t = useTranslations('WalletsDashboard');
    const format = useFormatter();
    const { money } = useWalletFormatting();
    const summary = summaryState.status === 'ready' ? summaryState.data : undefined;
    const walletPlaceholder = isWalletsLoading ? '' : '—';
    const balanceValue = isWalletsReady ? money(total) : walletPlaceholder;
    const walletCountValue = isWalletsReady ? format.number(walletCount) : walletPlaceholder;
    const incomeValue =
        summary === undefined ? (summaryState.status === 'loading' ? '' : '—') : money(summary.incoming);
    const expenseValue =
        summary === undefined ? (summaryState.status === 'loading' ? '' : '—') : money(Math.abs(summary.expense));

    return (
        <>
            <section className="grid grid-cols-2 gap-3 min-[1301px]:grid-cols-4" aria-label={t('summary.title')}>
                <SummaryCard
                    icon={Wallet}
                    label={t('summary.balance')}
                    value={balanceValue}
                    isLoading={isWalletsLoading}
                    note={t('summary.comparisonUnavailable')}
                    tone="transfer"
                />
                <SummaryCard
                    icon={WalletCards}
                    label={t('summary.accounts')}
                    value={walletCountValue}
                    isLoading={isWalletsLoading}
                    note={t('summary.walletCount')}
                    tone="transfer"
                />
                <SummaryCard
                    icon={ArrowUp}
                    label={t('summary.income')}
                    value={incomeValue}
                    isLoading={summaryState.status === 'loading'}
                    note={t('summary.currentMonth')}
                    tone="income"
                />
                <SummaryCard
                    icon={ArrowDown}
                    label={t('summary.expense')}
                    value={expenseValue}
                    isLoading={summaryState.status === 'loading'}
                    note={t('summary.currentMonth')}
                    tone="expense"
                />
            </section>
            {summaryState.status === 'error' && (
                <div className="flex items-center justify-between gap-3 text-xs text-destructive" role="alert">
                    <span>{t(summaryState.authenticationRequired ? 'states.signInAgain' : 'states.summaryError')}</span>
                    <Button variant="ghost" size="sm" onClick={onRetry}>
                        {t('actions.retry')}
                    </Button>
                </div>
            )}
        </>
    );
}

const summaryToneClasses = {
    transfer: 'bg-transfer/16 text-transfer',
    income: 'bg-income/16 text-income',
    expense: 'bg-expense/16 text-expense',
};

function SummaryCard({
    icon: Icon,
    label,
    value,
    isLoading,
    note,
    tone,
}: {
    icon: IconComponent;
    label: string;
    value: string;
    isLoading: boolean;
    note: string;
    tone: 'transfer' | 'income' | 'expense';
}) {
    return (
        <Card
            aria-busy={isLoading}
            className="flex items-center gap-4 px-4 py-5 shadow-none max-[701px]:items-start max-[701px]:gap-2.5 max-[701px]:px-2.5 max-[701px]:py-3.5"
        >
            <span
                className={cn(
                    'flex size-13 shrink-0 items-center justify-center rounded-full max-[701px]:size-8 max-[701px]:[&>span]:size-5',
                    summaryToneClasses[tone],
                )}
            >
                <Icon aria-hidden="true" className="size-7" />
            </span>
            <div>
                <h2 className="mt-0 mb-[5px] text-[13px] font-normal text-muted-foreground max-[701px]:text-[10px]">
                    {label}
                </h2>
                <strong
                    key={value}
                    className="wallet-content-enter block min-h-[1.2em] text-[clamp(20px,1.6vw,26px)] font-semibold tabular-nums max-[701px]:text-lg max-[701px]:[overflow-wrap:anywhere]"
                >
                    {value}
                </strong>
                <p className="mt-2 mb-0 text-[11px] text-muted-foreground max-[701px]:text-[10px]">{note}</p>
            </div>
        </Card>
    );
}
