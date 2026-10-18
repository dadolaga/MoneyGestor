'use client';

import { useId, useRef, useState } from 'react';

import { useFormatter, useLocale, useTranslations } from 'next-intl';
import { Controller, useForm, useWatch } from 'react-hook-form';

import { DateField } from '@/components/shared/date-field';
import { InputField, SwitchField } from '@/components/shared/form-controls';
import { FormField, fieldAriaProps } from '@/components/shared/form-field';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogBody,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    ArrowDown,
    ArrowLeftRight,
    ArrowUp,
    FileText,
    Paperclip,
    Plus,
    Tag,
    Trash2,
    Wallet,
} from '@/components/ui/icons';
import { Input } from '@/components/ui/input';
import { CategoryEditorDialog } from '@/features/categories/CategoryEditorDialog';
import { ApiProblemError, apiClient } from '@/lib/api/client';
import type { ApiTransactionType, ApiWallet, TransactionCreate } from '@/lib/api/client';
import { parseLocalizedAmount } from '@/lib/money';
import { notify } from '@/lib/notifications';
import { cn } from '@/lib/utils';

import { createTransactionDefaults, isCalendarDate } from './transaction-editor-model';
import type { MovementKind, TransactionDraft, TransactionFormValues } from './transaction-editor-model';
import { TransactionRecurrenceFields } from './transaction-recurrence-fields';

interface TransactionEditorDialogProps {
    wallets: ApiWallet[];
    types: ApiTransactionType[];
    walletId?: number;
    typeId?: number;
    draft?: TransactionDraft;
    metadataLoading: boolean;
    metadataError: string;
    onRetry: () => void;
    onClose: () => void;
    onCreated: () => void;
    onSaveDraft: (draft: TransactionDraft) => void;
    onCategoryCreated: (category: ApiTransactionType) => void;
}

const movementKinds = [
    {
        value: 'income',
        icon: ArrowUp,
        color: 'text-income',
        background: 'bg-income/20',
        selected: 'peer-checked:border-income peer-checked:bg-income/10',
    },
    {
        value: 'expense',
        icon: ArrowDown,
        color: 'text-expense',
        background: 'bg-expense/20',
        selected: 'peer-checked:border-expense peer-checked:bg-expense/10',
    },
    {
        value: 'transfer',
        icon: ArrowLeftRight,
        color: 'text-transfer',
        background: 'bg-transfer/20',
        selected: 'peer-checked:border-transfer peer-checked:bg-transfer/10',
    },
] satisfies { value: MovementKind; icon: typeof ArrowUp; color: string; background: string; selected: string }[];

function isTransferType(type: ApiTransactionType) {
    return type.name.toLowerCase() === 'transfer';
}

