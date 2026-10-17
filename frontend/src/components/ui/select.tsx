'use client';

import * as React from 'react';

import { cn } from '@/lib/utils';

interface SelectProps extends React.ComponentPropsWithoutRef<'select'> {
    onValueChange?: (value: string) => void;
    placeholder?: string;
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
    ({ className, children, onChange, onValueChange, placeholder, ...props }, ref) => (
        <select
            ref={ref}
            className={cn('box-border h-10 w-full cursor-pointer rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&_option]:bg-popover [&_option]:text-popover-foreground', className)}
            onChange={(event) => {
                onChange?.(event);
                onValueChange?.(event.currentTarget.value);
            }}
            {...props}
        >
            {placeholder !== undefined && <option value="" disabled>{placeholder}</option>}
            {children}
        </select>
    ),
);
Select.displayName = 'Select';

export { Select };
