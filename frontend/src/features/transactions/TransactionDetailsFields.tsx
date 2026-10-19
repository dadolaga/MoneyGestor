'use client';

import { useFormatter, useLocale, useTranslations } from 'next-intl';
import { useWatch } from 'react-hook-form';
import type { UseFormReturn } from 'react-hook-form';

import { DateField } from '@/components/shared/date-field';
import { InputField } from '@/components/shared/form-controls';
import { FormField } from '@/components/shared/form-field';
import { Button } from '@/components/ui/button';
import { ArrowLeftRight, FileText, Plus, Tag, Wallet, X } from '@/components/ui/icons';
import { Input } from '@/components/ui/input';
import { CategoryIcon } from '@/features/categories/category-display';
import type { ApiTransactionType, ApiWallet } from '@/lib/api/client';
import { parseLocalizedAmount } from '@/lib/money';
import { cn } from '@/lib/utils';

import { isCalendarDate } from './transaction-editor-model';
import type { TransactionFormValues } from './transaction-editor-model';
import { TransactionKindFields } from './TransactionKindFields';
import { TransactionMobileChoiceField, TransactionMobileDateField } from './TransactionMobileFields';

interface TransactionDetailsFieldsProps {
    form: UseFormReturn<TransactionFormValues>;
    id: string;
    balanceWallets: ApiWallet[];
    categories: ApiTransactionType[];
    onAddCategory: () => void;
    mobile?: boolean;
    detailsStep?: boolean;
}

