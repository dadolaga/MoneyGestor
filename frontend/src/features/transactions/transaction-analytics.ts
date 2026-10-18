import type { ApiTransaction } from '@/lib/api/client';

import { transactionKind } from './transaction-kind';

export interface TransactionPeriodProps {
    rows: ApiTransaction[];
    loading: boolean;
    failed: boolean;
}

export interface TransactionAnalyticsProps extends TransactionPeriodProps {
    from: string;
    to: string;
}

export function transactionTotals(rows: ApiTransaction[]) {
    return rows.reduce(
        (result, row) => {
            const kind = transactionKind(row);
            if (kind === 'Income') result.income += row.value;
            else if (kind === 'Expense') result.expense += Math.abs(row.value);
            else {
                result.transfers += Math.abs(row.value);
                result.transferCount++;
            }
            return result;
        },
        { income: 0, expense: 0, transfers: 0, transferCount: 0 },
    );
}
