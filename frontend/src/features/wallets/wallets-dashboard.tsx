'use client';

import { useEffect, useState } from 'react';

import dayjs from 'dayjs';
import { useFormatter, useTranslations } from 'next-intl';
import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts';
import { toast } from 'sonner';

import { ConfirmDeleteDialog } from '@/components/shared/confirm-delete-dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
    ArrowDown,
    ArrowLeftRight,
    ArrowRight,
    ArrowUp,
    Banknote,
    CreditCard,
    Landmark,
    Pencil,
    Plus,
    Trash2,
    Wallet,
    WalletCards,
} from '@/components/ui/icons';
import type { IconComponent } from '@/components/ui/icons';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { apiClient, ApiProblemError } from '@/lib/api/client';
import type { ApiDashboard, ApiTransaction, ApiWallet } from '@/lib/api/client';
import { cn } from '@/lib/utils';

import { newWalletIcons } from './new-wallet-model';
import type { NewWalletDraft } from './new-wallet-model';
import { walletDraftFromApi, walletRequestFromDraft } from './wallet-api-adapter';
import { WalletEditorDialog } from './wallet-editor-dialog';

type DashboardWallet = Omit<ApiWallet, 'currentValue' | 'initialValue'> & {
    currentValue?: number;
    initialValue?: number;
    draft?: NewWalletDraft;
};

type DialogAction = 'create' | 'connect' | 'edit' | 'transfer' | 'movement' | 'allMovements';
type LoadState<T> =
    | { status: 'loading' }
    | { status: 'error'; authenticationRequired: boolean }
    | { status: 'ready'; data: T };

const walletColor = (wallet: DashboardWallet) => `#${wallet.color.value.toString(16).padStart(6, '0')}`;

