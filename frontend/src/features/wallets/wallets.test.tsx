import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it, vi } from 'vitest';

import { toWalletViewModels } from '@/features/wallets/adapter';
import { WalletDialog } from '@/features/wallets/wallet-dialog';
import { WalletsPage } from '@/features/wallets/wallets-page';
import { demoWallets } from '@/lib/fixtures/finance';

import commonMessages from '../../../messages/en/common.json';
import walletMessages from '../../../messages/en/wallets.json';

const messages = { ...commonMessages, ...walletMessages };

function renderWithIntl(node: React.ReactNode) {
    return render(
        <NextIntlClientProvider locale="en" messages={messages}>
            {node}
        </NextIntlClientProvider>,
    );
}

describe('wallet feature', () => {
    it('adapts valid backend DTOs and discards incomplete records', () => {
        expect(
            toWalletViewModels([
                { id: 1, name: 'Main', currentValue: 1250, favorite: true, color: { value: 0x123abc } },
                { id: 2, currentValue: 10 },
            ]),
        ).toEqual([
            {
                id: 1,
                name: 'Main',
                currentValue: 1250,
                isFavorite: true,
                color: '#123abc',
            },
        ]);
    });

    it('creates a local wallet through the dialog', async () => {
        const user = userEvent.setup();
        const save = vi.fn();

        renderWithIntl(<WalletDialog open onOpenChange={() => undefined} onSave={save} />);

        await user.type(screen.getByLabelText('Wallet name'), 'Holiday fund');
        await user.type(screen.getByLabelText('Opening balance'), '1500.50');
        await user.click(screen.getByRole('button', { name: 'Add wallet' }));

        expect(save).toHaveBeenCalledWith(
            expect.objectContaining({ name: 'Holiday fund', currentValue: 1500.5, kind: 'bank' }),
        );
    });

    it('chooses a card subtype and shows its specific fields in the same dialog', async () => {
        const user = userEvent.setup();

        renderWithIntl(
            <WalletDialog
                open
                availableWallets={[demoWallets[0]]}
                onOpenChange={() => undefined}
                onSave={() => undefined}
            />,
        );

        await user.click(screen.getByRole('radio', { name: 'Card' }));

        expect(screen.getAllByRole('dialog')).toHaveLength(1);
        expect(screen.getByRole('radio', { name: 'Debit' })).toBeInTheDocument();
        expect(screen.getByRole('radio', { name: 'Credit' })).toBeInTheDocument();
        expect(screen.getByRole('radio', { name: 'Prepaid' })).toBeInTheDocument();
        expect(screen.getByLabelText('Linked account')).toBeInTheDocument();

        await user.click(screen.getByRole('radio', { name: 'Credit' }));
        expect(screen.getByLabelText('Collection day')).toBeInTheDocument();
        expect(screen.getByLabelText('Current amount due')).toBeInTheDocument();

        await user.click(screen.getByRole('radio', { name: 'Prepaid' }));
        expect(screen.queryByLabelText('Collection day')).not.toBeInTheDocument();
        expect(screen.getByLabelText('Top-up account (optional)')).toBeInTheDocument();
        expect(screen.getByLabelText('Low-balance threshold (optional)')).toBeInTheDocument();
    });

    it('renders the ready state with wallet and summary trend icons', () => {
        renderWithIntl(<WalletsPage initialState={{ status: 'ready', data: demoWallets }} />);

        expect(screen.getAllByText('Main account')).not.toHaveLength(0);
        expect(screen.getByText('Total wealth')).toBeInTheDocument();
    });

    it.each([
        [{ status: 'loading' } as const, 'Loading wallets…'],
        [{ status: 'empty' } as const, 'No wallets yet. Add your first wallet to get started.'],
        [{ status: 'error', error: { code: 503 } } as const, 'Wallets could not be loaded.'],
    ])('renders the fixture-driven %s state', (state, expected) => {
        renderWithIntl(<WalletsPage initialState={state} />);
        expect(screen.getByText(expected)).toBeInTheDocument();
    });
});
