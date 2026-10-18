'use client';

import { useEffect, useState } from 'react';

import dayjs from 'dayjs';
import { useTranslations } from 'next-intl';

import { ComingSoonDialog } from '@/components/shared/coming-soon-dialog';
import { ConfirmDeleteDialog } from '@/components/shared/confirm-delete-dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Landmark, Plus } from '@/components/ui/icons';
import { apiClient, ApiProblemError } from '@/lib/api/client';
import type { ApiDashboard, ApiTransaction, ApiWallet } from '@/lib/api/client';
import { notify } from '@/lib/notifications';
import '@/styles/wallets.css';

import { walletDraftFromApi, walletRequestFromDraft } from './wallet-adapter';
import { walletColor } from './wallet-model';
import type { DashboardWallet, LoadState, WalletDetailAction, WalletDraft } from './wallet-model';
import { WalletCardsList } from './WalletCardsList';
import { WalletDetails } from './WalletDetails';
import { WalletDistributions } from './WalletDistributions';
import { WalletEditorDialog } from './WalletEditorDialog';
import { WalletsSummary } from './WalletsSummary';
import { WalletsTable } from './WalletsTable';

type DialogAction = 'create' | 'connect' | WalletDetailAction;

export function WalletsDashboard() {
    const t = useTranslations('WalletsDashboard');
    const tCreate = useTranslations('CreateWallet');
    const [walletState, setWalletState] = useState<LoadState<ApiWallet[]>>({ status: 'loading' });
    const [summaryState, setSummaryState] = useState<LoadState<ApiDashboard>>({ status: 'loading' });
    const [movementState, setMovementState] = useState<LoadState<ApiTransaction[]>>({ status: 'loading' });
    const [selectedId, setSelectedId] = useState<number>();
    const [dialog, setDialog] = useState<{ action: DialogAction; wallet?: DashboardWallet }>();
    const [reloadKey, setReloadKey] = useState(0);
    const [pending, setPending] = useState(false);
    const [deletingWallet, setDeletingWallet] = useState<DashboardWallet>();
    const [deleteError, setDeleteError] = useState('');

    const wallets: DashboardWallet[] = (walletState.status === 'ready' ? walletState.data : []).map((wallet) => ({
        ...wallet,
        currentValue: wallet.hasOwnBalance === false ? undefined : wallet.currentValue,
        draft: walletDraftFromApi(wallet),
    }));
    const selected = wallets.find((wallet) => wallet.id === selectedId);
    const selectedWalletId = selected?.id;
    const movementWalletId = selected?.draft?.kind === 'debit' ? selected.draft.linkedAccountId : selectedWalletId;

    useEffect(() => {
        const controller = new AbortController();
        void apiClient
            .wallets(controller.signal)
            .then((data) => {
                if (!controller.signal.aborted) setWalletState({ status: 'ready', data });
            })
            .catch((error: unknown) => {
                if (!controller.signal.aborted)
                    setWalletState({
                        status: 'error',
                        authenticationRequired: error instanceof ApiProblemError && error.status === 401,
                    });
            });
        void apiClient
            .dashboard(
                dayjs().startOf('month').format('YYYY-MM-DD'),
                dayjs().endOf('month').format('YYYY-MM-DD'),
                controller.signal,
            )
            .then((data) => {
                if (!controller.signal.aborted) setSummaryState({ status: 'ready', data });
            })
            .catch((error: unknown) => {
                if (!controller.signal.aborted)
                    setSummaryState({
                        status: 'error',
                        authenticationRequired: error instanceof ApiProblemError && error.status === 401,
                    });
            });
        return () => controller.abort();
    }, [reloadKey]);

    useEffect(() => {
        if (movementWalletId === undefined) return;
        const controller = new AbortController();
        void apiClient
            .transactions(
                { walletId: movementWalletId, pageSize: 5, sortBy: 'Date', direction: 'Descending' },
                controller.signal,
            )
            .then((result) => {
                if (!controller.signal.aborted) setMovementState({ status: 'ready', data: result.items });
            })
            .catch((error: unknown) => {
                if (!controller.signal.aborted)
                    setMovementState({
                        status: 'error',
                        authenticationRequired: error instanceof ApiProblemError && error.status === 401,
                    });
            });
        return () => controller.abort();
    }, [movementWalletId, selectedWalletId, reloadKey]);

    const total = wallets
        .filter((wallet) => wallet.includedInTotal !== false)
        .reduce((sum, wallet) => sum + (wallet.currentValue ?? 0), 0);
    const accounts = wallets.flatMap((wallet) =>
        wallet.draft?.kind === 'bank' && wallet.id !== dialog?.wallet?.id
            ? [{ id: wallet.id, name: wallet.name, currency: wallet.draft.currency, shareable: wallet.draft.shareable }]
            : [],
    );
    const editorWallet =
        dialog?.action === 'edit' && dialog.wallet !== undefined
            ? {
                  ...dialog.wallet.draft,
                  id: dialog.wallet.id,
                  name: dialog.wallet.name,
                  color: walletColor(dialog.wallet),
                  initialBalance: dialog.wallet.initialValue ?? dialog.wallet.draft?.initialBalance,
              }
            : undefined;

    function selectWalletHandler(wallet: DashboardWallet) {
        if (wallet.id === selectedWalletId) {
            setSelectedId(undefined);
            return;
        }
        setMovementState({ status: 'loading' });
        setSelectedId(wallet.id);
    }

    async function refreshWallets() {
        try {
            const data = await apiClient.wallets();
            setWalletState({ status: 'ready', data });
        } catch (error: unknown) {
            notify.error(t('states.refreshError'));
            setWalletState({
                status: 'error',
                authenticationRequired: error instanceof ApiProblemError && error.status === 401,
            });
        }
    }

    async function saveWalletHandler(draft: WalletDraft) {
        if (pending) return;
        const editingWallet = dialog?.action === 'edit' ? dialog.wallet : undefined;
        const body = walletRequestFromDraft(draft);
        setPending(true);
        try {
            if (editingWallet === undefined) await apiClient.createWallet(body);
            else
                await apiClient.updateWallet(editingWallet.id, {
                    name: body.name,
                    colorValue: body.colorValue,
                    details: body.details,
                });
            setDialog(undefined);
            notify.success(tCreate(editingWallet === undefined ? 'created' : 'updated'));
            await refreshWallets();
        } finally {
            setPending(false);
        }
    }

    function requestDeleteWalletHandler(wallet: DashboardWallet) {
        setDeleteError('');
        setDeletingWallet(wallet);
    }

    async function deleteWalletHandler(wallet: DashboardWallet) {
        if (pending) return;
        setPending(true);
        setDeleteError('');
        try {
            await apiClient.deleteWallet(wallet.id);
            if (wallet.id === selectedWalletId) setSelectedId(undefined);
            setDeletingWallet(undefined);
            notify.success(t('delete.deleted'));
            await refreshWallets();
        } catch (error: unknown) {
            setDeleteError(
                t(
                    error instanceof ApiProblemError && error.status === 401
                        ? 'states.signInAgain'
                        : error instanceof ApiProblemError && error.status === 409
                          ? 'delete.conflict'
                          : 'delete.failed',
                ),
            );
        } finally {
            setPending(false);
        }
    }

    function retryMovementsHandler() {
        setMovementState({ status: 'loading' });
        setReloadKey((value) => value + 1);
    }

    function retryHandler() {
        setWalletState({ status: 'loading' });
        setSummaryState({ status: 'loading' });
        setMovementState({ status: 'loading' });
        setReloadKey((value) => value + 1);
    }

    return (
        <div className="flex min-h-full min-w-0 flex-col gap-5 box-border [&_*]:box-border [&_button]:[font-family:inherit] [&_button:focus-visible]:outline-2 [&_button:focus-visible]:outline-ring [&_button:focus-visible]:outline-offset-[3px]">
            <WalletsHeader
                onCreate={() => setDialog({ action: 'create' })}
                onConnect={() => setDialog({ action: 'connect' })}
            />

            <WalletsSummary
                total={total}
                walletCount={wallets.length}
                isWalletsReady={walletState.status === 'ready'}
                isWalletsLoading={walletState.status === 'loading'}
                summaryState={summaryState}
                onRetry={retryHandler}
            />

            {walletState.status === 'error' && (
                <Card
                    className="flex min-h-[200px] flex-col items-center justify-center gap-4 p-6 text-center text-muted-foreground"
                    role="alert"
                >
                    <p className="m-0">
                        {t(walletState.authenticationRequired ? 'states.signInAgain' : 'states.error')}
                    </p>
                    <Button variant="secondary" onClick={retryHandler}>
                        {t('actions.retry')}
                    </Button>
                </Card>
            )}
            <WalletCardsList
                wallets={wallets}
                isLoading={walletState.status === 'loading'}
                selectedId={selectedWalletId}
                onSelect={selectWalletHandler}
            />

            <div className="grid flex-1 grid-cols-1 items-stretch gap-5 min-[1301px]:min-h-[480px] min-[1301px]:grid-cols-[minmax(0,2fr)_minmax(360px,1fr)]">
                {selected === undefined ? (
                    <WalletsTable
                        wallets={wallets}
                        isLoading={walletState.status === 'loading'}
                        isReady={walletState.status === 'ready'}
                        onSelect={selectWalletHandler}
                        onEdit={(wallet) => setDialog({ action: 'edit', wallet })}
                        onDelete={requestDeleteWalletHandler}
                    />
                ) : (
                    <WalletDetails
                        wallet={selected}
                        wallets={wallets}
                        movementWalletId={movementWalletId}
                        movementState={movementState}
                        onAction={(action) => setDialog({ action, wallet: selected })}
                        onRetryMovements={retryMovementsHandler}
                    />
                )}
                <WalletDistributions
                    wallets={wallets}
                    total={total}
                    isLoading={walletState.status === 'loading'}
                    isReady={walletState.status === 'ready'}
                />
            </div>

            <ConfirmDeleteDialog
                item={deletingWallet}
                title={t('delete.title')}
                description={(wallet) => t('delete.description', { name: wallet.name })}
                pending={pending}
                error={deleteError}
                cancelLabel={t('actions.cancel')}
                confirmLabel={t('actions.delete')}
                onOpenChange={(open) => {
                    if (!open && !pending) setDeletingWallet(undefined);
                }}
                onConfirm={deleteWalletHandler}
            />

            {(dialog?.action === 'create' || dialog?.action === 'edit') && (
                <WalletEditorDialog
                    key={editorWallet?.id ?? 'create'}
                    accounts={accounts}
                    wallet={editorWallet}
                    pending={pending}
                    onClose={() => setDialog(undefined)}
                    onSave={saveWalletHandler}
                />
            )}
            <ComingSoonDialog
                open={dialog !== undefined && dialog.action !== 'create' && dialog.action !== 'edit'}
                onOpenChange={(open) => {
                    if (!open) setDialog(undefined);
                }}
            />
        </div>
    );
}

function WalletsHeader({ onCreate, onConnect }: { onCreate: () => void; onConnect: () => void }) {
    const t = useTranslations('WalletsDashboard');

    return (
        <header className="flex flex-col items-start justify-between gap-4 min-[701px]:flex-row min-[701px]:items-center">
            <div>
                <h1 className="m-0 text-[28px] leading-[1.2] min-[701px]:text-[32px]">{t('title')}</h1>
                <p className="mt-[7px] mb-0 text-sm text-muted-foreground">{t('description')}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2 [&_button]:shrink-0">
                <Button onClick={onCreate}>
                    <Plus aria-hidden="true" className="size-5" />
                    {t('actions.create')}
                </Button>
                <Button variant="outline" onClick={onConnect}>
                    <Landmark aria-hidden="true" className="size-4" />
                    {t('actions.connect')}
                </Button>
            </div>
        </header>
    );
}
