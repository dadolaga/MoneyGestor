import { IFormMultiType } from "./Interfaces";

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