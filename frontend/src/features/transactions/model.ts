export interface TransactionViewModel {
    id: number;
    description?: string;
    date?: string;
    typeName?: string;
    walletName?: string;
    value: number;
    isTransfer: boolean;
}
