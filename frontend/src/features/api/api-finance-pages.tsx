'use client';

import { useCallback, useEffect, useState } from 'react';

import dayjs from 'dayjs';
import { useFormatter, useTranslations } from 'next-intl';

import { ConfirmDeleteDialog } from '@/components/shared/confirm-delete-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { DashboardPreview } from '@/features/dashboard/dashboard-preview';
import type { DashboardViewModel } from '@/features/dashboard/model';
import { ApiProblemError } from '@/lib/api/client';
import { apiClient, type ApiTransaction, type ApiTransactionType, type ApiWallet, type TransactionQuery } from '@/lib/api/client';

function useApiError() {
    const t = useTranslations('ApiFinance');
    return (error: unknown) => error instanceof ApiProblemError && error.code === 'authentication_required' ? t('signInAgain') : t('requestFailed');
}

export function ApiTransactionsPage() {
    const t = useTranslations('ApiFinance.transactions');
    const tCommon = useTranslations('Common');
    const errorText = useApiError();
    const format = useFormatter();
    const [rows, setRows] = useState<ApiTransaction[]>([]);
    const [types, setTypes] = useState<ApiTransactionType[]>([]);
    const [wallets, setWallets] = useState<ApiWallet[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);
    const [search, setSearch] = useState('');
    const [kind, setKind] = useState<TransactionQuery['kind']>();
    const [formKind, setFormKind] = useState<'Income' | 'Expense' | 'Transfer'>('Expense');
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const [editing, setEditing] = useState<ApiTransaction>();
    const [deleting, setDeleting] = useState<ApiTransaction>();
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [date, setDate] = useState(dayjs().format('YYYY-MM-DD'));
    const [typeId, setTypeId] = useState('');
    const [walletId, setWalletId] = useState('');
    const [destinationId, setDestinationId] = useState('');
    const [transfer, setTransfer] = useState(false);
    const load = useCallback(async (signal?: AbortSignal) => {
        try {
            const [result, nextTypes, nextWallets] = await Promise.all([
                apiClient.transactions({ page, pageSize, search: search.length === 0 ? undefined : search, kind, sortBy: 'Date', direction: 'Descending' }, signal),
                apiClient.transactionTypes(signal), apiClient.wallets(signal),
            ]);
            const balanceWallets = nextWallets.filter((wallet) => wallet.hasOwnBalance !== false);
            setRows(result.items); setTotal(result.totalCount); setTypes(nextTypes); setWallets(balanceWallets); setError('');
            setTypeId((current) => current || String(nextTypes.find((type) => type.name.toLowerCase() !== 'transfer')?.id ?? nextTypes[0]?.id ?? ''));
            setWalletId((current) => current || String(balanceWallets[0]?.id ?? ''));
            setDestinationId((current) => current || String(balanceWallets[1]?.id ?? ''));
        } catch (cause) { if (!signal?.aborted) setError(errorText(cause)); }
    }, [errorText, kind, page, pageSize, search]);
    useEffect(() => { const controller = new AbortController(); queueMicrotask(() => void load(controller.signal)); return () => controller.abort(); }, [load]);
    const save = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault(); setBusy(true); setError('');
        try {
            const type = transfer ? types.find((item) => item.name.toLowerCase() === 'transfer') : undefined;
            const body = { description: description.trim(), date, value: transfer ? Math.abs(Number(amount)) : formKind === 'Income' ? Math.abs(Number(amount)) : -Math.abs(Number(amount)), typeId: Number(type?.id ?? typeId), walletId: Number(walletId), destinationWalletId: transfer ? Number(destinationId) : null };
            if (editing) await apiClient.updateTransaction(editing.id, body);
            else await apiClient.createTransaction(body);
            setEditing(undefined); setDescription(''); setAmount(''); await load();
        } catch (cause) { setError(errorText(cause)); } finally { setBusy(false); }
    };
    const startEdit = (row: ApiTransaction) => { setEditing(row); setDescription(row.description ?? ''); setAmount(String(Math.abs(row.value))); setDate(row.date); setTypeId(String(row.type.id)); setWalletId(String(row.wallet.id)); setDestinationId(String(row.destination?.id ?? '')); setTransfer(Boolean(row.destination)); setFormKind(row.destination ? 'Transfer' : row.value >= 0 ? 'Income' : 'Expense'); };
    const maxPage = Math.max(1, Math.ceil(total / pageSize));
    const transactionFormTitle = editing === undefined ? t('create') : t('edit');
    return <div className="mx-auto grid w-full gap-6">
        <header><h1 className="m-0 text-3xl font-bold">{t('title')}</h1><p className="text-muted-foreground">{t('description')}</p></header>
        <Card><CardHeader><CardTitle>{transactionFormTitle}</CardTitle></CardHeader><CardContent>
            <form className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" onSubmit={(event) => void save(event)}>
                <Input required maxLength={200} aria-label={t('descriptionField')} placeholder={t('descriptionField')} value={description} onChange={(event) => setDescription(event.target.value)} />
                <Input required type="number" min="0.01" step="0.01" aria-label={t('amount')} placeholder={t('amount')} value={amount} onChange={(event) => setAmount(event.target.value)} />
                <Input required type="date" aria-label={t('date')} value={date} onChange={(event) => setDate(event.target.value)} />
                <select aria-label={t('type')} className="h-10 rounded-md border border-input bg-background px-3" value={typeId} onChange={(event) => setTypeId(event.target.value)}>{types.filter((item) => item.name.toLowerCase() !== 'transfer').map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
                <select aria-label={t('wallet')} className="h-10 rounded-md border border-input bg-background px-3" value={walletId} onChange={(event) => setWalletId(event.target.value)}>{wallets.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
                <select aria-label={t('kind')} className="h-10 rounded-md border border-input bg-background px-3" value={formKind} onChange={(event) => { const value = event.target.value as 'Income' | 'Expense' | 'Transfer'; setFormKind(value); setTransfer(value === 'Transfer'); }}><option value="Expense">{t('expense')}</option><option value="Income">{t('income')}</option><option value="Transfer">{t('transfer')}</option></select>
                {!!transfer && <select aria-label={t('destination')} className="h-10 rounded-md border border-input bg-background px-3" value={destinationId} onChange={(event) => setDestinationId(event.target.value)}>{wallets.filter((item) => item.id !== Number(walletId)).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>}
                <div className="flex gap-2"><Button disabled={busy || !walletId || !typeId} type="submit">{t('save')}</Button>{!!editing && <Button type="button" variant="outline" onClick={() => setEditing(undefined)}>{t('cancel')}</Button>}</div>
            </form>
        </CardContent></Card>
        <div className="flex flex-wrap gap-3"><Input className="max-w-sm" aria-label={t('search')} placeholder={t('search')} value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} /><select aria-label={t('kindFilter')} className="h-10 rounded-md border border-input bg-background px-3" value={kind ?? 'All'} onChange={(event) => { setKind(event.target.value === 'All' ? undefined : event.target.value as TransactionQuery['kind']); setPage(1); }}><option value="All">{t('allKinds')}</option><option value="Income">{t('income')}</option><option value="Expense">{t('expense')}</option><option value="Transfer">{t('transfer')}</option></select></div>
        {!!error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <Card><CardContent className="grid gap-3 p-4">{rows.map((row) => {
            const rowDescription = row.description !== null && row.description.length > 0 ? row.description : t('untitled');
            const destinationLabel = row.destination === null ? null : ` → ${row.destination.name}`;
            return <article key={row.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3"><div><strong>{rowDescription}</strong><p className="m-0 text-sm text-muted-foreground">{format.dateTime(dayjs(row.date).toDate(), { dateStyle: 'medium' })} · {row.type.name} · {row.wallet.name}{destinationLabel}</p></div><div className="flex items-center gap-3"><strong className="tabular-nums">{format.number(row.value, { style: 'currency', currency: 'EUR' })}</strong><Button type="button" variant="outline" onClick={() => startEdit(row)}>{t('edit')}</Button><Button type="button" variant="destructive" onClick={() => setDeleting(row)}>{t('delete')}</Button></div></article>;
        })}{rows.length === 0 && !error && <p className="text-muted-foreground">{t('empty')}</p>}
            <footer className="flex items-center justify-end gap-3"><label className="text-sm">{t('perPage')} <select value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1); }}><option>10</option><option>20</option><option>50</option><option>100</option></select></label><span>{page} / {maxPage}</span><Button type="button" variant="outline" disabled={page <= 1} onClick={() => setPage((current) => current - 1)}>{t('previous')}</Button><Button type="button" variant="outline" disabled={page >= maxPage} onClick={() => setPage((current) => current + 1)}>{t('next')}</Button></footer>
        </CardContent></Card>
        <ConfirmDeleteDialog
            item={deleting}
            title={t('deleteTitle')}
            description={(item) => t('deleteDescription', { name: item.description ?? t('untitled') })}
            cancelLabel={tCommon('actions.cancel')}
            confirmLabel={tCommon('actions.delete')}
            pending={busy}
            onOpenChange={(open) => { if (!open) setDeleting(undefined); }}
            onConfirm={async (item) => {
                setBusy(true);
                try { await apiClient.deleteTransaction(item.id); setDeleting(undefined); await load(); }
                catch (cause) { setError(errorText(cause)); }
                finally { setBusy(false); }
            }}
        />
    </div>;
}

