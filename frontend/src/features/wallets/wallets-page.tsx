'use client';

import { useMemo, useState } from 'react';

import { useFormatter, useTranslations } from 'next-intl';

import { ConfirmDeleteDialog } from '@/components/shared/confirm-delete-dialog';
import { FeatureStateBoundary } from '@/components/shared/feature-state';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Banknote,
    ChartNoAxesColumnIncreasing,
    CreditCard,
    EllipsisVertical,
    Grid2X2,
    Landmark,
    List,
    PiggyBank,
    Plus,
    Star,
    TrendingDown,
    TrendingUp,
    WalletCards,
} from '@/components/ui/icons';
import type { IconComponent } from '@/components/ui/icons';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { FeatureState } from '@/types/feature-state';

import type { WalletIcon, WalletViewModel } from './model';
import { WalletDialog } from './wallet-dialog';
import { WalletDistributionChart } from './wallet-distribution-chart';

type WalletSort = 'name' | 'balance';
type WalletLayout = 'grid' | 'list';

interface WalletsPageProps {
    initialState: FeatureState<WalletViewModel[]>;
}

const kindIcons: Record<WalletIcon, IconComponent> = {
    bank: Landmark,
    savings: PiggyBank,
    card: CreditCard,
    cash: Banknote,
    investment: ChartNoAxesColumnIncreasing,
    wallet: WalletCards,
};

function WalletCard({
    wallet,
    layout,
    formatMoney,
    onEdit,
    onDelete,
}: {
    wallet: WalletViewModel;
    layout: WalletLayout;
    formatMoney: (value: number) => string;
    onEdit: (wallet: WalletViewModel) => void;
    onDelete: (wallet: WalletViewModel) => void;
}) {
    const t = useTranslations('Wallets');
    const Icon = kindIcons[wallet.icon ?? wallet.kind ?? 'bank'];
    const monthlyChange = wallet.monthlyChange ?? 0;
    const walletColor = wallet.color ?? 'var(--muted-foreground)';
    const walletDescription =
        wallet.kind === 'card' && wallet.cardDetails !== undefined
            ? [
                  t(`cardTypes.${wallet.cardDetails.kind}`),
                  wallet.cardDetails.lastFour ? `•••• ${wallet.cardDetails.lastFour}` : undefined,
              ]
                  .filter(Boolean)
                  .join(' · ')
            : (wallet.description ?? t(`types.${wallet.kind ?? 'bank'}`));

    return (
        <Card className={cn('min-w-0 overflow-hidden', layout === 'list' && 'sm:col-span-2 xl:col-span-3')}>
            <CardContent
                className={cn(
                    'grid gap-5 p-5',
                    layout === 'list' && 'sm:grid-cols-[minmax(12rem,1fr)_auto_auto] sm:items-center',
                )}
            >
                <div className="flex min-w-0 items-center gap-3">
                    <span
                        className="flex size-12 shrink-0 items-center justify-center rounded-full"
                        style={{
                            backgroundColor: `color-mix(in oklch, ${walletColor} 18%, transparent)`,
                            color: walletColor,
                        }}
                    >
                        <Icon aria-hidden="true" className="size-6" />
                    </span>
                    <div className="min-w-0">
                        <div className="flex items-center gap-2">
                            <h3 className="m-0 truncate text-base font-semibold">{wallet.name}</h3>
                            {!!wallet.isFavorite && (
                                <Star
                                    aria-label={t('list.favorite')}
                                    className="size-4 shrink-0 fill-warning text-warning"
                                />
                            )}
                        </div>
                        <p className="m-0 mt-1 truncate text-sm text-muted-foreground">{walletDescription}</p>
                    </div>
                </div>
                <div className={cn('flex flex-col gap-1', layout === 'grid' ? 'items-start' : 'items-end')}>
                    <p className="m-0 mt-1 text-2xl font-bold tabular-nums">{formatMoney(wallet.currentValue)}</p>
                    <WalletBadge value={monthlyChange} />
                </div>
                <div className="flex items-center gap-2 sm:justify-end">
                    <Button className="flex-1 sm:flex-none" type="button" onClick={() => onEdit(wallet)}>
                        {t('actions.details')}
                    </Button>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                aria-label={t('actions.more', { name: wallet.name })}
                            >
                                <EllipsisVertical aria-hidden="true" className="size-5" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onSelect={() => onEdit(wallet)}>{t('actions.edit')}</DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive" onSelect={() => onDelete(wallet)}>
                                {t('actions.delete')}
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </CardContent>
        </Card>
    );
}

