'use client';

import { useState } from 'react';

import dayjs from 'dayjs';
import { useFormatter, useTranslations } from 'next-intl';

import { DateRangeField } from '@/components/shared/date-range-field';
import type { DayjsDateRange } from '@/components/shared/date-range-field';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
    ArrowUpDown,
    ChevronLeft,
    ChevronRight,
    Download,
    Ellipsis,
    Plus,
    RotateCcw,
    Search,
    Tag,
    Wallet,
} from '@/components/ui/icons';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { ApiTransaction, TransactionQuery } from '@/lib/api/client';
import { notify } from '@/lib/notifications';
import { cn } from '@/lib/utils';

import { TransactionCharts, TransactionSummary } from './transaction-charts';
import { CategoryMark, TransactionAmount, WalletLabel } from './transaction-display';
import { TransactionEditorDialog } from './transaction-editor-dialog';
import type { TransactionDraft } from './transaction-editor-model';
import { transactionKind, useTransactionsDashboard } from './use-transactions-dashboard';

export function TransactionsDashboard() {
    const t = useTranslations('Movements');
    const format = useFormatter();
    const dashboard = useTransactionsDashboard();
    const { filters, rows, period, previous, wallets, types, loading, summaryLoading, total, page, pageSize, sort } =
        dashboard;
    const [dateRange, setDateRange] = useState<DayjsDateRange>(() => ({
        start: dayjs(filters.from),
        end: dayjs(filters.to),
    }));
    const [editorOpen, setEditorOpen] = useState(false);
    const [draft, setDraft] = useState<TransactionDraft>();
    const addLabel = draft === undefined ? t('actions.add') : t('editor.resumeDraft');
    const money = (value: number) => format.number(value, { style: 'currency', currency: 'EUR' });
    const date = (value: string) =>
        format.dateTime(dayjs(value).toDate(), { day: '2-digit', month: 'short', year: 'numeric' });
    const maxPage = Math.max(1, Math.ceil(total / pageSize));
    const firstPage = Math.max(1, Math.min(page - 2, maxPage - 4));
    const pages = Array.from({ length: Math.min(5, maxPage) }, (_, index) => firstPage + index);
    const error = dashboard.error || dashboard.metadataError || dashboard.summaryError;
    const analytics = {
        rows: period,
        previous,
        from: filters.from!,
        to: filters.to!,
        loading: summaryLoading,
        failed: dashboard.summaryError.length > 0,
    };
    const listStatus = loading ? t('states.loading') : dashboard.error ? '—' : t('list.count', { count: total });
    const emptyStatus = loading ? t('states.loading') : dashboard.error ? t('states.error') : t('states.empty');
    const recentStatus = summaryLoading
        ? t('states.loading')
        : dashboard.summaryError
          ? t('states.error')
          : t('states.empty');
    const columns: { label: string; key?: TransactionQuery['sortBy']; align?: 'right' }[] = [
        { label: t('list.date'), key: 'Date' },
        { label: t('list.description'), key: 'Description' },
        { label: t('list.kind') },
        { label: t('list.category'), key: 'Type' },
        { label: t('list.wallet'), key: 'Wallet' },
        { label: t('list.amount'), key: 'Value', align: 'right' },
    ];

    function sortHandler(key: NonNullable<TransactionQuery['sortBy']>) {
        dashboard.setSort({
            sortBy: key,
            direction: sort.sortBy === key && sort.direction === 'Descending' ? 'Ascending' : 'Descending',
        });
        dashboard.setPage(1);
    }

    function resetHandler() {
        dashboard.resetHandler();
        setDateRange({ start: dayjs().startOf('month'), end: dayjs().endOf('month') });
    }

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

    function exportHandler() {
        const escape = (value: string) =>
            `"${(/^[=+\-@\t\r]/.test(value) ? `'${value}` : value).replaceAll('"', '""')}"`;
        const content = [
            [
                t('list.date'),
                t('list.description'),
                t('list.kind'),
                t('list.category'),
                t('list.wallet'),
                t('list.destination'),
                t('list.amount'),
            ],
            ...period.map((row) => [
                row.date,
                row.description ?? '',
                t(`filters.${transactionKind(row).toLowerCase()}`),
                row.type.name,
                row.wallet.name,
                row.destination?.name ?? '',
                String(row.value),
            ]),
        ]
            .map((line) => line.map(escape).join(';'))
            .join('\r\n');
        const url = URL.createObjectURL(new Blob(['\uFEFF', content], { type: 'text/csv;charset=utf-8;' }));
        const link = document.createElement('a');
        link.href = url;
        link.download = `flowiy-${filters.from}-${filters.to}.csv`;
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 0);
    }

    function columnHeading(column: { label: string; key?: TransactionQuery['sortBy']; align?: 'right' }) {
        const key = column.key;
        if (!key) return column.label;
        return (
            <button
                type="button"
                className={cn(
                    'inline-flex cursor-pointer items-center gap-1 border-0 bg-transparent p-0 text-inherit focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    column.align === 'right' && 'justify-end',
                )}
                onClick={() => sortHandler(key)}
            >
                {column.label}
                <ArrowUpDown aria-hidden="true" className={cn('size-3', sort.sortBy !== key && 'opacity-50')} />
            </button>
        );
    }

    function columnSort(key: TransactionQuery['sortBy']) {
        if (sort.sortBy !== key) return undefined;
        return sort.direction === 'Ascending' ? ('ascending' as const) : ('descending' as const);
    }

    function categoryLabel(row: ApiTransaction) {
        return row.destination !== null ? t('summary.transfers') : row.type.name;
    }

    function currentPage(number: number) {
        return page === number ? ('page' as const) : undefined;
    }

    function actions(row: ApiTransaction) {
        return (
            <Button
                type="button"
                size="icon"
                variant="transparent"
                className="size-7"
                aria-label={t('actions.more', { name: row.description ?? t('list.untitled') })}
                title={t('actions.deferred')}
                onClick={() => notify.info(t('actions.deferred'))}
            >
                <Ellipsis aria-hidden="true" className="size-5" />
            </Button>
        );
    }

    return (
        <div className="mx-auto grid w-full min-w-0 gap-3.5">
            <header className="flex flex-wrap items-start justify-between gap-4">
                <div>
                    <h1 className="m-0 text-3xl font-bold tracking-tight sm:text-4xl">{t('title')}</h1>
                    <p className="m-0 mt-1.5 text-sm text-muted-foreground sm:text-base">{t('description')}</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <Button type="button" className="h-11 px-5" onClick={() => setEditorOpen(true)}>
                        <Plus aria-hidden="true" className="size-5" />
                        {addLabel}
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        className="h-11 border border-solid border-input px-5"
                        disabled={summaryLoading || !!dashboard.summaryError || period.length === 0}
                        onClick={exportHandler}
                    >
                        <Download aria-hidden="true" className="size-5" />
                        {t('actions.export')}
                    </Button>
                </div>
            </header>

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

            <TransactionSummary {...analytics} />

            <Card
                className="grid min-w-0 gap-2.5 rounded-lg p-2.5 shadow-none sm:grid-cols-2 xl:grid-cols-[minmax(180px,1.3fr)_minmax(235px,1.15fr)_minmax(145px,.9fr)_minmax(130px,.8fr)_minmax(150px,1fr)_auto]"
                aria-label={t('filters.title')}
            >
                <div className="relative min-w-0">
                    <Search
                        aria-hidden="true"
                        className="pointer-events-none absolute left-3 top-3 size-4 text-muted-foreground"
                    />
                    <Input
                        type="search"
                        maxLength={100}
                        className="h-10 pl-10"
                        aria-label={t('filters.search')}
                        placeholder={t('filters.searchPlaceholder')}
                        value={dashboard.search}
                        onChange={(event) => dashboard.setSearch(event.target.value)}
                    />
                </div>
                <div
                    aria-label={t('filters.dateRange')}
                    className="min-w-0 [&_button]:overflow-hidden [&_button]:border [&_button]:border-solid [&_button]:border-input [&_button]:bg-background [&_button]:text-xs"
                >
                    <DateRangeField
                        value={dateRange}
                        onChange={(range) => {
                            setDateRange(range);
                            if (range.start && range.end)
                                dashboard.filterHandler({
                                    from: range.start.format('YYYY-MM-DD'),
                                    to: range.end.format('YYYY-MM-DD'),
                                });
                        }}
                        placeholder={t('filters.datePlaceholder')}
                        formatDate={(value) =>
                            format.dateTime(value, { day: '2-digit', month: 'short', year: 'numeric' })
                        }
                        formatMonth={(value) => format.dateTime(value, { month: 'long', year: 'numeric' })}
                        formatWeekday={(value) => format.dateTime(value, { weekday: 'short' })}
                        previousMonthLabel={t('filters.previousMonth')}
                        nextMonthLabel={t('filters.nextMonth')}
                    />
                </div>
                <div className="relative min-w-0">
                    <Wallet
                        aria-hidden="true"
                        className="pointer-events-none absolute left-3 top-3 size-4 text-muted-foreground"
                    />
                    <Select
                        className="pl-9 text-xs"
                        searchable
                        aria-label={t('filters.wallet')}
                        value={filters.walletId ?? ''}
                        onValueChange={(value) =>
                            dashboard.filterHandler({ walletId: value ? Number(value) : undefined })
                        }
                    >
                        <option value="">{t('filters.allWallets')}</option>
                        {wallets.map((wallet) => (
                            <option key={wallet.id} value={wallet.id}>
                                {wallet.name}
                            </option>
                        ))}
                    </Select>
                </div>
                <div className="relative min-w-0">
                    <ArrowUpDown
                        aria-hidden="true"
                        className="pointer-events-none absolute left-3 top-3 size-4 text-muted-foreground"
                    />
                    <Select
                        className="pl-9 text-xs"
                        aria-label={t('filters.kind')}
                        value={filters.kind ?? ''}
                        onValueChange={(value) =>
                            dashboard.filterHandler({
                                kind:
                                    value === 'Income' || value === 'Expense' || value === 'Transfer'
                                        ? value
                                        : undefined,
                            })
                        }
                    >
                        <option value="">{t('filters.allKinds')}</option>
                        <option value="Income">{t('filters.income')}</option>
                        <option value="Expense">{t('filters.expense')}</option>
                        <option value="Transfer">{t('filters.transfer')}</option>
                    </Select>
                </div>
                <div className="relative min-w-0">
                    <Tag
                        aria-hidden="true"
                        className="pointer-events-none absolute left-3 top-3 size-4 text-muted-foreground"
                    />
                    <Select
                        className="pl-9 text-xs"
                        searchable
                        aria-label={t('filters.category')}
                        value={filters.typeId ?? ''}
                        onValueChange={(value) =>
                            dashboard.filterHandler({ typeId: value ? Number(value) : undefined })
                        }
                    >
                        <option value="">{t('filters.allCategories')}</option>
                        {types.map((type) => (
                            <option key={type.id} value={type.id}>
                                {type.name}
                            </option>
                        ))}
                    </Select>
                </div>
                <Button
                    type="button"
                    variant="outline"
                    className="border border-solid border-input text-xs"
                    onClick={resetHandler}
                >
                    <RotateCcw aria-hidden="true" className="size-4" />
                    {t('actions.reset')}
                </Button>
            </Card>

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
                <Card
                    className="flex min-w-0 flex-col overflow-hidden rounded-lg shadow-none min-[1380px]:min-h-[570px]"
                    aria-busy={loading}
                >
                    <div className="px-3.5 pb-3 pt-3">
                        <h2 className="m-0 text-xl font-semibold">{t('list.title')}</h2>
                        <p className="m-0 mt-1 text-xs text-muted-foreground" aria-live="polite">
                            {listStatus}
                        </p>
                    </div>
                    <div className="hidden px-1.5 md:block">
                        <Table className="border-collapse whitespace-nowrap text-xs [&_td]:border-b [&_td]:border-border/50 [&_td]:px-2 [&_td]:py-2 [&_th]:h-8 [&_th]:bg-muted/40 [&_th]:px-2 [&_th]:text-[11px]">
                            <TableHeader>
                                <TableRow>
                                    {columns.map((column) => (
                                        <TableHead
                                            key={column.label}
                                            className={column.align === 'right' ? 'text-right' : ''}
                                            aria-sort={columnSort(column.key)}
                                        >
                                            {columnHeading(column)}
                                        </TableHead>
                                    ))}
                                    <TableHead className="text-center">{t('list.actions')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {!loading &&
                                    !dashboard.error &&
                                    rows.map((row) => {
                                        const kind = transactionKind(row);
                                        const kindLabel = t(`filters.${kind.toLowerCase()}`);
                                        return (
                                            <TableRow key={row.id}>
                                                <TableCell>{date(row.date)}</TableCell>
                                                <TableCell>
                                                    <span className="flex items-center gap-2.5">
                                                        <CategoryMark row={row} />
                                                        <span
                                                            className="max-w-48 truncate"
                                                            title={row.description ?? undefined}
                                                        >
                                                            {row.description ?? t('list.untitled')}
                                                        </span>
                                                    </span>
                                                </TableCell>
                                                <TableCell>
                                                    <span
                                                        className={cn(
                                                            'inline-flex items-center gap-2',
                                                            kind === 'Income'
                                                                ? 'text-income'
                                                                : kind === 'Expense'
                                                                  ? 'text-expense'
                                                                  : 'text-transfer',
                                                        )}
                                                    >
                                                        <span className="size-2.5 rounded-full bg-current" />
                                                        {kindLabel}
                                                    </span>
                                                </TableCell>
                                                <TableCell>
                                                    <span className="flex items-center gap-2">
                                                        <CategoryMark row={row} />
                                                        <span className="max-w-28 truncate">{categoryLabel(row)}</span>
                                                    </span>
                                                </TableCell>
                                                <TableCell>
                                                    <WalletLabel row={row} />
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <TransactionAmount row={row} money={money} />
                                                </TableCell>
                                                <TableCell className="text-center">{actions(row)}</TableCell>
                                            </TableRow>
                                        );
                                    })}
                            </TableBody>
                        </Table>
                    </div>
                    <div className="grid gap-0 px-3 md:hidden">
                        {!loading &&
                            !dashboard.error &&
                            rows.map((row) => (
                                <article key={row.id} className="flex items-start gap-3 border-b border-border py-3">
                                    <CategoryMark row={row} className="mt-1" />
                                    <div className="min-w-0 flex-1">
                                        <p className="m-0 truncate text-sm font-medium">
                                            {row.description ?? t('list.untitled')}
                                        </p>
                                        <p className="m-0 my-1.5 text-xs text-muted-foreground">
                                            {date(row.date)} · {t(`filters.${transactionKind(row).toLowerCase()}`)}
                                        </p>
                                        <span className="text-xs text-muted-foreground">
                                            <WalletLabel row={row} />
                                        </span>
                                    </div>
                                    <div className="flex flex-col items-end gap-1 text-sm">
                                        <TransactionAmount row={row} money={money} />
                                        {actions(row)}
                                    </div>
                                </article>
                            ))}
                    </div>
                    {!!(loading || dashboard.error || rows.length === 0) && (
                        <p
                            role="status"
                            className="m-0 flex min-h-64 items-center justify-center p-6 text-center text-sm text-muted-foreground"
                        >
                            {emptyStatus}
                        </p>
                    )}
                    <footer className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-border p-3 text-xs text-muted-foreground">
                        <div className="flex items-center gap-2">
                            <span>{t('list.show')}</span>
                            <Select
                                className="h-8 w-20 py-1 text-xs"
                                aria-label={t('list.perPage')}
                                value={pageSize}
                                disabled={loading}
                                onValueChange={(value) => {
                                    dashboard.setPageSize(Number(value));
                                    dashboard.setPage(1);
                                }}
                            >
                                {[10, 20, 50, 100].map((size) => (
                                    <option key={size} value={size}>
                                        {size}
                                    </option>
                                ))}
                            </Select>
                            <span>{t('list.ofResults', { total })}</span>
                        </div>
                        <nav aria-label={t('list.pagination')} className="flex items-center gap-1">
                            <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                className="size-7 border border-solid border-border"
                                disabled={loading || page <= 1}
                                aria-label={t('actions.previous')}
                                onClick={() => dashboard.setPage(page - 1)}
                            >
                                <ChevronLeft aria-hidden="true" className="size-4" />
                            </Button>
                            {pages.map((number) => (
                                <Button
                                    key={number}
                                    type="button"
                                    variant={number === page ? 'default' : 'outline'}
                                    className="size-7 border border-solid border-border p-0 text-xs"
                                    disabled={loading}
                                    aria-label={t('list.page', { page: number })}
                                    aria-current={currentPage(number)}
                                    onClick={() => dashboard.setPage(number)}
                                >
                                    {number}
                                </Button>
                            ))}
                            <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                className="size-7 border border-solid border-border"
                                disabled={loading || page >= maxPage}
                                aria-label={t('actions.next')}
                                onClick={() => dashboard.setPage(page + 1)}
                            >
                                <ChevronRight aria-hidden="true" className="size-4" />
                            </Button>
                        </nav>
                    </footer>
                </Card>

                <aside
                    className="grid min-w-0 gap-2.5 sm:grid-cols-2 min-[1380px]:grid-cols-1"
                    aria-label={t('charts.overview')}
                >
                    <TransactionCharts {...analytics} />
                    <Card
                        className="min-w-0 rounded-lg p-3.5 shadow-none sm:col-span-2 min-[1380px]:col-span-1"
                        aria-busy={summaryLoading}
                    >
                        <h2 className="m-0 mb-2 text-base font-semibold">{t('recent.title')}</h2>
                        {!summaryLoading &&
                            !dashboard.summaryError &&
                            period.slice(0, 4).map((row) => (
                                <div
                                    key={row.id}
                                    className="flex min-w-0 items-center gap-2 border-b border-border/50 py-1.5 text-[11px] last:border-0"
                                >
                                    <CategoryMark row={row} className="size-4" />
                                    <span className="min-w-0 flex-1 truncate" title={row.description ?? undefined}>
                                        {row.description ?? t('list.untitled')}
                                    </span>
                                    <span className="hidden min-[1550px]:inline-flex">
                                        <WalletLabel row={row} compact />
                                    </span>
                                    <TransactionAmount row={row} money={money} />
                                    <span className="hidden shrink-0 text-[10px] text-muted-foreground sm:inline">
                                        {date(row.date)}
                                    </span>
                                    {actions(row)}
                                </div>
                            ))}
                        {!!(summaryLoading || dashboard.summaryError || period.length === 0) && (
                            <p role="status" className="py-4 text-center text-xs text-muted-foreground">
                                {recentStatus}
                            </p>
                        )}
                    </Card>
                </aside>
            </div>
        </div>
    );
}
