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
    date: string;
    value: number;
    wallet: number;
    walletDestination: number;
    typeId: number;
}  

// RECEIVE FROM SERVER
export interface User {
    lastname: string,
    firstname: string,
    token: string,
    expireToken: Array<number>,
}

export interface Wallet {
    id: number;
    name: string;
    value: number;
    favorite: boolean;
    color: string;
}

export interface TransactionType {
    id: number,
    name: string,
}

export interface ReceiveId {
    id: number,
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

    private constructor(transactionType: TransactionType) {
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

    private constructor(wallet: Wallet) {
        this.wallet = wallet;
    }

    print(): string | JSX.Element {
        return this.wallet.name;
    }

    getKey(): string | number {
        return this.wallet.id;
    }
    
    public static convert(wallets: Wallet[]): WalletPrintable[] {
        return wallets?.map(wallet => new WalletPrintable(wallet));
    }
}