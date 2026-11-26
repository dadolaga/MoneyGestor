'use client';

import * as React from 'react';

import { buttonVariants } from '@/components/ui/button';
import {
    Dialog, DialogClose, DialogDescription, DialogFooter, DialogHeader, DialogSurface, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { dialogContentMotion } from '@/components/ui/dialog-motion';
import { cn } from '@/lib/utils';

function AlertDialog(props: React.ComponentProps<typeof Dialog>) {
    return <Dialog {...props} role="alertdialog" dismissOnOutside={false} />;
}

const AlertDialogTrigger = DialogTrigger;
const AlertDialogTitle = DialogTitle;
const AlertDialogDescription = DialogDescription;
const AlertDialogHeader = DialogHeader;
const AlertDialogFooter = DialogFooter;

const AlertDialogCancel = React.forwardRef<HTMLButtonElement, React.ComponentPropsWithoutRef<typeof DialogClose>>(
    ({ className, ...props }, ref) => (
        <DialogClose ref={ref} data-dialog-cancel="" className={cn(buttonVariants({ variant: 'outline' }), className)} {...props} />
    ),
);
AlertDialogCancel.displayName = 'AlertDialogCancel';

const AlertDialogAction = React.forwardRef<HTMLButtonElement, React.ComponentPropsWithoutRef<typeof DialogClose>>(
    ({ className, ...props }, ref) => (
        <DialogClose ref={ref} className={cn(buttonVariants(), className)} {...props} />
    ),
);
AlertDialogAction.displayName = 'AlertDialogAction';

const AlertDialogContent = React.forwardRef<HTMLDialogElement, React.ComponentPropsWithoutRef<typeof DialogSurface>>(
    ({ className, ...props }, ref) => (
        <DialogSurface
            ref={ref}
            className={cn(
                'fixed bottom-auto right-auto left-1/2 top-1/2 m-0 box-border grid max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 gap-4 overflow-y-auto rounded-xl border border-border bg-popover p-6 text-popover-foreground shadow-lg outline-none backdrop:bg-foreground/20 backdrop:backdrop-blur-sm',
                dialogContentMotion,
                className,
            )}
            {...props}
        />
    ),
);
AlertDialogContent.displayName = 'AlertDialogContent';

export { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger };
