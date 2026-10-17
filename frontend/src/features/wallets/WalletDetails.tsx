'use client';

import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowLeftRight, Plus } from '@/components/ui/icons';
import type { ApiTransaction } from '@/lib/api/client';

import { useWalletFormatting } from './useWalletFormatting';
import type { DashboardWallet, LoadState, WalletDetailAction } from './wallet-dashboard-model';
import { WalletMark } from './WalletDisplay';
import { WalletMovements } from './WalletMovements';

interface WalletDetailsProps {
    wallet: DashboardWallet;
    wallets: DashboardWallet[];
    movementWalletId?: number;
    movementState: LoadState<ApiTransaction[]>;
    onAction: (action: WalletDetailAction) => void;
    onRetryMovements: () => void;
}

export function WalletDetails({
    wallet,
    wallets,
    movementWalletId,
    movementState,
    onAction,
    onRetryMovements,
}: WalletDetailsProps) {
    const t = useTranslations('WalletsDashboard');

    return (
        <Card className="flex min-w-0 flex-col p-5 shadow-none max-[701px]:p-4">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <h2 className="m-0 text-lg font-[650]">{t('details.title')}</h2>
                <div className="flex flex-wrap items-center gap-2 [&_button]:shrink-0">
                    <Button variant="outline" size="sm" onClick={() => onAction('edit')}>
                        {t('actions.edit')}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => onAction('transfer')}>
                        <ArrowLeftRight aria-hidden="true" className="size-4" />
                        {t('actions.transfer')}
                    </Button>
                    <Button size="sm" onClick={() => onAction('movement')}>
                        <Plus aria-hidden="true" className="size-4" />
                        {t('actions.movement')}
                    </Button>
                </div>
            </div>
            <div
                key={wallet.id}
                className="wallet-content-enter grid flex-1 grid-cols-1 gap-5 min-[701px]:grid-cols-[minmax(210px,0.85fr)_minmax(0,1.2fr)]"
            >
                <WalletInformation wallet={wallet} wallets={wallets} />
                <WalletMovements
                    walletId={movementWalletId}
                    isLinkedAccount={wallet.draft?.kind === 'debit'}
                    state={movementState}
                    onRetry={onRetryMovements}
                    onViewAll={() => onAction('allMovements')}
                />
            </div>
        </Card>
    );
}

function WalletInformation({ wallet, wallets }: { wallet: DashboardWallet; wallets: DashboardWallet[] }) {
    const t = useTranslations('WalletsDashboard');
    const tCreate = useTranslations('CreateWallet');
    const { money, walletBalance, walletType } = useWalletFormatting();
    const linkedAccount = wallets.find((candidate) => candidate.id === wallet.draft?.linkedAccountId);

    return (
        <div className="min-w-0">
            <div className="flex min-w-0 items-start gap-3.5">
                <WalletMark wallet={wallet} />
                <div>
                    <h3 className="m-0 text-base font-semibold [overflow-wrap:anywhere]">{wallet.name}</h3>
                    <p className="mt-1 mb-0 text-xs text-muted-foreground">{walletType(wallet)}</p>
                </div>
            </div>
            <dl className="mt-5 mb-0 text-sm">
                {[
                    [t('details.balance'), walletBalance(wallet)],
                    [t('details.availableBalance'), '—'],
                    [t('details.bookBalance'), '—'],
                    [t('details.type'), walletType(wallet)],
                    [t('details.institution'), wallet.draft?.institution ?? '—'],
                    [t('details.iban'), wallet.draft?.iban ?? '—'],
                    ...(wallet.draft?.linkedAccountId !== undefined
                        ? [[tCreate('fields.linkedAccount'), linkedAccount?.name ?? '—']]
                        : []),
                    ...(wallet.draft?.kind === 'credit'
                        ? [
                              [tCreate('fields.creditLimit'), money(wallet.draft.creditLimit ?? 0)],
                              [tCreate('fields.currentSpending'), money(wallet.draft.currentSpending ?? 0)],
                          ]
                        : []),
                    [t('details.updated'), '—'],
                ].map(([label, value]) => (
                    <div key={label} className="grid grid-cols-[1fr_1.15fr] gap-3 border-t border-border py-3">
                        <dt className="text-muted-foreground">{label}</dt>
                        <dd className="m-0 tabular-nums [overflow-wrap:anywhere]">{value}</dd>
                    </div>
                ))}
            </dl>
        </div>
    );
}
