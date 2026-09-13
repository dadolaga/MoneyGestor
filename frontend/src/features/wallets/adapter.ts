import type { Wallet } from '@/models/backend';

import type { WalletViewModel } from './model';

function toCssColor(value: number | undefined): string | undefined {
    if (value === undefined || !Number.isInteger(value) || value < 0 || value > 0xffffff) return undefined;
    return `#${value.toString(16).padStart(6, '0')}`;
}

export function toWalletViewModels(dtos: Wallet[]): WalletViewModel[] {
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
