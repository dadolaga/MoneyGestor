'use client';

import * as React from 'react';

import { useLocale } from 'next-intl';
import { DayPicker } from 'react-day-picker';

import { buttonVariants } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from '@/components/ui/icons';
import { cn } from '@/lib/utils';

export type CalendarProps = React.ComponentProps<typeof DayPicker> & {
    appearance?: 'compact' | 'spacious';
};

function Calendar({ className, classNames, showOutsideDays = true, appearance = 'compact', ...props }: CalendarProps) {
    const locale = useLocale();
    const spacious = appearance === 'spacious';

    return (
        <DayPicker
            showOutsideDays={showOutsideDays}
            weekStartsOn={locale === 'it' ? 1 : 0}
            className={cn('relative', spacious ? 'p-3 sm:p-4' : 'p-3', className)}
            classNames={{
                months: cn('flex flex-col', spacious ? 'gap-6 sm:flex-row sm:gap-8' : 'gap-4 sm:flex-row'),
                month: 'space-y-4',
                month_caption: cn(
                    'relative flex items-center justify-center',
                    spacious ? 'h-9 px-10' : 'pt-1',
                ),
                caption_label: cn(spacious ? 'text-base font-bold tracking-tight' : 'text-sm font-medium'),
                nav: cn(
                    'flex items-center',
                    spacious ? 'absolute inset-x-3 top-3 z-10 justify-between sm:inset-x-4 sm:top-4' : 'space-x-1',
                ),
                button_previous: cn(
                    buttonVariants({ variant: spacious ? 'ghost' : 'outline', size: 'icon' }),
                    spacious
                        ? 'size-9 bg-transparent p-0 text-muted-foreground hover:bg-muted hover:text-foreground'
                        : 'size-7 bg-transparent p-0 opacity-60 hover:opacity-100',
                ),
                button_next: cn(
                    buttonVariants({ variant: spacious ? 'ghost' : 'outline', size: 'icon' }),
                    spacious
                        ? 'size-9 bg-transparent p-0 text-muted-foreground hover:bg-muted hover:text-foreground'
                        : 'size-7 bg-transparent p-0 opacity-60 hover:opacity-100',
                ),
                month_grid: 'w-full border-collapse space-y-1',
                weekdays: cn('flex', spacious && 'gap-1'),
                weekday: cn(
                    'rounded-md font-normal text-muted-foreground',
                    spacious ? 'w-9 text-xs sm:w-10 sm:text-sm' : 'w-9 text-[0.8rem]',
                ),
                week: cn('flex w-full', spacious ? 'mt-1 gap-1' : 'mt-2'),
                day: cn(
                    'relative p-0 text-center focus-within:relative focus-within:z-20',
                    spacious ? 'size-9 text-sm sm:size-10' : 'size-9 text-sm',
                ),
                day_button: cn(
                    buttonVariants({ variant: 'ghost', size: 'icon' }),
                    spacious
                        ? 'size-9 rounded-lg bg-muted/65 p-0 font-medium shadow-sm hover:bg-accent sm:size-10'
                        : 'size-9 p-0 font-normal aria-selected:opacity-100',
                ),
                selected: spacious
                    ? '[&>button]:bg-primary [&>button]:text-primary-foreground [&>button]:shadow-md [&>button]:shadow-primary/25 hover:[&>button]:bg-primary/90'
                    : 'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground',
                today: spacious
                    ? '[&>button]:ring-2 [&>button]:ring-ring [&>button]:ring-offset-2 [&>button]:ring-offset-popover'
                    : 'bg-accent text-accent-foreground',
                range_start: spacious
                    ? '[&>button]:bg-primary [&>button]:text-primary-foreground'
                    : undefined,
                range_middle: spacious
                    ? '[&>button]:rounded-md [&>button]:!bg-primary/20 [&>button]:!text-foreground'
                    : undefined,
                range_end: spacious
                    ? '[&>button]:!bg-primary [&>button]:!text-primary-foreground'
                    : undefined,
                outside: cn('text-muted-foreground opacity-50', spacious && '[&>button]:bg-muted/30'),
                disabled: 'text-muted-foreground opacity-50',
                hidden: 'invisible',
                ...classNames,
            }}
            components={{
                Chevron: ({ orientation }) =>
                    orientation === 'left' ? (
                        <ChevronLeft className={cn(spacious ? 'size-5' : 'size-4')} />
                    ) : (
                        <ChevronRight className={cn(spacious ? 'size-5' : 'size-4')} />
                    ),
            }}
            {...props}
        />
    );
}

Calendar.displayName = 'Calendar';

export { Calendar };
