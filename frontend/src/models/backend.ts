export interface ApiList<T> {
    length: number;
    data: T[];
}

export interface ListFilter {
    order?: string;
    offset?: number;
    limit?: number;
    where?: string;
}

export interface User {
    id?: number;
    firstname?: string;
    lastname?: string;
    email?: string;
    username?: string;
    password?: string;
}

export interface Wallet {
    id?: number;
    name?: string;
    value?: number;
    currentValue?: number;
    favorite?: boolean;
    color?: Color;
}

export interface Type {
    id?: number;
    name?: string;
    userId?: number;
}

export interface Transaction {
    id?: number;
    description?: string;
    longDescription?: string;
    date?: string;
    transactionType?: Type;
    user?: User;
    userInsert?: User;
    wallet?: Wallet;
    walletDestination?: Wallet;
    value?: number;
}

export interface Color {
    id?: number;
    name?: string;
    value?: number;
    userId?: number;
}

export class Login {
    user: string;
    password: string;
    remember: boolean = false;
}

export class DashboardOutput {
    incoming: number;
    expense: number;
    incomingCategories: DashboardOutputChar[];
    expenseCategories: DashboardOutputChar[];
}

export class DashboardOutputChar {
    type: Type;
    value: number;
}
