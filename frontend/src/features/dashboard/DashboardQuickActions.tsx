'use client';

import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowDown, ArrowLeftRight, ArrowUp, ChevronRight, Plus, Wallet, Zap } from '@/components/ui/icons';
import { CategoryIcon } from '@/features/categories/category-display';
import type { MovementKind } from '@/features/transactions/transaction-editor-model';
import type { ApiTransactionType } from '@/lib/api/client';
import { cn } from '@/lib/utils';

interface DashboardQuickActionsProps {
    types: ApiTransactionType[];
    metadataLoading: boolean;
    metadataError: string;
    onOpenMovement: (kind: MovementKind, typeId?: number) => void;
    onAddWallet: () => void;
}

export function DashboardQuickActions({ types, metadataLoading, metadataError, onOpenMovement, onAddWallet }: DashboardQuickActionsProps) {
    const t = useTranslations('ApiFinance.dashboard');
    const categories = types.filter((type) => type.systemKind === null).slice(0, 4);

    return (
        <Card className="min-w-0 rounded-lg border-0 bg-transparent p-0 shadow-none sm:order-1 sm:border sm:bg-card sm:p-4">
            <h2 className="m-0 mb-3 flex items-center gap-2 text-lg font-semibold">
                <Zap aria-hidden="true" className="size-5 text-primary sm:hidden" />{t('quickActions')}
            </h2>
            <Button type="button" onClick={() => onOpenMovement('expense')}
                className="mb-3 h-auto min-h-18 w-full justify-start gap-3 rounded-xl px-4 py-3 text-left shadow-[0_6px_24px_color-mix(in_oklch,var(--primary)_25%,transparent)] sm:hidden">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary-foreground/20">
                    <Plus aria-hidden="true" className="size-7" />
                </span>
                <span className="min-w-0 whitespace-normal">
                    <span className="block text-base font-semibold">{t('newMovement')}</span>
                    <span className="mt-1 block text-xs font-normal">{t('quickMovementDescription')}</span>
                </span>
                <ChevronRight aria-hidden="true" className="ml-auto size-5" />
            </Button>
            {categories.length > 0 && (
                <div className="mb-2 grid grid-cols-4 gap-2 sm:hidden" role="group" aria-label={t('categoryShortcuts')}>
                    {categories.map((category) => (
                        <Button key={category.id} type="button" variant="transparent"
                            disabled={metadataLoading || !!metadataError}
                            onClick={() => onOpenMovement('expense', category.id)}
                            title={category.name}
                            className="h-auto min-h-20 min-w-0 flex-col gap-2 rounded-xl border border-solid border-border bg-card px-1 py-3 hover:border-primary [&>span:first-child]:size-7">
                            <CategoryIcon type={category} />
                            <span className="w-full truncate text-xs">{category.name}</span>
                        </Button>
                    ))}
                </div>
            )}
            <div className={cn('grid grid-cols-3 gap-2 sm:gap-2.5 xl:grid-cols-1', categories.length > 0 && 'hidden sm:grid')}>
                {([
                    { kind: 'income', label: 'newIncome', icon: ArrowUp, color: 'var(--income)' },
                    { kind: 'expense', label: 'newExpense', icon: ArrowDown, color: 'var(--expense)' },
                    { kind: 'transfer', label: 'transfer', icon: ArrowLeftRight, color: 'var(--transfer)' },
                ] as const).map(({ kind, label, icon: Icon, color }) => (
                    <Button key={kind} type="button" variant="transparent" onClick={() => onOpenMovement(kind)}
                        className="h-auto min-h-20 min-w-0 flex-col rounded-lg border border-solid border-[color-mix(in_oklch,var(--action-color)_35%,transparent)] bg-[color-mix(in_oklch,var(--action-color)_8%,transparent)] px-1 py-2 hover:bg-[color-mix(in_oklch,var(--action-color)_16%,transparent)] sm:h-16 sm:min-h-0 sm:flex-row sm:justify-start sm:p-1"
                        style={{ '--action-color': color } as React.CSSProperties}>
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg text-primary-foreground sm:size-13" style={{ background: color }}>
                            <Icon aria-hidden="true" className="size-6 sm:size-8" />
                        </span>
                        <span className="whitespace-normal text-center text-xs font-normal sm:ml-1 sm:text-left sm:text-sm">{t(label)}</span>
                        <ChevronRight aria-hidden="true" className="mr-2 ml-auto hidden size-4 sm:inline-flex" />
                    </Button>
                ))}
            </div>
            <Button type="button" variant="transparent" disabled={metadataLoading || !!metadataError}
                onClick={onAddWallet} className="mt-1 min-h-11 w-full text-xs text-muted-foreground sm:hidden">
                <Wallet aria-hidden="true" className="size-4" />{t('addWallet')}
            </Button>
        </Card>
    );
}
