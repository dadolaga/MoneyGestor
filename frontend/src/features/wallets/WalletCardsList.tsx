'use client';

import { useRef } from 'react';
import type { MouseEvent, PointerEvent } from 'react';

import { useTranslations } from 'next-intl';

import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

import { useWalletFormatting } from './useWalletFormatting';
import type { DashboardWallet } from './wallet-dashboard-model';
import { WalletMark, WalletStatus } from './WalletDisplay';

interface WalletCardsListProps {
    wallets: DashboardWallet[];
    isLoading: boolean;
    selectedId?: number;
    onSelect: (wallet: DashboardWallet) => void;
}

export function WalletCardsList({ wallets, isLoading, selectedId, onSelect }: WalletCardsListProps) {
    const t = useTranslations('WalletsDashboard');
    const dragRef = useRef<{
        pointerId: number;
        startX: number;
        scrollLeft: number;
    } | null>(null);
    const suppressClickRef = useRef(false);

    function pointerDownHandler(event: PointerEvent<HTMLDivElement>) {
        suppressClickRef.current = false;
        // Touch scrolling stays native, including vertical page gestures.
        if (event.pointerType !== 'mouse' || event.button !== 0) return;

        dragRef.current = {
            pointerId: event.pointerId,
            startX: event.clientX,
            scrollLeft: event.currentTarget.scrollLeft,
        };
    }

    function pointerMoveHandler(event: PointerEvent<HTMLDivElement>) {
        const drag = dragRef.current;
        if (!drag || drag.pointerId !== event.pointerId) return;
        if (event.buttons !== 1) {
            pointerEndHandler(event);
            return;
        }

        const distance = event.clientX - drag.startX;
        if (!suppressClickRef.current && Math.abs(distance) < 6) return;

        suppressClickRef.current = true;
        event.currentTarget.setPointerCapture(event.pointerId);
        event.preventDefault();
        event.currentTarget.scrollLeft = drag.scrollLeft - distance;
    }

    function pointerEndHandler(event: PointerEvent<HTMLDivElement>) {
        if (dragRef.current?.pointerId !== event.pointerId) return;

        dragRef.current = null;
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId);
        }
    }

    function clickCaptureHandler(event: MouseEvent<HTMLDivElement>) {
        // A drag must not select a card; keyboard activation still works.
        if (!suppressClickRef.current || event.detail === 0) return;

        event.preventDefault();
        event.stopPropagation();
        suppressClickRef.current = false;
    }

    return (
        <section aria-labelledby="wallets-list-title" aria-busy={isLoading}>
            {!!isLoading && (
                <span className="sr-only" role="status">
                    {t('states.loading')}
                </span>
            )}
            <div className="mb-2.5 flex items-center justify-between gap-3">
                <h2 className="m-0 text-base font-[650]" id="wallets-list-title">
                    {t('list.title')}
                </h2>
            </div>
            <div
                className="-mx-1 flex cursor-grab gap-3 overflow-x-auto overscroll-x-contain p-1 select-none [scrollbar-width:none] active:cursor-grabbing [&::-webkit-scrollbar]:hidden"
                onPointerDown={pointerDownHandler}
                onPointerMove={pointerMoveHandler}
                onPointerUp={pointerEndHandler}
                onPointerCancel={pointerEndHandler}
                onLostPointerCapture={pointerEndHandler}
                onClickCapture={clickCaptureHandler}
            >
                {!!isLoading && <Card aria-hidden="true" className="min-h-[156px] w-[340px] shrink-0 shadow-none" />}
                {wallets.map((wallet) => (
                    <WalletCard
                        key={wallet.id}
                        wallet={wallet}
                        isSelected={wallet.id === selectedId}
                        onSelect={onSelect}
                    />
                ))}
            </div>
        </section>
    );
}

interface WalletCardProps {
    wallet: DashboardWallet;
    isSelected: boolean;
    onSelect: (wallet: DashboardWallet) => void;
}

function WalletCard({ wallet, isSelected, onSelect }: WalletCardProps) {
    const { walletBalance, walletType } = useWalletFormatting();

    return (
        <button
            type="button"
            className={cn(
                'wallet-card-interactive min-h-[156px] w-[340px] shrink-0 cursor-[inherit] rounded-xl border border-solid border-border bg-card px-3.5 pt-4 pb-3 text-left text-card-foreground hover:border-muted-foreground',
                isSelected &&
                    'border-primary hover:border-primary bg-[color-mix(in_oklch,var(--primary)_5%,var(--card))] shadow-[inset_0_0_0_1px_var(--primary)]',
            )}
            aria-pressed={isSelected}
            onClick={() => onSelect(wallet)}
        >
            <div className="flex min-w-0 items-start gap-3.5">
                <WalletMark wallet={wallet} />
                <div className="min-w-0">
                    <h3 className="m-0 truncate text-sm font-semibold" title={wallet.name}>
                        {wallet.name}
                    </h3>
                    <p className="mt-1 mb-0 text-xs text-muted-foreground">{walletType(wallet)}</p>
                    <strong className="mt-2.5 block text-[21px] font-semibold tabular-nums">
                        {walletBalance(wallet)}
                    </strong>
                </div>
            </div>
            <div className="mt-4 flex items-center justify-between gap-2">
                <WalletStatus />
                <span className="rounded-lg bg-secondary px-[9px] py-[5px] text-[11px]">{walletType(wallet)}</span>
            </div>
        </button>
    );
}
