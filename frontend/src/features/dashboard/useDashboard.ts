'use client';

import { useEffect, useState } from 'react';

import dayjs from 'dayjs';
import { useTranslations } from 'next-intl';

import { ApiProblemError, apiClient } from '@/lib/api/client';
import type { ApiTransaction, ApiTransactionType, ApiWallet, TransactionOverview } from '@/lib/api/client';

interface PeriodData {
    overview: TransactionOverview;
    rows: ApiTransaction[];
}

interface Metadata {
    wallets: ApiWallet[];
    types: ApiTransactionType[];
}

interface RequestState<T> {
    data?: T;
    loading: boolean;
    error: string;
}

export function useDashboard() {
    const t = useTranslations('ApiFinance');
    const [month, setMonth] = useState(() => dayjs().format('YYYY-MM'));
    const [revision, setRevision] = useState(0);
    const [period, setPeriod] = useState<RequestState<PeriodData>>({ loading: true, error: '' });
    const [metadata, setMetadata] = useState<RequestState<Metadata>>({ loading: true, error: '' });
    const from = dayjs(`${month}-01`).startOf('month').format('YYYY-MM-DD');
    const to = dayjs(`${month}-01`).endOf('month').format('YYYY-MM-DD');

    useEffect(() => {
        const controller = new AbortController();
        void Promise.all([
            apiClient.transactionOverview({ from, to }, controller.signal),
            apiClient.transactions({ from, to, pageSize: 6, sortBy: 'Date', direction: 'Descending' }, controller.signal),
        ]).then(([overview, recent]) => {
            if (!controller.signal.aborted) setPeriod({ data: { overview, rows: recent.items }, loading: false, error: '' });
        }).catch((cause: unknown) => {
            if (!controller.signal.aborted) setPeriod({
                loading: false,
                error: t(cause instanceof ApiProblemError && cause.status === 401 ? 'signInAgain' : 'dashboard.requestFailed'),
            });
        });
        return () => controller.abort();
    }, [from, to, revision, t]);

    useEffect(() => {
        const controller = new AbortController();
        void Promise.all([apiClient.wallets(controller.signal), apiClient.transactionTypes(controller.signal)])
            .then(([wallets, types]) => {
                if (!controller.signal.aborted) setMetadata({ data: { wallets, types }, loading: false, error: '' });
            }).catch((cause: unknown) => {
                if (!controller.signal.aborted) setMetadata({
                    loading: false,
                    error: t(cause instanceof ApiProblemError && cause.status === 401 ? 'signInAgain' : 'requestFailed'),
                });
            });
        return () => controller.abort();
    }, [revision, t]);

    function categoryCreatedHandler() {
        setMetadata((current) => ({ ...current, loading: true, error: '' }));
        setRevision((current) => current + 1);
    }

    function monthChangeHandler(value: string) {
        if (!/^\d{4}-\d{2}$/.test(value) || dayjs(`${value}-01`).format('YYYY-MM') !== value || value === month) return;
        setPeriod({ loading: true, error: '' });
        setMonth(value);
    }

    function retryHandler() {
        setPeriod({ loading: true, error: '' });
        setMetadata({ loading: true, error: '' });
        setRevision((value) => value + 1);
    }

    return { month, period, metadata, monthChangeHandler, retryHandler, categoryCreatedHandler };
}
