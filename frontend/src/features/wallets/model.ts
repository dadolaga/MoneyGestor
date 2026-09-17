export interface WalletViewModel {
    id: number;
    name: string;
    currentValue: number;
    isFavorite: boolean;
    color: string | undefined;
    kind?: WalletKind;
    icon?: WalletIcon;
    institution?: string;
    description?: string;
    showOnDashboard?: boolean;
    monthlyChange?: number;
    cardDetails?: WalletCardDetails;
}

export type WalletKind = 'bank' | 'savings' | 'card' | 'cash' | 'investment';
export type WalletIcon = WalletKind | 'wallet';
export type CardKind = 'debit' | 'credit' | 'prepaid';
export type CardNetwork = 'visa' | 'mastercard' | 'amex' | 'other';

export interface WalletCardDetails {
    kind: CardKind;
    network: CardNetwork;
    lastFour?: string;
    linkedWalletId?: number;
    paymentDay?: number;
    lowBalanceThreshold?: number;
    allowLinkedTopUps?: boolean;
    suggestAutomaticTopUp?: boolean;
}
