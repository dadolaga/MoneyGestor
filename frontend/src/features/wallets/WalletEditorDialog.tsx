'use client';

import { useId } from 'react';

import dayjs from 'dayjs';
import { useFormatter, useLocale, useTranslations } from 'next-intl';
import { useForm, useWatch } from 'react-hook-form';

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
import { Check, Plus, Save, Wallet } from '@/components/ui/icons';
import { Input } from '@/components/ui/input';
import { ApiProblemError } from '@/lib/api/client';
import { parseLocalizedAmount } from '@/lib/money';
import { cn } from '@/lib/utils';

import { hasOwnBalance, walletIcons, walletKinds } from './wallet-model';
import type { CardNetwork, WalletAccount, WalletDraft, WalletKind } from './wallet-model';

interface WalletFormValues {
    kind: WalletKind | '';
    name: string;
    institution: string;
    color: string;
    initialBalance: string;
    iban: string;
    lastFour: string;
    network: CardNetwork;
    expiry: string;
    linkedAccountId: string;
    creditLimit: string;
    currentSpending: string;
    statementDay: string;
    paymentDay: string;
    notes: string;
    shareable: boolean;
}

interface WalletEditorDialogProps {
    accounts: WalletAccount[];
    wallet?: Partial<WalletDraft> & { id: number };
    pending?: boolean;
    onClose: () => void;
    onSave: (wallet: WalletDraft) => Promise<void>;
}

const colors = [
    { value: '#ef2850', className: 'bg-[#ef2850]', name: 'red' },
    { value: '#f97316', className: 'bg-[#f97316]', name: 'orange' },
    { value: '#facc15', className: 'bg-[#facc15]', name: 'yellow' },
    { value: '#10b981', className: 'bg-[#10b981]', name: 'green' },
    { value: '#3b82f6', className: 'bg-[#3b82f6]', name: 'blue' },
    { value: '#8b5cf6', className: 'bg-[#8b5cf6]', name: 'purple' },
    { value: '#f472b6', className: 'bg-[#f472b6]', name: 'pink' },
    { value: '#64748b', className: 'bg-[#64748b]', name: 'grey' },
];
const networks: CardNetwork[] = ['visa', 'mastercard', 'amex', 'other'];
const serverFields: Record<string, keyof WalletFormValues> = {
    name: 'name',
    color: 'color',
    colorid: 'color',
    colorvalue: 'color',
    kind: 'kind',
    currency: 'kind',
    institution: 'institution',
    initialvalue: 'initialBalance',
    iban: 'iban',
    lastfour: 'lastFour',
    network: 'network',
    expiry: 'expiry',
    linkedaccountid: 'linkedAccountId',
    creditlimit: 'creditLimit',
    currentspending: 'currentSpending',
    statementday: 'statementDay',
    paymentday: 'paymentDay',
    notes: 'notes',
    shareable: 'shareable',
};
const serverReasons: Record<string, string> = {
    required: 'validation.required',
    invalid_kind: 'validation.kind',
    invalid_currency: 'validation.currency',
    invalid_color: 'validation.color',
    invalid_account: 'validation.account',
    invalid_iban: 'validation.iban',
    invalid_network: 'validation.network',
    invalid_last_four: 'validation.lastFour',
    invalid_expiry: 'validation.expiry',
    invalid_amount: 'validation.serverAmount',
    invalid_day: 'validation.day',
    too_long: 'validation.notes',
    not_applicable: 'validation.incompatibleFields',
    inapplicable_card_fields: 'validation.incompatibleFields',
    inapplicable_credit_fields: 'validation.incompatibleFields',
    immutable_kind: 'validation.immutableKind',
};

