'use client';

import { useEffect, useMemo, useState } from 'react';

import dayjs from 'dayjs';
import { useTranslations } from 'next-intl';

import { ApiProblemError, apiClient } from '@/lib/api/client';
import type { ApiTransaction, ApiTransactionType, ApiWallet, TransactionQuery } from '@/lib/api/client';

export function transactionKind(row: ApiTransaction) {
    return row.destination !== null ? 'Transfer' : row.value >= 0 ? 'Income' : 'Expense';
}

async function loadPeriod(query: TransactionQuery, signal: AbortSignal) {
    const first = await apiClient.transactions(
        { ...query, page: 1, pageSize: 100, sortBy: 'Date', direction: 'Descending' },
        signal,
    );
    const rows = [...first.items];
    // The API caps each page at 100. Totals and charts must include every matching page.
    for (let page = 2; page <= Math.ceil(first.totalCount / 100); page++) {
        const next = await apiClient.transactions(
            { ...query, page, pageSize: 100, sortBy: 'Date', direction: 'Descending' },
            signal,
        );
        rows.push(...next.items);
    }
    return rows;
}

export function useTransactionsDashboard() {
    const t = useTranslations('ApiFinance');
    const [filters, setFilters] = useState<TransactionQuery>(() => ({
        from: dayjs().startOf('month').format('YYYY-MM-DD'),
        to: dayjs().endOf('month').format('YYYY-MM-DD'),
    }));
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [sort, setSort] = useState<Pick<TransactionQuery, 'sortBy' | 'direction'>>({
        sortBy: 'Date',
        direction: 'Descending',
    });
    const [rows, setRows] = useState<ApiTransaction[]>([]);
    const [period, setPeriod] = useState<ApiTransaction[]>([]);
    const [previous, setPrevious] = useState<ApiTransaction[]>([]);
    const [wallets, setWallets] = useState<ApiWallet[]>([]);
    const [types, setTypes] = useState<ApiTransactionType[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [summaryLoading, setSummaryLoading] = useState(true);
    const [error, setError] = useState('');
    const [summaryError, setSummaryError] = useState('');
    const [metadataError, setMetadataError] = useState('');
    const [metadataLoading, setMetadataLoading] = useState(true);
    const [revision, setRevision] = useState(0);
    const query = useMemo(() => ({ ...filters }), [filters]);

    useEffect(() => {
        const timer = setTimeout(() => {
            setFilters((current) =>
                current.search === (search.trim() || undefined)
                    ? current
                    : { ...current, search: search.trim() || undefined },
            );
            setPage(1);
        }, 300);
        return () => clearTimeout(timer);
    }, [search]);

    useEffect(() => {
        const controller = new AbortController();
        void (async () => {
            setMetadataLoading(true);
            try {
                const [nextWallets, nextTypes] = await Promise.all([
                    apiClient.wallets(controller.signal),
                    apiClient.transactionTypes(controller.signal),
                ]);
                if (controller.signal.aborted) return;
                setWallets(nextWallets);
                setTypes(nextTypes);
                setMetadataError('');
            } catch (cause) {
                if (!controller.signal.aborted)
                    setMetadataError(
                        cause instanceof ApiProblemError && cause.code === 'authentication_required'
                            ? t('signInAgain')
                            : t('requestFailed'),
                    );
            } finally {
                if (!controller.signal.aborted) setMetadataLoading(false);
            }
        })();
        return () => controller.abort();
    }, [revision, t]);

    useEffect(() => {
        const controller = new AbortController();
        void (async () => {
            setLoading(true);
            setError('');
            try {
                const result = await apiClient.transactions({ ...query, ...sort, page, pageSize }, controller.signal);
                if (controller.signal.aborted) return;
                const lastPage = Math.max(1, Math.ceil(result.totalCount / pageSize));
                if (page > lastPage) {
                    setPage(lastPage);
                    return;
                }
                setRows(result.items);
                setTotal(result.totalCount);
            } catch (cause) {
                if (!controller.signal.aborted)
                    setError(
                        cause instanceof ApiProblemError && cause.code === 'authentication_required'
                            ? t('signInAgain')
                            : t('requestFailed'),
                    );
            } finally {
                if (!controller.signal.aborted) setLoading(false);
            }
        })();
        return () => controller.abort();
    }, [page, pageSize, query, revision, sort, t]);

    useEffect(() => {
        const controller = new AbortController();
        void (async () => {
            setSummaryLoading(true);
            setSummaryError('');
            const start = dayjs(query.from);
            const end = dayjs(query.to);
            const isWholeMonth = start.date() === 1 && end.isSame(start.endOf('month'), 'day');
            const previousEnd = start.subtract(1, 'day');
            const previousStart = isWholeMonth
                ? previousEnd.startOf('month')
                : start.subtract(end.diff(start, 'day') + 1, 'day');
            try {
                const [currentRows, previousRows] = await Promise.all([
                    loadPeriod(query, controller.signal),
                    loadPeriod(
                        { ...query, from: previousStart.format('YYYY-MM-DD'), to: previousEnd.format('YYYY-MM-DD') },
                        controller.signal,
                    ),
                ]);
                if (controller.signal.aborted) return;
                setPeriod(currentRows);
                setPrevious(previousRows);
            } catch (cause) {
                if (!controller.signal.aborted)
                    setSummaryError(
                        cause instanceof ApiProblemError && cause.code === 'authentication_required'
                            ? t('signInAgain')
                            : t('requestFailed'),
                    );
            } finally {
                if (!controller.signal.aborted) setSummaryLoading(false);
            }
        })();
        return () => controller.abort();
    }, [query, revision, t]);

    function filterHandler(update: Partial<TransactionQuery>) {
        setFilters((current) => ({ ...current, ...update }));
        setPage(1);
    }

    function resetHandler() {
        setSearch('');
        setFilters({
            from: dayjs().startOf('month').format('YYYY-MM-DD'),
            to: dayjs().endOf('month').format('YYYY-MM-DD'),
        });
        setPage(1);
    }

    return {
        filters,
        search,
        setSearch,
        filterHandler,
        resetHandler,
        rows,
        period,
        previous,
        wallets,
        types,
        page,
        setPage,
        pageSize,
        setPageSize,
        sort,
        setSort,
        total,
        loading,
        summaryLoading,
        error,
        summaryError,
        metadataError,
        metadataLoading,
        retryHandler: () => setRevision((current) => current + 1),
    };
}