export function TransactionEditorDialog({
    wallets,
    types,
    walletId,
    typeId,
    draft,
    metadataLoading,
    metadataError,
    onRetry,
    onClose,
    onCreated,
    onSaveDraft,
    onCategoryCreated,
}: TransactionEditorDialogProps) {
    const t = useTranslations('Movements.editor');
    const tDialog = useTranslations('Movements.dialog');
    const tKinds = useTranslations('Movements.filters');
    const tCategory = useTranslations('Movements.categoryEditor');
    const locale = useLocale();
    const format = useFormatter();
    const id = useId();
    const balanceWallets = wallets.filter((wallet) => wallet.hasOwnBalance !== false);
    const categories = types.filter((type) => !isTransferType(type));
    const transferType = types.find(isTransferType);
    const [defaults] = useState(
        () =>
            draft?.values ??
            createTransactionDefaults(
                balanceWallets.find((wallet) => wallet.id === walletId)?.id ?? balanceWallets[0]?.id,
                categories.find((type) => type.id === typeId)?.id,
            ),
    );
    const [receipt, setReceipt] = useState(draft?.receipt);
    const [receiptError, setReceiptError] = useState('');
    const [categoryEditorOpen, setCategoryEditorOpen] = useState(false);
    const receiptInput = useRef<HTMLInputElement>(null);
    const form = useForm<TransactionFormValues>({ defaultValues: defaults, mode: 'onBlur' });
    const {
        control,
        register,
        handleSubmit,
        getValues,
        clearErrors,
        setError,
        setValue,
        formState: { errors, isSubmitting },
    } = form;
    const [kind, sourceId, recurring, notes] = useWatch({ control, name: ['kind', 'walletId', 'recurring', 'notes'] });
    const isTransfer = kind === 'transfer';
    const unavailable = recurring || receipt !== undefined;
    const submitLabel = isSubmitting ? t('saving') : t('create');
    const walletLabel = isTransfer ? tDialog('sourceWallet') : tDialog('wallet');
    const categoryOptions = categories.map((type) => ({ value: String(type.id), label: type.name, icon: <Tag /> }));
    const walletOptions = balanceWallets.map((wallet) => ({ value: String(wallet.id), label: wallet.name, icon: <Wallet /> }));
    const destinationOptions = walletOptions.filter((wallet) => wallet.value !== sourceId);
    const metadataMessage =
        metadataError ||
        (!metadataLoading && balanceWallets.length === 0
            ? t('noWallets')
            : !metadataLoading && categories.length === 0 && !isTransfer
              ? t('noCategories')
              : '');
    const serverFields: Record<string, keyof TransactionFormValues> = {
        description: 'description',
        longdescription: 'notes',
        value: 'amount',
        date: 'date',
        typeid: 'typeId',
        walletid: 'walletId',
        destinationwalletid: 'destinationWalletId',
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

    async function submitHandler(values: TransactionFormValues) {
        clearErrors('root');
        if (values.recurring || receipt !== undefined) {
            setError('root.server', { message: t('previewOnly') });
            return;
        }
        const amount = parseLocalizedAmount(values.amount, locale);
        if (amount === undefined || amount <= 0) {
            setError('amount', { message: tDialog('invalidAmount') });
            return;
        }
        if (values.kind === 'transfer' && transferType === undefined) {
            setError('root.server', { message: t('missingTransferType') });
            return;
        }
        const body: TransactionCreate = {
            description: values.description.trim(),
            longDescription: values.notes.trim() || null,
            date: values.date,
            value: values.kind === 'expense' ? -amount : amount,
            typeId: values.kind === 'transfer' ? transferType!.id : Number(values.typeId),
            walletId: Number(values.walletId),
            destinationWalletId: values.kind === 'transfer' ? Number(values.destinationWalletId) : null,
        };
        try {
            await apiClient.createTransaction(body);
            onCreated();
        } catch (error: unknown) {
            if (error instanceof ApiProblemError) {
                for (const field of Object.keys(error.fieldErrors)) {
                    const name = serverFields[field.split('.').at(-1)?.toLowerCase() ?? ''];
                    if (name !== undefined) setError(name, { message: t('serverField') });
                }
            }
            const message =
                error instanceof ApiProblemError && error.status === 401
                    ? 'signInAgain'
                    : error instanceof ApiProblemError && error.status === 400
                      ? 'invalidFields'
                      : error instanceof ApiProblemError && error.status === 404
                        ? 'resourceMissing'
                        : 'saveFailed';
            setError('root.server', { message: t(message) });
        }
    }

    function saveDraftHandler() {
        onSaveDraft({ values: { ...getValues(), weekdays: [...getValues('weekdays')] }, receipt });
    }

    function categoryCreatedHandler(category: ApiTransactionType) {
        onCategoryCreated(category);
        setValue('typeId', String(category.id), { shouldDirty: true });
        clearErrors('typeId');
        setCategoryEditorOpen(false);
        notify.success(tCategory('created'));
    }

    function receiptHandler(file?: File) {
        if (file === undefined) return;
        if (file.size === 0 || file.size > 10 * 1024 * 1024 || !/\.(pdf|jpe?g|png|webp)$/i.test(file.name)) {
            setReceiptError(t('invalidReceipt'));
            if (receiptInput.current !== null) receiptInput.current.value = '';
            return;
        }
        setReceipt(file);
        setReceiptError('');
        clearErrors('root');
    }

    return (
        <Dialog
            open
            dismissOnOutside={false}
            onOpenChange={(open) => {
                if (!open && !isSubmitting) onClose();
            }}
        >
            <DialogContent
                closeLabel={tDialog('cancel')}
                className="box-border max-w-[780px] gap-0 border border-solid border-border p-0 shadow-none [&_*]:box-border"
            >
                <DialogHeader className="flex-row items-center gap-4 space-y-0 px-5 pt-5 pr-12 text-left sm:px-7 sm:pt-6">
                    <span className="relative flex size-14 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground sm:size-16">
                        <Plus aria-hidden="true" className="absolute top-2 size-7" />
                        <ArrowLeftRight aria-hidden="true" className="absolute bottom-2 size-7" />
                    </span>
                    <div>
                        <DialogTitle className="m-0 text-2xl font-semibold">{tDialog('createTitle')}</DialogTitle>
                        <DialogDescription className="mt-1 text-sm">{t('subtitle')}</DialogDescription>
                    </div>
                </DialogHeader>
                <form
                    className="flex min-h-0 flex-1 flex-col overflow-hidden"
                    noValidate
                    onSubmit={handleSubmit(submitHandler)}
                >
                    <DialogBody className="px-5 py-5 sm:px-7">
                        <fieldset
                            disabled={isSubmitting || metadataLoading}
                            className="m-0 grid min-w-0 gap-4 border-0 p-0"
                        >
                            <fieldset className="m-0 min-w-0 border-0 p-0">
                                <legend className="sr-only">{tDialog('kind')}</legend>
                                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                                    {movementKinds.map(({ value, icon: Icon, color, background, selected }) => (
                                        <label key={value} className="relative cursor-pointer">
                                            <input
                                                type="radio"
                                                className="peer sr-only"
                                                value={value}
                                                {...register('kind', { onChange: () => clearErrors() })}
                                            />
                                            <span
                                                className={cn(
                                                    'flex min-h-20 items-center gap-3 rounded-lg border border-solid border-input bg-background px-3 py-3 transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-ring',
                                                    selected,
                                                )}
                                            >
                                                <span
                                                    className={cn(
                                                        'flex size-12 shrink-0 items-center justify-center rounded-full',
                                                        color,
                                                        background,
                                                    )}
                                                >
                                                    <Icon aria-hidden="true" className="size-7" />
                                                </span>
                                                <span className="grid gap-1">
                                                    <span className="text-sm font-semibold">{tKinds(value)}</span>
                                                    <span className="text-[11px] text-muted-foreground">
                                                        {t(`kindHints.${value}`)}
                                                    </span>
                                                </span>
                                            </span>
                                        </label>
                                    ))}
                                </div>
                            </fieldset>

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
                                            const amount =
                                                typeof value === 'string'
                                                    ? parseLocalizedAmount(value, locale)
                                                    : undefined;
                                            if (amount === undefined || amount <= 0) return tDialog('invalidAmount');
                                            return (
                                                Math.abs(amount * 100 - Math.round(amount * 100)) < 0.000001 ||
                                                t('invalidPrecision')
                                            );
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
                                    formatDate={(date) =>
                                        format.dateTime(date, { day: '2-digit', month: 'short', year: 'numeric' })
                                    }
                                    formatMonth={(date) => format.dateTime(date, { month: 'long', year: 'numeric' })}
                                    formatWeekday={(date) => format.dateTime(date, { weekday: 'short' })}
                                    rules={{
                                        required: tDialog('required'),
                                        validate: (value) =>
                                            (typeof value === 'string' && isCalendarDate(value)) || t('invalidDate'),
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
                                            balanceWallets.some((wallet) => String(wallet.id) === value) ||
                                            t('selectWallet'),
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
                                                onClick={() => setCategoryEditorOpen(true)}
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
                                            <Input
                                                id={`${id}-transfer-category`}
                                                value={tKinds('transfer')}
                                                readOnly
                                                className="pl-10"
                                            />
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
                                                (typeof value === 'string' && value.trim().length > 0) ||
                                                tDialog('required'),
                                            maxLength: { value: 200, message: t('descriptionTooLong') },
                                        }}
                                    />
                                </div>
                            </div>

                            <Controller
                                control={control}
                                name="notes"
                                render={({ field, fieldState }) => (
                                    <FormField id={`${id}-notes`} label={t('notes')} error={fieldState.error?.message}>
                                        <div className="relative">
                                            <FileText
                                                aria-hidden="true"
                                                className="pointer-events-none absolute left-3 top-3 size-4 text-muted-foreground"
                                            />
                                            <textarea
                                                {...field}
                                                id={`${id}-notes`}
                                                className="box-border min-h-24 w-full resize-y rounded-md border border-solid border-input bg-background py-2.5 pl-10 pr-3 pb-7 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                                                placeholder={t('notesPlaceholder')}
                                                maxLength={240}
                                                {...fieldAriaProps(`${id}-notes`, fieldState.error?.message)}
                                            />
                                            <span className="pointer-events-none absolute bottom-2 right-3 text-[11px] tabular-nums text-muted-foreground">
                                                {notes.length}/240
                                            </span>
                                        </div>
                                    </FormField>
                                )}
                            />

                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <SwitchField
                                    control={control}
                                    name="recurring"
                                    id={`${id}-recurring`}
                                    label={t('recurring')}
                                    description={t('recurringHint')}
                                />
                                <div>
                                    <input
                                        ref={receiptInput}
                                        type="file"
                                        accept=".pdf,.jpg,.jpeg,.png,.webp"
                                        className="sr-only"
                                        tabIndex={-1}
                                        aria-label={t('attachReceipt')}
                                        onChange={(event) => receiptHandler(event.currentTarget.files?.[0])}
                                    />
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="border border-dashed border-input px-4"
                                        onClick={() => receiptInput.current?.click()}
                                    >
                                        <Paperclip aria-hidden="true" className="size-4" />
                                        {t('attachReceipt')}
                                    </Button>
                                </div>
                            </div>
                            {!!receiptError && (
                                <p role="alert" className="m-0 text-xs text-destructive">
                                    {receiptError}
                                </p>
                            )}
                            {!!receipt && (
                                <div className="flex min-w-0 items-center gap-2 rounded-md border border-solid border-border p-2 text-xs">
                                    <FileText aria-hidden="true" className="size-4" />
                                    <span className="min-w-0 flex-1 truncate">{receipt.name}</span>
                                    <span className="shrink-0 text-muted-foreground">
                                        {format.number(receipt.size / 1024, { maximumFractionDigits: 0 })} KB
                                    </span>
                                    <Button
                                        type="button"
                                        variant="transparent"
                                        size="icon"
                                        className="size-7"
                                        aria-label={t('removeReceipt')}
                                        onClick={() => {
                                            setReceipt(undefined);
                                            if (receiptInput.current) receiptInput.current.value = '';
                                        }}
                                    >
                                        <Trash2 aria-hidden="true" className="size-4" />
                                    </Button>
                                </div>
                            )}
                            {!!recurring && <TransactionRecurrenceFields form={form} id={id} />}
                            {!!unavailable && (
                                <p role="status" className="m-0 text-xs text-muted-foreground">
                                    {t('previewOnly')}
                                </p>
                            )}
                            {!!errors.root?.server?.message && (
                                <p role="alert" className="m-0 text-sm text-destructive">
                                    {errors.root.server.message}
                                </p>
                            )}
                        </fieldset>
                        {!!metadataLoading && (
                            <p role="status" className="text-sm text-muted-foreground">
                                {t('loadingOptions')}
                            </p>
                        )}
                        {!!metadataMessage && (
                            <div
                                role="alert"
                                className="mt-3 flex items-center justify-between gap-2 text-sm text-destructive"
                            >
                                <span>{metadataMessage}</span>
                                {!!metadataError && (
                                    <Button type="button" size="sm" variant="outline" onClick={onRetry}>
                                        {t('retry')}
                                    </Button>
                                )}
                            </div>
                        )}
                    </DialogBody>
                    <DialogFooter className="mx-5 items-stretch border-t border-border py-3 sm:mx-7 sm:items-center">
                        <Button
                            type="button"
                            variant="transparent"
                            className="sm:mr-auto"
                            disabled={isSubmitting}
                            onClick={onClose}
                        >
                            {tDialog('cancel')}
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            className="border border-solid border-input"
                            disabled={isSubmitting || metadataLoading}
                            onClick={saveDraftHandler}
                        >
                            {t('saveDraft')}
                        </Button>
                        <Button
                            type="submit"
                            disabled={
                                isSubmitting ||
                                metadataLoading ||
                                unavailable ||
                                balanceWallets.length === 0 ||
                                types.length === 0
                            }
                        >
                            {submitLabel}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
            {!!categoryEditorOpen && (
                <CategoryEditorDialog
                    types={types}
                    loading={metadataLoading}
                    error={metadataError}
                    onRetry={onRetry}
                    onClose={() => setCategoryEditorOpen(false)}
                    onCreated={categoryCreatedHandler}
                />
            )}
        </Dialog>
    );
}
