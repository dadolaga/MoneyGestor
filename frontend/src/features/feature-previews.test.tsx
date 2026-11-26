import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { TransactionsPreview } from '@/features/transactions/TransactionsPreview';
import { WalletsPreview } from '@/features/wallets/WalletsPreview';
import { transactionStateFixtures, walletStateFixtures } from '@/lib/fixtures/finance';

const states = {
    idle: 'Waiting',
    loading: 'Loading data',
    empty: 'No data',
    error: 'Could not load',
};

const formatMoney = (value: number) => `EUR ${value.toFixed(2)}`;

describe('fixture-driven feature previews', () => {
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
});
