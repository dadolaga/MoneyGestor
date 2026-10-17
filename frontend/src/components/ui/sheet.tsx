'use client';

import * as React from 'react';

import { Dialog, DialogClose, DialogDescription, DialogHeader, DialogSurface, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { X } from '@/components/ui/icons';
import { cn } from '@/lib/utils';

const Sheet = Dialog;
const SheetTrigger = DialogTrigger;
const SheetClose = DialogClose;
const SheetHeader = DialogHeader;
const SheetTitle = DialogTitle;
const SheetDescription = DialogDescription;

const SheetContent = React.forwardRef<
    HTMLDialogElement,
    React.ComponentPropsWithoutRef<typeof DialogSurface> & { side?: 'top' | 'right' | 'bottom' | 'left'; closeLabel?: string }
>(({ className, children, side = 'right', closeLabel = 'Close', ...props }, ref) => (
    <DialogSurface
        ref={ref}
        className={cn(
            'fixed m-0 box-border flex max-h-dvh max-w-none flex-col gap-4 overflow-y-auto border-0 bg-background p-6 text-foreground shadow-lg outline-none backdrop:bg-foreground/20',
            side === 'left' && 'inset-y-0 left-0 right-auto h-dvh w-3/4 max-w-sm border-r border-border',
            side === 'right' && 'inset-y-0 left-auto right-0 h-dvh w-3/4 max-w-sm border-l border-border',
            side === 'top' && 'inset-x-0 top-0 bottom-auto w-full border-b border-border',
            side === 'bottom' && 'inset-x-0 top-auto bottom-0 w-full border-t border-border',
            className,
        )}
        {...props}
    >
        {children}
        <DialogClose aria-label={closeLabel} className="absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <X aria-hidden="true" className="size-4" />
        </DialogClose>
    </DialogSurface>
));
SheetContent.displayName = 'SheetContent';

export { Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger };
