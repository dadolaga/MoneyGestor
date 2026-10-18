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
import type { ApiTransactionType, ApiWallet, TransactionCreate } from '@/lib/api/client';
import { parseLocalizedAmount } from '@/lib/money';
import { notify } from '@/lib/notifications';

import { createTransactionDefaults } from './transaction-editor-model';
import type { TransactionDraft, TransactionFormValues } from './transaction-editor-model';
import { TransactionAdditionalFields } from './TransactionAdditionalFields';
import { TransactionDetailsFields } from './TransactionDetailsFields';
import { TransactionKindFields } from './TransactionKindFields';
import { TransactionRecurrenceFields } from './TransactionRecurrenceFields';

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
    const tCategory = useTranslations('Movements.categoryEditor');
    const locale = useLocale();
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
    const [categoryEditorOpen, setCategoryEditorOpen] = useState(false);
    const form = useForm<TransactionFormValues>({ defaultValues: defaults, mode: 'onBlur' });
    const {
        control,
        handleSubmit,
        getValues,
        clearErrors,
        setError,
        setValue,
        formState: { errors, isSubmitting },
    } = form;
    const [kind, recurring] = useWatch({ control, name: ['kind', 'recurring'] });
    const isTransfer = kind === 'transfer';
    const unavailable = recurring || receipt !== undefined;
    const submitLabel = isSubmitting ? t('saving') : t('create');
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
                            <TransactionKindFields form={form} />
                            <TransactionDetailsFields
                                form={form}
                                id={id}
                                balanceWallets={balanceWallets}
                                categories={categories}
                                onAddCategory={() => setCategoryEditorOpen(true)}
                            />
                            <TransactionAdditionalFields
                                form={form}
                                id={id}
                                receipt={receipt}
                                onReceiptChange={setReceipt}
                            />
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
