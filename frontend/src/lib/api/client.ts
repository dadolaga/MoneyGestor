import axios from 'axios';
import type { AxiosRequestConfig, AxiosResponse } from 'axios';

const http = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5256',
    withCredentials: true,
    headers: { Accept: 'application/json, application/problem+json' },
});

export interface ApiColor {
    id: number;
    name: string | null;
    value: number;
}

export interface ApiWallet {
    id: number;
    name: string;
    initialValue: number;
    currentValue: number;
    favorite: boolean;
    color: ApiColor;
}

export interface ApiTransactionType {
    id: number;
    name: string;
    isGlobal: boolean;
}

export interface ApiWalletReference {
    id: number;
    name: string;
    color: ApiColor;
}

export interface ApiTransaction {
    id: number;
    description: string | null;
    longDescription: string | null;
    date: string;
    value: number;
    type: ApiTransactionType;
    wallet: ApiWalletReference;
    destination: ApiWalletReference | null;
}

export interface ApiPage<T> {
    page: number;
    pageSize: number;
    totalCount: number;
    items: T[];
}

export interface ApiDashboardCategory {
    type: ApiTransactionType;
    value: number;
}

export interface ApiDashboard {
    incoming: number;
    expense: number;
    incomingCategories: ApiDashboardCategory[];
    expenseCategories: ApiDashboardCategory[];
}

export interface TransactionQuery {
    page?: number;
    pageSize?: number;
    from?: string;
    to?: string;
    walletId?: number;
    typeId?: number;
    kind?: 'Income' | 'Expense' | 'Transfer';
    search?: string;
    sortBy?: 'Date' | 'Description' | 'Value' | 'Type' | 'Wallet';
    direction?: 'Ascending' | 'Descending';
}

export interface WalletCreate {
    name: string;
    initialValue: number;
    colorId: number;
}

export interface WalletUpdate {
    name?: string;
    colorId?: number;
}

export interface TransactionCreate {
    description?: string | null;
    longDescription?: string | null;
    date: string;
    value: number;
    typeId: number;
    walletId: number;
    destinationWalletId?: number | null;
}

export interface TransactionUpdate {
    description?: string | null;
    longDescription?: string | null;
    date?: string | null;
    value?: number | null;
    typeId?: number | null;
    walletId?: number | null;
    destinationWalletId?: number | null;
}

export class ApiProblemError extends Error {
    constructor(
        readonly status: number,
        readonly code: string,
        readonly fieldErrors: Record<string, string[]> = {},
    ) {
        super(code);
        this.name = 'ApiProblemError';
    }
}

let csrfRequest: Promise<string> | undefined;

async function requestCsrf(): Promise<string> {
    const request = csrfRequest ??= http
        .get<{ token: string }>('/api/v1/auth/antiforgery')
        .then((response) => response.data.token)
        .catch((error: unknown) => {
            csrfRequest = undefined;
            throw toApiProblem(error);
        });
    return request;
}

function toApiProblem(error: unknown): Error {
    if (!axios.isAxiosError(error)) return error instanceof Error ? error : new Error('unexpected_error');
    if (!error.response) return error.code === 'ERR_CANCELED' ? error : new ApiProblemError(0, 'network_error');
    const body = error.response.data as {
        code?: unknown;
        errors?: unknown;
    };
    const errors = body?.errors && typeof body.errors === 'object' ? (body.errors as Record<string, string[]>) : {};
    return new ApiProblemError(
        error.response.status,
        typeof body?.code === 'string' ? body.code : 'unexpected_error',
        errors,
    );
}

async function send<T>(config: AxiosRequestConfig, unsafe = false): Promise<T> {
    try {
        const csrf = unsafe ? await requestCsrf() : undefined;
        const response: AxiosResponse<T> = await http.request<T>({
            ...config,
            headers: { ...config.headers, ...(csrf ? { 'X-CSRF-TOKEN': csrf } : {}) },
        });
        return response.data;
    } catch (error) {
        throw toApiProblem(error);
    }
}

export const apiClient = {
    session: (signal?: AbortSignal) => send<{ id: number; firstname: string; lastname: string; email: string; username: string }>({ method: 'GET', url: '/api/v1/auth/session', signal }),
    logout: (signal?: AbortSignal) => send<void>({ method: 'POST', url: '/api/v1/auth/logout', signal }, true),
    colors: (signal?: AbortSignal) => send<ApiColor[]>({ method: 'GET', url: '/api/v1/colors', signal }),
    wallets: (signal?: AbortSignal) => send<ApiWallet[]>({ method: 'GET', url: '/api/v1/wallets', signal }),
    createWallet: (body: WalletCreate, signal?: AbortSignal) => send<{ id: number }>({ method: 'POST', url: '/api/v1/wallets', data: body, signal }, true),
    updateWallet: (id: number, body: WalletUpdate, signal?: AbortSignal) => send<void>({ method: 'PUT', url: `/api/v1/wallets/${id}`, data: body, signal }, true),
    deleteWallet: (id: number, signal?: AbortSignal) => send<void>({ method: 'DELETE', url: `/api/v1/wallets/${id}`, signal }, true),
    setWalletFavorite: (id: number, favorite: boolean, signal?: AbortSignal) => send<void>({ method: 'PUT', url: `/api/v1/wallets/${id}/favorite`, data: favorite, signal }, true),
    transactionTypes: (signal?: AbortSignal) => send<ApiTransactionType[]>({ method: 'GET', url: '/api/v1/transaction-types', signal }),
    createTransactionType: (name: string, signal?: AbortSignal) => send<{ id: number }>({ method: 'POST', url: '/api/v1/transaction-types', data: { name }, signal }, true),
    transactions: (params: TransactionQuery = {}, signal?: AbortSignal) => send<ApiPage<ApiTransaction>>({ method: 'GET', url: '/api/v1/transactions', params, signal }),
    createTransaction: (body: TransactionCreate, signal?: AbortSignal) => send<{ id: number }>({ method: 'POST', url: '/api/v1/transactions', data: body, signal }, true),
    updateTransaction: (id: number, body: TransactionUpdate, signal?: AbortSignal) => send<void>({ method: 'PATCH', url: `/api/v1/transactions/${id}`, data: body, signal }, true),
    deleteTransaction: (id: number, signal?: AbortSignal) => send<void>({ method: 'DELETE', url: `/api/v1/transactions/${id}`, signal }, true),
    dashboard: (from: string, to: string, signal?: AbortSignal) => send<ApiDashboard>({ method: 'GET', url: '/api/v1/dashboard', params: { from, to }, signal }),
};
