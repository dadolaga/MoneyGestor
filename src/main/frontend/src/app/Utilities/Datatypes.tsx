interface IUser {
    id: number;
    firstname: string;
    lastname: string;
    email: string;
    username: string;
    token: string;
    expiratedToken: Date;
}

export interface Wallet {
    id: Number,
    name: String,
    value: number,
    favorite: boolean,
    color: string,
}

export interface ITransaction {
    id: number,
    description: string,
    value: number,
    date: string,
    wallet: Wallet,
    walletDestination: Wallet,
    type: ITransactionType,
}

export interface ITransactionType {
    id: number,
    name: string,
    userId: number,
}

export interface ITransactionTable {
    id: number,
    description: string,
    value: number,
    date: string,
    wallet: Wallet,
    walletDestination: Wallet,
    type: ITransactionType,
}