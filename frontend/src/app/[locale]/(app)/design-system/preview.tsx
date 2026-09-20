'use client';

import { useState } from 'react';

import { useFormatter, useTranslations } from 'next-intl';
import { useTheme } from 'next-themes';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { FieldAdornment, FieldControl, fieldControlInputClassName } from '@/components/ui/field-control';
import { Moon, Sun, WalletCards } from '@/components/ui/icons';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { DashboardPreview } from '@/features/dashboard/dashboard-preview';
import { TransactionsPreview } from '@/features/transactions/transactions-preview';
import { WalletsPreview } from '@/features/wallets/wallets-preview';
import {
    dashboardStateFixtures,
    fixtureForStatus,
    transactionStateFixtures,
    walletStateFixtures,
} from '@/lib/fixtures/finance';
import { featureStatuses, type FeatureStatus } from '@/types/feature-state';

type PreviewFeature = 'dashboard' | 'wallets' | 'transactions';

export function DesignSystemPreview() {
    const { resolvedTheme, setTheme } = useTheme();
    const format = useFormatter();
    const t = useTranslations('DesignSystem');
    const tCommon = useTranslations('Common');
    const tFeatures = useTranslations('FeaturePreview');

    const [feature, setFeature] = useState<PreviewFeature>('dashboard');
    const [status, setStatus] = useState<FeatureStatus>('ready');

    const isDark = resolvedTheme === 'dark';

    const renderFeaturePreview = () => {
        if (feature === 'dashboard') {
            return (
                <DashboardPreview
                    state={fixtureForStatus(dashboardStateFixtures, status)}
                    labels={{
                        incoming: tFeatures('dashboard.incoming'),
                        expense: tFeatures('dashboard.expense'),
                        categories: tFeatures('dashboard.categories'),
                        states: {
                            idle: tFeatures('states.idle'),
                            loading: tFeatures('states.loading'),
                            empty: tFeatures('states.empty'),
                            error: tFeatures('states.error'),
                        },
                    }}
                    formatMoney={(value) => format.number(value, { style: 'currency', currency: 'EUR' })}
                />
            );
        }

        if (feature === 'wallets') {
            return (
                <WalletsPreview
                    state={fixtureForStatus(walletStateFixtures, status)}
                    labels={{
                        balance: tFeatures('wallets.balance'),
                        favorite: tFeatures('wallets.favorite'),
                        states: {
                            idle: tFeatures('states.idle'),
                            loading: tFeatures('states.loading'),
                            empty: tFeatures('states.empty'),
                            error: tFeatures('states.error'),
                        },
                    }}
                    formatMoney={(value) => format.number(value, { style: 'currency', currency: 'EUR' })}
                />
            );
        }

        return (
            <TransactionsPreview
                state={fixtureForStatus(transactionStateFixtures, status)}
                labels={{
                    description: tFeatures('transactions.description'),
                    wallet: tFeatures('transactions.wallet'),
                    date: tFeatures('transactions.date'),
                    amount: tFeatures('transactions.amount'),
                    fallbackDescription: tFeatures('transactions.fallbackDescription'),
                    transfer: tFeatures('transactions.transfer'),
                    states: {
                        idle: tFeatures('states.idle'),
                        loading: tFeatures('states.loading'),
                        empty: tFeatures('states.empty'),
                        error: tFeatures('states.error'),
                    },
                }}
                formatDate={(value) => format.dateTime(new Date(value), { dateStyle: 'medium' })}
                formatMoney={(value) => format.number(value, { style: 'currency', currency: 'EUR' })}
            />
        );
    };

    return (
        <main className="min-h-screen overflow-y-auto bg-background px-4 py-8 text-foreground sm:px-8">
            <div className="mx-auto flex max-w-5xl flex-col gap-8">
                <header className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-semibold tracking-tight">{t('title')}</h1>
                        <p className="mt-2 text-muted-foreground">{t('description')}</p>
                    </div>
                    <Button
                        variant="outline"
                        size="icon"
                        type="button"
                        onClick={() => setTheme(isDark ? 'light' : 'dark')}
                        aria-label={tCommon('theme.label')}
                    >
                        {isDark ? (
                            <Sun className="size-4" strokeWidth={2} />
                        ) : (
                            <Moon className="size-4" strokeWidth={2} />
                        )}
                    </Button>
                </header>

                <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <Card>
                        <CardHeader>
                            <CardTitle>{t('cardTitle')}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <p className="text-sm text-muted-foreground">{t('cardContent')}</p>
                            <div className="flex flex-wrap gap-2">
                                <Badge>{t('brand')}</Badge>
                                <Badge variant="income">{t('income')}</Badge>
                                <Badge variant="expense">{t('expense')}</Badge>
                                <Badge variant="transfer">{t('transfer')}</Badge>
                            </div>
                            <Progress value={62} />
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>{tCommon('theme.label')}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <Label htmlFor="design-system-input">{tCommon('actions.save')}</Label>
                            <FieldControl>
                                <FieldAdornment position="start">
                                    <WalletCards aria-hidden="true" />
                                </FieldAdornment>
                                <Input
                                    id="design-system-input"
                                    className={fieldControlInputClassName}
                                    placeholder={t('cardTitle')}
                                />
                                <FieldAdornment position="end">EUR</FieldAdornment>
                            </FieldControl>
                            <Separator />
                            <Skeleton className="h-4 w-4/5" />
                            <Skeleton className="h-4 w-3/5" />
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>{t('brand')}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Dialog>
                                <DialogTrigger asChild>
                                    <Button type="button">{t('openDialog')}</Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>{t('dialogTitle')}</DialogTitle>
                                        <DialogDescription>{t('dialogDescription')}</DialogDescription>
                                    </DialogHeader>
                                    <DialogFooter>
                                        <Button type="button">{tCommon('actions.save')}</Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                        </CardContent>
                    </Card>
                </section>

                <section className="space-y-4" aria-labelledby="feature-preview-title">
                    <div>
                        <h2 id="feature-preview-title" className="text-2xl font-semibold tracking-tight">
                            {tFeatures('title')}
                        </h2>
                        <p className="mt-2 text-muted-foreground">{tFeatures('description')}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {(['dashboard', 'wallets', 'transactions'] as PreviewFeature[]).map((item) => (
                            <Button
                                key={item}
                                type="button"
                                variant={feature === item ? 'default' : 'outline'}
                                aria-pressed={feature === item}
                                onClick={() => setFeature(item)}
                            >
                                {tFeatures(`features.${item}`)}
                            </Button>
                        ))}
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {featureStatuses.map((item) => (
                            <Button
                                key={item}
                                type="button"
                                size="sm"
                                variant={status === item ? 'secondary' : 'ghost'}
                                aria-pressed={status === item}
                                onClick={() => setStatus(item)}
                            >
                                {tFeatures(`statuses.${item}`)}
                            </Button>
                        ))}
                    </div>
                    {renderFeaturePreview()}
                </section>
            </div>
        </main>
    );
}
