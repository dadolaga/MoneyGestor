'use client';

import { useState } from 'react';

import dayjs from 'dayjs';
import { useFormatter, useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { Plus, Wallet } from '@/components/ui/icons';
import type { MovementKind } from '@/features/transactions/transaction-editor-model';
import { TransactionEditorDialog } from '@/features/transactions/TransactionEditorDialog';
import { walletRequestFromDraft } from '@/features/wallets/wallet-adapter';
import type { WalletDraft } from '@/features/wallets/wallet-model';
import { WealthDistribution } from '@/features/wallets/WalletDistributions';
import { WalletEditorDialog } from '@/features/wallets/WalletEditorDialog';
import { apiClient } from '@/lib/api/client';
import { notify } from '@/lib/notifications';

import { DashboardMonthlyChart } from './DashboardMonthlyChart';
import { DashboardQuickActions } from './DashboardQuickActions';
import { DashboardRecent } from './DashboardRecent';
import { DashboardSummary } from './DashboardSummary';
import { useDashboard } from './useDashboard';

export function Dashboard() {
    const t = useTranslations('ApiFinance.dashboard');
    const format = useFormatter();
    const movements = useTranslations('Movements.editor');
    const createWallet = useTranslations('CreateWallet');
    const dashboard = useDashboard();
    const { period, metadata } = dashboard;
    const [movement, setMovement] = useState<{ kind: MovementKind; typeId?: number }>();
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

    function openMovementHandler(kind: MovementKind, typeId?: number) {
        setMovement({ kind, typeId });
    }

    return (
        <div className="mx-auto flex min-h-full w-full min-w-0 flex-col gap-3.5 box-border [&_*]:box-border min-[1380px]:h-full min-[1380px]:min-h-0">
            <header className="hidden shrink-0 flex-wrap items-start justify-between gap-4 sm:flex">
                <div>
                    <h1 className="m-0 text-3xl font-bold tracking-tight sm:text-4xl">{t('title')}</h1>
                    <p className="m-0 mt-1.5 text-sm text-muted-foreground sm:text-base">{t('description')}</p>
                </div>
                <div className="flex flex-wrap gap-3">
                    <Button type="button" className="h-11 rounded-lg px-5" onClick={() => openMovementHandler('expense')}>
                        <Plus aria-hidden="true" className="size-5" />{t('newMovement')}
                    </Button>
                    <Button type="button" variant="outline" className="h-11 rounded-lg border border-solid border-input px-4"
                        disabled={metadata.loading || !!metadata.error} onClick={() => setWalletEditorOpen(true)}>
                        <Wallet aria-hidden="true" className="size-5" />{t('addWallet')}
                    </Button>
                </div>
            </header>
            <h1 className="sr-only sm:hidden">{t('title')}</h1>

            {!!error && (
                <div role="alert" className="flex shrink-0 flex-wrap items-center justify-between gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                    <span>{error}</span><Button type="button" variant="outline" size="sm" onClick={dashboard.retryHandler}>{t('retry')}</Button>
                </div>
            )}

            <div className="shrink-0">
                <p className="m-0 mb-2 text-xs text-muted-foreground sm:hidden">
                    {t('selectedMonth', { month: format.dateTime(dayjs(`${dashboard.month}-01`).toDate(), { month: 'long', year: 'numeric' }) })}
                </p>
                <DashboardSummary overview={period.data?.overview} total={total} periodLoading={period.loading} walletsLoading={metadata.loading} />
            </div>

            <div className="grid shrink-0 min-w-0 gap-3.5 sm:order-2 xl:grid-cols-[minmax(0,1fr)_290px]">
                <DashboardQuickActions types={types} metadataLoading={metadata.loading} metadataError={metadata.error}
                    onOpenMovement={openMovementHandler} onAddWallet={() => setWalletEditorOpen(true)} />
                <DashboardRecent rows={period.data?.rows ?? []} loading={period.loading} failed={!!period.error} />
            </div>

            <div className="grid min-w-0 gap-3.5 sm:order-1 min-[1380px]:flex-1 min-[1380px]:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
                <DashboardMonthlyChart month={dashboard.month} onMonthChange={dashboard.monthChangeHandler}
                    overview={period.data?.overview} loading={period.loading} failed={!!period.error} />
                <WealthDistribution distribution={distribution} total={total ?? 0} canShowDistribution={canShowDistribution}
                    isLoading={metadata.loading} isReady={!!metadata.data} className="rounded-lg p-4" />
            </div>

            {movement !== undefined && (
                <TransactionEditorDialog wallets={wallets} types={types} initialKind={movement.kind} typeId={movement.typeId}
                    metadataLoading={metadata.loading} metadataError={metadata.error} onRetry={dashboard.retryHandler}
                    onClose={() => setMovement(undefined)} onCategoryCreated={dashboard.categoryCreatedHandler}
                    onSaved={() => { setMovement(undefined); notify.success(movements('created')); dashboard.retryHandler(); }} />
            )}
            {!!walletEditorOpen && <WalletEditorDialog accounts={accounts} pending={walletPending}
                onClose={() => setWalletEditorOpen(false)} onSave={saveWalletHandler} />}
        </div>
    );
}
