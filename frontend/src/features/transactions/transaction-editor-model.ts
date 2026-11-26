import dayjs from 'dayjs';

export type MovementKind = 'income' | 'expense' | 'transfer';

export interface TransactionFormValues {
    kind: MovementKind;
    amount: string;
    date: string;
    walletId: string;
    destinationWalletId: string;
    typeId: string;
    description: string;
    notes: string;
    recurring: boolean;
}

export function createTransactionDefaults(walletId?: number, typeId?: number): TransactionFormValues {
    return {
        kind: 'expense',
        amount: '',
        date: dayjs().format('YYYY-MM-DD'),
        walletId: walletId === undefined ? '' : String(walletId),
        destinationWalletId: '',
        typeId: typeId === undefined ? '' : String(typeId),
        description: '',
        notes: '',
        recurring: false,
    };
}

export function isCalendarDate(value: string) {
    return /^\d{4}-\d{2}-\d{2}$/.test(value) && dayjs(value).isValid() && dayjs(value).format('YYYY-MM-DD') === value;
}
