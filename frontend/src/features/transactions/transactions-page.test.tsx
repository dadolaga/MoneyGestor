import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it } from 'vitest';

import { transactionStateFixtures } from '@/lib/fixtures/finance';

import { TransactionsPage } from './transactions-page';
import messages from '../../../messages/en/movements.json';

function renderPage() {
    return render(
        <NextIntlClientProvider locale="en" messages={messages} timeZone="Europe/Rome">
            <TransactionsPage initialState={transactionStateFixtures.ready} />
        </NextIntlClientProvider>,
    );
}

describe('transactions page', () => {
    it('filters the transaction list by its visible content', async () => {
        const user = userEvent.setup();
        renderPage();

        await user.type(screen.getByRole('textbox', { name: 'Search transactions' }), 'Spotify');

        expect(screen.getAllByText('Spotify Premium')).toHaveLength(2);
        expect(screen.queryByText('Weekly groceries')).not.toBeInTheDocument();
        expect(screen.getByText('1 transaction')).toBeInTheDocument();
    });

    it('opens the shared create form', async () => {
        const user = userEvent.setup();
        renderPage();

        await user.click(screen.getByRole('button', { name: 'New transaction' }));

        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: 'New transaction' })).toBeInTheDocument();
        expect(screen.getByLabelText('Description')).toBeInTheDocument();
        expect(screen.getByLabelText('Amount')).toBeInTheDocument();
        expect(screen.getByLabelText('Date')).toHaveProperty('tagName', 'BUTTON');

        fireEvent.click(screen.getByLabelText('Date'));
        expect(screen.getByRole('grid')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Today' })).toBeInTheDocument();
    });

    it('opens the two-month date range calendar', () => {
        renderPage();

        fireEvent.click(screen.getByRole('button', { name: 'Date range' }));

        expect(screen.getAllByRole('grid')).toHaveLength(2);
        expect(screen.getByRole('button', { name: 'Previous month' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Next month' })).toBeInTheDocument();
    });

    it('sorts a column in both directions from its header', async () => {
        const user = userEvent.setup();
        renderPage();
        const table = screen.getByRole('table');
        const amountHeader = within(table).getByRole('button', { name: 'Amount' });

        await user.click(amountHeader);
        expect(within(within(table).getAllByRole('row')[1]).getByText('Monthly rent')).toBeInTheDocument();
        expect(within(table).getByRole('columnheader', { name: 'Amount' })).toHaveAttribute('aria-sort', 'ascending');

        await user.click(amountHeader);
        expect(within(within(table).getAllByRole('row')[1]).getByText('September salary')).toBeInTheDocument();
        expect(within(table).getByRole('columnheader', { name: 'Amount' })).toHaveAttribute('aria-sort', 'descending');
    });
});
