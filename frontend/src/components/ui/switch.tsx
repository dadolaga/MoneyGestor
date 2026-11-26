import * as React from 'react';

import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const switchVariants = cva(
    'peer absolute inset-0 m-0 size-full cursor-pointer appearance-none rounded-full border border-transparent bg-input shadow-inner outline-none transition-colors duration-200 checked:bg-primary hover:bg-input/80 checked:hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50',
);

const switchContainerVariants = cva('relative inline-flex shrink-0 align-middle', {
    variants: {
        size: {
            sm: 'h-5 w-9',
            md: 'h-6 w-11',
            lg: 'h-7 w-12',
        },
    },
    defaultVariants: { size: 'md' },
});

const switchThumbVariants = cva(
    'pointer-events-none absolute left-0.5 top-1/2 block -translate-y-1/2 rounded-full bg-white shadow-sm transition-transform duration-200 peer-checked:translate-x-full peer-disabled:opacity-80 motion-reduce:transition-none',
    {
        variants: {
            size: {
                sm: 'size-4',
                md: 'size-5',
                lg: 'size-6',
            },
        },
        defaultVariants: { size: 'md' },
    },
);

export interface SwitchProps
    extends
        Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size' | 'type'>,
        VariantProps<typeof switchContainerVariants> {
    onCheckedChange?: (checked: boolean) => void;
}

const Switch = React.forwardRef<HTMLInputElement, SwitchProps>(
    ({ className, size, onChange, onCheckedChange, ...props }, ref) => (
        <span className={switchContainerVariants({ size })}>
            <input
                ref={ref}
                type="checkbox"
                role="switch"
                className={cn(switchVariants(), className)}
                onChange={(event) => {
                    onChange?.(event);
                    onCheckedChange?.(event.currentTarget.checked);
                }}
                {...props}
            />
            <span aria-hidden="true" className={switchThumbVariants({ size })} />
        </span>
    ),
);
Switch.displayName = 'Switch';

export { Switch, switchVariants };
