'use client';

import * as React from 'react';

import { cn } from '@/lib/utils';

interface CheckboxProps extends Omit<React.ComponentPropsWithoutRef<'input'>, 'type'> {
    onCheckedChange?: (checked: boolean) => void;
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
    ({ className, onChange, onCheckedChange, ...props }, ref) => (
        <input
            ref={ref}
            type="checkbox"
            className={cn(
                'peer m-0 size-4 shrink-0 cursor-pointer rounded-sm accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
                className,
            )}
            onChange={(event) => {
                onChange?.(event);
                onCheckedChange?.(event.currentTarget.checked);
            }}
            {...props}
        />
    ),
);
Checkbox.displayName = 'Checkbox';

export { Checkbox };
