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
    name: string,
    value: number,
    color: string,
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
    value: number; // In TS, BigDecimal can be represented as a number
    favorite: boolean;
    color: string;
}


export interface ReceiveId {
    id: number,
}