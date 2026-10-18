import axios from 'axios';
import type { AxiosRequestConfig, AxiosResponse } from 'axios';

export const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5256';

const http = axios.create({
    baseURL: apiBaseUrl,
    withCredentials: true,
    headers: { Accept: 'application/json, application/problem+json' },
});

export interface AccountConfiguration {
    requireConfirmedEmail: boolean;
}

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
    details?: ApiWalletDetails | null;
    hasOwnBalance?: boolean;
    includedInTotal?: boolean;
}

export interface ApiWalletDetails {
    kind: 'bank' | 'prepaid' | 'debit' | 'credit' | 'cash';
    currency: 'EUR';
    institution?: string | null;
    iban?: string | null;
    lastFour?: string | null;
    network?: 'visa' | 'mastercard' | 'amex' | 'other' | null;
    expiry?: string | null;
    linkedAccountId?: number | null;
    creditLimit?: number | null;
    currentSpending?: number | null;
    statementDay?: number | null;
    paymentDay?: number | null;
    notes?: string | null;
    shareable: boolean;
}

export interface ApiTransactionType {
    id: number;
    name: string;
    isGlobal: boolean;
    parentId: number | null;
    icon: string;
    color: string;
    description: string | null;
    keywords: string | null;
    useInReports: boolean;
    systemKind: 'Transfer' | 'Adjustment' | null;
}

export interface TransactionTypeCreate {
    name: string;
    parentId?: number | null;
    icon?: string;
    color?: string;
    description?: string | null;
    keywords?: string | null;
    useInReports?: boolean;
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

export interface TransactionTotals {
    income: number;
    expense: number;
    transfers: number;
    incomeCount: number;
    expenseCount: number;
    transferCount: number;
    movementCount: number;
}

export interface TransactionOverview {
    period: { from: string; to: string };
    totals: TransactionTotals;
    previous: { period: { from: string; to: string }; totals: TransactionTotals };
    expenseCategories: { typeId: number; value: number }[];
    weekly: { from: string; to: string; income: number; expense: number }[];
    daily: { date: string; income: number; expense: number; transfers: number; movementCount: number }[];
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
    colorId?: number;
    colorValue?: number;
    details?: ApiWalletDetails;
}

export interface WalletUpdate {
    name?: string;
    colorId?: number;
    colorValue?: number;
    details?: ApiWalletDetails;
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

async function requestCsrf(): Promise<string> {
    // Fetch for each mutation so login/logout and other tabs cannot leave a cached identity token.
    const response = await http.get<{ token: string }>('/api/v1/auth/antiforgery');
    return response.data.token;
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

async function exportTransactions(params: TransactionQuery & { locale: string }, signal?: AbortSignal) {
    try {
        const response = await http.get<Blob>('/api/v1/transactions/export', { params, signal, responseType: 'blob' });
        const disposition = String(response.headers['content-disposition'] ?? '');
        const filename = /filename="?([^";]+)"?/.exec(disposition)?.[1] ?? `flowiy-${params.from}-${params.to}.csv`;
        return { blob: response.data, filename };
    } catch (error) {
        if (axios.isAxiosError(error) && error.response?.data instanceof Blob) {
            const content = await error.response.data.text();
            try { error.response.data = JSON.parse(content); } catch { /* Non-JSON HTTP errors use the status fallback. */ }
        }
        throw toApiProblem(error);
    }
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
    accountConfiguration: (signal?: AbortSignal) => send<AccountConfiguration>({ method: 'GET', url: '/api/v1/auth/configuration', signal }),
    session: (signal?: AbortSignal) => send<{ id: number; firstname: string; lastname: string; email: string; username: string }>({ method: 'GET', url: '/api/v1/auth/session', signal }),
    logout: (signal?: AbortSignal) => send<void>({ method: 'POST', url: '/api/v1/auth/logout', signal }, true),
    colors: (signal?: AbortSignal) => send<ApiColor[]>({ method: 'GET', url: '/api/v1/colors', signal }),
    wallets: (signal?: AbortSignal) => send<ApiWallet[]>({ method: 'GET', url: '/api/v1/wallets', signal }),
    createWallet: (body: WalletCreate, signal?: AbortSignal) => send<{ id: number }>({ method: 'POST', url: '/api/v1/wallets', data: body, signal }, true),
    updateWallet: (id: number, body: WalletUpdate, signal?: AbortSignal) => send<void>({ method: 'PUT', url: `/api/v1/wallets/${id}`, data: body, signal }, true),
    deleteWallet: (id: number, signal?: AbortSignal) => send<void>({ method: 'DELETE', url: `/api/v1/wallets/${id}`, signal }, true),
    setWalletFavorite: (id: number, favorite: boolean, signal?: AbortSignal) => send<void>({ method: 'PUT', url: `/api/v1/wallets/${id}/favorite`, data: favorite, signal }, true),
    transactionTypes: (signal?: AbortSignal) => send<ApiTransactionType[]>({ method: 'GET', url: '/api/v1/transaction-types', signal }),
    transactionType: (id: number, signal?: AbortSignal) => send<ApiTransactionType>({ method: 'GET', url: `/api/v1/transaction-types/${id}`, signal }),
    createTransactionType: (body: TransactionTypeCreate, signal?: AbortSignal) => send<{ id: number }>({ method: 'POST', url: '/api/v1/transaction-types', data: body, signal }, true),
    transaction: (id: number, signal?: AbortSignal) => send<ApiTransaction>({ method: 'GET', url: `/api/v1/transactions/${id}`, signal }),
    transactionOverview: (params: TransactionQuery, signal?: AbortSignal) => send<TransactionOverview>({ method: 'GET', url: '/api/v1/transactions/overview', params, signal }),
    exportTransactions,
    transactions: (params: TransactionQuery = {}, signal?: AbortSignal) => send<ApiPage<ApiTransaction>>({ method: 'GET', url: '/api/v1/transactions', params, signal }),
    createTransaction: (body: TransactionCreate, signal?: AbortSignal) => send<{ id: number }>({ method: 'POST', url: '/api/v1/transactions', data: body, signal }, true),
    updateTransaction: (id: number, body: TransactionUpdate, signal?: AbortSignal) => send<void>({ method: 'PATCH', url: `/api/v1/transactions/${id}`, data: body, signal }, true),
    deleteTransaction: (id: number, signal?: AbortSignal) => send<void>({ method: 'DELETE', url: `/api/v1/transactions/${id}`, signal }, true),
    dashboard: (from: string, to: string, signal?: AbortSignal) => send<ApiDashboard>({ method: 'GET', url: '/api/v1/dashboard', params: { from, to }, signal }),
};
