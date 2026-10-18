import {
    ArrowLeftRight,
    ArrowRight,
    Briefcase,
    Car,
    Gamepad2,
    Heart,
    House,
    ShoppingCart,
    Tag,
    Utensils,
    Wallet,
    Zap,
} from '@/components/ui/icons';
import type { ApiTransaction } from '@/lib/api/client';
import { cn } from '@/lib/utils';

import { transactionKind } from './use-transactions-dashboard';

export const categoryColors = [
    'var(--expense)',
    'var(--warning)',
    'var(--chart-5)',
    'var(--transfer)',
    'var(--chart-6)',
    'var(--income)',
    'var(--muted-foreground)',
];

export function CategoryMark({ row, className }: { row: ApiTransaction; className?: string }) {
    const name = row.type.name.toLowerCase();
    const Icon =
        row.destination !== null
            ? ArrowLeftRight
            : /lavor|stipend|salary|work/.test(name)
              ? Briefcase
              : /spesa|aliment|grocer|shopping/.test(name)
                ? ShoppingCart
                : /casa|affitto|home|rent/.test(name)
                  ? House
                  : /ristor|restaurant|food/.test(name)
                    ? Utensils
                    : /utenz|bollett|utilit/.test(name)
                      ? Zap
                      : /trasport|transport|fuel/.test(name)
                        ? Car
                        : /intratten|entertain|gaming/.test(name)
                          ? Gamepad2
                          : /salute|sport|health/.test(name)
                            ? Heart
                            : Tag;
    return (
        <Icon
            aria-hidden="true"
            className={cn('size-5 shrink-0', className)}
            style={{
                color:
                    row.destination !== null ? 'var(--transfer)' : categoryColors[row.type.id % categoryColors.length],
            }}
        />
    );
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
    // Transfers are returned once, from the source wallet, with a positive API magnitude.
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
