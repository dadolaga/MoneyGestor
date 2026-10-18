'use client';

import { useTranslations } from 'next-intl';
import type { UseFormReturn } from 'react-hook-form';

import { ArrowDown, ArrowLeftRight, ArrowUp } from '@/components/ui/icons';
import { cn } from '@/lib/utils';

import type { MovementKind, TransactionFormValues } from './transaction-editor-model';

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

export function TransactionKindFields({ form }: { form: UseFormReturn<TransactionFormValues> }) {
    const t = useTranslations('Movements.editor');
    const tDialog = useTranslations('Movements.dialog');
    const tKinds = useTranslations('Movements.filters');
    const { register, clearErrors } = form;

    return (
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
                                <span className="text-[11px] text-muted-foreground">{t(`kindHints.${value}`)}</span>
                            </span>
                        </span>
                    </label>
                ))}
            </div>
        </fieldset>
    );
}
