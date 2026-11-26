'use client';

import { useTranslations } from 'next-intl';

import { Card } from '@/components/ui/card';

import type { TransactionPeriodProps } from './transaction-analytics';
import { TransactionActions } from './TransactionActions';
import type { TransactionActionHandlers } from './TransactionActions';
import { CategoryMark, TransactionAmount, WalletLabel } from './TransactionDisplay';
import { useTransactionFormatting } from './useTransactionFormatting';

export function TransactionsRecent({ rows, loading, failed, onEdit, onDelete }: TransactionPeriodProps & TransactionActionHandlers) {
    const t = useTranslations('Movements');
    const { money, date } = useTransactionFormatting();
    const recentStatus = loading ? t('states.loading') : failed ? t('states.error') : t('states.empty');

    return (
        <Card
            className="min-w-0 rounded-lg p-3.5 shadow-none sm:col-span-2 min-[1380px]:col-span-1"
            aria-busy={loading}
        >
            <h2 className="m-0 mb-2 text-base font-semibold">{t('recent.title')}</h2>
            {!loading &&
                !failed &&
                rows.slice(0, 4).map((row) => (
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
                        <TransactionActions row={row} onEdit={onEdit} onDelete={onDelete} />
                    </div>
                ))}
            {!!(loading || failed || rows.length === 0) && (
                <p role="status" className="py-4 text-center text-xs text-muted-foreground">
                    {recentStatus}
                </p>
            )}
        </Card>
    );
}
