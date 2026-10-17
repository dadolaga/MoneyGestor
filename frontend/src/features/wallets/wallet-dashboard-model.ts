import type { ApiWallet } from '@/lib/api/client';

import type { NewWalletDraft } from './new-wallet-model';

export type DashboardWallet = Omit<ApiWallet, 'currentValue' | 'initialValue'> & {
    currentValue?: number;
    initialValue?: number;
    draft?: NewWalletDraft;
};

export type WalletDetailAction = 'edit' | 'transfer' | 'movement' | 'allMovements';

export type LoadState<T> =
    | { status: 'loading' }
    | { status: 'error'; authenticationRequired: boolean }
    | { status: 'ready'; data: T };

export const walletColor = (wallet: DashboardWallet) => `#${wallet.color.value.toString(16).padStart(6, '0')}`;
