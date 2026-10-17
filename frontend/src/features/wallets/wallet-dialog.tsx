'use client';

import { useEffect } from 'react';

import { useLocale, useTranslations } from 'next-intl';
import { Controller, useForm, useWatch } from 'react-hook-form';

import { InputField, SwitchField } from '@/components/shared/form-controls';
import { FormField } from '@/components/shared/form-field';
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
    Banknote,
    CreditCard,
    FileText,
    Landmark,
    PiggyBank,
    Plus,
    Save,
} from '@/components/ui/icons';
import type { IconComponent } from '@/components/ui/icons';
import { parseLocalizedAmount } from '@/lib/money';
import { cn } from '@/lib/utils';

import type { CardKind, CardNetwork, WalletIcon, WalletKind, WalletViewModel } from './model';

interface WalletFormValues {
    name: string;
    balance: string | number;
    kind: WalletKind;
    color: string;
    icon: WalletIcon;
    institution: string;
    currency: 'EUR';
    description: string;
    showOnDashboard: boolean;
    favorite: boolean;
    cardKind: CardKind;
    cardNetwork: CardNetwork;
    cardLastFour: string;
    linkedWalletId: string;
    paymentDay: string;
    lowBalanceThreshold: string | number;
    allowLinkedTopUps: boolean;
    suggestAutomaticTopUp: boolean;
}

interface WalletDialogProps {
    open: boolean;
    wallet?: WalletViewModel;
    availableWallets?: WalletViewModel[];
    onOpenChange: (open: boolean) => void;
    onSave: (wallet: Omit<WalletViewModel, 'id'>) => void;
}

const walletKinds = ['bank', 'savings', 'card', 'cash'] as const;
const cardKinds: CardKind[] = ['debit', 'credit', 'prepaid'];
const cardNetworks: CardNetwork[] = ['visa', 'mastercard', 'amex', 'other'];
const walletColors = ['#ef2850', '#8b5cf6', '#3b82f6', '#10b981', '#84cc16', '#f59e0b', '#64748b'];
const draftStorageKey = 'moneygestor.wallet-draft';

const kindIcons: Record<(typeof walletKinds)[number], IconComponent> = {
    bank: Landmark,
    savings: PiggyBank,
    card: CreditCard,
    cash: Banknote,
};

const emptyValues: WalletFormValues = {
    name: '',
    balance: '',
    kind: 'bank',
    color: walletColors[1],
    icon: 'bank',
    institution: '',
    currency: 'EUR',
    description: '',
    showOnDashboard: true,
    favorite: false,
    cardKind: 'debit',
    cardNetwork: 'visa',
    cardLastFour: '',
    linkedWalletId: '',
    paymentDay: '',
    lowBalanceThreshold: '',
    allowLinkedTopUps: true,
    suggestAutomaticTopUp: false,
};

