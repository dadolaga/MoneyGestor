import type { ApiTransaction, TransactionOverview } from '@/lib/api/client';

export interface TransactionPeriodProps {
    rows: ApiTransaction[];
    loading: boolean;
    failed: boolean;
}

export interface TransactionAnalyticsProps {
    overview?: TransactionOverview;
    loading: boolean;
    failed: boolean;
    from: string;
    to: string;
}


export const emptyTransactionTotals = { income: 0, expense: 0, transfers: 0, incomeCount: 0, expenseCount: 0, transferCount: 0, movementCount: 0 };
