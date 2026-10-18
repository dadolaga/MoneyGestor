import type { ApiTransaction } from '@/lib/api/client';

export function transactionKind(row: ApiTransaction) {
    return row.destination !== null ? 'Transfer' : row.value >= 0 ? 'Income' : 'Expense';
}
