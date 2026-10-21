'use client';

import { useEffect, useId, useRef, useState } from 'react';

import { useLocale, useTranslations } from 'next-intl';
import { useForm, useWatch } from 'react-hook-form';

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
import { ArrowLeftRight, Check, ChevronDown, ChevronLeft, ChevronRight, Plus, Zap } from '@/components/ui/icons';
import { CategoryEditorDialog } from '@/features/categories/CategoryEditorDialog';
import { useIsMobile } from '@/hooks/useMobile';
import { ApiProblemError, apiClient } from '@/lib/api/client';
import type { ApiTransaction, ApiTransactionType, ApiWallet, TransactionCreate } from '@/lib/api/client';
import { parseLocalizedAmount } from '@/lib/money';
import { notify } from '@/lib/notifications';
import { cn } from '@/lib/utils';

import { createTransactionDefaults } from './transaction-editor-model';
import type { MovementKind, TransactionFormValues } from './transaction-editor-model';
import { TransactionAdditionalFields } from './TransactionAdditionalFields';
import { TransactionDetailsFields } from './TransactionDetailsFields';
import { TransactionKindFields } from './TransactionKindFields';

interface TransactionEditorDialogProps {
    wallets: ApiWallet[];
    types: ApiTransactionType[];
    walletId?: number;
    typeId?: number;
    transaction?: ApiTransaction;
    initialKind?: MovementKind;
    metadataLoading: boolean;
    metadataError: string;
    onRetry: () => void;
    onClose: () => void;
    onSaved: () => void;
    onCategoryCreated: (category: ApiTransactionType) => void;
}

function isTransferType(type: ApiTransactionType) {
    return type.systemKind === 'Transfer';
}

