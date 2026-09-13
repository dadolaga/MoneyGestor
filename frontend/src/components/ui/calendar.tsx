'use client';

import * as React from 'react';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { DayPicker } from 'react-day-picker';

import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({ className, classNames, showOutsideDays = true, ...props }: CalendarProps) {
    return (
        <DayPicker
            showOutsideDays={showOutsideDays}
            className={cn('p-3', className)}
            classNames={{
                months: 'flex flex-col sm:flex-row gap-4',
                month: 'space-y-4',
                month_caption: 'flex justify-center pt-1 relative items-center',
                caption_label: 'text-sm font-medium',
                nav: 'space-x-1 flex items-center',
                button_previous: cn(buttonVariants({ variant: 'outline', size: 'icon' }), 'size-7 bg-transparent p-0 opacity-60 hover:opacity-100'),
                button_next: cn(buttonVariants({ variant: 'outline', size: 'icon' }), 'size-7 bg-transparent p-0 opacity-60 hover:opacity-100'),
                month_grid: 'w-full border-collapse space-y-1',
                weekdays: 'flex',
                weekday: 'w-9 rounded-md text-[0.8rem] font-normal text-muted-foreground',
                week: 'mt-2 flex w-full',
                day: 'relative size-9 p-0 text-center text-sm focus-within:relative focus-within:z-20',
                day_button: cn(buttonVariants({ variant: 'ghost', size: 'icon' }), 'size-9 p-0 font-normal aria-selected:opacity-100'),
                selected: 'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground',
                today: 'bg-accent text-accent-foreground',
                outside: 'text-muted-foreground opacity-50',
                disabled: 'text-muted-foreground opacity-50',
                hidden: 'invisible',
                ...classNames,
            }}
            components={{ Chevron: ({ orientation }) => orientation === 'left' ? <ChevronLeft className="size-4" /> : <ChevronRight className="size-4" /> }}
            {...props}
        />
    );
}

Calendar.displayName = 'Calendar';

export { Calendar };
