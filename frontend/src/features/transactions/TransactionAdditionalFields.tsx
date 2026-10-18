'use client';

import { useRef, useState } from 'react';

import { useFormatter, useTranslations } from 'next-intl';
import { Controller, useWatch } from 'react-hook-form';
import type { UseFormReturn } from 'react-hook-form';

import { SwitchField } from '@/components/shared/form-controls';
import { FormField, fieldAriaProps } from '@/components/shared/form-field';
import { Button } from '@/components/ui/button';
import { FileText, Paperclip, Trash2 } from '@/components/ui/icons';

import type { TransactionFormValues } from './transaction-editor-model';

interface TransactionAdditionalFieldsProps {
    form: UseFormReturn<TransactionFormValues>;
    id: string;
    receipt?: File;
    onReceiptChange: (receipt?: File) => void;
}

export function TransactionAdditionalFields({ form, id, receipt, onReceiptChange }: TransactionAdditionalFieldsProps) {
    const t = useTranslations('Movements.editor');
    const format = useFormatter();
    const [receiptError, setReceiptError] = useState('');
    const receiptInput = useRef<HTMLInputElement>(null);
    const { control, clearErrors } = form;
    const notes = useWatch({ control, name: 'notes' });

    function receiptHandler(file?: File) {
        if (file === undefined) return;
        if (file.size === 0 || file.size > 10 * 1024 * 1024 || !/\.(pdf|jpe?g|png|webp)$/i.test(file.name)) {
            setReceiptError(t('invalidReceipt'));
            if (receiptInput.current !== null) receiptInput.current.value = '';
            return;
        }
        onReceiptChange(file);
        setReceiptError('');
        clearErrors('root');
    }

    return (
        <>
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
                            onReceiptChange(undefined);
                            if (receiptInput.current) receiptInput.current.value = '';
                        }}
                    >
                        <Trash2 aria-hidden="true" className="size-4" />
                    </Button>
                </div>
            )}
        </>
    );
}
