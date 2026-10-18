'use client';

import dayjs from 'dayjs';
import { useFormatter } from 'next-intl';

export function useTransactionFormatting() {
    const format = useFormatter();
    const money = (value: number) => format.number(value, { style: 'currency', currency: 'EUR' });
    const date = (value: string) =>
        format.dateTime(dayjs(value).toDate(), { day: '2-digit', month: 'short', year: 'numeric' });

    return { money, date };
}
