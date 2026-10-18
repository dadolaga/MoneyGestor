'use client';

import { useState } from 'react';

import dayjs from 'dayjs';
import { useFormatter, useTranslations } from 'next-intl';

import { DateRangeField } from '@/components/shared/date-range-field';
import type { DayjsDateRange } from '@/components/shared/date-range-field';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowUpDown, RotateCcw, Search, Tag, Wallet } from '@/components/ui/icons';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { CategoryIcon } from '@/features/categories/category-display';
import type { ApiTransactionType, ApiWallet, TransactionQuery } from '@/lib/api/client';

interface TransactionsFiltersProps {
    filters: TransactionQuery;
    search: string;
    wallets: ApiWallet[];
    types: ApiTransactionType[];
    onSearchChange: (value: string) => void;
    onFilterChange: (update: Partial<TransactionQuery>) => void;
    onReset: () => void;
}

export function TransactionsFilters({
    filters,
    search,
    wallets,
    types,
    onSearchChange,
    onFilterChange,
    onReset,
}: TransactionsFiltersProps) {
    const t = useTranslations('Movements');
    const format = useFormatter();
    const [dateRange, setDateRange] = useState<DayjsDateRange>(() => ({
        start: dayjs(filters.from),
        end: dayjs(filters.to),
    }));

    function resetHandler() {
        onReset();
        setDateRange({ start: dayjs().startOf('month'), end: dayjs().endOf('month') });
    }

    return (
        <Card
            className="grid min-w-0 shrink-0 gap-2.5 rounded-lg p-2.5 shadow-none sm:grid-cols-2 xl:grid-cols-[minmax(180px,1.3fr)_minmax(235px,1.15fr)_minmax(145px,.9fr)_minmax(130px,.8fr)_minmax(150px,1fr)_auto]"
            aria-label={t('filters.title')}
        >
            <div className="relative min-w-0">
                <Search
                    aria-hidden="true"
                    className="pointer-events-none absolute left-3 top-3 size-4 text-muted-foreground"
                />
                <Input
                    type="search"
                    maxLength={100}
                    className="h-10 pl-10"
                    aria-label={t('filters.search')}
                    placeholder={t('filters.searchPlaceholder')}
                    value={search}
                    onChange={(event) => onSearchChange(event.target.value)}
                />
            </div>
            <div
                aria-label={t('filters.dateRange')}
                className="min-w-0 [&_button]:overflow-hidden [&_button]:border [&_button]:border-solid [&_button]:border-input [&_button]:bg-background [&_button]:text-xs"
            >
                <DateRangeField
                    value={dateRange}
                    onChange={(range) => {
                        setDateRange(range);
                        if (range.start && range.end)
                            onFilterChange({
                                from: range.start.format('YYYY-MM-DD'),
                                to: range.end.format('YYYY-MM-DD'),
                            });
                    }}
                    placeholder={t('filters.datePlaceholder')}
                    formatDate={(value) => format.dateTime(value, { day: '2-digit', month: 'short', year: 'numeric' })}
                    formatMonth={(value) => format.dateTime(value, { month: 'long', year: 'numeric' })}
                    formatWeekday={(value) => format.dateTime(value, { weekday: 'short' })}
                    previousMonthLabel={t('filters.previousMonth')}
                    nextMonthLabel={t('filters.nextMonth')}
                />
            </div>
            <div className="relative min-w-0">
                <Wallet
                    aria-hidden="true"
                    className="pointer-events-none absolute left-3 top-3 size-4 text-muted-foreground"
                />
                <Select
                    className="pl-9 text-xs"
                    searchable
                    aria-label={t('filters.wallet')}
                    value={filters.walletId ?? ''}
                    onValueChange={(value) => onFilterChange({ walletId: value ? Number(value) : undefined })}
                >
                    <option value="">{t('filters.allWallets')}</option>
                    {wallets.map((wallet) => (
                        <option key={wallet.id} value={wallet.id}>
                            {wallet.name}
                        </option>
                    ))}
                </Select>
            </div>
            <div className="relative min-w-0">
                <ArrowUpDown
                    aria-hidden="true"
                    className="pointer-events-none absolute left-3 top-3 size-4 text-muted-foreground"
                />
                <Select
                    className="pl-9 text-xs"
                    aria-label={t('filters.kind')}
                    value={filters.kind ?? ''}
                    onValueChange={(value) =>
                        onFilterChange({
                            kind: value === 'Income' || value === 'Expense' || value === 'Transfer' ? value : undefined,
                        })
                    }
                >
                    <option value="">{t('filters.allKinds')}</option>
                    <option value="Income">{t('filters.income')}</option>
                    <option value="Expense">{t('filters.expense')}</option>
                    <option value="Transfer">{t('filters.transfer')}</option>
                </Select>
            </div>
            <div className="relative min-w-0">
                <Tag
                    aria-hidden="true"
                    className="pointer-events-none absolute left-3 top-3 size-4 text-muted-foreground"
                />
                <Select
                    className="pl-9 text-xs"
                    searchable
                    aria-label={t('filters.category')}
                    value={filters.typeId ?? ''}
                    onValueChange={(value) => onFilterChange({ typeId: value ? Number(value) : undefined })}
                    options={[
                        { value: '', label: t('filters.allCategories') },
                        ...types.map((type) => ({ value: String(type.id), label: type.name, icon: <CategoryIcon type={type} /> })),
                    ]}
                />
            </div>
            <Button
                type="button"
                variant="outline"
                className="border border-solid border-input text-xs"
                onClick={resetHandler}
            >
                <RotateCcw aria-hidden="true" className="size-4" />
                {t('actions.reset')}
            </Button>
        </Card>
    );
}
