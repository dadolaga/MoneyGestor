export interface TransactionViewModel {
    id: number;
    description?: string;
    date?: string;
    typeName?: string;
    walletName?: string;
    destinationWalletName?: string;
    value: number;
    isTransfer: boolean;
}
