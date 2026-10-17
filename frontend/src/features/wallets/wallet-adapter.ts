import type { ApiWallet } from '@/lib/api/client';
import type { Wallet } from '@/models/backend';

import { walletColor } from './wallet-model';
import type { WalletDraft, WalletPreviewModel } from './wallet-model';

export function walletDraftFromApi(wallet: ApiWallet): WalletDraft | undefined {
    const details = wallet.details;
    if (details == null) return undefined;
    return {
        name: wallet.name,
        color: walletColor(wallet),
        initialBalance: wallet.hasOwnBalance === false ? undefined : wallet.initialValue,
        kind: details.kind,
        currency: details.currency,
        institution: details.institution ?? undefined,
        iban: details.iban ?? undefined,
        lastFour: details.lastFour ?? undefined,
        network: details.network ?? undefined,
        expiry: details.expiry ?? undefined,
        linkedAccountId: details.linkedAccountId ?? undefined,
        creditLimit: details.creditLimit ?? undefined,
        currentSpending: details.currentSpending ?? undefined,
        statementDay: details.statementDay ?? undefined,
        paymentDay: details.paymentDay ?? undefined,
        notes: details.notes ?? undefined,
        shareable: details.shareable,
    };
}

export function walletRequestFromDraft(draft: WalletDraft) {
    const { name, color, initialBalance, ...details } = draft;
    return { name, colorValue: Number.parseInt(color.slice(1), 16), initialValue: initialBalance ?? 0, details };
}

function toCssColor(value: number | undefined): string | undefined {
    if (value === undefined || !Number.isInteger(value) || value < 0 || value > 0xffffff) return undefined;
    return `#${value.toString(16).padStart(6, '0')}`;
}

export function toWalletPreviewModels(dtos: Wallet[]): WalletPreviewModel[] {
    return dtos.flatMap((wallet) =>
        wallet.id === undefined || wallet.name === undefined || wallet.currentValue === undefined
            ? []
            : [
                  {
                      id: wallet.id,
                      name: wallet.name,
                      currentValue: wallet.currentValue,
                      isFavorite: wallet.favorite ?? false,
                      color: toCssColor(wallet.color?.value),
                  },
              ],
    );
}
