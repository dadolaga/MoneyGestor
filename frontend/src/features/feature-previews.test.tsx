import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { DashboardPreview } from '@/features/dashboard/dashboard-preview';
import { TransactionsPreview } from '@/features/transactions/transactions-preview';
import { WalletsPreview } from '@/features/wallets/WalletsPreview';
import { dashboardStateFixtures, transactionStateFixtures, walletStateFixtures } from '@/lib/fixtures/finance';

const states = {
    idle: 'Waiting',
    loading: 'Loading data',
    empty: 'No data',
    error: 'Could not load',
};

const formatMoney = (value: number) => `EUR ${value.toFixed(2)}`;

describe('fixture-driven feature previews', () => {
    it('renders dashboard data passed through props', () => {
        render(
            <DashboardPreview
                state={dashboardStateFixtures.ready}
                labels={{ incoming: 'Income', expense: 'Expenses', categories: 'Categories', states }}
                formatMoney={formatMoney}
            />,
        );

        expect(screen.getByText('EUR 3250.00')).toBeInTheDocument();
        expect(screen.getByText('Salary')).toBeInTheDocument();
    });

    it('renders wallet data passed through props', () => {
        render(
            <WalletsPreview
                state={walletStateFixtures.ready}
                labels={{ balance: 'Current balance', favorite: 'Favourite wallet', states }}
                formatMoney={formatMoney}
            />,
        );

        expect(screen.getByText('Main account')).toBeInTheDocument();
        expect(screen.getByLabelText('Favourite wallet')).toBeInTheDocument();
    });

    it('renders transaction data passed through props', () => {
        render(
            <TransactionsPreview
                state={transactionStateFixtures.ready}
                labels={{
                    description: 'Description',
                    wallet: 'Wallet',
                    date: 'Date',
                    amount: 'Amount',
                    fallbackDescription: 'Untitled',
                    transfer: 'Transfer',
                    states,
                }}
                formatDate={(value) => value.slice(0, 10)}
                formatMoney={formatMoney}
            />,
        );

        expect(screen.getByText('Weekly groceries')).toBeInTheDocument();
        expect(screen.getAllByText('Transfer')).toHaveLength(2);
    });

    it.each([
        ['idle', dashboardStateFixtures.idle, 'Waiting'],
        ['loading', dashboardStateFixtures.loading, 'Loading data'],
        ['empty', dashboardStateFixtures.empty, 'No data'],
        ['error', dashboardStateFixtures.error, 'Could not load'],
    ] as const)('renders the %s state without a backend', (_name, state, expected) => {
        render(
            <DashboardPreview
                state={state}
                labels={{ incoming: 'Income', expense: 'Expenses', categories: 'Categories', states }}
                formatMoney={formatMoney}
            />,
        );

        expect(screen.getByText(expected)).toBeInTheDocument();
    });
});
