'use client';

import { useTranslations } from 'next-intl';

import { Card } from '@/components/ui/card';
import { ArrowUpDown } from '@/components/ui/icons';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { ApiTransaction, TransactionQuery } from '@/lib/api/client';
import { cn } from '@/lib/utils';

import { transactionKind } from './transaction-kind';
import { TransactionActions } from './TransactionActions';
import type { TransactionActionHandlers } from './TransactionActions';
import { CategoryMark, TransactionAmount, WalletLabel } from './TransactionDisplay';
import { TransactionsPagination } from './TransactionsPagination';
import { useTransactionFormatting } from './useTransactionFormatting';

interface TransactionsListProps extends TransactionActionHandlers {
    rows: ApiTransaction[];
    loading: boolean;
    error: string;
    total: number;
    page: number;
    pageSize: number;
    sort: Pick<TransactionQuery, 'sortBy' | 'direction'>;
    onSortChange: (sort: Pick<TransactionQuery, 'sortBy' | 'direction'>) => void;
    onPageChange: (page: number) => void;
    onPageSizeChange: (size: number) => void;
}

export function TransactionsList({
    rows,
    loading,
    error,
    total,
    page,
    pageSize,
    sort,
    onSortChange,
    onPageChange,
    onPageSizeChange,
    onEdit,
    onDelete,
}: TransactionsListProps) {
    const t = useTranslations('Movements');
    const { money, date } = useTransactionFormatting();
    const listStatus = loading ? t('states.loading') : error ? '—' : t('list.count', { count: total });
    const emptyStatus = loading ? t('states.loading') : error ? t('states.error') : t('states.empty');
    const columns: { label: string; key?: TransactionQuery['sortBy']; align?: 'right' }[] = [
        { label: t('list.date'), key: 'Date' },
        { label: t('list.description'), key: 'Description' },
        { label: t('list.kind') },
        { label: t('list.category'), key: 'Type' },
        { label: t('list.wallet'), key: 'Wallet' },
        { label: t('list.amount'), key: 'Value', align: 'right' },
    ];

    function sortHandler(key: NonNullable<TransactionQuery['sortBy']>) {
        onSortChange({
            sortBy: key,
            direction: sort.sortBy === key && sort.direction === 'Descending' ? 'Ascending' : 'Descending',
        });
        onPageChange(1);
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

    return (
        <Card
            className="box-border flex min-h-0 min-w-0 flex-col overflow-hidden rounded-lg shadow-none min-[1380px]:h-full"
            aria-busy={loading}
        >
            <div className="shrink-0 px-3.5 pb-3 pt-3">
                <h2 className="m-0 text-xl font-semibold">{t('list.title')}</h2>
                <p className="m-0 mt-1 text-xs text-muted-foreground" aria-live="polite">
                    {listStatus}
                </p>
            </div>
            <div className="hidden min-h-0 flex-1 px-1.5 md:block">
                <Table
                    containerProps={{
                        className: 'max-h-[60dvh] overscroll-contain min-[1380px]:h-full min-[1380px]:max-h-none',
                        tabIndex: 0,
                        role: 'region',
                        'aria-label': t('list.title'),
                    }}
                    className="border-collapse whitespace-nowrap text-xs [&_td]:border-b [&_td]:border-border/50 [&_td]:px-2 [&_td]:py-2 [&_th]:sticky [&_th]:top-0 [&_th]:z-10 [&_th]:h-8 [&_th]:bg-muted [&_th]:px-2 [&_th]:text-[11px]"
                >
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
                            !error &&
                            rows.map((row) => {
                                const kind = transactionKind(row);
                                const kindLabel = t(`filters.${kind.toLowerCase()}`);
                                return (
                                    <TableRow key={row.id}>
                                        <TableCell>{date(row.date)}</TableCell>
                                        <TableCell>
                                            <span className="flex items-center gap-2.5">
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
                                        <TableCell className="text-center">
                                            <TransactionActions row={row} onEdit={onEdit} onDelete={onDelete} />
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                    </TableBody>
                </Table>
            </div>
            <div className="grid max-h-[60dvh] gap-0 overflow-auto overscroll-contain px-3 md:hidden">
                {!loading &&
                    !error &&
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
                                <TransactionActions row={row} onEdit={onEdit} onDelete={onDelete} />
                            </div>
                        </article>
                    ))}
            </div>
            {!!(loading || error || rows.length === 0) && (
                <p
                    role="status"
                    className="m-0 flex min-h-64 flex-1 items-center justify-center p-6 text-center text-sm text-muted-foreground min-[1380px]:min-h-0"
                >
                    {emptyStatus}
                </p>
            )}
            <TransactionsPagination
                total={total}
                page={page}
                pageSize={pageSize}
                loading={loading}
                onPageChange={onPageChange}
                onPageSizeChange={onPageSizeChange}
            />
        </Card>
    );
}
