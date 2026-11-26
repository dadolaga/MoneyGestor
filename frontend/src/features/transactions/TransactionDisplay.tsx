import { ArrowRight, Wallet } from '@/components/ui/icons';
import { CategoryIcon } from '@/features/categories/category-display';
import type { ApiTransaction } from '@/lib/api/client';
import { cn } from '@/lib/utils';

import { transactionKind } from './transaction-kind';

export function CategoryMark({ row, className }: { row: ApiTransaction; className?: string }) {
    return <span className={cn('inline-flex size-5 shrink-0 [&>span]:size-full [&>svg]:size-full', className)}><CategoryIcon type={row.type} /></span>;
}

export function WalletLabel({ row, compact = false }: { row: ApiTransaction; compact?: boolean }) {
    const color = `#${row.wallet.color.value.toString(16).padStart(6, '0')}`;
    return (
        <span className="inline-flex min-w-0 items-center gap-2">
            <span
                className="flex size-6 shrink-0 items-center justify-center rounded bg-[color-mix(in_oklch,currentColor_18%,transparent)]"
                style={{ color }}
            >
                <Wallet aria-hidden="true" className="size-4" />
            </span>
            <span className={cn('truncate', compact && 'max-w-28 text-[11px]')}>{row.wallet.name}</span>
            {!!row.destination && (
                <>
                    <ArrowRight aria-hidden="true" className="size-3 text-transfer" />
                    <span className={cn('truncate', compact && 'max-w-20 text-[11px]')}>{row.destination.name}</span>
                </>
            )}
        </span>
    );
}

export function TransactionAmount({ row, money }: { row: ApiTransaction; money: (value: number) => string }) {
    const kind = transactionKind(row);
    const sign = kind === 'Income' ? '+' : kind === 'Expense' ? '−' : '';
    // Transfers are returned once with the signed source value; display their magnitude.
    return (
        <strong
            className={cn(
                'whitespace-nowrap font-semibold tabular-nums',
                kind === 'Income' ? 'text-income' : kind === 'Expense' ? 'text-expense' : 'text-transfer',
            )}
        >
            {sign} {money(Math.abs(row.value))}
        </strong>
    );
}
