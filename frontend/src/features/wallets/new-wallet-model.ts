import { Banknote, CreditCard, Landmark, WalletCards } from '@/components/ui/icons';

import type { CardNetwork } from './model';

export type NewWalletKind = 'bank' | 'prepaid' | 'debit' | 'credit' | 'cash';

export interface NewWalletDraft {
    name: string;
    kind: NewWalletKind;
    color: string;
    currency: 'EUR';
    institution?: string;
    initialBalance?: number;
    iban?: string;
    lastFour?: string;
    network?: CardNetwork;
    expiry?: string;
    linkedAccountId?: number;
    creditLimit?: number;
    currentSpending?: number;
    statementDay?: number;
    paymentDay?: number;
    notes?: string;
    shareable: boolean;
}

export interface NewWalletAccount {
    id: number;
    name: string;
    currency: 'EUR';
    shareable: boolean;
}

export const newWalletKinds: NewWalletKind[] = ['bank', 'prepaid', 'debit', 'credit', 'cash'];

export const newWalletIcons = {
    bank: Landmark,
    prepaid: CreditCard,
    debit: CreditCard,
    credit: WalletCards,
    cash: Banknote,
};

export function hasOwnBalance(kind: NewWalletKind) {
    return kind === 'bank' || kind === 'prepaid' || kind === 'cash';
}
