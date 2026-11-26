'use client';

import dayjs from 'dayjs';
import { useFormatter } from 'next-intl';

import { useCalendarDateFormatting } from '@/hooks/useCalendarDateFormatting';

export function useTransactionFormatting() {
    const format = useFormatter();
    const { formatDate, formatShortDate } = useCalendarDateFormatting();
    const money = (value: number) => format.number(value, { style: 'currency', currency: 'EUR' });
    const date = (value: string) => formatDate(dayjs(value).toDate());
    const shortDate = (value: string) => formatShortDate(dayjs(value).toDate());

    return { money, date, shortDate };
}