export function WalletEditorDialog({
    accounts,
    wallet,
    pending = false,
    onClose,
    onSave,
}: WalletEditorDialogProps) {
    const t = useTranslations('CreateWallet');
    const locale = useLocale();
    const format = useFormatter();
    const id = useId();
    const isEditing = wallet !== undefined;
    const amountText = (value: number | undefined, fallback = '') =>
        value === undefined ? fallback : format.number(value, { useGrouping: false, maximumFractionDigits: 2 });
    const {
        control,
        register,
        handleSubmit,
        setError,
        clearErrors,
        formState: { errors },
    } = useForm<WalletFormValues>({
        shouldUnregister: true,
        defaultValues: {
            kind: wallet?.kind ?? (isEditing ? '' : 'bank'),
            name: wallet?.name ?? '',
            institution: wallet?.institution ?? '',
            color: wallet?.color ?? colors[0].value,
            initialBalance: amountText(wallet?.initialBalance, '0'),
            iban: wallet?.iban ?? '',
            lastFour: wallet?.lastFour ?? '',
            network: wallet?.network ?? 'visa',
            expiry: wallet?.expiry ?? '',
            linkedAccountId: wallet?.linkedAccountId?.toString() ?? '',
            creditLimit: amountText(wallet?.creditLimit),
            currentSpending: amountText(wallet?.currentSpending, '0'),
            statementDay: wallet?.statementDay?.toString() ?? '',
            paymentDay: wallet?.paymentDay?.toString() ?? '',
            notes: wallet?.notes ?? '',
            shareable: wallet?.shareable ?? false,
        },
    });
    const kind = useWatch({ control, name: 'kind' });
    const notes = useWatch({ control, name: 'notes' }) ?? '';
    const isCard = kind === 'prepaid' || kind === 'debit' || kind === 'credit';
    const isCredit = kind === 'credit';
    const needsAccount = kind === 'debit' || isCredit;
    const hasBalance = kind !== '' && hasOwnBalance(kind);
    const currencyDescription = kind === 'debit' ? t('inheritedCurrency') : undefined;
    const initialBalanceDescription = isEditing ? t('initialBalanceLocked') : undefined;
    const accountDescription = accounts.length === 0 ? t('noAccounts') : undefined;
    const title = t(isEditing ? 'editTitle' : 'title');
    const description = t(isEditing ? 'editDescription' : 'description');
    const submitLabel = t(isEditing ? 'save' : 'create');
    const actionLabel = pending ? t('saving') : submitLabel;
    const SubmitIcon = isEditing ? Save : Plus;
    const namePlaceholder = kind === '' ? t('namePlaceholder') : t(`namePlaceholders.${kind}`);
    const colorOptions = [...colors];
    if (wallet?.color !== undefined && !colors.some((color) => color.value === wallet.color)) {
        colorOptions.push({ value: wallet.color, className: '', name: 'current' });
    }
    const expiryMin =
        wallet?.expiry !== undefined && wallet.expiry < dayjs().format('YYYY-MM')
            ? wallet.expiry
            : dayjs().format('YYYY-MM');
    const kindErrorId = errors.kind === undefined ? undefined : `${id}-kind-error`;

    const requiredLabel = (label: string) => (
        <>
            {label}
            <span aria-hidden="true" className="ml-1 text-primary">
                *
            </span>
        </>
    );
    const requiredText = {
        validate: (value: unknown) =>
            (typeof value === 'string' && value.trim().length > 0) || t('validation.required'),
    };
    const amountRules = (nonNegative = false) => ({
        required: t('validation.required'),
        validate: (value: unknown) => {
            if (typeof value !== 'string') return t('validation.amount');
            const amount = parseLocalizedAmount(value, locale);
            const valid =
                /^[+\-\d.,\s]+$/.test(value) &&
                amount !== undefined &&
                Math.abs(amount * 100 - Math.round(amount * 100)) < 0.000001;
            if (!valid) return t('validation.amount');
            return !nonNegative || (amount !== undefined && amount >= 0) || t('validation.nonNegative');
        },
    });
    const dayRules = {
        required: t('validation.required'),
        validate: (value: unknown) =>
            (typeof value === 'string' && /^(?:[1-9]|[12]\d|3[01])$/.test(value)) || t('validation.day'),
    };

    async function submitHandler(values: WalletFormValues) {
        clearErrors('root');
        if (values.kind === '') {
            setError('kind', { message: t('validation.required') });
            return;
        }
        const linkedAccount = needsAccount
            ? accounts.find((account) => String(account.id) === values.linkedAccountId)
            : undefined;
        if (needsAccount && linkedAccount === undefined) {
            setError('linkedAccountId', { message: t('validation.account') });
            return;
        }

        const wallet: WalletDraft = {
            kind: values.kind,
            name: values.name.trim(),
            color: values.color,
            currency: linkedAccount?.currency ?? 'EUR',
            shareable: kind === 'debit' ? Boolean(linkedAccount?.shareable) : values.shareable,
            notes: values.notes.trim() || undefined,
        };
        if (kind !== 'cash') wallet.institution = values.institution.trim();
        if (hasBalance) wallet.initialBalance = parseLocalizedAmount(values.initialBalance, locale);
        if (kind === 'bank' || kind === 'prepaid')
            wallet.iban = values.iban.replace(/\s/g, '').toUpperCase() || undefined;
        if (isCard) {
            wallet.lastFour = values.lastFour || undefined;
            wallet.network = values.network;
            wallet.expiry = values.expiry || undefined;
        }
        if (needsAccount) wallet.linkedAccountId = linkedAccount?.id;
        if (isCredit) {
            wallet.creditLimit = parseLocalizedAmount(values.creditLimit, locale);
            wallet.currentSpending = parseLocalizedAmount(values.currentSpending, locale);
            wallet.statementDay = Number(values.statementDay);
            wallet.paymentDay = Number(values.paymentDay);
        }
        try {
            await onSave(wallet);
        } catch (error: unknown) {
            if (error instanceof ApiProblemError) {
                for (const [field, reasons] of Object.entries(error.fieldErrors)) {
                    const name = serverFields[field.split('.').at(-1)?.toLowerCase() ?? ''];
                    const messageKey = reasons.map((reason) => serverReasons[reason]).find((key) => key !== undefined);
                    if (name !== undefined) {
                        setError(name, { message: t(messageKey ?? 'validation.serverField') });
                    }
                }
            }
            const message =
                error instanceof ApiProblemError && error.status === 401
                    ? 'errors.signInAgain'
                    : error instanceof ApiProblemError && error.status === 409
                      ? 'errors.conflict'
                      : error instanceof ApiProblemError && error.status === 400
                        ? 'errors.validation'
                        : 'errors.failed';
            setError('root.server', { message: t(message) });
        }
    }

    return (
        <Dialog
            open
            onOpenChange={(open) => {
                if (!open && !pending) onClose();
            }}
        >
            <DialogContent closeLabel={t('cancel')} className="box-border max-w-3xl gap-0 p-0 [&_*]:box-border">
                <DialogHeader className="flex-row items-center gap-3 space-y-0 px-5 pt-5 pr-12 text-left sm:px-6 sm:pt-6">
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                        <Wallet aria-hidden="true" className="size-6" />
                    </span>
                    <div>
                        <DialogTitle className="m-0 text-2xl font-semibold">{title}</DialogTitle>
                        <DialogDescription className="mt-1 mb-0">{description}</DialogDescription>
                    </div>
                </DialogHeader>
                <form className="flex min-h-0 flex-1 flex-col overflow-hidden" noValidate onSubmit={handleSubmit(submitHandler)}>
                    <DialogBody className="px-5 py-5 sm:px-6">
                        <fieldset disabled={pending} className="m-0 grid min-w-0 gap-5 border-0 p-0">
                            <fieldset className="m-0 min-w-0 border-0 p-0">
                                <legend className="sr-only">{t('kind')}</legend>
                                <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                                    {walletKinds.map((walletKind) => {
                                        const Icon = walletIcons[walletKind];
                                        return (
                                            <label key={walletKind} className="relative cursor-pointer">
                                                <input
                                                    className="peer sr-only"
                                                    type="radio"
                                                    value={walletKind}
                                                    disabled={!!isEditing && walletKind !== wallet.kind}
                                                    aria-describedby={kindErrorId}
                                                    {...register('kind', {
                                                        required: t('validation.required'),
                                                        onChange: () => clearErrors(),
                                                    })}
                                                />
                                                <span className="flex h-full min-h-28 flex-col items-center justify-center gap-2 rounded-lg border border-solid border-border bg-secondary/20 px-2 py-3 text-center transition-colors peer-checked:border-primary peer-checked:bg-primary/10 peer-checked:text-primary peer-focus-visible:ring-2 peer-focus-visible:ring-ring">
                                                    <Icon aria-hidden="true" className="size-6" />
                                                    <span className="text-sm font-medium">
                                                        {t(`kinds.${walletKind}`)}
                                                    </span>
                                                    <span className="text-[11px] text-muted-foreground">
                                                        {t(`kindHints.${walletKind}`)}
                                                    </span>
                                                </span>
                                                <Check
                                                    aria-hidden="true"
                                                    className="absolute top-2 right-2 hidden size-3 text-primary peer-checked:inline-flex"
                                                />
                                            </label>
                                        );
                                    })}
                                </div>
                                {!!errors.kind && (
                                    <p
                                        id={`${id}-kind-error`}
                                        role="alert"
                                        className="mt-2 mb-0 text-sm text-destructive"
                                    >
                                        {errors.kind.message}
                                    </p>
                                )}
                                {wallet !== undefined && wallet.kind === undefined && (
                                    <p className="mt-2 mb-0 text-sm text-muted-foreground">{t('typeUnavailable')}</p>
                                )}
                                {!!isEditing && (
                                    <p className="mt-2 mb-0 text-sm text-muted-foreground">
                                        {t('typeLocked')}
                                    </p>
                                )}
                            </fieldset>

                            <div className="grid min-w-0 gap-4 sm:grid-cols-2">
                                <InputField
                                    id={`${id}-name`}
                                    control={control}
                                    name="name"
                                    label={requiredLabel(t('fields.name'))}
                                    placeholder={namePlaceholder}
                                    maxLength={100}
                                    autoComplete="off"
                                    aria-required
                                    rules={requiredText}
                                />
                                {kind !== '' && kind !== 'cash' && (
                                    <InputField
                                        id={`${id}-institution`}
                                        control={control}
                                        name="institution"
                                        label={requiredLabel(t('fields.institution'))}
                                        placeholder={t('institutionPlaceholder')}
                                        maxLength={100}
                                        autoComplete="organization"
                                        aria-required
                                        rules={requiredText}
                                    />
                                )}
                                <FormField
                                    id={`${id}-currency`}
                                    label={t('fields.currency')}
                                    description={currencyDescription}
                                >
                                    <Input id={`${id}-currency`} readOnly value="EUR (€)" />
                                </FormField>
                                <fieldset className="m-0 grid min-w-0 gap-2 border-0 p-0">
                                    <legend className="mb-2 p-0 text-sm font-medium">{t('fields.color')}</legend>
                                    <div className="flex min-h-10 flex-wrap items-center gap-3">
                                        {colorOptions.map((color) => {
                                            const customColorStyle =
                                                color.className === '' ? { backgroundColor: color.value } : undefined;
                                            return (
                                                <label key={color.value} className="cursor-pointer">
                                                    <input
                                                        type="radio"
                                                        value={color.value}
                                                        aria-label={t(`colors.${color.name}`)}
                                                        className="peer sr-only"
                                                        {...register('color')}
                                                    />
                                                    <span
                                                        style={customColorStyle}
                                                        className={cn(
                                                            'block size-6 rounded-full ring-offset-2 ring-offset-popover peer-checked:ring-2 peer-checked:ring-primary peer-focus-visible:outline-2 peer-focus-visible:outline-ring',
                                                            color.className,
                                                        )}
                                                    />
                                                </label>
                                            );
                                        })}
                                    </div>
                                </fieldset>
                                {!!hasBalance && (
                                    <InputField
                                        id={`${id}-balance`}
                                        control={control}
                                        name="initialBalance"
                                        readOnly={isEditing}
                                        label={requiredLabel(t('fields.initialBalance'))}
                                        description={initialBalanceDescription}
                                        inputMode="decimal"
                                        startAdornment="€"
                                        placeholder={t('amountPlaceholder')}
                                        aria-required
                                        rules={amountRules()}
                                    />
                                )}
                                {(kind === 'bank' || kind === 'prepaid') && (
                                    <InputField
                                        id={`${id}-iban`}
                                        control={control}
                                        name="iban"
                                        label={t('fields.iban')}
                                        placeholder="IT60 X054 2811 1010 0000 0123 456"
                                        maxLength={42}
                                        autoComplete="off"
                                        rules={{
                                            validate: (value) =>
                                                !value ||
                                                /^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(
                                                    String(value).replace(/\s/g, '').toUpperCase(),
                                                ) ||
                                                t('validation.iban'),
                                        }}
                                    />
                                )}
                                {!!isCard && (
                                    <>
                                        <InputField
                                            id={`${id}-last-four`}
                                            control={control}
                                            name="lastFour"
                                            label={t('fields.lastFour')}
                                            placeholder="1234"
                                            inputMode="numeric"
                                            maxLength={4}
                                            autoComplete="off"
                                            rules={{ pattern: { value: /^\d{4}$/, message: t('validation.lastFour') } }}
                                        />
                                        <InputField
                                            id={`${id}-network`}
                                            control={control}
                                            name="network"
                                            kind="select"
                                            label={t('fields.network')}
                                            options={networks.map((network) => ({
                                                value: network,
                                                label: t(`cardNetworks.${network}`),
                                            }))}
                                        />
                                        <InputField
                                            id={`${id}-expiry`}
                                            control={control}
                                            name="expiry"
                                            label={t('fields.expiry')}
                                            type="month"
                                            min={expiryMin}
                                            rules={{
                                                validate: (value) =>
                                                    !value ||
                                                    value === wallet?.expiry ||
                                                    (/^\d{4}-(0[1-9]|1[0-2])$/.test(String(value)) &&
                                                        String(value) >= dayjs().format('YYYY-MM')) ||
                                                    t('validation.expiry'),
                                            }}
                                        />
                                    </>
                                )}
                                {!!needsAccount && (
                                    <div className="sm:col-span-2">
                                        <InputField
                                            id={`${id}-account`}
                                            control={control}
                                            name="linkedAccountId"
                                            kind="select"
                                            label={requiredLabel(t('fields.linkedAccount'))}
                                            description={accountDescription}
                                            placeholder={t('accountPlaceholder')}
                                            aria-required
                                            options={accounts.map((account) => ({
                                                value: String(account.id),
                                                label: account.name,
                                            }))}
                                            rules={{
                                                required: t('validation.required'),
                                                validate: (value) =>
                                                    accounts.some((account) => String(account.id) === value) ||
                                                    t('validation.account'),
                                            }}
                                        />
                                    </div>
                                )}
                                {!!isCredit && (
                                    <>
                                        <InputField
                                            id={`${id}-credit-limit`}
                                            control={control}
                                            name="creditLimit"
                                            label={requiredLabel(t('fields.creditLimit'))}
                                            inputMode="decimal"
                                            startAdornment="€"
                                            placeholder={t('amountPlaceholder')}
                                            aria-required
                                            rules={amountRules(true)}
                                        />
                                        <InputField
                                            id={`${id}-spending`}
                                            control={control}
                                            name="currentSpending"
                                            label={requiredLabel(t('fields.currentSpending'))}
                                            inputMode="decimal"
                                            startAdornment="€"
                                            placeholder={t('amountPlaceholder')}
                                            aria-required
                                            rules={amountRules(true)}
                                        />
                                        <InputField
                                            id={`${id}-statement-day`}
                                            control={control}
                                            name="statementDay"
                                            label={requiredLabel(t('fields.statementDay'))}
                                            inputMode="numeric"
                                            maxLength={2}
                                            placeholder="28"
                                            aria-required
                                            rules={dayRules}
                                        />
                                        <InputField
                                            id={`${id}-payment-day`}
                                            control={control}
                                            name="paymentDay"
                                            label={requiredLabel(t('fields.paymentDay'))}
                                            inputMode="numeric"
                                            maxLength={2}
                                            placeholder="15"
                                            aria-required
                                            rules={dayRules}
                                        />
                                    </>
                                )}
                            </div>

                            <FormField id={`${id}-notes`} label={t('fields.notes')} error={errors.notes?.message}>
                                <textarea
                                    id={`${id}-notes`}
                                    className="min-h-20 w-full resize-y rounded-md border border-input bg-background px-3 py-2 [font-family:inherit] text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                    placeholder={t('notesPlaceholder')}
                                    maxLength={200}
                                    {...register('notes', {
                                        maxLength: { value: 200, message: t('validation.notes') },
                                    })}
                                    {...fieldAriaProps(`${id}-notes`, errors.notes?.message)}
                                />
                                <span className="text-right text-xs text-muted-foreground">{notes.length}/200</span>
                            </FormField>
                            <div className="grid items-center gap-4 sm:grid-cols-2">
                                {kind !== '' && kind !== 'debit' && (
                                    <SwitchField
                                        id={`${id}-shareable`}
                                        control={control}
                                        name="shareable"
                                        label={t('fields.shareable')}
                                    />
                                )}
                                {kind === 'debit' && (
                                    <p className="m-0 text-sm text-muted-foreground">{t('inheritedSharing')}</p>
                                )}
                                {kind !== '' && (
                                    <p className="m-0 text-sm text-muted-foreground">
                                        {t(hasBalance ? 'includedInTotal' : 'excludedFromTotal')}
                                    </p>
                                )}
                            </div>
                            {!!errors.root?.server && (
                                <p role="alert" className="m-0 text-sm text-destructive">
                                    {errors.root.server.message}
                                </p>
                            )}
                        </fieldset>
                    </DialogBody>
                    <DialogFooter className="border-t border-border px-5 py-4 sm:px-6">
                        <Button type="button" variant="ghost" className="sm:mr-auto" disabled={pending} onClick={onClose}>
                            {t('cancel')}
                        </Button>
                        <Button type="submit" disabled={pending || (!!needsAccount && accounts.length === 0)}>
                            <SubmitIcon aria-hidden="true" className="size-4" />
                            {actionLabel}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
