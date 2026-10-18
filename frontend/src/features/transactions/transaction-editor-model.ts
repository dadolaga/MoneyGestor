import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';

export type MovementKind = 'income' | 'expense' | 'transfer';
export type RecurrenceFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly';
export type MonthlyTiming = 'day' | 'lastDay' | 'weekday' | 'lastWeekday';

export interface TransactionFormValues {
    kind: MovementKind;
    amount: string;
    date: string;
    walletId: string;
    destinationWalletId: string;
    typeId: string;
    description: string;
    notes: string;
    recurring: boolean;
    frequency: RecurrenceFrequency;
    interval: string;
    weekdays: number[];
    monthlyTiming: MonthlyTiming;
    endType: 'never' | 'date' | 'count';
    endDate: string;
    count: string;
}

export interface TransactionDraft {
    values: TransactionFormValues;
    receipt?: File;
}

export function createTransactionDefaults(walletId?: number, typeId?: number): TransactionFormValues {
    return {
        kind: 'expense',
        amount: '',
        date: dayjs().format('YYYY-MM-DD'),
        walletId: walletId === undefined ? '' : String(walletId),
        destinationWalletId: '',
        typeId: typeId === undefined ? '' : String(typeId),
        description: '',
        notes: '',
        recurring: false,
        frequency: 'monthly',
        interval: '1',
        weekdays: [],
        monthlyTiming: 'day',
        endType: 'never',
        endDate: '',
        count: '12',
    };
}

export function isCalendarDate(value: string) {
    return /^\d{4}-\d{2}-\d{2}$/.test(value) && dayjs(value).isValid() && dayjs(value).format('YYYY-MM-DD') === value;
}

export function monthlyTimingForDate(timing: MonthlyTiming, date: Dayjs): MonthlyTiming {
    if (timing === 'lastDay' && date.date() !== date.daysInMonth()) return 'day';
    if (timing === 'lastWeekday' && date.add(7, 'day').month() === date.month()) return 'weekday';
    return timing;
}

/** A form preview only: these dates do not schedule or create financial records. */
export function recurrencePreview(values: TransactionFormValues, limit = 5): string[] {
    if (!isCalendarDate(values.date) || !/^[1-9]\d?$/.test(values.interval)) return [];
    if (values.endType === 'date' && !isCalendarDate(values.endDate)) return [];
    if (values.endType === 'count' && !/^[1-9]\d{0,2}$/.test(values.count)) return [];
    const start = dayjs(values.date);
    const interval = Number(values.interval);
    const count = values.endType === 'count' ? Math.min(limit, Number(values.count)) : limit;
    const dates: string[] = [];
    const weekdays = new Set([start.day(), ...values.weekdays]);
    const firstWeek = start.subtract((start.day() + 6) % 7, 'day');
    const timing = monthlyTimingForDate(values.monthlyTiming, start);

    function append(date: Dayjs) {
        if (values.endType === 'date' && date.isAfter(dayjs(values.endDate), 'day')) return false;
        dates.push(date.format('YYYY-MM-DD'));
        return true;
    }

    if (values.frequency === 'weekly') {
        for (let cursor = start; dates.length < count; cursor = cursor.add(1, 'day')) {
            const week = Math.floor(cursor.diff(firstWeek, 'day') / 7);
            if (week % interval === 0 && weekdays.has(cursor.day()) && !append(cursor)) break;
            if (values.endType === 'date' && cursor.isAfter(dayjs(values.endDate), 'day')) break;
        }
        return dates;
    }

    for (let index = 0; index < count; index++) {
        let date: Dayjs;
        if (values.frequency === 'daily') date = start.add(index * interval, 'day');
        else if (values.frequency === 'yearly') date = start.add(index * interval, 'year');
        else {
            const month = start.startOf('month').add(index * interval, 'month');
            date = month.date(Math.min(start.date(), month.daysInMonth()));
            if (timing === 'lastDay') date = month.endOf('month').startOf('day');
            if (timing === 'weekday') {
                const offset = (start.day() - month.day() + 7) % 7;
                date = month.add(offset + Math.floor((start.date() - 1) / 7) * 7, 'day');
                if (date.month() !== month.month()) date = date.subtract(7, 'day');
            }
            if (timing === 'lastWeekday') {
                const end = month.endOf('month').startOf('day');
                date = end.subtract((end.day() - start.day() + 7) % 7, 'day');
            }
        }
        if (!append(date)) break;
    }
    return dates;
}
