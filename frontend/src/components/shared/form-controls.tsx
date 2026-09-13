'use client';

import type { ComponentProps, ReactNode } from 'react';

import { Controller, type FieldValues, type UseControllerProps } from 'react-hook-form';

import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FormField, fieldAriaProps } from '@/components/shared/form-field';
import { parseLocalizedAmount } from '@/lib/money';

type ControlledProps<T extends FieldValues> = UseControllerProps<T> & { label: string; description?: string };

export function TextField<T extends FieldValues>({
    label,
    description,
    ...props
}: ControlledProps<T> & Omit<ComponentProps<typeof Input>, 'name'>) {
    const id = String(props.name);
    return (
        <Controller
            {...props}
            render={({ field, fieldState }) => (
                <FormField id={id} label={label} description={description} error={fieldState.error?.message}>
                    <Input {...field} {...fieldAriaProps(id, fieldState.error?.message, description)} />
                </FormField>
            )}
        />
    );
}

export function PasswordField<T extends FieldValues>(
    props: ControlledProps<T> & Omit<ComponentProps<typeof Input>, 'name' | 'type'>,
) {
    return <TextField {...props} type="password" autoComplete="current-password" />;
}

export function AmountField<T extends FieldValues>({
    label,
    description,
    locale,
    ...props
}: ControlledProps<T> & Omit<ComponentProps<typeof Input>, 'name' | 'inputMode'> & { locale: string }) {
    const id = String(props.name);
    return (
        <Controller
            {...props}
            render={({ field, fieldState }) => (
                <FormField id={id} label={label} description={description} error={fieldState.error?.message}>
                    <Input
                        {...field}
                        value={field.value ?? ''}
                        inputMode="decimal"
                        {...fieldAriaProps(id, fieldState.error?.message, description)}
                        onChange={(event) => field.onChange(event.target.value)}
                        onBlur={() => {
                            const amount = parseLocalizedAmount(String(field.value ?? ''), locale);
                            if (amount !== undefined) field.onChange(amount);
                            field.onBlur();
                        }}
                    />
                </FormField>
            )}
        />
    );
}

export function CheckboxField<T extends FieldValues>({ label, description, ...props }: ControlledProps<T>) {
    const id = String(props.name);
    return (
        <Controller
            {...props}
            render={({ field, fieldState }) => (
                <div className="grid gap-2">
                    <div className="flex items-center gap-2">
                        <Checkbox
                            id={id}
                            checked={Boolean(field.value)}
                            onCheckedChange={field.onChange}
                            aria-invalid={Boolean(fieldState.error)}
                        />
                        <label htmlFor={id} className="text-sm font-medium leading-none">
                            {label}
                        </label>
                    </div>
                    {description ? <p className="m-0 text-sm text-muted-foreground">{description}</p> : null}
                    {fieldState.error ? (
                        <p role="alert" className="m-0 text-sm text-destructive">
                            {fieldState.error.message}
                        </p>
                    ) : null}
                </div>
            )}
        />
    );
}

export interface SelectOption {
    value: string;
    label: ReactNode;
}
export function SelectField<T extends FieldValues>({
    label,
    description,
    options,
    placeholder,
    ...props
}: ControlledProps<T> & { options: SelectOption[]; placeholder: string }) {
    const id = String(props.name);
    return (
        <Controller
            {...props}
            render={({ field, fieldState }) => (
                <FormField id={id} label={label} description={description} error={fieldState.error?.message}>
                    <Select value={field.value ?? ''} onValueChange={field.onChange}>
                        <SelectTrigger id={id} {...fieldAriaProps(id, fieldState.error?.message, description)}>
                            <SelectValue placeholder={placeholder} />
                        </SelectTrigger>
                        <SelectContent>
                            {options.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </FormField>
            )}
        />
    );
}