export function ApiDashboardPage() {
    const t = useTranslations('ApiFinance.dashboard');
    const format = useFormatter();
    const errorText = useApiError();
    const [from, setFrom] = useState(dayjs().startOf('month').format('YYYY-MM-DD'));
    const [to, setTo] = useState(dayjs().endOf('month').format('YYYY-MM-DD'));
    const [data, setData] = useState<DashboardViewModel>();
    const [error, setError] = useState('');
    const load = useCallback(async (signal?: AbortSignal) => {
        try {
            const result = await apiClient.dashboard(from, to, signal);
            setData({ incoming: result.incoming, expense: result.expense, incomingCategories: result.incomingCategories.map(({ type, value }) => ({ id: type.id, name: type.name, value })), expenseCategories: result.expenseCategories.map(({ type, value }) => ({ id: type.id, name: type.name, value })) }); setError('');
        } catch (cause) { if (!signal?.aborted) setError(errorText(cause)); }
    }, [errorText, from, to]);
    useEffect(() => { const controller = new AbortController(); queueMicrotask(() => void load(controller.signal)); return () => controller.abort(); }, [load]);
    const states = { idle: t('loading'), loading: t('loading'), empty: t('empty'), error: t('requestFailed') };
    const dashboardState = data !== undefined
        ? { status: 'ready' as const, data }
        : error.length > 0 ? { status: 'error' as const, error: { message: 'dashboard_unavailable' } }
          : { status: 'loading' as const };
    return <div className="mx-auto grid w-full gap-6"><header><h1 className="m-0 text-3xl font-bold">{t('title')}</h1><p className="text-muted-foreground">{t('description')}</p></header>
        <div className="flex flex-wrap items-end gap-3"><label className="grid gap-1 text-sm">{t('from')}<Input type="date" value={from} onChange={(event) => setFrom(event.target.value)} /></label><label className="grid gap-1 text-sm">{t('to')}<Input type="date" value={to} onChange={(event) => setTo(event.target.value)} /></label></div>
        <DashboardPreview state={dashboardState} labels={{ incoming: t('incoming'), expense: t('expense'), categories: t('categories'), states }} formatMoney={(value) => format.number(value, { style: 'currency', currency: 'EUR' })} />
    </div>;
}
