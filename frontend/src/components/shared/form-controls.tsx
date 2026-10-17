'use client';

import type { ComponentProps, ReactNode } from 'react';

import { Controller, type ControllerRenderProps, type FieldValues, type UseControllerProps } from 'react-hook-form';

import { FormField, fieldAriaProps } from '@/components/shared/form-field';
import { Checkbox } from '@/components/ui/checkbox';
import { FieldAdornment, FieldControl, fieldControlInputClassName } from '@/components/ui/field-control';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Switch, type SwitchProps } from '@/components/ui/switch';
import { parseLocalizedAmount } from '@/lib/money';
import { cn } from '@/lib/utils';

type ControlledProps<T extends FieldValues> = UseControllerProps<T> & {
    id?: string;
    label: ReactNode;
    description?: string;
};

type NativeInputProps = Omit<
    ComponentProps<typeof Input>,
    'defaultValue' | 'disabled' | 'name' | 'onBlur' | 'onChange' | 'ref' | 'value'
>;

export interface SelectOption {
    value: string;
    label: ReactNode;
    disabled?: boolean;
}

export type InputFieldProps<T extends FieldValues> = ControlledProps<T> &
    NativeInputProps & {
        kind?: 'text' | 'password' | 'amount' | 'select';
        startAdornment?: ReactNode;
        endAdornment?: ReactNode;
        locale?: string;
        options?: SelectOption[];
    };

/** A single API for text, password, amount and select fields. */
export function InputField<T extends FieldValues>({
    id: providedId,
    label,
    description,
    kind = 'text',
    startAdornment,
    endAdornment,
    locale,
    options = [],
    control,
    name,
    rules,
    shouldUnregister,
    defaultValue,
    disabled,
    className,
    ...inputProps
}: InputFieldProps<T>) {
    const id = providedId ?? String(name);
    const inputType = kind === 'password' ? 'password' : inputProps.type;
    const inputMode = kind === 'amount' ? 'decimal' : inputProps.inputMode;

    const renderInput = (field: ControllerRenderProps<T>, error?: string) => (
        <FieldControl invalid={error !== undefined} disabled={disabled} className={className}>
            {startAdornment !== undefined && <FieldAdornment position="start">{startAdornment}</FieldAdornment>}
            <Input
                {...inputProps}
                {...field}
                id={id}
                type={inputType}
                disabled={disabled}
                value={field.value ?? ''}
                inputMode={inputMode}
                className={fieldControlInputClassName}
                {...fieldAriaProps(id, error, description)}
                onChange={(event) => field.onChange(event.target.value)}
                onBlur={() => {
                    if (kind === 'amount') {
                        const amount = parseLocalizedAmount(String(field.value ?? ''), locale ?? 'en');
                        if (amount !== undefined) field.onChange(amount);
                    }
                    field.onBlur();
                }}
            />
            {endAdornment !== undefined && <FieldAdornment position="end">{endAdornment}</FieldAdornment>}
        </FieldControl>
    );

    const renderControl = (field: ControllerRenderProps<T>, error?: string) => {
        if (kind !== 'select') return renderInput(field, error);

        const selectValue = field.value == null ? '' : String(field.value);
        return (
            <FieldControl invalid={error !== undefined} disabled={disabled} className={className}>
                {startAdornment !== undefined && <FieldAdornment position="start">{startAdornment}</FieldAdornment>}
                <Select
                    ref={field.ref}
                    id={id}
                    value={selectValue}
                    name={field.name}
                    disabled={disabled}
                    onValueChange={field.onChange}
                    onBlur={field.onBlur}
                    placeholder={inputProps.placeholder}
                    className={fieldControlInputClassName}
                    {...fieldAriaProps(id, error, description)}
                >
                    {options.map((option) => (
                        <option key={option.value} value={option.value} disabled={option.disabled}>
                            {option.label}
                        </option>
                    ))}
                </Select>
                {endAdornment !== undefined && <FieldAdornment position="end">{endAdornment}</FieldAdornment>}
            </FieldControl>
        );
    };

    return (
        <Controller
            control={control}
            name={name}
            rules={rules}
            shouldUnregister={shouldUnregister}
            defaultValue={defaultValue}
            disabled={disabled}
            render={({ field, fieldState }) => (
                <FormField id={id} label={label} description={description} error={fieldState.error?.message}>
                    {renderControl(field, fieldState.error?.message)}
                </FormField>
            )}
        />
    );
}

export function CheckboxField<T extends FieldValues>({
    label,
    description,
    id: providedId,
    ...props
}: ControlledProps<T>) {
    const id = providedId ?? String(props.name);
    return (
        <Controller
            {...props}
            render={({ field, fieldState }) => (
                <div className="grid gap-2">
                    <div className="flex items-center gap-2">
                        <Checkbox
                            id={id}
                            checked={Boolean(field.value)}
                            disabled={props.disabled}
                            onCheckedChange={field.onChange}
                            aria-invalid={Boolean(fieldState.error)}
                        />
                        <label htmlFor={id} className="text-sm font-medium leading-none">
                            {label}
                        </label>
                    </div>
                    {description !== undefined && (
                        <p className="m-0 text-sm text-muted-foreground">{String(description)}</p>
                    )}
                    {fieldState.error !== undefined && (
                        <p role="alert" className="m-0 text-sm text-destructive">
                            {String(fieldState.error.message)}
                        </p>
                    )}
                </div>
            )}
        />
    );
}

export function SwitchField<T extends FieldValues>({
    label,
    description,
    id: providedId,
    size = 'md',
    className,
    ...props
}: ControlledProps<T> & { size?: SwitchProps['size']; className?: string }) {
    const id = providedId ?? String(props.name);
    return (
        <Controller
            {...props}
            render={({ field, fieldState }) => (
                <div className={cn('flex items-start gap-3', className)}>
                    <Switch
                        id={id}
                        size={size}
                        checked={Boolean(field.value)}
                        disabled={props.disabled}
                        onCheckedChange={field.onChange}
                        {...fieldAriaProps(id, fieldState.error?.message, description)}
                    />
                    <div className="grid min-w-0 gap-1">
                        <label htmlFor={id} className="cursor-pointer text-sm font-semibold leading-6">
                            {label}
                        </label>
                        {description !== undefined && (
                            <p id={`${id}-description`} className="m-0 text-sm leading-5 text-muted-foreground">
                                {String(description)}
                            </p>
                        )}
                        {fieldState.error !== undefined && (
                            <p id={`${id}-error`} role="alert" className="m-0 text-sm text-destructive">
                                {String(fieldState.error.message)}
                            </p>
                        )}
                    </div>
                </div>
            )}
        />
    );
}
