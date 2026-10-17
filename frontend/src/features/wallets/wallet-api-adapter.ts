import type { ApiWallet } from '@/lib/api/client';

import type { NewWalletDraft } from './new-wallet-model';

export function walletDraftFromApi(wallet: ApiWallet): NewWalletDraft | undefined {
    const details = wallet.details;
    if (details == null) return undefined;
    return {
        name: wallet.name,
        color: `#${wallet.color.value.toString(16).padStart(6, '0')}`,
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

export function walletRequestFromDraft(draft: NewWalletDraft) {
    const { name, color, initialBalance, ...details } = draft;
    return { name, colorValue: Number.parseInt(color.slice(1), 16), initialValue: initialBalance ?? 0, details };
}
