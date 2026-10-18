'use client';

import { useFormatter, useLocale, useTranslations } from 'next-intl';
import { useWatch } from 'react-hook-form';
import type { UseFormReturn } from 'react-hook-form';

import { DateField } from '@/components/shared/date-field';
import { InputField } from '@/components/shared/form-controls';
import { FormField } from '@/components/shared/form-field';
import { Button } from '@/components/ui/button';
import { FileText, Plus, Tag, Wallet } from '@/components/ui/icons';
import { Input } from '@/components/ui/input';
import { CategoryIcon } from '@/features/categories/category-display';
import type { ApiTransactionType, ApiWallet } from '@/lib/api/client';
import { parseLocalizedAmount } from '@/lib/money';

import { isCalendarDate } from './transaction-editor-model';
import type { TransactionFormValues } from './transaction-editor-model';

interface TransactionDetailsFieldsProps {
    form: UseFormReturn<TransactionFormValues>;
    id: string;
    balanceWallets: ApiWallet[];
    categories: ApiTransactionType[];
    onAddCategory: () => void;
}

export function TransactionDetailsFields({
    form,
    id,
    balanceWallets,
    categories,
    onAddCategory,
}: TransactionDetailsFieldsProps) {
    const t = useTranslations('Movements.editor');
    const tDialog = useTranslations('Movements.dialog');
    const tKinds = useTranslations('Movements.filters');
    const tCategory = useTranslations('Movements.categoryEditor');
    const locale = useLocale();
    const format = useFormatter();
    const { control, getValues } = form;
    const [kind, sourceId] = useWatch({ control, name: ['kind', 'walletId'] });
    const isTransfer = kind === 'transfer';
    const walletLabel = isTransfer ? tDialog('sourceWallet') : tDialog('wallet');
    const categoryOptions = categories.map((type) => ({ value: String(type.id), label: type.name, icon: <CategoryIcon type={type} /> }));
    const walletOptions = balanceWallets.map((wallet) => ({
        value: String(wallet.id),
        label: wallet.name,
        icon: <Wallet />,
    }));
    const destinationOptions = walletOptions.filter((wallet) => wallet.value !== sourceId);

    function requiredLabel(label: string) {
        return (
            <>
                {label}{' '}
                <span aria-hidden="true" className="text-expense">
                    *
                </span>
            </>
        );
    }

    return (
        <div className="grid items-start gap-4 sm:grid-cols-2">
            <InputField
                control={control}
                name="amount"
                id={`${id}-amount`}
                label={requiredLabel(tDialog('amount'))}
                inputMode="decimal"
                placeholder={format.number(0, { minimumFractionDigits: 2 })}
                endAdornment="€"
                aria-required
                rules={{
                    required: tDialog('required'),
                    validate: (value) => {
                        const amount = typeof value === 'string' ? parseLocalizedAmount(value, locale) : undefined;
                        if (amount === undefined || amount <= 0) return tDialog('invalidAmount');
                        return Math.abs(amount * 100 - Math.round(amount * 100)) < 0.000001 || t('invalidPrecision');
                    },
                }}
            />
            <DateField
                control={control}
                name="date"
                id={`${id}-date`}
                label={`${tDialog('date')} *`}
                placeholder={tDialog('datePlaceholder')}
                todayLabel={tDialog('today')}
                previousMonthLabel={tDialog('previousMonth')}
                nextMonthLabel={tDialog('nextMonth')}
                formatDate={(date) => format.dateTime(date, { day: '2-digit', month: 'short', year: 'numeric' })}
                formatMonth={(date) => format.dateTime(date, { month: 'long', year: 'numeric' })}
                formatWeekday={(date) => format.dateTime(date, { weekday: 'short' })}
                rules={{
                    required: tDialog('required'),
                    validate: (value) => (typeof value === 'string' && isCalendarDate(value)) || t('invalidDate'),
                }}
            />
            <InputField
                control={control}
                name="walletId"
                id={`${id}-wallet`}
                kind="select"
                searchable
                label={requiredLabel(walletLabel)}
                placeholder={t('selectWallet')}
                options={walletOptions}
                aria-required
                rules={{
                    required: tDialog('required'),
                    validate: (value) =>
                        balanceWallets.some((wallet) => String(wallet.id) === value) || t('selectWallet'),
                }}
            />
            {!isTransfer && (
                <InputField
                    control={control}
                    name="typeId"
                    id={`${id}-type`}
                    kind="select"
                    searchable
                    label={requiredLabel(tDialog('category'))}
                    placeholder={t('selectCategory')}
                    endAdornment={
                        <Button
                            type="button"
                            variant="transparent"
                            size="icon"
                            className="size-7"
                            aria-label={tCategory('title')}
                            title={tCategory('title')}
                            aria-haspopup="dialog"
                            onClick={onAddCategory}
                        >
                            <Plus aria-hidden="true" className="size-4" />
                        </Button>
                    }
                    options={categoryOptions}
                    aria-required
                    rules={{
                        validate: (value) =>
                            getValues('kind') === 'transfer' ||
                            categories.some((type) => String(type.id) === value) ||
                            t('selectCategory'),
                    }}
                />
            )}
            {!!isTransfer && (
                <FormField id={`${id}-transfer-category`} label={tDialog('category')}>
                    <div className="relative">
                        <Tag
                            aria-hidden="true"
                            className="pointer-events-none absolute left-3 top-3 size-4 text-transfer"
                        />
                        <Input id={`${id}-transfer-category`} value={tKinds('transfer')} readOnly className="pl-10" />
                    </div>
                </FormField>
            )}
            {!!isTransfer && (
                <div className="sm:col-span-2">
                    <InputField
                        control={control}
                        name="destinationWalletId"
                        id={`${id}-destination`}
                        kind="select"
                        searchable
                        label={requiredLabel(tDialog('destinationWallet'))}
                        placeholder={t('selectDestination')}
                        options={destinationOptions}
                        aria-required
                        rules={{
                            validate: (value) =>
                                getValues('kind') !== 'transfer' ||
                                destinationOptions.some((wallet) => wallet.value === value) ||
                                tDialog('differentWallet'),
                        }}
                    />
                </div>
            )}
            <div className="sm:col-span-2">
                <InputField
                    control={control}
                    name="description"
                    id={`${id}-description`}
                    label={requiredLabel(tDialog('description'))}
                    placeholder={t(`descriptionPlaceholders.${kind}`)}
                    maxLength={200}
                    startAdornment={<FileText aria-hidden="true" className="size-4" />}
                    aria-required
                    rules={{
                        required: tDialog('required'),
                        validate: (value) =>
                            (typeof value === 'string' && value.trim().length > 0) || tDialog('required'),
                        maxLength: { value: 200, message: t('descriptionTooLong') },
                    }}
                />
            </div>
        </div>
    );
}
