'use client';

import * as React from 'react';

import * as DialogPrimitive from 'radix-ui/dialog';

import { X } from '@/components/ui/icons';
import { cn } from '@/lib/utils';

const Sheet = DialogPrimitive.Root;
const SheetTrigger = DialogPrimitive.Trigger;
const SheetClose = DialogPrimitive.Close;

const SheetContent = React.forwardRef<
    React.ElementRef<typeof DialogPrimitive.Content>,
    React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & { side?: 'top' | 'right' | 'bottom' | 'left' }
>(({ className, children, side = 'right', ...props }, ref) => (
    <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-foreground/20" />
        <DialogPrimitive.Content
            ref={ref}
            className={cn(
                'fixed z-50 flex flex-col gap-4 bg-background p-6 shadow-lg',
                side === 'left' && 'inset-y-0 left-0 w-3/4 max-w-sm border-r border-border',
                side === 'right' && 'inset-y-0 right-0 w-3/4 max-w-sm border-l border-border',
                side === 'top' && 'inset-x-0 top-0 border-b border-border',
                side === 'bottom' && 'inset-x-0 bottom-0 border-t border-border',
                className,
            )}
            {...props}
        >
            {children}
            <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <X className="size-4" />
                <span className="sr-only">Close</span>
            </DialogPrimitive.Close>
        </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
));
SheetContent.displayName = DialogPrimitive.Content.displayName;

function SheetHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
    return <div className={cn('flex flex-col space-y-2 text-left', className)} {...props} />;
}
const SheetTitle = DialogPrimitive.Title;
const SheetDescription = DialogPrimitive.Description;

export { Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger };
