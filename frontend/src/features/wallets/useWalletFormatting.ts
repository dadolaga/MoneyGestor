'use client';

import { useFormatter, useTranslations } from 'next-intl';

import type { DashboardWallet } from './wallet-model';

export function useWalletFormatting() {
    const t = useTranslations('WalletsDashboard');
    const tCreate = useTranslations('CreateWallet');
    const format = useFormatter();
    const money = (value: number) => format.number(value, { style: 'currency', currency: 'EUR' });
    const percentage = (value: number) => format.number(value, { style: 'percent', maximumFractionDigits: 0 });
    const walletBalance = (wallet: DashboardWallet) =>
        wallet.currentValue === undefined ? '—' : money(wallet.currentValue);
    const walletType = (wallet: DashboardWallet) =>
        wallet.draft === undefined ? t('details.wallet') : tCreate(`kinds.${wallet.draft.kind}`);

    return { money, percentage, walletBalance, walletType };
}
