'use client';

import { useState } from 'react';

import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { notify } from '@/lib/notifications';

import type { TransactionDraft } from './transaction-editor-model';
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
    const { filters, period, previous, wallets, types, summaryLoading } = dashboard;
    const [editorOpen, setEditorOpen] = useState(false);
    const [draft, setDraft] = useState<TransactionDraft>();
    const error = dashboard.error || dashboard.metadataError || dashboard.summaryError;
    const analytics = {
        rows: period,
        from: filters.from!,
        to: filters.to!,
        loading: summaryLoading,
        failed: dashboard.summaryError.length > 0,
    };

    function createdHandler() {
        setEditorOpen(false);
        setDraft(undefined);
        dashboard.retryHandler();
        notify.success(t('editor.created'));
    }

    function saveDraftHandler(nextDraft: TransactionDraft) {
        setDraft(nextDraft);
        setEditorOpen(false);
        notify.success(t('editor.draftSaved'));
    }

    return (
        <div className="mx-auto grid w-full min-w-0 gap-3.5">
            <TransactionsHeader {...analytics} hasDraft={draft !== undefined} onAdd={() => setEditorOpen(true)} />

            {!!editorOpen && (
                <TransactionEditorDialog
                    wallets={wallets}
                    types={types}
                    walletId={filters.walletId}
                    typeId={filters.typeId}
                    draft={draft}
                    metadataLoading={dashboard.metadataLoading}
                    metadataError={dashboard.metadataError}
                    onRetry={dashboard.retryHandler}
                    onClose={() => setEditorOpen(false)}
                    onCreated={createdHandler}
                    onSaveDraft={saveDraftHandler}
                    onCategoryCreated={dashboard.categoryCreatedHandler}
                />
            )}

            <TransactionSummary {...analytics} previous={previous} />
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
                    <TransactionCategoriesCard {...analytics} />
                    <TransactionWeeklyCard {...analytics} />
                    <TransactionsRecent {...analytics} />
                </aside>
            </div>
        </div>
    );
}
