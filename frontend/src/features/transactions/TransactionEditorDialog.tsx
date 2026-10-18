'use client';

import { useId, useState } from 'react';

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
import { ArrowLeftRight, Plus } from '@/components/ui/icons';
import { CategoryEditorDialog } from '@/features/categories/CategoryEditorDialog';
import { ApiProblemError, apiClient } from '@/lib/api/client';
import type { ApiTransaction, ApiTransactionType, ApiWallet, TransactionCreate } from '@/lib/api/client';
import { parseLocalizedAmount } from '@/lib/money';
import { notify } from '@/lib/notifications';

import { createTransactionDefaults } from './transaction-editor-model';
import type { TransactionFormValues } from './transaction-editor-model';
import { TransactionAdditionalFields } from './TransactionAdditionalFields';
import { TransactionDetailsFields } from './TransactionDetailsFields';
import { TransactionKindFields } from './TransactionKindFields';

interface TransactionEditorDialogProps {
    wallets: ApiWallet[];
    types: ApiTransactionType[];
    walletId?: number;
    typeId?: number;
    transaction?: ApiTransaction;
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
    const locale = useLocale();
    const id = useId();
    const balanceWallets = wallets.filter((wallet) => wallet.hasOwnBalance !== false);
    const categories = types.filter((type) => type.systemKind === null);
    const transferType = types.find(isTransferType);
    const [defaults] = useState<TransactionFormValues>(
        () =>
            transaction ? {
                ...createTransactionDefaults(),
                kind: transaction.type.systemKind === 'Transfer' ? 'transfer' : transaction.value > 0 ? 'income' : 'expense',
                amount: new Intl.NumberFormat(locale === 'it' ? 'it-IT' : 'en-GB', { useGrouping: false, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(transaction.value)),
                date: transaction.date, description: transaction.description ?? '', notes: transaction.longDescription ?? '',
                walletId: String(transaction.wallet.id), typeId: String(transaction.type.id),
                destinationWalletId: transaction.destination ? String(transaction.destination.id) : '',
            } : createTransactionDefaults(
                balanceWallets.find((wallet) => wallet.id === walletId)?.id ?? balanceWallets[0]?.id,
                categories.find((type) => type.id === typeId)?.id,
            ),
    );
    const [categoryEditorOpen, setCategoryEditorOpen] = useState(false);
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
                    : error instanceof ApiProblemError && error.status === 400 && error.code !== 'antiforgery_validation_failed'
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
                className="box-border max-w-[780px] gap-0 border border-solid border-border p-0 shadow-none [&_*]:box-border"
            >
                <DialogHeader className="flex-row items-center gap-4 space-y-0 px-5 pt-5 pr-12 text-left sm:px-7 sm:pt-6">
                    <span className="relative flex size-14 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground sm:size-16">
                        <Plus aria-hidden="true" className="absolute top-2 size-7" />
                        <ArrowLeftRight aria-hidden="true" className="absolute bottom-2 size-7" />
                    </span>
                    <div>
                        <DialogTitle className="m-0 text-2xl font-semibold">{tDialog(transaction ? 'editTitle' : 'createTitle')}</DialogTitle>
                        <DialogDescription className="mt-1 text-sm">{subtitle}</DialogDescription>
                    </div>
                </DialogHeader>
                <form
                    className="flex min-h-0 flex-1 flex-col overflow-hidden"
                    noValidate
                    onSubmit={(event) => { void handleSubmit(submitHandler)(event); }}
                >
                    <DialogBody className="px-5 py-5 sm:px-7">
                        <fieldset
                            disabled={isSubmitting || metadataLoading}
                            className="m-0 grid min-w-0 gap-4 border-0 p-0"
                        >
                            <TransactionKindFields form={form} />
                            <TransactionDetailsFields
                                form={form}
                                id={id}
                                balanceWallets={balanceWallets}
                                categories={categories}
                                onAddCategory={() => setCategoryEditorOpen(true)}
                            />
                            <TransactionAdditionalFields form={form} id={id} editing={transaction !== undefined} />
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
                            type="submit"
                            disabled={
                                isSubmitting ||
                                metadataLoading ||
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
