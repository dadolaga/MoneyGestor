import type { ComponentProps, ReactNode } from 'react';

import { cn } from '@/lib/utils';

interface FieldControlProps extends ComponentProps<'div'> {
    invalid?: boolean;
    disabled?: boolean;
}

function FieldControl({ className, invalid = false, disabled = false, ...props }: FieldControlProps) {
    return (
        <div
            data-disabled={disabled || undefined}
            data-invalid={invalid || undefined}
            className={cn(
                'box-border flex h-10 w-full items-center gap-2 rounded-md border border-input bg-background px-3 text-sm text-foreground transition-shadow',
                'focus-within:outline-none focus-within:ring-2 focus-within:ring-ring',
                'data-[invalid=true]:border-destructive data-[disabled=true]:cursor-not-allowed data-[disabled=true]:opacity-50',
                className,
            )}
            {...props}
        />
    );
}

interface FieldAdornmentProps extends ComponentProps<'span'> {
    position: 'start' | 'end';
    children: ReactNode;
}

function FieldAdornment({ position, className, children, ...props }: FieldAdornmentProps) {
    return (
        <span
            data-position={position}
            className={cn(
                'flex shrink-0 items-center justify-center text-muted-foreground [&_svg]:size-4',
                position === 'end' && 'text-xs tabular-nums',
                className,
            )}
            {...props}
        >
            {children}
        </span>
    );
}

const fieldControlInputClassName =
    'h-full w-auto min-w-0 flex-1 rounded-none border-0 bg-transparent px-0 py-2 shadow-none focus:outline-none focus:ring-0 focus-visible:ring-0 disabled:cursor-not-allowed disabled:opacity-100';

export { FieldAdornment, FieldControl, fieldControlInputClassName };
