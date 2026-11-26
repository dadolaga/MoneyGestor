import { Banknote, CreditCard, Landmark, WalletCards } from '@/components/ui/icons';
import type { ApiWallet } from '@/lib/api/client';

export type CardNetwork = 'visa' | 'mastercard' | 'amex' | 'other';

export type WalletKind = 'bank' | 'prepaid' | 'debit' | 'credit' | 'cash';

export interface WalletDraft {
    name: string;
    kind: WalletKind;
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

export interface WalletAccount {
    id: number;
    name: string;
    currency: 'EUR';
    shareable: boolean;
}

export const walletKinds: WalletKind[] = ['bank', 'prepaid', 'debit', 'credit', 'cash'];

export const walletIcons = {
    bank: Landmark,
    prepaid: CreditCard,
    debit: CreditCard,
    credit: WalletCards,
    cash: Banknote,
};

export function hasOwnBalance(kind: WalletKind) {
    return kind === 'bank' || kind === 'prepaid' || kind === 'cash';
}

export type DashboardWallet = Omit<ApiWallet, 'currentValue' | 'initialValue'> & {
    currentValue?: number;
    initialValue?: number;
    draft?: WalletDraft;
};

export type WalletDetailAction = 'edit' | 'transfer' | 'movement' | 'allMovements';

export type LoadState<T> =
    | { status: 'loading' }
    | { status: 'error'; authenticationRequired: boolean }
    | { status: 'ready'; data: T };

export const walletColor = (wallet: DashboardWallet) => `#${wallet.color.value.toString(16).padStart(6, '0')}`;

export interface WalletPreviewModel {
    id: number;
    name: string;
    currentValue: number;
    isFavorite: boolean;
    color: string | undefined;
}
