'use client';

import { useEffect, useState } from 'react';

import dayjs from 'dayjs';
import { useTranslations } from 'next-intl';

import { ApiProblemError, apiClient } from '@/lib/api/client';
import type { ApiTransaction, ApiTransactionType, ApiWallet, TransactionOverview, TransactionQuery } from '@/lib/api/client';

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
    const [overview, setOverview] = useState<TransactionOverview>();
    const [recent, setRecent] = useState<ApiTransaction[]>([]);
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
                const result = await apiClient.transactions({ ...filters, ...sort, page, pageSize }, controller.signal);
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
    }, [page, pageSize, filters, revision, sort, t]);

    useEffect(() => {
        const controller = new AbortController();
        void (async () => {
            setSummaryLoading(true);
            setSummaryError('');
            try {
                const [nextOverview, nextRecent] = await Promise.all([
                    apiClient.transactionOverview(filters, controller.signal),
                    apiClient.transactions({ ...filters, page: 1, pageSize: 4, sortBy: 'Date', direction: 'Descending' }, controller.signal),
                ]);
                if (controller.signal.aborted) return;
                setOverview(nextOverview);
                setRecent(nextRecent.items);
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
    }, [filters, revision, t]);

    function filterHandler(update: Partial<TransactionQuery>) {
        setFilters((current) => ({ ...current, ...update }));
        setPage(1);
    }

    function categoryCreatedHandler() {
        setMetadataLoading(true);
        setRevision((current) => current + 1);
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
        overview,
        recent,
        wallets,
        types,
        categoryCreatedHandler,
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
