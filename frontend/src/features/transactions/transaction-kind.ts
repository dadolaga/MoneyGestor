import type { ApiTransaction } from '@/lib/api/client';

export function transactionKind(row: ApiTransaction) {
    return row.type.systemKind === 'Transfer' ? 'Transfer' : row.value >= 0 ? 'Income' : 'Expense';
}
