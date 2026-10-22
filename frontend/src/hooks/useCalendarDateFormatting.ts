'use client';

import { useMemo } from 'react';

import { useLocale } from 'next-intl';

/** Calendar dates use local day/month/year, without the server's time zone conversion. */
export function useCalendarDateFormatting() {
    const locale = useLocale();

    return useMemo(() => {
        const date = new Intl.DateTimeFormat(locale, { day: '2-digit', month: 'short', year: 'numeric' });
        const shortDate = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' });
        const month = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' });
        const weekday = new Intl.DateTimeFormat(locale, { weekday: 'short' });

        return {
            formatDate: (value: Date) => date.format(value),
            formatShortDate: (value: Date) => shortDate.format(value),
            formatMonth: (value: Date) => month.format(value),
            formatWeekday: (value: Date) => weekday.format(value),
        };
    }, [locale]);
}
