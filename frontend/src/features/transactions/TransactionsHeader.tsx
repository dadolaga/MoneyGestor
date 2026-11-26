'use client';

import { useState } from 'react';

import { useLocale, useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { Download, Plus } from '@/components/ui/icons';
import { ApiProblemError, apiClient } from '@/lib/api/client';
import type { TransactionQuery } from '@/lib/api/client';
import { notify } from '@/lib/notifications';

interface TransactionsHeaderProps {
    filters: TransactionQuery;
    onAdd: () => void;
}

export function TransactionsHeader({ filters, onAdd }: TransactionsHeaderProps) {
    const t = useTranslations('Movements');
    const locale = useLocale();
    const [exporting, setExporting] = useState(false);
    async function exportHandler() {
        setExporting(true);
        try {
            const { blob, filename } = await apiClient.exportTransactions({ ...filters, locale });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            link.click();
            setTimeout(() => URL.revokeObjectURL(url), 0);
        } catch (cause) {
            notify.error(t(cause instanceof ApiProblemError && cause.status === 401 ? 'editor.signInAgain' : 'actions.exportFailed'));
        } finally { setExporting(false); }
    }

    return (
        <header className="flex flex-wrap items-start justify-between gap-4">
            <div>
                <h1 className="m-0 text-3xl font-bold tracking-tight sm:text-4xl">{t('title')}</h1>
                <p className="m-0 mt-1.5 text-sm text-muted-foreground sm:text-base">{t('description')}</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
                <Button type="button" className="h-11 px-5" onClick={onAdd}>
                    <Plus aria-hidden="true" className="size-5" />
                    {t('actions.add')}
                </Button>
                <Button
                    type="button"
                    variant="outline"
                    className="h-11 border border-solid border-input px-5"
                    disabled={exporting}
                    onClick={exportHandler}
                >
                    <Download aria-hidden="true" className="size-5" />
                    {t('actions.export')}
                </Button>
            </div>
        </header>
    );
}