export function WalletsDashboard() {
    const t = useTranslations('WalletsDashboard');
    const tCreate = useTranslations('CreateWallet');
    const format = useFormatter();
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

    const money = (value: number) => format.number(value, { style: 'currency', currency: 'EUR' });
    const percentage = (value: number) => format.number(value, { style: 'percent', maximumFractionDigits: 0 });
    const total = wallets
        .filter((wallet) => wallet.includedInTotal !== false)
        .reduce((sum, wallet) => sum + (wallet.currentValue ?? 0), 0);
    // A pie cannot represent debt faithfully; keep signed balances in cards and the table.
    const distribution = wallets
        .filter((wallet) => wallet.currentValue !== undefined && wallet.includedInTotal !== false)
        .sort((a, b) => (b.currentValue ?? 0) - (a.currentValue ?? 0));
    const canShowDistribution =
        distribution.length > 0 && total > 0 && distribution.every((wallet) => (wallet.currentValue ?? 0) >= 0);
    const summary = summaryState.status === 'ready' ? summaryState.data : undefined;
    const summaryError = summaryState.status === 'error';
    const incomeValue = summary === undefined ? '—' : money(summary.incoming);
    const expenseValue = summary === undefined ? '—' : money(Math.abs(summary.expense));
    const dialogTitle = dialog === undefined ? '' : t(`dialogs.${dialog.action}`);
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
    const hasLinkedCards =
        editorWallet !== undefined && wallets.some((wallet) => wallet.draft?.linkedAccountId === editorWallet.id);
    const walletBalance = (wallet: DashboardWallet) =>
        wallet.currentValue === undefined ? '—' : money(wallet.currentValue);
    const walletType = (wallet: DashboardWallet) =>
        wallet.draft === undefined ? t('details.wallet') : tCreate(`kinds.${wallet.draft.kind}`);
    const walletStatus = () => t('details.statusUnavailable');

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
            toast.error(t('states.refreshError'));
            setWalletState({
                status: 'error',
                authenticationRequired: error instanceof ApiProblemError && error.status === 401,
            });
        }
    }

    async function saveWalletHandler(draft: NewWalletDraft) {
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
            toast.success(tCreate(editingWallet === undefined ? 'created' : 'updated'));
            await refreshWallets();
        } finally {
            setPending(false);
        }
    }

    async function deleteWalletHandler(wallet: DashboardWallet) {
        if (pending) return;
        setPending(true);
        setDeleteError('');
        try {
            await apiClient.deleteWallet(wallet.id);
            if (wallet.id === selectedWalletId) setSelectedId(undefined);
            setDeletingWallet(undefined);
            toast.success(t('delete.deleted'));
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

    function retryHandler() {
        setWalletState({ status: 'loading' });
        setSummaryState({ status: 'loading' });
        setMovementState({ status: 'loading' });
        setReloadKey((value) => value + 1);
    }

    const displayedMovementState = movementState;

    return (
        <div className="grid min-w-0 gap-4 box-border [&_*]:box-border [&_button]:[font-family:inherit] [&_button:focus-visible]:outline-2 [&_button:focus-visible]:outline-ring [&_button:focus-visible]:outline-offset-[3px]">
            <header className="flex flex-col items-start justify-between gap-4 min-[701px]:flex-row min-[701px]:items-center">
                <div>
                    <h1 className="m-0 text-[28px] leading-[1.2] min-[701px]:text-[32px]">{t('title')}</h1>
                    <p className="mt-[7px] mb-0 text-sm text-muted-foreground">{t('description')}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2 [&_button]:shrink-0">
                    <Button onClick={() => setDialog({ action: 'create' })}>
                        <Plus aria-hidden="true" className="size-5" />
                        {t('actions.create')}
                    </Button>
                    <Button variant="outline" onClick={() => setDialog({ action: 'connect' })}>
                        <Landmark aria-hidden="true" className="size-4" />
                        {t('actions.connect')}
                    </Button>
                </div>
            </header>

            <section className="grid grid-cols-2 gap-3 min-[1301px]:grid-cols-4" aria-label={t('summary.title')}>
                <SummaryCard
                    icon={Wallet}
                    label={t('summary.balance')}
                    value={walletState.status === 'ready' ? money(total) : '—'}
                    note={t('summary.comparisonUnavailable')}
                    tone="transfer"
                />
                <SummaryCard
                    icon={WalletCards}
                    label={t('summary.accounts')}
                    value={walletState.status === 'ready' ? format.number(wallets.length) : '—'}
                    note={t('summary.walletCount')}
                    tone="transfer"
                />
                <SummaryCard
                    icon={ArrowUp}
                    label={t('summary.income')}
                    value={incomeValue}
                    note={t('summary.currentMonth')}
                    tone="income"
                />
                <SummaryCard
                    icon={ArrowDown}
                    label={t('summary.expense')}
                    value={expenseValue}
                    note={t('summary.currentMonth')}
                    tone="expense"
                />
            </section>
            {!!summaryError && (
                <div className="flex items-center justify-between gap-3 text-xs text-destructive" role="alert">
                    <span>{t(summaryState.authenticationRequired ? 'states.signInAgain' : 'states.summaryError')}</span>
                    <Button variant="ghost" size="sm" onClick={retryHandler}>
                        {t('actions.retry')}
                    </Button>
                </div>
            )}

            {walletState.status === 'loading' && (
                <Card
                    className="flex min-h-[200px] flex-col items-center justify-center gap-4 p-6 text-center text-muted-foreground"
                    role="status"
                    aria-busy="true"
                >
                    {t('states.loading')}
                </Card>
            )}
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
            <section aria-labelledby="wallets-list-title">
                <div className="mb-2.5 flex items-center justify-between gap-3">
                    <h2 className="m-0 text-base font-[650]" id="wallets-list-title">
                        {t('list.title')}
                    </h2>
                </div>
                <div className="grid grid-cols-[repeat(auto-fit,minmax(210px,1fr))] gap-3 max-[701px]:grid-cols-[repeat(auto-fit,minmax(190px,1fr))]">
                    {wallets.map((wallet) => (
                        <button
                            key={wallet.id}
                            type="button"
                            className={cn(
                                'min-w-0 cursor-pointer rounded-xl border border-solid border-border bg-card px-3.5 pt-4 pb-3 text-left text-card-foreground transition-colors duration-150 hover:border-muted-foreground',
                                wallet.id === selectedWalletId &&
                                    'border-primary hover:border-primary bg-[color-mix(in_oklch,var(--primary)_5%,var(--card))] shadow-[inset_0_0_0_1px_var(--primary)]',
                            )}
                            aria-pressed={wallet.id === selectedWalletId}
                            onClick={() => selectWalletHandler(wallet)}
                        >
                            <div className="flex min-w-0 items-start gap-3.5">
                                <WalletMark wallet={wallet} />
                                <div className="min-w-0">
                                    <h3 className="m-0 truncate text-sm font-semibold" title={wallet.name}>
                                        {wallet.name}
                                    </h3>
                                    <p className="mt-1 mb-0 text-xs text-muted-foreground">{walletType(wallet)}</p>
                                    <strong className="mt-2.5 block text-[21px] font-semibold tabular-nums">
                                        {walletBalance(wallet)}
                                    </strong>
                                </div>
                            </div>
                            <div className="mt-4 flex items-center justify-between gap-2">
                                <span className="inline-flex items-center gap-[7px] text-[11px] whitespace-nowrap text-muted-foreground [&>span]:size-2 [&>span]:rounded-full [&>span]:bg-muted-foreground">
                                    <span />
                                    {walletStatus()}
                                </span>
                                <span className="rounded-lg bg-secondary px-[9px] py-[5px] text-[11px]">
                                    {walletType(wallet)}
                                </span>
                            </div>
                        </button>
                    ))}
                </div>
            </section>

            {wallets.length > 0 && (
                <>
                    <div className="grid grid-cols-1 items-start gap-3.5 min-[1301px]:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
                        {selected === undefined && (
                            <Card className="min-w-0 overflow-hidden shadow-none">
                                <h2 className="mt-0 mb-2.5 px-3.5 pt-3 text-base font-[650]">{t('table.title')}</h2>
                                <Table className="min-w-[780px] border-collapse">
                                    <TableHeader>
                                        <TableRow>
                                            {[
                                                'name',
                                                'type',
                                                'institution',
                                                'balance',
                                                'updated',
                                                'status',
                                                'actions',
                                            ].map((key) => (
                                                <TableHead
                                                    key={key}
                                                    className={cn(
                                                        'h-8 bg-muted text-[11px]',
                                                        key === 'balance' && 'text-right',
                                                    )}
                                                >
                                                    {t(`table.${key}`)}
                                                </TableHead>
                                            ))}
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {wallets.map((wallet) => (
                                            <TableRow
                                                key={wallet.id}
                                                className="[&>td]:px-4 [&>td]:py-1 [&>td]:text-xs [&>td:last-child]:w-20"
                                            >
                                                <TableCell>
                                                    <Button
                                                        type="button"
                                                        className="inline-flex cursor-pointer items-center gap-2.5 border-0 bg-transparent px-0 py-[5px] text-left text-[length:inherit] text-inherit"
                                                        onClick={() => selectWalletHandler(wallet)}
                                                    >
                                                        <Wallet
                                                            aria-hidden="true"
                                                            className="size-4"
                                                            style={{ color: walletColor(wallet) }}
                                                        />
                                                        {wallet.name}
                                                    </Button>
                                                </TableCell>
                                                <TableCell>{walletType(wallet)}</TableCell>
                                                <TableCell>{wallet.draft?.institution ?? '—'}</TableCell>
                                                <TableCell className="text-right tabular-nums">
                                                    {walletBalance(wallet)}
                                                </TableCell>
                                                <TableCell>—</TableCell>
                                                <TableCell>
                                                    <span className="inline-flex items-center gap-[7px] text-[11px] whitespace-nowrap text-muted-foreground [&>span]:size-2 [&>span]:rounded-full [&>span]:bg-muted-foreground">
                                                        <span />
                                                        {walletStatus()}
                                                    </span>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-1">
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="icon"
                                                            className="size-8"
                                                            aria-label={t('actions.editFor', { name: wallet.name })}
                                                            title={t('actions.edit')}
                                                            onClick={() => setDialog({ action: 'edit', wallet })}
                                                        >
                                                            <Pencil aria-hidden="true" className="size-4" />
                                                        </Button>
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="icon"
                                                            className="size-8 text-destructive"
                                                            aria-label={t('actions.deleteFor', { name: wallet.name })}
                                                            title={t('actions.delete')}
                                                            onClick={() => {
                                                                setDeleteError('');
                                                                setDeletingWallet(wallet);
                                                            }}
                                                        >
                                                            <Trash2 aria-hidden="true" className="size-4" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </Card>
                        )}
                        {selected !== undefined && (
                            <Card className="min-w-0 p-3.5 shadow-none max-[701px]:p-3">
                                <div className="mb-3.5 flex flex-wrap items-center justify-between gap-2">
                                    <h2 className="m-0 text-base font-[650]">{t('details.title')}</h2>
                                    <div className="flex flex-wrap items-center gap-2 [&_button]:shrink-0">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setDialog({ action: 'edit', wallet: selected })}
                                        >
                                            {t('actions.edit')}
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setDialog({ action: 'transfer', wallet: selected })}
                                        >
                                            <ArrowLeftRight aria-hidden="true" className="size-4" />
                                            {t('actions.transfer')}
                                        </Button>
                                        <Button
                                            size="sm"
                                            onClick={() => setDialog({ action: 'movement', wallet: selected })}
                                        >
                                            <Plus aria-hidden="true" className="size-4" />
                                            {t('actions.movement')}
                                        </Button>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 gap-[18px] min-[701px]:grid-cols-[minmax(210px,0.85fr)_minmax(0,1.2fr)]">
                                    <div className="min-w-0">
                                        <div className="flex min-w-0 items-start gap-3.5">
                                            <WalletMark wallet={selected} />
                                            <div>
                                                <h3 className="m-0 overflow-hidden text-sm font-semibold text-ellipsis">
                                                    {selected.name}
                                                </h3>
                                                <p className="mt-1 mb-0 text-xs text-muted-foreground">
                                                    {walletType(selected)}
                                                </p>
                                            </div>
                                        </div>
                                        <dl className="mt-4 mb-0 text-xs">
                                            {[
                                                [t('details.balance'), walletBalance(selected)],
                                                [t('details.availableBalance'), '—'],
                                                [t('details.bookBalance'), '—'],
                                                [t('details.type'), walletType(selected)],
                                                [t('details.institution'), selected.draft?.institution ?? '—'],
                                                [t('details.iban'), selected.draft?.iban ?? '—'],
                                                ...(selected.draft?.linkedAccountId !== undefined
                                                    ? [
                                                          [
                                                              tCreate('fields.linkedAccount'),
                                                              wallets.find(
                                                                  (wallet) =>
                                                                      wallet.id === selected.draft?.linkedAccountId,
                                                              )?.name ?? '—',
                                                          ],
                                                      ]
                                                    : []),
                                                ...(selected.draft?.kind === 'credit'
                                                    ? [
                                                          [
                                                              tCreate('fields.creditLimit'),
                                                              money(selected.draft.creditLimit ?? 0),
                                                          ],
                                                          [
                                                              tCreate('fields.currentSpending'),
                                                              money(selected.draft.currentSpending ?? 0),
                                                          ],
                                                      ]
                                                    : []),
                                                [t('details.updated'), '—'],
                                            ].map(([label, value]) => (
                                                <div
                                                    key={label}
                                                    className="grid grid-cols-[1fr_1.15fr] gap-2.5 border-t border-border py-2"
                                                >
                                                    <dt className="text-muted-foreground">{label}</dt>
                                                    <dd className="m-0 tabular-nums [overflow-wrap:anywhere]">
                                                        {value}
                                                    </dd>
                                                </div>
                                            ))}
                                        </dl>
                                    </div>
                                    <section
                                        className="min-w-0 self-start rounded-lg border border-solid border-border"
                                        aria-labelledby="wallets-movements-title"
                                    >
                                        <div className="m-0 flex flex-wrap items-center justify-between gap-2 border-b border-border px-2.5 py-0.5">
                                            <h3 className="m-0 text-[13px]" id="wallets-movements-title">
                                                {t(
                                                    selected.draft?.kind === 'debit'
                                                        ? 'movements.linkedAccount'
                                                        : 'movements.title',
                                                )}
                                            </h3>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => setDialog({ action: 'allMovements', wallet: selected })}
                                            >
                                                {t('actions.viewAll')}
                                                <ArrowRight aria-hidden="true" className="size-4" />
                                            </Button>
                                        </div>
                                        {displayedMovementState.status === 'loading' && (
                                            <p
                                                className="m-0 px-3.5 py-7 text-center text-xs text-muted-foreground"
                                                role="status"
                                            >
                                                {t('movements.loading')}
                                            </p>
                                        )}
                                        {displayedMovementState.status === 'error' && (
                                            <div
                                                className="px-3.5 py-7 text-center text-xs text-muted-foreground"
                                                role="alert"
                                            >
                                                <p className="m-0">
                                                    {t(
                                                        displayedMovementState.authenticationRequired
                                                            ? 'states.signInAgain'
                                                            : 'movements.error',
                                                    )}
                                                </p>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => {
                                                        setMovementState({ status: 'loading' });
                                                        setReloadKey((value) => value + 1);
                                                    }}
                                                >
                                                    {t('actions.retry')}
                                                </Button>
                                            </div>
                                        )}
                                        {displayedMovementState.status === 'ready' &&
                                            displayedMovementState.data.length === 0 && (
                                                <p className="m-0 px-3.5 py-7 text-center text-xs text-muted-foreground">
                                                    {t('movements.empty')}
                                                </p>
                                            )}
                                        {displayedMovementState.status === 'ready' &&
                                            displayedMovementState.data.length > 0 && (
                                                <div>
                                                    {displayedMovementState.data.map((movement) => {
                                                        const isTransfer = movement.destination !== null;
                                                        const MovementIcon = isTransfer
                                                            ? ArrowLeftRight
                                                            : movement.value >= 0
                                                              ? ArrowUp
                                                              : ArrowDown;
                                                        const signedValue = isTransfer
                                                            ? movement.destination?.id === movementWalletId
                                                                ? Math.abs(movement.value)
                                                                : -Math.abs(movement.value)
                                                            : movement.value;
                                                        const tone = isTransfer
                                                            ? 'text-transfer'
                                                            : signedValue >= 0
                                                              ? 'text-income'
                                                              : 'text-expense';
                                                        return (
                                                            <div
                                                                key={movement.id}
                                                                className="grid grid-cols-[75px_20px_minmax(65px,1fr)_auto] items-center gap-2.5 px-2.5 py-3 text-[11px] [&+div]:border-t [&+div]:border-border max-[701px]:grid-cols-[65px_16px_minmax(40px,1fr)_auto] max-[701px]:gap-1.5 max-[701px]:px-2 min-[1700px]:grid-cols-[85px_20px_minmax(65px,1fr)_75px_auto]"
                                                            >
                                                                <time
                                                                    className="text-muted-foreground"
                                                                    dateTime={movement.date}
                                                                >
                                                                    {format.dateTime(dayjs(movement.date).toDate(), {
                                                                        day: '2-digit',
                                                                        month: 'short',
                                                                        year: 'numeric',
                                                                    })}
                                                                </time>
                                                                <MovementIcon
                                                                    aria-hidden="true"
                                                                    className={cn('size-5', tone)}
                                                                />
                                                                <span
                                                                    className="truncate"
                                                                    title={movement.description ?? undefined}
                                                                >
                                                                    {movement.description ?? t('movements.untitled')}
                                                                </span>
                                                                <span className="hidden truncate text-muted-foreground min-[1700px]:block">
                                                                    {movement.type.name}
                                                                </span>
                                                                <strong
                                                                    className={cn(
                                                                        'text-right text-xs whitespace-nowrap tabular-nums max-[701px]:text-[11px]',
                                                                        tone,
                                                                    )}
                                                                >
                                                                    {format.number(signedValue, {
                                                                        style: 'currency',
                                                                        currency: 'EUR',
                                                                        signDisplay: 'always',
                                                                    })}
                                                                </strong>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                    </section>
                                </div>
                            </Card>
                        )}

                        <aside
                            className="grid min-w-0 gap-2.5 min-[701px]:max-[1301px]:grid-cols-2"
                            aria-label={t('distribution.title')}
                        >
                            <Card className="min-w-0 p-3.5 shadow-none">
                                <h2 className="mt-0 mb-2.5 text-base font-[650]">{t('distribution.title')}</h2>
                                {canShowDistribution ? (
                                    <div className="grid grid-cols-[135px_minmax(0,1fr)] items-center gap-3 min-[1700px]:grid-cols-[155px_minmax(0,1fr)]">
                                        <div
                                            className="relative h-[145px] min-w-0 min-[1700px]:h-40"
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
                                                        isAnimationActive={false}
                                                    >
                                                        {distribution.map((wallet) => (
                                                            <Cell key={wallet.id} fill={walletColor(wallet)} />
                                                        ))}
                                                    </Pie>
                                                </PieChart>
                                            </ResponsiveContainer>
                                            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-[5px]">
                                                <strong className="text-xs tabular-nums">{money(total)}</strong>
                                                <span className="text-[11px] text-muted-foreground">
                                                    {t('distribution.total')}
                                                </span>
                                            </div>
                                        </div>
                                        <ul className="m-0 grid list-none gap-3 p-0">
                                            {distribution.map((wallet) => (
                                                <li
                                                    key={wallet.id}
                                                    className="grid grid-cols-[9px_minmax(45px,1fr)_auto_28px] items-center gap-[7px] text-[10px]"
                                                >
                                                    <span
                                                        className="size-[9px] rounded-full"
                                                        style={{ backgroundColor: walletColor(wallet) }}
                                                    />
                                                    <span className="truncate" title={wallet.name}>
                                                        {wallet.name}
                                                    </span>
                                                    <strong className="font-semibold tabular-nums">
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
                                    <p className="m-0 px-3.5 py-7 text-center text-xs text-muted-foreground">
                                        {t('distribution.unavailable')}
                                    </p>
                                )}
                            </Card>
                            <Card className="min-w-0 p-3.5 shadow-none">
                                <h2 className="mt-0 mb-2.5 text-base font-[650]">{t('distribution.byType')}</h2>
                                <div className="grid gap-2">
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
                                            .filter(
                                                (wallet) =>
                                                    wallet.draft?.kind === kind && wallet.includedInTotal !== false,
                                            )
                                            .reduce((sum, wallet) => sum + (wallet.currentValue ?? 0), 0);
                                        const ratio = canShowDistribution ? value / total : 0;
                                        return (
                                            <div
                                                key={key}
                                                className="grid grid-cols-[16px_95px_minmax(30px,1fr)_auto] items-center gap-2 text-[11px]"
                                            >
                                                <Icon aria-hidden="true" className={cn('size-4', colorClassName)} />
                                                <span>{t(`distribution.${key}`)}</span>
                                                <span
                                                    className="h-[9px] overflow-hidden rounded bg-muted"
                                                    aria-hidden="true"
                                                >
                                                    <span
                                                        className={cn(
                                                            'block h-full rounded bg-current',
                                                            colorClassName,
                                                        )}
                                                        style={{ width: `${Math.max(0, Math.min(1, ratio)) * 100}%` }}
                                                    />
                                                </span>
                                                <span className="tabular-nums">{money(value)}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                                <p className="mt-2.5 mb-0 text-[10px] text-muted-foreground">
                                    {t('distribution.excludedCards')}
                                </p>
                            </Card>
                        </aside>
                    </div>
                </>
            )}

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
                    hasLinkedCards={hasLinkedCards}
                    onClose={() => setDialog(undefined)}
                    onSave={saveWalletHandler}
                />
            )}
            <Dialog
                open={dialog !== undefined && dialog.action !== 'create' && dialog.action !== 'edit'}
                onOpenChange={(open) => {
                    if (!open) setDialog(undefined);
                }}
            >
                <DialogContent closeLabel={t('actions.close')} aria-describedby={undefined}>
                    <DialogHeader>
                        <DialogTitle className="m-0 pr-6">{dialogTitle}</DialogTitle>
                    </DialogHeader>
                    <div className="min-h-40" />
                </DialogContent>
            </Dialog>
        </div>
    );
}

function WalletMark({ wallet }: { wallet: DashboardWallet }) {
    const color = walletColor(wallet);
    const Icon = wallet.draft === undefined ? Wallet : newWalletIcons[wallet.draft.kind];
    return (
        <span
            className="flex size-[46px] shrink-0 items-center justify-center rounded-[10px] bg-[color-mix(in_oklch,currentColor_18%,transparent)]"
            style={{ color }}
        >
            <Icon aria-hidden="true" className="size-6" />
        </span>
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
    note,
    tone,
}: {
    icon: IconComponent;
    label: string;
    value: string;
    note: string;
    tone: 'transfer' | 'income' | 'expense';
}) {
    return (
        <Card className="flex items-center gap-4 px-4 py-5 shadow-none max-[701px]:items-start max-[701px]:gap-2.5 max-[701px]:px-2.5 max-[701px]:py-3.5">
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
                <strong className="text-[clamp(20px,1.6vw,26px)] font-semibold tabular-nums max-[701px]:text-lg max-[701px]:[overflow-wrap:anywhere]">
                    {value}
                </strong>
                <p className="mt-2 mb-0 text-[11px] text-muted-foreground max-[701px]:text-[10px]">{note}</p>
            </div>
        </Card>
    );
}
