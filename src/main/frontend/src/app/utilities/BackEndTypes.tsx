import { CSSProperties, JSX } from "react";
import { IFormMultiType } from "./Interfaces";
import { Box } from "@mui/material";

export interface Response<T> {
    code: number,
    content: T,
    type: string,
}

// SEND TO SERVER
export interface LoginForm {
    username: string,
    password: string,
    remember: boolean,
}

export interface UserRegistrationForm {
    lastname: string;
    firstname: string;
    username: string;
    email: string;
    password: string;
    confirm: string;
}

export interface CreateWalletForm {
    name?: string,
    value?: number,
    color?: string,
    favorite?: boolean,
}

export interface TransactionTypeForm {
    name: string,
}

export interface TransactionForm {
    description: string;
    longDescription?: string;
    date: string;
    value: number;
    wallet?: number;
    walletDestination?: number;
    typeId: number;
}

export interface MultiTransactionInsert {
    walletId: number;
    transactions: TransactionForm[];
}

export interface GraphDataSend {
    start: string,
    end: string,
}

export interface ITransactionFilter {
    start: string,
    end: string,
    moneyIn: boolean
}

// RECEIVE FROM SERVER
export interface User {
    lastname: string,
    firstname: string,
    token: string,
    expireToken: Array<number>,
}

export interface ILoginData {
    name: string,
    surname: string,
    token: string,
}

export interface Wallet {
    id: number;
    name: string;
    value: number;
    favorite: boolean;
    color: string;
}

export interface Stock {
    id?: number
    name?: string
    subscriptionValue?: number
    subscriptionDate?: string
    currentValue?: number
    resourcesInvested?: number
}

export interface StockMovement {
    id?: number
    description?: string
    value?: number
    current_yield: number
    date?: string
    is_bank_deposit?: boolean
    is_tfr?: boolean
    stock?: Stock
}

export type CreateStockMovement = StockMovement & {
    wallet: number | null
};

export interface TransactionType {
    id: number,
    name: string,
}

export interface ReceiveId {
    id: number,
}

export interface Transaction {
    id: number;
    description?: string;
    value: number;
    date: string;
    wallet: Wallet;
    walletDestination?: Wallet;
    transactionDestinationId?: number;
    type: TransactionType;
}

export interface LineGraph<LINE, VALUES> {
    line: LINE,
    values: VALUES[],
}

export class Color implements IFormMultiType {
    public color: string;

    constructor(color: string) {
        this.color = color;
    }

    print(): string | JSX.Element {
        return (<><span style={{height: '20px', width: '20px', backgroundColor: '#' + this.color, marginRight: "10px"}}></span>#{this.color}</>);
    }

    getKey(): string {
        return this.color;
    }
}

export class TransactionTypePrintable implements IFormMultiType {
    private transactionType: TransactionType;

    public constructor(transactionType: TransactionType) {
        this.transactionType = transactionType;
    }

    print(): string | JSX.Element {
        let style: CSSProperties = {};
        if(this.transactionType.id == 1 || this.transactionType.id == 2)
            style = {fontWeight: 'bold', textTransform: 'uppercase', fontStyle: "italic"}

        return <Box component={"span"} style={style}>{this.transactionType.name}</Box>
    }

    getKey(): string | number {
        return this.transactionType.id;
    }
    
    public static convert(transactionTypes: TransactionType[]): TransactionTypePrintable[] {
        return transactionTypes?.map(transactionType => new TransactionTypePrintable(transactionType));
    }
}

export class WalletPrintable implements IFormMultiType {
    private wallet: Wallet;

    public constructor(wallet: Wallet) {
        this.wallet = wallet;
    }

    print(): string | JSX.Element {
        return <Box component={"span"} style={{fontWeight: this.wallet.favorite ? "bold" : undefined}}>{this.wallet.name}</Box>;
    }

    getKey(): string | number {
        return this.wallet.id;
    }
    
    public static convert(wallets: Wallet[]): WalletPrintable[] {
        return wallets?.map(wallet => new WalletPrintable(wallet));
    }
}