'use client';

import { useState } from 'react';

import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowDown, ArrowLeftRight, ArrowUp, ChevronRight, Plus, Wallet } from '@/components/ui/icons';
import type { MovementKind } from '@/features/transactions/transaction-editor-model';
import { TransactionEditorDialog } from '@/features/transactions/TransactionEditorDialog';
import { walletRequestFromDraft } from '@/features/wallets/wallet-adapter';
import type { WalletDraft } from '@/features/wallets/wallet-model';
import { WealthDistribution } from '@/features/wallets/WalletDistributions';
import { WalletEditorDialog } from '@/features/wallets/WalletEditorDialog';
import { apiClient } from '@/lib/api/client';
import { notify } from '@/lib/notifications';

import { DashboardMonthlyChart } from './DashboardMonthlyChart';
import { DashboardRecent } from './DashboardRecent';
import { DashboardSummary } from './DashboardSummary';
import { useDashboard } from './useDashboard';

export function Dashboard() {
    const t = useTranslations('ApiFinance.dashboard');
    const movements = useTranslations('Movements.editor');
    const createWallet = useTranslations('CreateWallet');
    const dashboard = useDashboard();
    const { period, metadata } = dashboard;
    const [movementKind, setMovementKind] = useState<MovementKind>();
    const [walletEditorOpen, setWalletEditorOpen] = useState(false);
    const [walletPending, setWalletPending] = useState(false);
    const wallets = metadata.data?.wallets ?? [];
    const types = metadata.data?.types ?? [];
    const distribution = wallets.filter((wallet) => wallet.hasOwnBalance !== false && wallet.includedInTotal !== false);
    const total = metadata.data ? distribution.reduce((sum, wallet) => sum + wallet.currentValue, 0) : undefined;
    const canShowDistribution = (total ?? 0) > 0 && distribution.every((wallet) => wallet.currentValue >= 0);
    const accounts = wallets.flatMap((wallet) => wallet.details?.kind === 'bank' ? [{
        id: wallet.id, name: wallet.name, currency: wallet.details.currency, shareable: wallet.details.shareable,
    }] : []);
    const error = metadata.error || period.error;

    async function saveWalletHandler(draft: WalletDraft) {
        setWalletPending(true);
        try {
            await apiClient.createWallet(walletRequestFromDraft(draft));
            setWalletEditorOpen(false);
            notify.success(createWallet('created'));
            dashboard.retryHandler();
        } finally {
            setWalletPending(false);
        }
    }

    return (
        <div className="mx-auto flex min-h-full w-full min-w-0 flex-col gap-3.5 box-border [&_*]:box-border min-[1380px]:h-full min-[1380px]:min-h-0">
            <header className="flex shrink-0 flex-wrap items-start justify-between gap-4">
                <div>
                    <h1 className="m-0 text-3xl font-bold tracking-tight sm:text-4xl">{t('title')}</h1>
                    <p className="m-0 mt-1.5 text-sm text-muted-foreground sm:text-base">{t('description')}</p>
                </div>
                <div className="flex flex-wrap gap-3">
                    <Button type="button" className="h-11 rounded-lg px-5" onClick={() => setMovementKind('expense')}>
                        <Plus aria-hidden="true" className="size-5" />{t('newMovement')}
                    </Button>
                    <Button type="button" variant="outline" className="h-11 rounded-lg border border-solid border-input px-4"
                        disabled={metadata.loading || !!metadata.error} onClick={() => setWalletEditorOpen(true)}>
                        <Wallet aria-hidden="true" className="size-5" />{t('addWallet')}
                    </Button>
                </div>
            </header>

            {!!error && (
                <div role="alert" className="flex shrink-0 flex-wrap items-center justify-between gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                    <span>{error}</span><Button type="button" variant="outline" size="sm" onClick={dashboard.retryHandler}>{t('retry')}</Button>
                </div>
            )}

            <DashboardSummary overview={period.data?.overview} total={total} periodLoading={period.loading} walletsLoading={metadata.loading} />

            <div className="grid min-w-0 gap-3.5 min-[1380px]:flex-1 min-[1380px]:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
                <DashboardMonthlyChart month={dashboard.month} onMonthChange={dashboard.monthChangeHandler}
                    overview={period.data?.overview} loading={period.loading} failed={!!period.error} />
                <WealthDistribution distribution={distribution} total={total ?? 0} canShowDistribution={canShowDistribution}
                    isLoading={metadata.loading} isReady={!!metadata.data} className="rounded-lg p-4" />
            </div>

            <div className="grid shrink-0 min-w-0 gap-3.5 xl:grid-cols-[minmax(0,1fr)_290px]">
                <DashboardRecent rows={period.data?.rows ?? []} loading={period.loading} failed={!!period.error} />
                <Card className="min-w-0 rounded-lg p-4 shadow-none">
                    <h2 className="m-0 mb-3 text-lg font-semibold">{t('quickActions')}</h2>
                    <div className="grid gap-2.5 sm:grid-cols-3 xl:grid-cols-1">
                        {([
                            { kind: 'income', label: 'newIncome', icon: ArrowUp, color: 'var(--income)' },
                            { kind: 'expense', label: 'newExpense', icon: ArrowDown, color: 'var(--expense)' },
                            { kind: 'transfer', label: 'transfer', icon: ArrowLeftRight, color: 'var(--transfer)' },
                        ] as const).map(({ kind, label, icon: Icon, color }) => (
                            <Button key={kind} type="button" variant="transparent" onClick={() => setMovementKind(kind)}
                                className="h-16 justify-start rounded-lg border border-solid border-[color-mix(in_oklch,var(--action-color)_35%,transparent)] bg-[color-mix(in_oklch,var(--action-color)_8%,transparent)] p-1 hover:bg-[color-mix(in_oklch,var(--action-color)_16%,transparent)]"
                                style={{ '--action-color': color } as React.CSSProperties}>
                                <span className="flex size-13 shrink-0 items-center justify-center rounded-lg text-primary-foreground" style={{ background: color }}>
                                    <Icon aria-hidden="true" className="size-8" />
                                </span>
                                <span className="ml-1 whitespace-normal text-left text-sm font-normal">{t(label)}</span>
                                <ChevronRight aria-hidden="true" className="mr-2 ml-auto size-4" />
                            </Button>
                        ))}
                    </div>
                </Card>
            </div>

            {movementKind !== undefined && (
                <TransactionEditorDialog wallets={wallets} types={types} initialKind={movementKind}
                    metadataLoading={metadata.loading} metadataError={metadata.error} onRetry={dashboard.retryHandler}
                    onClose={() => setMovementKind(undefined)} onCategoryCreated={dashboard.categoryCreatedHandler}
                    onSaved={() => { setMovementKind(undefined); notify.success(movements('created')); dashboard.retryHandler(); }} />
            )}
            {!!walletEditorOpen && <WalletEditorDialog accounts={accounts} pending={walletPending}
                onClose={() => setWalletEditorOpen(false)} onSave={saveWalletHandler} />}
        </div>
    );
}
