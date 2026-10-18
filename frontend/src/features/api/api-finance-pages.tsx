'use client';

import { useCallback, useEffect, useState } from 'react';

import dayjs from 'dayjs';
import { useFormatter, useTranslations } from 'next-intl';

import { Input } from '@/components/ui/input';
import { DashboardPreview } from '@/features/dashboard/dashboard-preview';
import type { DashboardViewModel } from '@/features/dashboard/model';
import { ApiProblemError } from '@/lib/api/client';
import { apiClient } from '@/lib/api/client';

function useApiError() {
    const t = useTranslations('ApiFinance');
    return (error: unknown) => error instanceof ApiProblemError && error.code === 'authentication_required' ? t('signInAgain') : t('requestFailed');
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
