'use client';

import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { Download, Plus } from '@/components/ui/icons';

import type { TransactionAnalyticsProps } from './transaction-analytics';
import { transactionKind } from './transaction-kind';

interface TransactionsHeaderProps extends TransactionAnalyticsProps {
    hasDraft: boolean;
    onAdd: () => void;
}

export function TransactionsHeader({ rows, from, to, loading, failed, hasDraft, onAdd }: TransactionsHeaderProps) {
    const t = useTranslations('Movements');
    const addLabel = hasDraft ? t('editor.resumeDraft') : t('actions.add');

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
            ...rows.map((row) => [
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
        link.download = `flowiy-${from}-${to}.csv`;
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 0);
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
                    {addLabel}
                </Button>
                <Button
                    type="button"
                    variant="outline"
                    className="h-11 border border-solid border-input px-5"
                    disabled={loading || failed || rows.length === 0}
                    onClick={exportHandler}
                >
                    <Download aria-hidden="true" className="size-5" />
                    {t('actions.export')}
                </Button>
            </div>
        </header>
    );
}