export function TransactionDetailsFields({
    form,
    id,
    balanceWallets,
    categories,
    onAddCategory,
    mobile = false,
    detailsStep = false,
}: TransactionDetailsFieldsProps) {
    const t = useTranslations('Movements.editor');
    const tDialog = useTranslations('Movements.dialog');
    const tKinds = useTranslations('Movements.filters');
    const tCategory = useTranslations('Movements.categoryEditor');
    const tMobile = useTranslations('Movements.mobile');
    const locale = useLocale();
    const format = useFormatter();
    const { control, getValues } = form;
    const [kind, sourceId, typeId, amount, destinationId] = useWatch({
        control,
        name: ['kind', 'walletId', 'typeId', 'amount', 'destinationWalletId'],
    });
    const isTransfer = kind === 'transfer';
    const walletLabel = isTransfer ? tDialog('sourceWallet') : tDialog('wallet');
    const categoryOptions = categories.map((type) => ({
        value: String(type.id),
        label: type.name,
        icon: <CategoryIcon type={type} />,
    }));
    const walletOptions = balanceWallets.map((wallet) => ({
        value: String(wallet.id),
        label: wallet.name,
        icon: <Wallet />,
        detail: format.number(wallet.currentValue, { style: 'currency', currency: 'EUR' }),
    }));
    const destinationOptions = walletOptions.filter((wallet) => wallet.value !== sourceId);
    const rules = {
        amount: {
            required: tDialog('required'),
            validate: (value: unknown) => {
                const parsed = typeof value === 'string' ? parseLocalizedAmount(value, locale) : undefined;
                if (parsed === undefined || parsed <= 0) return tDialog('invalidAmount');
                return Math.abs(parsed * 100 - Math.round(parsed * 100)) < 0.000001 || t('invalidPrecision');
            },
        },
        date: {
            required: tDialog('required'),
            validate: (value: unknown) => (typeof value === 'string' && isCalendarDate(value)) || t('invalidDate'),
        },
        walletId: {
            required: tDialog('required'),
            validate: (value: unknown) =>
                balanceWallets.some((wallet) => String(wallet.id) === value) || t('selectWallet'),
        },
        typeId: {
            validate: (value: unknown) =>
                getValues('kind') === 'transfer' ||
                categories.some((type) => String(type.id) === value) ||
                t('selectCategory'),
        },
        destinationWalletId: {
            validate: (value: unknown) =>
                getValues('kind') !== 'transfer' ||
                destinationOptions.some((wallet) => wallet.value === value) ||
                tDialog('differentWallet'),
        },
    };

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

    const amountLabel = mobile ? (
        <span className="sr-only">{tDialog('amount')}</span>
    ) : (
        requiredLabel(tDialog('amount'))
    );
    const amountPrefix = mobile ? <span className="text-3xl">€</span> : undefined;
    const descriptionSuffix = mobile ? (
        <Button
            type="button"
            size="icon"
            variant="transparent"
            className="size-7"
            aria-label={tMobile('clearDescription')}
            onClick={() => form.setValue('description', '', { shouldDirty: true, shouldValidate: true })}
        >
            <X aria-hidden="true" className="size-4" />
        </Button>
    ) : undefined;
    const amountField = (
        <InputField
            control={control}
            name="amount"
            id={`${id}-amount`}
            label={amountLabel}
            inputMode="decimal"
            placeholder={format.number(0, { minimumFractionDigits: 2 })}
            startAdornment={amountPrefix}
            endAdornment={
                mobile ? (
                    <Button
                        type="button"
                        size="icon"
                        variant="transparent"
                        className="size-8"
                        aria-label={tMobile('clearAmount')}
                        onClick={() => {
                            form.setValue('amount', '', { shouldDirty: true, shouldValidate: true });
                            form.setFocus('amount');
                        }}
                    >
                        <X aria-hidden="true" className="size-5" />
                    </Button>
                ) : (
                    '€'
                )
            }
            className={cn(mobile && 'h-20 rounded-xl [&_input]:text-4xl [&_input]:font-semibold')}
            aria-required
            rules={rules.amount}
        />
    );
    const dateField = mobile ? (
        <TransactionMobileDateField
            control={control}
            name="date"
            id={`${id}-date`}
            label={`${tDialog('date')} *`}
            rules={rules.date}
        />
    ) : (
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
            rules={rules.date}
        />
    );
    const walletField = mobile ? (
        <TransactionMobileChoiceField
            control={control}
            name="walletId"
            id={`${id}-wallet`}
            label={`${walletLabel} *`}
            title={tMobile('chooseWallet')}
            placeholder={t('selectWallet')}
            options={walletOptions}
            rules={rules.walletId}
        />
    ) : (
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
            rules={rules.walletId}
        />
    );
    const categoryField = !isTransfer ? (
        mobile ? (
            <TransactionMobileChoiceField
                control={control}
                name="typeId"
                id={`${id}-type`}
                label={`${tDialog('category')} *`}
                title={tMobile('allCategories')}
                placeholder={t('selectCategory')}
                options={categoryOptions}
                categories
                onAddCategory={onAddCategory}
                rules={rules.typeId}
            />
        ) : (
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
                rules={rules.typeId}
            />
        )
    ) : (
        <FormField id={`${id}-transfer-category`} label={tDialog('category')}>
            <div className="relative">
                <Tag aria-hidden="true" className="pointer-events-none absolute left-3 top-3 size-4 text-transfer" />
                <Input id={`${id}-transfer-category`} value={tKinds('transfer')} readOnly className="pl-10" />
            </div>
        </FormField>
    );
    const destinationField = isTransfer && (
        <div className="sm:col-span-2">
            {mobile ? (
                <TransactionMobileChoiceField
                    control={control}
                    name="destinationWalletId"
                    id={`${id}-destination`}
                    label={`${tDialog('destinationWallet')} *`}
                    title={tDialog('destinationWallet')}
                    placeholder={t('selectDestination')}
                    options={destinationOptions}
                    rules={rules.destinationWalletId}
                />
            ) : (
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
                    rules={rules.destinationWalletId}
                />
            )}
        </div>
    );
    const descriptionField = (
        <div className="sm:col-span-2">
            <InputField
                control={control}
                name="description"
                id={`${id}-description`}
                label={requiredLabel(tDialog('description'))}
                placeholder={t(`descriptionPlaceholders.${kind}`)}
                maxLength={200}
                startAdornment={<FileText aria-hidden="true" className="size-4" />}
                className={cn(mobile && 'h-12 rounded-xl [&_input]:text-base')}
                endAdornment={descriptionSuffix}
                aria-required
                rules={{
                    required: tDialog('required'),
                    validate: (value) => (typeof value === 'string' && value.trim().length > 0) || tDialog('required'),
                    maxLength: { value: 200, message: t('descriptionTooLong') },
                }}
            />
        </div>
    );

    if (mobile) {
        const category = categories.find((type) => String(type.id) === typeId);
        const summaryIcon = isTransfer ? (
            <ArrowLeftRight aria-hidden="true" />
        ) : category ? (
            <CategoryIcon type={category} />
        ) : (
            <Tag aria-hidden="true" />
        );
        return (
            <div className="grid min-w-0 grid-cols-1 gap-4">
                <div hidden={detailsStep} className={cn('grid min-w-0 grid-cols-1 gap-4', detailsStep && 'hidden')}>
                    <div className="min-w-0 [&>div]:min-w-0 [&>div]:grid-cols-1">
                        {amountField}
                    </div>
                    <TransactionKindFields form={form} compact />
                    {walletField}
                    {destinationField}
                    {categoryField}
                </div>
                {!!detailsStep && (
                    <div className="flex items-center gap-4 rounded-2xl border border-solid border-border bg-background p-4">
                        <span className="flex size-16 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary [&>span]:size-9">
                            {summaryIcon}
                        </span>
                        <div className="grid min-w-0 gap-1">
                            <span className="truncate text-sm">
                                {tKinds(kind)}
                                {!isTransfer && category ? ` · ${category.name}` : ''}
                            </span>
                            <strong className="text-3xl tabular-nums">
                                {format.number(parseLocalizedAmount(amount, locale) ?? 0, {
                                    style: 'currency',
                                    currency: 'EUR',
                                })}
                            </strong>
                            <span className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
                                <Wallet aria-hidden="true" className="size-4" />
                                <span className="truncate">
                                    {walletOptions.find((wallet) => wallet.value === sourceId)?.label}
                                    {isTransfer
                                        ? ` → ${walletOptions.find((wallet) => wallet.value === destinationId)?.label ?? ''}`
                                        : ''}
                                </span>
                            </span>
                        </div>
                    </div>
                )}
                {dateField}
                {descriptionField}
            </div>
        );
    }

    return (
        <div className="grid items-start gap-4 sm:grid-cols-2">
            {amountField}
            {dateField}
            {walletField}
            {categoryField}
            {destinationField}
            {descriptionField}
        </div>
    );
}