export function TransactionEditorDialog({
    wallets,
    types,
    walletId,
    typeId,
    transaction,
    initialKind = 'expense',
    metadataLoading,
    metadataError,
    onRetry,
    onClose,
    onSaved,
    onCategoryCreated,
}: TransactionEditorDialogProps) {
    const t = useTranslations('Movements.editor');
    const tDialog = useTranslations('Movements.dialog');
    const tCategory = useTranslations('Movements.categoryEditor');
    const tMobile = useTranslations('Movements.mobile');
    const locale = useLocale();
    const isMobile = useIsMobile();
    const id = useId();
    const balanceWallets = wallets.filter((wallet) => wallet.hasOwnBalance !== false);
    const categories = types.filter((type) => type.systemKind === null);
    const transferType = types.find(isTransferType);
    const [defaults] = useState<TransactionFormValues>(() =>
        transaction
            ? {
                  ...createTransactionDefaults(),
                  kind:
                      transaction.type.systemKind === 'Transfer'
                          ? 'transfer'
                          : transaction.value > 0
                            ? 'income'
                            : 'expense',
                  amount: new Intl.NumberFormat(locale === 'it' ? 'it-IT' : 'en-GB', {
                      useGrouping: false,
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                  }).format(Math.abs(transaction.value)),
                  date: transaction.date,
                  description: transaction.description ?? '',
                  notes: transaction.longDescription ?? '',
                  walletId: String(transaction.wallet.id),
                  typeId: String(transaction.type.id),
                  destinationWalletId: transaction.destination ? String(transaction.destination.id) : '',
              }
            : {
                  ...createTransactionDefaults(
                      balanceWallets.find((wallet) => wallet.id === walletId)?.id ?? balanceWallets[0]?.id,
                      categories.find((type) => type.id === typeId)?.id,
                  ),
                  kind: initialKind,
              },
    );
    const [categoryEditorOpen, setCategoryEditorOpen] = useState(false);
    const [detailsStep, setDetailsStep] = useState(false);
    const titleRef = useRef<HTMLHeadingElement>(null);
    const fieldsRef = useRef<HTMLFieldSetElement>(null);
    const form = useForm<TransactionFormValues>({ defaultValues: defaults, mode: 'onBlur' });
    const {
        control,
        handleSubmit,
        clearErrors,
        setError,
        setValue,
        formState: { errors, isSubmitting },
    } = form;
    const kind = useWatch({ control, name: 'kind' });
    const isTransfer = kind === 'transfer';
    const subtitle = transaction === undefined ? t('subtitle') : tDialog('editDescription');
    const submitLabel = isSubmitting ? t('saving') : transaction ? t('save') : t('create');
    const mobileTitle = detailsStep
        ? tMobile('detailsTitle')
        : transaction
          ? tDialog('editTitle')
          : tMobile('quickTitle');
    const mobileDescription = detailsStep
        ? tMobile('detailsDescription')
        : transaction
          ? subtitle
          : tMobile('quickDescription');
    const mobileSubmitLabel = detailsStep ? (isSubmitting ? t('saving') : tMobile('saveNow')) : tMobile('continue');
    const mobileBackLabel = detailsStep ? tMobile('back') : tDialog('cancel');
    const metadataMessage =
        metadataError ||
        (!metadataLoading && balanceWallets.length === 0
            ? t('noWallets')
            : !metadataLoading && categories.length === 0 && !isTransfer
              ? t('noCategories')
              : '');
    const saveDisabled = isSubmitting || metadataLoading || balanceWallets.length === 0 || types.length === 0;
    const serverFields: Record<string, keyof TransactionFormValues> = {
        description: 'description',
        longdescription: 'notes',
        value: 'amount',
        date: 'date',
        typeid: 'typeId',
        walletid: 'walletId',
        destinationwalletid: 'destinationWalletId',
    };

    useEffect(() => {
        if (isMobile) {
            titleRef.current?.focus();
            fieldsRef.current?.parentElement?.scrollTo({ top: 0 });
        }
    }, [isMobile, detailsStep]);

    async function continueHandler() {
        const valid = await form.trigger(
            ['amount', 'walletId', isTransfer ? 'destinationWalletId' : 'typeId', 'date', 'description'],
            { shouldFocus: true },
        );
        if (valid) setDetailsStep(true);
    }

    async function submitHandler(values: TransactionFormValues) {
        clearErrors('root');
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
            description: values.description.trim() || null,
            longDescription: values.notes.trim() || null,
            date: values.date,
            value: values.kind === 'expense' ? -amount : amount,
            typeId: values.kind === 'transfer' ? transferType!.id : Number(values.typeId),
            walletId: Number(values.walletId),
            destinationWalletId: values.kind === 'transfer' ? Number(values.destinationWalletId) : null,
        };
        try {
            if (transaction) {
                await apiClient.updateTransaction(transaction.id, body);
            } else {
                await apiClient.createTransaction(body);
            }
            onSaved();
            if (isMobile || transaction) {
                onClose();
            } else {
                form.reset({ ...values, amount: '', description: '', notes: '' });
            }
        } catch (error: unknown) {
            if (error instanceof ApiProblemError) {
                for (const field of Object.keys(error.fieldErrors)) {
                    const name = serverFields[field.split('.').at(-1)?.toLowerCase() ?? ''];
                    if (name !== undefined) setError(name, { message: t('serverField') });
                    if (
                        isMobile &&
                        (name === 'amount' ||
                            name === 'walletId' ||
                            name === 'destinationWalletId' ||
                            name === 'typeId')
                    ) {
                        setDetailsStep(false);
                    }
                }
            }
            const message =
                error instanceof ApiProblemError && error.status === 401
                    ? 'signInAgain'
                    : error instanceof ApiProblemError &&
                        error.status === 400 &&
                        error.code !== 'antiforgery_validation_failed'
                      ? 'invalidFields'
                      : error instanceof ApiProblemError && error.status === 404
                        ? 'resourceMissing'
                        : error instanceof ApiProblemError && error.status === 409
                          ? 'conflict'
                          : error instanceof ApiProblemError && error.status === 422
                            ? 'domainError'
                            : error instanceof ApiProblemError && error.code === 'antiforgery_validation_failed'
                              ? 'csrfFailed'
                              : 'saveFailed';
            setError('root.server', { message: t(message) });
        }
    }

    function categoryCreatedHandler(category: ApiTransactionType) {
        onCategoryCreated(category);
        setValue('typeId', String(category.id), { shouldDirty: true });
        clearErrors('typeId');
        setCategoryEditorOpen(false);
        notify.success(tCategory('created'));
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
                className={cn(
                    'box-border max-w-[780px] gap-0 border border-solid border-border p-0 shadow-none [&_*]:box-border',
                    isMobile &&
                        'left-0 top-0 h-dvh max-h-dvh w-full max-w-none translate-x-0 translate-y-0 rounded-none border-0 [&>button:last-child]:hidden',
                )}
            >
                {isMobile ? (
                    <DialogHeader className="relative flex-row items-start gap-2 space-y-0 px-3 pb-1 pt-[max(1rem,env(safe-area-inset-top))] text-center">
                        <Button
                            type="button"
                            variant="transparent"
                            size="icon"
                            className="shrink-0"
                            disabled={isSubmitting}
                            aria-label={mobileBackLabel}
                            onClick={() => {
                                if (detailsStep) setDetailsStep(false);
                                else onClose();
                            }}
                        >
                            <ChevronLeft aria-hidden="true" className="size-6" />
                        </Button>
                        <div className="min-w-0 flex-1 pt-1">
                            <DialogTitle ref={titleRef} tabIndex={-1} className="text-lg outline-none">
                                {mobileTitle}
                            </DialogTitle>
                            <DialogDescription className="mt-1 text-xs">{mobileDescription}</DialogDescription>
                        </div>
                        <Zap aria-hidden="true" className="mr-2 mt-2 size-6 shrink-0 text-primary" />
                    </DialogHeader>
                ) : (
                    <DialogHeader className="flex-row items-center gap-4 space-y-0 px-5 pt-5 pr-12 text-left sm:px-7 sm:pt-6">
                        <span className="relative flex size-14 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground sm:size-16">
                            <Plus aria-hidden="true" className="absolute top-2 size-7" />
                            <ArrowLeftRight aria-hidden="true" className="absolute bottom-2 size-7" />
                        </span>
                        <div>
                            <DialogTitle className="m-0 text-2xl font-semibold">
                                {tDialog(transaction ? 'editTitle' : 'createTitle')}
                            </DialogTitle>
                            <DialogDescription className="mt-1 text-sm">{subtitle}</DialogDescription>
                        </div>
                    </DialogHeader>
                )}
                <form
                    className="flex min-h-0 flex-1 flex-col overflow-hidden"
                    noValidate
                    onSubmit={(event) => {
                        if (isMobile && !detailsStep) {
                            event.preventDefault();
                            if (!saveDisabled) void continueHandler();
                            return;
                        }
                        void handleSubmit(submitHandler, (invalid) => {
                            if (
                                isMobile &&
                                (invalid.amount || invalid.walletId || invalid.typeId || invalid.destinationWalletId)
                            ) {
                                setDetailsStep(false);
                                const name = (['amount', 'walletId', 'typeId', 'destinationWalletId'] as const).find(
                                    (field) => invalid[field],
                                );
                                if (name) requestAnimationFrame(() => form.setFocus(name));
                            }
                        })(event);
                    }}
                >
                    <DialogBody className={isMobile ? 'px-4 py-3' : 'px-5 py-5 sm:px-7'}>
                        <fieldset
                            ref={fieldsRef}
                            disabled={isSubmitting || metadataLoading}
                            className="m-0 grid min-w-0 gap-4 border-0 p-0"
                        >
                            {!isMobile && <TransactionKindFields form={form} />}
                            <TransactionDetailsFields
                                form={form}
                                id={id}
                                balanceWallets={balanceWallets}
                                categories={categories}
                                onAddCategory={() => setCategoryEditorOpen(true)}
                                mobile={isMobile}
                                detailsStep={detailsStep}
                            />
                            <div
                                hidden={!!isMobile && !detailsStep}
                                className={cn(
                                    'grid gap-4',
                                    isMobile && '[&_textarea]:text-base',
                                    isMobile && !detailsStep && 'hidden',
                                )}
                            >
                                <TransactionAdditionalFields
                                    form={form}
                                    id={id}
                                    editing={isMobile || transaction !== undefined}
                                />
                            </div>
                            {!!isMobile && !detailsStep && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    disabled={saveDisabled || !!metadataError}
                                    className="min-h-10 rounded-xl border border-solid border-input text-muted-foreground"
                                    onClick={() => {
                                        void continueHandler();
                                    }}
                                >
                                    {tMobile('moreDetails')}
                                    <ChevronDown aria-hidden="true" className="size-4" />
                                </Button>
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
                    {isMobile ? (
                        <DialogFooter className="flex-col gap-2 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
                            <div className="flex gap-3">
                                {!!detailsStep && (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        disabled={isSubmitting}
                                        className="h-14 rounded-2xl border border-solid border-input px-4"
                                        onClick={() => setDetailsStep(false)}
                                    >
                                        <ChevronLeft aria-hidden="true" className="size-5" />
                                        {tMobile('back')}
                                    </Button>
                                )}
                                <Button
                                    type="submit"
                                    disabled={saveDisabled || !!metadataError}
                                    className="h-14 min-w-0 flex-1 rounded-2xl text-lg shadow-[0_6px_24px_color-mix(in_oklch,var(--primary)_25%,transparent)]"
                                >
                                    {!!detailsStep && <Check aria-hidden="true" className="size-6" />}
                                    {mobileSubmitLabel}
                                    {!detailsStep && <ChevronRight aria-hidden="true" className="size-6" />}
                                </Button>
                            </div>
                            <p aria-live="polite" className="m-0 text-center text-xs text-muted-foreground">
                                {tMobile('step', { step: detailsStep ? 2 : 1 })}
                            </p>
                        </DialogFooter>
                    ) : (
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
                            <Button type="submit" disabled={saveDisabled}>
                                {submitLabel}
                            </Button>
                        </DialogFooter>
                    )}
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