export function WalletsPage({ initialState }: WalletsPageProps) {
    const t = useTranslations('Wallets');
    const tCommon = useTranslations('Common');
    const format = useFormatter();
    const [wallets, setWallets] = useState(initialState.status === 'ready' ? initialState.data : []);
    const [sort, setSort] = useState<WalletSort>('name');
    const [layout, setLayout] = useState<WalletLayout>('grid');
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingWallet, setEditingWallet] = useState<WalletViewModel>();
    const [deletingWallet, setDeletingWallet] = useState<WalletViewModel>();

    const sortedWallets = useMemo(
        () =>
            [...wallets].sort((left, right) =>
                sort === 'balance' ? right.currentValue - left.currentValue : left.name.localeCompare(right.name),
            ),
        [sort, wallets],
    );

    const totals = useMemo(
        () => ({
            total: wallets.reduce((sum, wallet) => sum + wallet.currentValue, 0),
            available: wallets
                .filter((wallet) => wallet.kind !== 'savings' && wallet.kind !== 'investment')
                .reduce((sum, wallet) => sum + wallet.currentValue, 0),
            savings: wallets
                .filter((wallet) => wallet.kind === 'savings')
                .reduce((sum, wallet) => sum + wallet.currentValue, 0),
            investments: wallets
                .filter((wallet) => wallet.kind === 'investment')
                .reduce((sum, wallet) => sum + wallet.currentValue, 0),
        }),
        [wallets],
    );

    const formatMoney = (value: number) => format.number(value, { style: 'currency', currency: 'EUR' });
    const formatPercentage = (value: number) =>
        format.number(value, {
            style: 'percent',
            minimumFractionDigits: 1,
            maximumFractionDigits: 1,
            signDisplay: 'exceptZero',
        });

    const addClickHandler = () => {
        setEditingWallet(undefined);
        setDialogOpen(true);
    };

    const editHandler = (wallet: WalletViewModel) => {
        setEditingWallet(wallet);
        setDialogOpen(true);
    };

    const saveHandler = (wallet: Omit<WalletViewModel, 'id'>) => {
        if (editingWallet === undefined) {
            setWallets((current) => [
                ...current,
                { ...wallet, id: Math.max(0, ...current.map((item) => item.id)) + 1 },
            ]);
            return;
        }
        setWallets((current) =>
            current.map((item) => (item.id === editingWallet.id ? { ...wallet, id: item.id } : item)),
        );
    };

    const summaryCards: { key: keyof typeof totals; icon: IconComponent; change: number }[] = [
        { key: 'total', icon: WalletCards, change: -3.0 },
        { key: 'available', icon: Banknote, change: 1.2 },
        { key: 'savings', icon: PiggyBank, change: 3.6 },
        { key: 'investments', icon: ChartNoAxesColumnIncreasing, change: 5.2 },
    ];

    return (
        <div className="mx-auto grid w-full gap-7">
            <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <h1 className="m-0 text-3xl font-bold tracking-tight sm:text-4xl">{t('title')}</h1>
                    <p className="m-0 mt-2 text-muted-foreground">{t('description')}</p>
                </div>
                <Button
                    className="w-full sm:w-auto"
                    size="lg"
                    type="button"
                    variant="default"
                    onClick={addClickHandler}
                >
                    <Plus aria-hidden="true" className="size-5" />
                    {t('actions.add')}
                </Button>
            </header>

            {initialState.status === 'ready' ? (
                <>
                    <section className="flex gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        {summaryCards.map(({ key, icon: Icon, change }) => {
                            return (
                                <Card key={key} className="min-w-xs max-w-md w-full">
                                    <CardContent className="flex flex-col items-start gap-2 p-5">
                                        <div className="flex items-center gap-4">
                                            <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-accent text-primary">
                                                <Icon aria-hidden="true" className="size-6" />
                                            </span>
                                            <div className="flex flex-col">
                                                <p className="m-0 text-sm text-muted-foreground">
                                                    {t(`summary.${key}`)}
                                                </p>
                                                <p className="m-0 mt-1 truncate text-2xl font-bold tabular-nums">
                                                    {formatMoney(totals[key])}
                                                </p>
                                            </div>
                                        </div>
                                        <div>
                                            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                                <WalletBadge value={change} />
                                                <span>{t('summary.comparedToLastMonth')}</span>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </section>

                    <section aria-labelledby="wallet-list-title" className="grid gap-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <h2 id="wallet-list-title" className="m-0 text-2xl font-semibold">
                                {t('list.title')}
                            </h2>
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="text-sm text-muted-foreground">{t('list.sortLabel')}</span>
                                <Select value={sort} onValueChange={(value) => setSort(value as WalletSort)}>
                                    <SelectTrigger className="w-36" aria-label={t('list.sortLabel')}>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="name">{t('list.sortName')}</SelectItem>
                                        <SelectItem value="balance">{t('list.sortBalance')}</SelectItem>
                                    </SelectContent>
                                </Select>
                                <div className="flex rounded-md bg-muted p-1 gap-1">
                                    <Button
                                        type="button"
                                        size="icon"
                                        variant={layout === 'grid' ? 'default' : 'ghost'}
                                        aria-label={t('actions.gridView')}
                                        aria-pressed={layout === 'grid'}
                                        onClick={() => setLayout('grid')}
                                    >
                                        <Grid2X2 aria-hidden="true" className="size-4" />
                                    </Button>
                                    <Button
                                        type="button"
                                        size="icon"
                                        variant={layout === 'list' ? 'default' : 'ghost'}
                                        aria-label={t('actions.listView')}
                                        aria-pressed={layout === 'list'}
                                        onClick={() => setLayout('list')}
                                    >
                                        <List aria-hidden="true" className="size-4" />
                                    </Button>
                                </div>
                            </div>
                        </div>
                        {wallets.length === 0 ? (
                            <FeatureStateBoundary
                                state={{ status: 'empty' }}
                                labels={{
                                    idle: t('states.idle'),
                                    loading: t('states.loading'),
                                    empty: t('states.empty'),
                                    error: t('states.error'),
                                }}
                            >
                                {() => null}
                            </FeatureStateBoundary>
                        ) : (
                            <div
                                className={cn(
                                    'grid gap-4',
                                    layout === 'grid' && 'sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-6',
                                )}
                            >
                                {sortedWallets.map((wallet) => (
                                    <WalletCard
                                        key={wallet.id}
                                        wallet={wallet}
                                        layout={layout}
                                        formatMoney={formatMoney}
                                        onEdit={editHandler}
                                        onDelete={setDeletingWallet}
                                    />
                                ))}
                            </div>
                        )}
                    </section>

                    {wallets.length !== 0 && (
                        <WalletDistributionChart
                            wallets={wallets}
                            title={t('chart.title')}
                            totalLabel={t('chart.total')}
                            description={t('chart.description')}
                            formatMoney={formatMoney}
                            formatPercentage={formatPercentage}
                        />
                    )}
                </>
            ) : (
                <FeatureStateBoundary
                    state={initialState}
                    labels={{
                        idle: t('states.idle'),
                        loading: t('states.loading'),
                        empty: t('states.empty'),
                        error: t('states.error'),
                    }}
                >
                    {() => null}
                </FeatureStateBoundary>
            )}

            <WalletDialog
                open={dialogOpen}
                wallet={editingWallet}
                availableWallets={wallets}
                onOpenChange={setDialogOpen}
                onSave={saveHandler}
            />
            <ConfirmDeleteDialog
                item={deletingWallet}
                title={t('dialog.deleteTitle')}
                description={(wallet) => t('dialog.deleteDescription', { name: wallet.name })}
                cancelLabel={tCommon('actions.cancel')}
                confirmLabel={tCommon('actions.delete')}
                onOpenChange={(open) => {
                    if (!open) setDeletingWallet(undefined);
                }}
                onConfirm={(wallet) => {
                    setWallets((current) => current.filter((item) => item.id !== wallet.id));
                    setDeletingWallet(undefined);
                }}
            />
        </div>
    );
}

function WalletBadge({ value }: { value: number }) {
    const format = useFormatter();

    const trendIcon = useMemo(
        () =>
            value >= 0 ? (
                <TrendingUp aria-hidden="true" className="size-3.5" />
            ) : (
                <TrendingDown aria-hidden="true" className="size-3.5" />
            ),
        [value],
    );

    const formatPercentage = (value: number) =>
        format.number(value, {
            style: 'percent',
            minimumFractionDigits: 1,
            maximumFractionDigits: 1,
            signDisplay: 'exceptZero',
        });

    return (
        <Badge
            className="flex gap-[7px]"
            variant={
                // eslint-disable-next-line react/jsx-no-leaked-render
                value > 0 ? 'income' : value < 0 ? 'expense' : 'transfer'
            }
        >
            {trendIcon}
            {formatPercentage(value / 100)}
        </Badge>
    );
}
