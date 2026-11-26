'use client';

import { useState } from 'react';

import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import type { FieldValues, UseControllerProps } from 'react-hook-form';
import { Controller } from 'react-hook-form';

import { FormField, fieldAriaProps } from '@/components/shared/form-field';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { FieldAdornment, FieldControl } from '@/components/ui/field-control';
import { CalendarIcon, ChevronDown } from '@/components/ui/icons';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface DateFieldProps<T extends FieldValues> extends UseControllerProps<T> {
    id?: string;
    label: string;
    description?: string;
    placeholder: string;
    todayLabel: string;
    previousMonthLabel: string;
    nextMonthLabel: string;
    formatDate: (date: Date) => string;
    formatMonth: (date: Date) => string;
    formatWeekday: (date: Date) => string;
}

function parseDate(value: unknown): Dayjs | undefined {
    if (typeof value !== 'string' || value.length === 0) return undefined;
    const parsed = dayjs(value);
    return parsed.isValid() ? parsed.startOf('day') : undefined;
}

/** A locale-aware Day.js field backed by the shared calendar, never by the browser date input. */
export function DateField<T extends FieldValues>({
    id: providedId,
    label,
    description,
    placeholder,
    todayLabel,
    previousMonthLabel,
    nextMonthLabel,
    formatDate,
    formatMonth,
    formatWeekday,
    ...controllerProps
}: DateFieldProps<T>) {
    const [open, setOpen] = useState(false);
    const id = providedId ?? String(controllerProps.name);

    return (
        <Controller
            {...controllerProps}
            render={({ field, fieldState }) => {
                const selected = parseDate(field.value);
                const error = fieldState.error?.message;
                const displayValue = selected === undefined ? placeholder : formatDate(selected.toDate());

                const selectDate = (date?: Date) => {
                    if (!date) return;
                    field.onChange(dayjs(date).format('YYYY-MM-DD'));
                    field.onBlur();
                    setOpen(false);
                };

                return (
                    <FormField id={id} label={label} description={description} error={error}>
                        <Popover
                            open={open}
                            onOpenChange={(nextOpen) => {
                                setOpen(nextOpen);
                                if (!nextOpen) field.onBlur();
                            }}
                        >
                            <FieldControl invalid={error !== undefined} disabled={controllerProps.disabled}>
                                <FieldAdornment position="start">
                                    <CalendarIcon aria-hidden="true" />
                                </FieldAdornment>
                                <PopoverTrigger asChild>
                                    <button
                                        ref={field.ref}
                                        id={id}
                                        type="button"
                                        disabled={controllerProps.disabled}
                                        className={cn(
                                            'flex h-full min-w-0 flex-1 cursor-pointer items-center border-0 bg-transparent p-0 text-left text-sm text-foreground outline-none',
                                            !selected && 'text-muted-foreground',
                                        )}
                                        {...fieldAriaProps(id, error, description)}
                                    >
                                        <span className="truncate">
                                            {displayValue}
                                        </span>
                                    </button>
                                </PopoverTrigger>
                                <FieldAdornment position="end">
                                    <ChevronDown aria-hidden="true" className="size-4" />
                                </FieldAdornment>
                            </FieldControl>

                            <PopoverContent
                                revealFromInput
                                className="w-auto overflow-x-hidden overflow-y-auto rounded-2xl border-border/80 bg-popover p-0 shadow-2xl"
                                align="start"
                                sideOffset={8}
                            >
                                <div className="border-b border-border bg-muted/30 px-4 py-3">
                                    <p className="m-0 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                        {label}
                                    </p>
                                    <p className="m-0 mt-1 text-base font-semibold">
                                        {displayValue}
                                    </p>
                                </div>
                                <Calendar
                                    appearance="spacious"
                                    mode="single"
                                    selected={selected?.toDate()}
                                    defaultMonth={selected?.toDate()}
                                    onSelect={selectDate}
                                    formatters={{
                                        formatCaption: formatMonth,
                                        formatWeekdayName: formatWeekday,
                                    }}
                                    labels={{
                                        labelDayButton: formatDate,
                                        labelPrevious: () => previousMonthLabel,
                                        labelNext: () => nextMonthLabel,
                                    }}
                                />
                                <div className="border-t border-border p-2">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="w-full justify-center"
                                        onClick={() => selectDate(dayjs().startOf('day').toDate())}
                                    >
                                        {todayLabel}
                                    </Button>
                                </div>
                            </PopoverContent>
                        </Popover>
                    </FormField>
                );
            }}
        />
    );
}
