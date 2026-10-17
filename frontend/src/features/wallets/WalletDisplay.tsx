'use client';

import { useTranslations } from 'next-intl';

import { Wallet } from '@/components/ui/icons';

import { newWalletIcons } from './new-wallet-model';
import { walletColor } from './wallet-dashboard-model';
import type { DashboardWallet } from './wallet-dashboard-model';

export function WalletMark({ wallet }: { wallet: DashboardWallet }) {
    const color = walletColor(wallet);
    const Icon = wallet.draft === undefined ? Wallet : newWalletIcons[wallet.draft.kind];
    return (
        <span
            className="flex size-[46px] shrink-0 items-center justify-center rounded-[10px] bg-[color-mix(in_oklch,currentColor_18%,transparent)]"
            style={{ color }}
        >
            <Icon aria-hidden="true" className="size-6" />
        </span>
    );
}

export function WalletStatus() {
    const t = useTranslations('WalletsDashboard');

    return (
        <span className="inline-flex items-center gap-[7px] text-[11px] whitespace-nowrap text-muted-foreground [&>span]:size-2 [&>span]:rounded-full [&>span]:bg-muted-foreground">
            <span />
            {t('details.statusUnavailable')}
        </span>
    );
}
