'use client';

import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import { CalendarIcon } from 'lucide-react';
import type { DateRange } from 'react-day-picker';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

export interface DayjsDateRange {
    start?: Dayjs;
    end?: Dayjs;
}
interface DateRangeFieldProps {
    value?: DayjsDateRange;
    onChange: (value: DayjsDateRange) => void;
    placeholder: string;
    formatDate: (date: Date) => string;
    disabled?: boolean;
}

const toDate = (value?: Dayjs) => value?.toDate();
const toDayjs = (value?: Date) => (value ? dayjs(value).startOf('day') : undefined);

/** The calendar boundary speaks Date; consumers receive Day.js values only. */
export function DateRangeField({ value, onChange, placeholder, formatDate, disabled }: DateRangeFieldProps) {
    const selection: DateRange | undefined = value ? { from: toDate(value.start), to: toDate(value.end) } : undefined;
    const label = value?.start
        ? `${formatDate(toDate(value.start)!)}${value.end ? ` – ${formatDate(toDate(value.end)!)}` : ''}`
        : placeholder;
    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button
                    type="button"
                    variant="outline"
                    className={cn('w-full justify-start font-normal', !value?.start && 'text-muted-foreground')}
                    disabled={disabled}
                >
                    <CalendarIcon className="mr-2 size-4" />
                    {label}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                    mode="range"
                    selected={selection}
                    onSelect={(range) => onChange({ start: toDayjs(range?.from), end: toDayjs(range?.to) })}
                    numberOfMonths={2}
                />
            </PopoverContent>
        </Popover>
    );
}
