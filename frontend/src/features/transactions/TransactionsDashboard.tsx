'use client';

import { useState } from 'react';

import { useTranslations } from 'next-intl';

import { ConfirmDeleteDialog } from '@/components/shared/confirm-delete-dialog';
import { Button } from '@/components/ui/button';
import { ApiProblemError, apiClient } from '@/lib/api/client';
import type { ApiTransaction } from '@/lib/api/client';
import { notify } from '@/lib/notifications';

import { TransactionCategoriesCard } from './TransactionCategoriesCard';
import { TransactionEditorDialog } from './TransactionEditorDialog';
import { TransactionsFilters } from './TransactionsFilters';
import { TransactionsHeader } from './TransactionsHeader';
import { TransactionsList } from './TransactionsList';
import { TransactionsRecent } from './TransactionsRecent';
import { TransactionSummary } from './TransactionSummary';
import { TransactionWeeklyCard } from './TransactionWeeklyCard';
import { useTransactionsDashboard } from './useTransactionsDashboard';

export function TransactionsDashboard() {
    const t = useTranslations('Movements');
    const dashboard = useTransactionsDashboard();
    const { filters, overview, recent, wallets, types, summaryLoading } = dashboard;
    const [editorOpen, setEditorOpen] = useState(false);
    const [editing, setEditing] = useState<ApiTransaction>();
    const [deleting, setDeleting] = useState<ApiTransaction>();
    const [deletingPending, setDeletingPending] = useState(false);
    const [deleteError, setDeleteError] = useState('');
    const error = dashboard.error || dashboard.metadataError || dashboard.summaryError;
    const analytics = {
        overview,
        from: filters.from!,
        to: filters.to!,
        loading: summaryLoading,
        failed: dashboard.summaryError.length > 0,
    };

    function savedHandler() {
        setEditorOpen(false);
        setEditing(undefined);
        dashboard.retryHandler();
        notify.success(t(editing ? 'editor.updated' : 'editor.created'));
    }

    async function editHandler(row: ApiTransaction) {
        try {
            const transaction = await apiClient.transaction(row.id);
            setEditing(transaction);
            setEditorOpen(true);
        } catch (cause) {
            notify.error(t(cause instanceof ApiProblemError && cause.status === 401 ? 'editor.signInAgain' : 'editor.loadFailed'));
        }
    }

    async function deleteHandler(row: ApiTransaction) {
        setDeletingPending(true);
        setDeleteError('');
        try {
            await apiClient.deleteTransaction(row.id);
            setDeleting(undefined);
            dashboard.retryHandler();
            notify.success(t('editor.deleted'));
        } catch (cause) {
            setDeleteError(t(cause instanceof ApiProblemError && cause.status === 401 ? 'editor.signInAgain' : 'editor.deleteFailed'));
        } finally { setDeletingPending(false); }
    }

    const actions = { onEdit: editHandler, onDelete: (row: ApiTransaction) => { setDeleteError(''); setDeleting(row); } };

    return (
        <div className="mx-auto grid w-full min-w-0 gap-3.5">
            <TransactionsHeader filters={filters} onAdd={() => { setEditing(undefined); setEditorOpen(true); }} />

            {!!editorOpen && (
                <TransactionEditorDialog
                    wallets={wallets}
                    types={types}
                    walletId={filters.walletId}
                    typeId={filters.typeId}
                    transaction={editing}
                    metadataLoading={dashboard.metadataLoading}
                    metadataError={dashboard.metadataError}
                    onRetry={dashboard.retryHandler}
                    onClose={() => setEditorOpen(false)}
                    onSaved={savedHandler}
                    onCategoryCreated={dashboard.categoryCreatedHandler}
                />
            )}

            <TransactionSummary {...analytics} />
            <TransactionsFilters
                filters={filters}
                search={dashboard.search}
                wallets={wallets}
                types={types}
                onSearchChange={dashboard.setSearch}
                onFilterChange={dashboard.filterHandler}
                onReset={dashboard.resetHandler}
            />

            {!!error && (
                <div
                    role="alert"
                    className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
                >
                    <span>{error}</span>
                    <Button type="button" size="sm" variant="outline" onClick={dashboard.retryHandler}>
                        {t('actions.retry')}
                    </Button>
                </div>
            )}

            <div className="grid min-w-0 items-start gap-3 min-[1380px]:grid-cols-[minmax(0,1.9fr)_minmax(350px,1fr)]">
                <TransactionsList
                    {...actions}
                    rows={dashboard.rows}
                    loading={dashboard.loading}
                    error={dashboard.error}
                    total={dashboard.total}
                    page={dashboard.page}
                    pageSize={dashboard.pageSize}
                    sort={dashboard.sort}
                    onSortChange={dashboard.setSort}
                    onPageChange={dashboard.setPage}
                    onPageSizeChange={dashboard.setPageSize}
                />
                <aside
                    className="grid min-w-0 gap-2.5 sm:grid-cols-2 min-[1380px]:grid-cols-1"
                    aria-label={t('charts.overview')}
                >
                    <TransactionCategoriesCard {...analytics} types={types} />
                    <TransactionWeeklyCard {...analytics} />
                    <TransactionsRecent rows={recent} loading={summaryLoading} failed={analytics.failed} {...actions} />
                </aside>
            </div>
            <ConfirmDeleteDialog
                item={deleting} title={t('dialog.deleteTitle')}
                description={(row) => t('dialog.deleteDescription', { name: row.description ?? t('list.untitled') })}
                pending={deletingPending} error={deleteError}
                cancelLabel={t('actions.cancel')} confirmLabel={t('actions.delete')}
                onOpenChange={(open) => { if (!open && !deletingPending) setDeleting(undefined); }}
                onConfirm={deleteHandler}
            />
        </div>
    );
}
