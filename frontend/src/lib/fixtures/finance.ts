import { toDashboardViewModel } from '@/features/dashboard/adapter';
import { toTransactionViewModels } from '@/features/transactions/adapter';
import { toWalletViewModels } from '@/features/wallets/adapter';
import type { WalletViewModel } from '@/features/wallets/model';
import type { DashboardOutput, Transaction, Wallet } from '@/models/backend';
import type { FeatureState, FeatureStatus } from '@/types/feature-state';

interface FeatureStateFixtures<T> {
    idle: FeatureState<T>;
    loading: FeatureState<T>;
    ready: FeatureState<T>;
    empty: FeatureState<T>;
    error: FeatureState<T>;
}

function createStateFixtures<T>(data: T): FeatureStateFixtures<T> {
    return {
        idle: { status: 'idle' },
        loading: { status: 'loading' },
        ready: { status: 'ready', data },
        empty: { status: 'empty' },
        error: { status: 'error', error: { code: 503 } },
    };
}

const dashboardDto: DashboardOutput = {
    incoming: 3250,
    expense: -1876.42,
    incomingCategories: [
        { type: { id: 3, name: 'Salary' }, value: 2950 },
        { type: { id: 4, name: 'Freelance' }, value: 300 },
    ],
    expenseCategories: [
        { type: { id: 5, name: 'Home' }, value: -980 },
        { type: { id: 6, name: 'Everyday' }, value: -896.42 },
    ],
};

const walletDtos: Wallet[] = [
    {
        id: 11,
        name: 'Main account',
        value: 1800,
        currentValue: 5230.45,
        favorite: true,
        color: { id: 1, value: 0xe3494f },
    },
    {
        id: 12,
        name: 'Main card',
        value: 600,
        currentValue: 1250.3,
        favorite: false,
        color: { id: 2, value: 0x3182ce },
    },
    {
        id: 13,
        name: 'Savings account',
        value: 5000,
        currentValue: 10200,
        favorite: false,
        color: { id: 3, value: 0x35a36f },
    },
];

const transactionDtos: Transaction[] = [
    {
        id: 101,
        description: 'September salary',
        date: '2026-09-01T08:30:00Z',
        transactionType: { id: 3, name: 'Salary' },
        wallet: walletDtos[0],
        value: 2950,
    },
    {
        id: 102,
        description: 'Weekly groceries',
        date: '2026-09-06T17:45:00Z',
        transactionType: { id: 5, name: 'Everyday' },
        wallet: walletDtos[0],
        value: -86.42,
    },
    {
        id: 103,
        description: 'Travel budget',
        date: '2026-09-08T10:00:00Z',
        transactionType: { id: 1, name: 'Transfer' },
        wallet: walletDtos[0],
        walletDestination: walletDtos[1],
        value: -250,
    },
    {
        id: 104,
        description: 'Spotify Premium',
        date: '2026-09-10T09:00:00Z',
        transactionType: { id: 6, name: 'Entertainment' },
        wallet: walletDtos[1],
        value: -9.99,
    },
    {
        id: 105,
        description: 'Freelance website',
        date: '2026-09-11T15:20:00Z',
        transactionType: { id: 4, name: 'Freelance' },
        wallet: walletDtos[0],
        value: 350,
    },
    {
        id: 106,
        description: 'Electricity bill',
        date: '2026-09-12T08:00:00Z',
        transactionType: { id: 7, name: 'Utilities' },
        wallet: walletDtos[0],
        value: -120.3,
    },
    {
        id: 107,
        description: 'Dinner at La Piazzetta',
        date: '2026-09-13T20:30:00Z',
        transactionType: { id: 8, name: 'Restaurants' },
        wallet: walletDtos[1],
        value: -65,
    },
    {
        id: 108,
        description: 'Insurance refund',
        date: '2026-09-14T11:15:00Z',
        transactionType: { id: 9, name: 'Other income' },
        wallet: walletDtos[0],
        value: 120,
    },
    {
        id: 109,
        description: 'Monthly rent',
        date: '2026-09-15T07:30:00Z',
        transactionType: { id: 10, name: 'Home' },
        wallet: walletDtos[0],
        value: -650,
    },
    {
        id: 110,
        description: 'Train ticket',
        date: '2026-09-16T16:10:00Z',
        transactionType: { id: 11, name: 'Travel' },
        wallet: walletDtos[1],
        value: -59.9,
    },
    {
        id: 111,
        description: 'Gym membership',
        date: '2026-09-17T06:45:00Z',
        transactionType: { id: 12, name: 'Health and sport' },
        wallet: walletDtos[1],
        value: -49.9,
    },
    {
        id: 112,
        description: 'Savings transfer',
        date: '2026-09-18T10:00:00Z',
        transactionType: { id: 1, name: 'Transfer' },
        wallet: walletDtos[0],
        walletDestination: walletDtos[2],
        value: -500,
    },
];

export const dashboardStateFixtures = createStateFixtures(toDashboardViewModel(dashboardDto));
export const demoWallets: WalletViewModel[] = toWalletViewModels(walletDtos).map((wallet, index) => ({
    ...wallet,
    kind: (['bank', 'card', 'savings'] as const)[index],
    monthlyChange: [1.4, -2.1, 3.6][index],
}));

demoWallets.push(
    {
        id: 14,
        name: 'Cash',
        currentValue: 320,
        isFavorite: false,
        color: '#2fbf71',
        kind: 'cash',
        monthlyChange: 0,
    },
    {
        id: 15,
        name: 'Investments',
        currentValue: 5770.2,
        isFavorite: false,
        color: '#f2b935',
        kind: 'investment',
        monthlyChange: 5.2,
    },
);

export const walletStateFixtures = createStateFixtures(demoWallets);
export const transactionStateFixtures = createStateFixtures(toTransactionViewModels(transactionDtos));

export function fixtureForStatus<T>(fixtures: FeatureStateFixtures<T>, status: FeatureStatus): FeatureState<T> {
    return fixtures[status];
}
