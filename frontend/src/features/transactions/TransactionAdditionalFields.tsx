'use client';

import { useTranslations } from 'next-intl';
import { Controller, useWatch } from 'react-hook-form';
import type { UseFormReturn } from 'react-hook-form';

import { SwitchField } from '@/components/shared/form-controls';
import { FormField, fieldAriaProps } from '@/components/shared/form-field';
import { FileText } from '@/components/ui/icons';

import type { TransactionFormValues } from './transaction-editor-model';

interface TransactionAdditionalFieldsProps {
    form: UseFormReturn<TransactionFormValues>;
    id: string;
    editing?: boolean;
}

export function TransactionAdditionalFields({ form, id, editing }: TransactionAdditionalFieldsProps) {
    const t = useTranslations('Movements.editor');
    const { control } = form;
    const notes = useWatch({ control, name: 'notes' });

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
                                maxLength={2000}
                                {...fieldAriaProps(`${id}-notes`, fieldState.error?.message)}
                            />
                            <span className="pointer-events-none absolute bottom-2 right-3 text-[11px] tabular-nums text-muted-foreground">
                                {notes.length}/2000
                            </span>
                        </div>
                    </FormField>
                )}
            />

            {!editing && <SwitchField
                control={control}
                name="recurring"
                disabled
                id={`${id}-recurring`}
                label={t('recurring')}
                description={t('recurringHint')}
            />}
        </>
    );
}
