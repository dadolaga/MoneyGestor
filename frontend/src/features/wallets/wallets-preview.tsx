import { Star } from 'lucide-react';

import { FeatureStateBoundary } from '@/components/shared/feature-state';
import { Card, CardContent } from '@/components/ui/card';
import type { FeatureState } from '@/types/feature-state';

import type { WalletViewModel } from './model';

interface WalletsPreviewProps {
    state: FeatureState<WalletViewModel[]>;
    labels: {
        balance: string;
        favorite: string;
        states: { idle: string; loading: string; empty: string; error: string };
    };
    formatMoney: (value: number) => string;
}

export function WalletsPreview({ state, labels, formatMoney }: WalletsPreviewProps) {
    return (
        <FeatureStateBoundary state={state} labels={labels.states}>
            {(wallets) => (
                <div className="grid gap-3 sm:grid-cols-2">
                    {wallets.map((wallet) => (
                        <Card key={wallet.id}>
                            <CardContent className="flex items-center justify-between gap-4 pt-6">
                                <div className="flex min-w-0 items-center gap-3">
                                    <span
                                        className="size-3 shrink-0 rounded-full border border-border"
                                        style={{ backgroundColor: wallet.color ?? 'transparent' }}
                                    />
                                    <div className="min-w-0">
                                        <p className="m-0 truncate font-medium">{wallet.name}</p>
                                        <p className="m-0 mt-1 text-xs text-muted-foreground">{labels.balance}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {!!wallet.isFavorite && (
                                        <Star
                                            aria-label={labels.favorite}
                                            className="size-4 fill-warning text-warning"
                                        />
                                    )}
                                    <span className="whitespace-nowrap font-semibold tabular-nums">
                                        {formatMoney(wallet.currentValue)}
                                    </span>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </FeatureStateBoundary>
    );
}
