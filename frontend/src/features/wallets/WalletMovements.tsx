'use client';

import dayjs from 'dayjs';
import { useFormatter, useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { ArrowDown, ArrowLeftRight, ArrowRight, ArrowUp } from '@/components/ui/icons';
import type { ApiTransaction } from '@/lib/api/client';
import { cn } from '@/lib/utils';

import type { LoadState } from './wallet-model';

interface WalletMovementsProps {
    walletId?: number;
    isLinkedAccount: boolean;
    state: LoadState<ApiTransaction[]>;
    onRetry: () => void;
    onViewAll: () => void;
}

export function WalletMovements({ walletId, isLinkedAccount, state, onRetry, onViewAll }: WalletMovementsProps) {
    const t = useTranslations('WalletsDashboard');

    return (
        <section
            className="flex min-h-[280px] min-w-0 flex-col overflow-hidden rounded-lg border border-solid border-border"
            aria-labelledby="wallets-movements-title"
            aria-busy={state.status === 'loading'}
        >
            <div className="m-0 flex flex-wrap items-center justify-between gap-2 border-b border-border px-3 py-2">
                <h3 className="m-0 text-sm" id="wallets-movements-title">
                    {t(isLinkedAccount ? 'movements.linkedAccount' : 'movements.title')}
                </h3>
                <Button size="sm" variant="ghost" onClick={onViewAll}>
                    {t('actions.viewAll')}
                    <ArrowRight aria-hidden="true" className="size-4" />
                </Button>
            </div>
            {state.status === 'loading' && (
                <p className="sr-only" role="status">
                    {t('movements.loading')}
                </p>
            )}
            {state.status === 'error' && (
                <div
                    className="flex flex-1 flex-col items-center justify-center gap-2 px-4 py-10 text-center text-sm text-muted-foreground"
                    role="alert"
                >
                    <p className="m-0">{t(state.authenticationRequired ? 'states.signInAgain' : 'movements.error')}</p>
                    <Button variant="ghost" size="sm" onClick={onRetry}>
                        {t('actions.retry')}
                    </Button>
                </div>
            )}
            {state.status === 'ready' && state.data.length === 0 && (
                <p className="m-0 flex flex-1 items-center justify-center px-4 py-10 text-center text-sm text-muted-foreground">
                    {t('movements.empty')}
                </p>
            )}
            {state.status === 'ready' && state.data.length > 0 && (
                <div className="wallet-content-enter">
                    {state.data.map((movement) => (
                        <WalletMovementRow key={movement.id} movement={movement} walletId={walletId} />
                    ))}
                </div>
            )}
        </section>
    );
}

function WalletMovementRow({ movement, walletId }: { movement: ApiTransaction; walletId?: number }) {
    const t = useTranslations('WalletsDashboard');
    const format = useFormatter();
    const isTransfer = movement.destination !== null;
    const MovementIcon = isTransfer ? ArrowLeftRight : movement.value >= 0 ? ArrowUp : ArrowDown;
    const signedValue = isTransfer
        ? movement.destination?.id === walletId
            ? Math.abs(movement.value)
            : -Math.abs(movement.value)
        : movement.value;
    const tone = isTransfer ? 'text-transfer' : signedValue >= 0 ? 'text-income' : 'text-expense';

    return (
        <div className="grid grid-cols-[75px_20px_minmax(65px,1fr)_auto] items-center gap-3 px-3 py-4 text-xs [&+div]:border-t [&+div]:border-border max-[701px]:grid-cols-[65px_16px_minmax(40px,1fr)_auto] max-[701px]:gap-2 max-[701px]:px-2 min-[1700px]:grid-cols-[85px_20px_minmax(65px,1fr)_75px_auto]">
            <time className="text-muted-foreground" dateTime={movement.date}>
                {format.dateTime(dayjs(movement.date).toDate(), {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                })}
            </time>
            <MovementIcon aria-hidden="true" className={cn('size-5', tone)} />
            <span className="truncate" title={movement.description ?? undefined}>
                {movement.description ?? t('movements.untitled')}
            </span>
            <span className="hidden truncate text-muted-foreground min-[1700px]:block">{movement.type.name}</span>
            <strong className={cn('text-right text-xs whitespace-nowrap tabular-nums max-[701px]:text-[11px]', tone)}>
                {format.number(signedValue, {
                    style: 'currency',
                    currency: 'EUR',
                    signDisplay: 'always',
                })}
            </strong>
        </div>
    );
}