export function WalletDialog({ open, wallet, availableWallets = [], onOpenChange, onSave }: WalletDialogProps) {
    const locale = useLocale();
    const t = useTranslations('Wallets');
    const tCommon = useTranslations('Common');
    const { control, handleSubmit, reset, setValue } = useForm<WalletFormValues>({
        defaultValues: emptyValues,
    });
    const selectedColor = useWatch({ control, name: 'color' });
    const selectedKind = useWatch({ control, name: 'kind' });
    const selectedCardKind = useWatch({ control, name: 'cardKind' });
    const description = useWatch({ control, name: 'description' }) ?? '';
    const linkedAccountOptions = availableWallets.filter(
        (candidate) => candidate.id !== wallet?.id && candidate.kind === 'bank',
    );
    const isCard = selectedKind === 'card';
    const isPrepaidCard = selectedCardKind === 'prepaid';
    const dialogTitle = String(
        isCard
            ? t(`dialog.cardTitles.${wallet === undefined ? 'create' : 'edit'}.${selectedCardKind}`)
            : t(wallet === undefined ? 'dialog.createTitle' : 'dialog.editTitle'),
    );
    const dialogDescription = String(
        isCard
            ? t(`dialog.cardDescriptions.${selectedCardKind}`)
            : t(wallet === undefined ? 'dialog.createDescription' : 'dialog.editDescription'),
    );

    useEffect(() => {
        if (!open) return;

        let draft: Partial<WalletFormValues> = {};
        if (wallet === undefined) {
            try {
                draft = JSON.parse(window.sessionStorage.getItem(draftStorageKey) ?? '{}') as Partial<WalletFormValues>;
            } catch {
                window.sessionStorage.removeItem(draftStorageKey);
            }
        }

        reset({
            ...emptyValues,
            ...draft,
            name: wallet?.name ?? draft.name ?? '',
            balance: wallet?.currentValue ?? draft.balance ?? '',
            kind: wallet?.kind ?? draft.kind ?? 'bank',
            color: wallet?.color ?? draft.color ?? walletColors[1],
            icon: wallet?.icon ?? draft.icon ?? wallet?.kind ?? 'bank',
            institution: wallet?.institution ?? draft.institution ?? '',
            description: wallet?.description ?? draft.description ?? '',
            showOnDashboard: wallet?.showOnDashboard ?? draft.showOnDashboard ?? true,
            favorite: wallet?.isFavorite ?? draft.favorite ?? false,
            cardKind: wallet?.cardDetails?.kind ?? draft.cardKind ?? 'debit',
            cardNetwork: wallet?.cardDetails?.network ?? draft.cardNetwork ?? 'visa',
            cardLastFour: wallet?.cardDetails?.lastFour ?? draft.cardLastFour ?? '',
            linkedWalletId: wallet?.cardDetails?.linkedWalletId?.toString() ?? draft.linkedWalletId ?? '',
            paymentDay: wallet?.cardDetails?.paymentDay?.toString() ?? draft.paymentDay ?? '',
            lowBalanceThreshold: wallet?.cardDetails?.lowBalanceThreshold ?? draft.lowBalanceThreshold ?? '',
            allowLinkedTopUps: wallet?.cardDetails?.allowLinkedTopUps ?? draft.allowLinkedTopUps ?? true,
            suggestAutomaticTopUp: wallet?.cardDetails?.suggestAutomaticTopUp ?? draft.suggestAutomaticTopUp ?? false,
        });
    }, [open, reset, wallet]);

    const getCurrentValue = (values: WalletFormValues) => {
        const balance = parseLocalizedAmount(String(values.balance), locale) ?? 0;
        if (values.kind !== 'card') return balance;
        if (values.cardKind === 'debit') return 0;
        if (values.cardKind === 'credit') return -Math.abs(balance);
        return balance;
    };

    const toWallet = (values: WalletFormValues): Omit<WalletViewModel, 'id'> => ({
        name: values.name.trim(),
        currentValue: getCurrentValue(values),
        isFavorite: values.favorite,
        color: values.color,
        kind: values.kind,
        icon: values.icon,
        institution: values.institution.trim() || undefined,
        description: values.description.trim() || undefined,
        showOnDashboard: values.showOnDashboard,
        monthlyChange: wallet?.monthlyChange ?? 0,
        cardDetails:
            values.kind === 'card'
                ? {
                      kind: values.cardKind,
                      network: values.cardNetwork,
                      lastFour: values.cardLastFour.trim() || undefined,
                      linkedWalletId: values.linkedWalletId ? Number(values.linkedWalletId) : undefined,
                      paymentDay: values.cardKind === 'credit' ? Number(values.paymentDay) : undefined,
                      lowBalanceThreshold:
                          values.cardKind === 'prepaid'
                              ? parseLocalizedAmount(String(values.lowBalanceThreshold), locale)
                              : undefined,
                      allowLinkedTopUps: values.cardKind === 'prepaid' ? values.allowLinkedTopUps : undefined,
                      suggestAutomaticTopUp: values.cardKind === 'prepaid' ? values.suggestAutomaticTopUp : undefined,
                  }
                : undefined,
    });

    const submitHandler = (values: WalletFormValues) => {
        window.sessionStorage.removeItem(draftStorageKey);
        onSave(toWallet(values));
        onOpenChange(false);
    };

    const saveDraftHandler = (values: WalletFormValues) => {
        window.sessionStorage.setItem(draftStorageKey, JSON.stringify(values));
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent closeLabel={tCommon('actions.close')} className="max-w-3xl gap-0 p-0 sm:w-[calc(100%-3rem)]">
                <DialogHeader className="shrink-0 px-5 pt-5 sm:px-7 sm:pt-7">
                    <DialogTitle className="text-left text-2xl font-bold sm:text-3xl mb-0">{dialogTitle}</DialogTitle>
                    <DialogDescription className="text-left text-base mt-1">{dialogDescription}</DialogDescription>
                </DialogHeader>

                <form className="flex min-h-0 flex-1 flex-col overflow-hidden" onSubmit={handleSubmit(submitHandler)}>
                    <DialogBody className="grid gap-5 px-5 py-5 sm:px-7">
                        <Controller
                            control={control}
                            name="kind"
                            render={({ field }) => (
                                <fieldset className="m-0 grid min-w-0 gap-2 border-0 p-0">
                                    <legend className="sr-only">{t('dialog.type')}</legend>
                                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="radiogroup">
                                        {walletKinds.map((kind) => {
                                            const Icon = kindIcons[kind];
                                            const selected = field.value === kind;
                                            return (
                                                <Button
                                                    key={kind}
                                                    type="button"
                                                    disabled={wallet !== undefined && !selected}
                                                    role="radio"
                                                    aria-checked={selected}
                                                    className={cn(
                                                        'flex min-h-20 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border bg-secondary/35 px-2 py-3 text-sm font-medium text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                                                        selected
                                                            ? 'border-primary bg-primary text-primary-foreground shadow-md'
                                                            : 'border-border hover:bg-accent',
                                                    )}
                                                    onClick={() => {
                                                        field.onChange(kind);
                                                        setValue('icon', kind, { shouldDirty: true });
                                                    }}
                                                >
                                                    <Icon aria-hidden="true" className="size-6" />
                                                    {t(`types.${kind}`)}
                                                </Button>
                                            );
                                        })}
                                    </div>
                                </fieldset>
                            )}
                        />

                        {selectedKind === 'card' && (
                            <Controller
                                control={control}
                                name="cardKind"
                                render={({ field }) => (
                                    <fieldset className="m-0 grid min-w-0 gap-2 border-0 p-0">
                                        <legend className="text-sm font-semibold mb-1">{t('dialog.cardType')}</legend>
                                        <div className="grid grid-cols-3 gap-2" role="radiogroup">
                                            {cardKinds.map((cardKind) => {
                                                const selected = field.value === cardKind;
                                                return (
                                                    <Button
                                                        key={cardKind}
                                                        type="button"
                                                        disabled={wallet !== undefined && !selected}
                                                        role="radio"
                                                        aria-checked={selected}
                                                        className={cn(
                                                            'flex min-h-20 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border bg-secondary/35 px-2 py-3 text-sm font-medium text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                                                            selected
                                                                ? 'border-primary bg-primary/15 text-primary shadow-sm ring-1 ring-primary'
                                                                : 'border-border hover:bg-accent',
                                                        )}
                                                        onClick={() => field.onChange(cardKind)}
                                                    >
                                                        <CreditCard aria-hidden="true" className="size-6" />
                                                        {t(`cardTypes.${cardKind}`)}
                                                    </Button>
                                                );
                                            })}
                                        </div>
                                    </fieldset>
                                )}
                            />
                        )}

                        <div className="grid min-w-0 gap-5 sm:grid-cols-2">
                            <InputField
                                control={control}
                                name="name"
                                label={t(selectedKind === 'card' ? 'dialog.cardName' : 'dialog.name')}
                                description={t(selectedKind === 'card' ? 'dialog.cardNameHelp' : 'dialog.nameHelp')}
                                placeholder={t(
                                    selectedKind === 'card' ? 'dialog.cardNamePlaceholder' : 'dialog.namePlaceholder',
                                )}
                                autoComplete="off"
                                rules={{ required: t('dialog.required') }}
                            />
                            {selectedKind !== 'card' && (
                                <InputField
                                    kind="amount"
                                    control={control}
                                    name="balance"
                                    readOnly={wallet !== undefined}
                                    label={t('dialog.balance')}
                                    description={t('dialog.balanceHelp')}
                                    placeholder="0.00"
                                    startAdornment="€"
                                    locale={locale}
                                    rules={{
                                        required: t('dialog.required'),
                                        validate: (value) =>
                                            parseLocalizedAmount(String(value), locale) !== undefined ||
                                            t('dialog.invalidAmount'),
                                    }}
                                />
                            )}
                            {selectedKind !== 'card' && (
                                <InputField
                                    control={control}
                                    name="institution"
                                    label={t('dialog.institution')}
                                    description={t('dialog.institutionHelp')}
                                    placeholder={t('dialog.institutionPlaceholder')}
                                    autoComplete="organization"
                                />
                            )}
                            <InputField
                                control={control}
                                name="currency"
                                kind="select"
                                label={t('dialog.currency')}
                                description={t('dialog.currencyHelp')}
                                options={[{ value: 'EUR', label: t('dialog.currencyEur') }]}
                            />
                            {selectedKind === 'card' && (
                                <>
                                    <InputField
                                        control={control}
                                        name="cardNetwork"
                                        kind="select"
                                        label={t('dialog.cardNetwork')}
                                        description={t('dialog.cardNetworkHelp')}
                                        options={cardNetworks.map((network) => ({
                                            value: network,
                                            label: t(`cardNetworks.${network}`),
                                        }))}
                                    />
                                    <InputField
                                        control={control}
                                        name="cardLastFour"
                                        label={t('dialog.lastFour')}
                                        description={t('dialog.lastFourHelp')}
                                        placeholder="1234"
                                        inputMode="numeric"
                                        maxLength={4}
                                        rules={{
                                            pattern: { value: /^\d{4}$/, message: t('dialog.invalidLastFour') },
                                        }}
                                    />
                                </>
                            )}
                            <FormField id="wallet-color" label={t('dialog.color')} description={t('dialog.colorHelp')}>
                                <div
                                    id="wallet-color"
                                    className="flex min-h-10 flex-wrap items-center justify-start gap-3"
                                    role="radiogroup"
                                >
                                    {walletColors.map((color) => (
                                        <Button
                                            key={color}
                                            type="button"
                                            role="radio"
                                            aria-label={t('dialog.chooseColor', { color })}
                                            aria-checked={selectedColor === color}
                                            className={cn(
                                                'size-7 px-0 cursor-pointer rounded-full border-2 border-transparent outline-offset-2 focus-visible:outline-2 focus-visible:outline-ring',
                                                selectedColor === color &&
                                                    'ring-2 ring-foreground ring-offset-2 ring-offset-popover',
                                            )}
                                            style={{ backgroundColor: color }}
                                            onClick={() => setValue('color', color, { shouldDirty: true })}
                                        />
                                    ))}
                                </div>
                            </FormField>
                        </div>

                        {selectedKind === 'card' && (
                            <div className="grid min-w-0 gap-5 rounded-xl border border-border bg-secondary/20 p-4 sm:grid-cols-2">
                                {selectedCardKind !== 'debit' && (
                                    <InputField
                                        kind="amount"
                                        control={control}
                                        name="balance"
                                        readOnly={wallet !== undefined && selectedCardKind === 'prepaid'}
                                        label={t(
                                            selectedCardKind === 'credit'
                                                ? 'dialog.creditBalance'
                                                : 'dialog.prepaidBalance',
                                        )}
                                        description={t(
                                            selectedCardKind === 'credit'
                                                ? 'dialog.creditBalanceHelp'
                                                : 'dialog.prepaidBalanceHelp',
                                        )}
                                        placeholder="0.00"
                                        startAdornment="€"
                                        locale={locale}
                                        rules={{
                                            required: t('dialog.required'),
                                            validate: (value) =>
                                                parseLocalizedAmount(String(value), locale) !== undefined ||
                                                t('dialog.invalidAmount'),
                                        }}
                                    />
                                )}
                                <InputField
                                    control={control}
                                    name="linkedWalletId"
                                    kind="select"
                                    label={t(
                                        selectedCardKind === 'prepaid' ? 'dialog.topUpAccount' : 'dialog.linkedAccount',
                                    )}
                                    description={t(
                                        selectedCardKind === 'prepaid'
                                            ? 'dialog.topUpAccountHelp'
                                            : 'dialog.linkedAccountHelp',
                                    )}
                                    placeholder={t('dialog.linkedAccountPlaceholder')}
                                    options={linkedAccountOptions.map((account) => ({
                                        value: String(account.id),
                                        label: account.name,
                                    }))}
                                    rules={{
                                        validate: (value) => isPrepaidCard || Boolean(value) || t('dialog.required'),
                                    }}
                                />
                                {selectedCardKind === 'credit' && (
                                    <InputField
                                        control={control}
                                        name="paymentDay"
                                        label={t('dialog.paymentDay')}
                                        description={t('dialog.paymentDayHelp')}
                                        placeholder="15"
                                        inputMode="numeric"
                                        rules={{
                                            required: t('dialog.required'),
                                            validate: (value) => {
                                                const day = Number(value);
                                                return (
                                                    (Number.isInteger(day) && day >= 1 && day <= 31) ||
                                                    t('dialog.invalidDay')
                                                );
                                            },
                                        }}
                                    />
                                )}
                                {selectedCardKind === 'prepaid' && (
                                    <InputField
                                        kind="amount"
                                        control={control}
                                        name="lowBalanceThreshold"
                                        label={t('dialog.lowBalanceThreshold')}
                                        description={t('dialog.lowBalanceThresholdHelp')}
                                        placeholder="20.00"
                                        startAdornment="€"
                                        locale={locale}
                                        rules={{
                                            validate: (value) =>
                                                value === '' ||
                                                parseLocalizedAmount(String(value), locale) !== undefined ||
                                                t('dialog.invalidAmount'),
                                        }}
                                    />
                                )}
                                {linkedAccountOptions.length === 0 && (
                                    <p className="m-0 text-sm text-warning sm:col-span-2">
                                        {t('dialog.noLinkedAccounts')}
                                    </p>
                                )}
                                {selectedCardKind === 'prepaid' && (
                                    <div className="grid gap-4 sm:col-span-2 sm:grid-cols-2">
                                        <SwitchField
                                            control={control}
                                            name="allowLinkedTopUps"
                                            label={t('dialog.allowLinkedTopUps')}
                                            description={t('dialog.allowLinkedTopUpsHelp')}
                                        />
                                        <SwitchField
                                            control={control}
                                            name="suggestAutomaticTopUp"
                                            label={t('dialog.suggestAutomaticTopUp')}
                                            description={t('dialog.suggestAutomaticTopUpHelp')}
                                        />
                                    </div>
                                )}
                            </div>
                        )}

                        <InputField
                            control={control}
                            name="description"
                            label={t('dialog.description')}
                            description={t('dialog.descriptionHelp')}
                            startAdornment={<FileText aria-hidden="true" />}
                            endAdornment={`${description.length}/200`}
                            maxLength={200}
                            placeholder={t('dialog.descriptionPlaceholder')}
                        />

                        <div className="grid gap-4 sm:grid-cols-2">
                            <SwitchField
                                control={control}
                                name="showOnDashboard"
                                size="md"
                                label={t('dialog.showOnDashboard')}
                                description={t('dialog.showOnDashboardHelp')}
                            />
                            <SwitchField
                                control={control}
                                name="favorite"
                                size="md"
                                label={t('dialog.favorite')}
                                description={t('dialog.favoriteHelp')}
                            />
                        </div>
                    </DialogBody>

                    <DialogFooter className="border-t border-border bg-background px-5 py-4 sm:justify-start sm:px-7">
                        <Button type="button" className="sm:min-w-36" variant="outline" onClick={() => onOpenChange(false)}>
                            {tCommon('actions.cancel')}
                        </Button>
                        {wallet === undefined && (
                            <Button
                                type="button"
                                className="sm:ml-auto sm:min-w-40"
                                variant="secondary"
                                onClick={handleSubmit(saveDraftHandler)}
                            >
                                <Save aria-hidden="true" className="size-5" />
                                {t('dialog.saveDraft')}
                            </Button>
                        )}
                        <Button className={cn('sm:min-w-52', wallet !== undefined && 'sm:ml-auto')} type="submit">
                            <Plus aria-hidden="true" className="size-5" />
                            {t(
                                wallet === undefined
                                    ? selectedKind === 'card'
                                        ? 'dialog.addCardAction'
                                        : 'dialog.addAction'
                                    : 'dialog.updateAction',
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
