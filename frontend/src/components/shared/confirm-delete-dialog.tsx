'use client';

import { useState } from 'react';

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface ConfirmDeleteDialogProps<T> {
    item?: T;
    title: string;
    description: string | ((item: T) => string);
    cancelLabel: string;
    confirmLabel: string;
    onOpenChange: (open: boolean) => void;
    onConfirm: (item: T) => void | Promise<void>;
    pending?: boolean;
    error?: string;
}
export function ConfirmDeleteDialog<T>({
    item,
    title,
    description,
    cancelLabel,
    confirmLabel,
    onOpenChange,
    onConfirm,
    pending,
    error,
}: ConfirmDeleteDialogProps<T>) {
    const [retainedItem, setRetainedItem] = useState(() => item);
    if (item !== undefined && item !== retainedItem) setRetainedItem(() => item);
    const displayedItem = item ?? retainedItem;
    if (displayedItem === undefined) return null;
    const resolvedDescription = typeof description === 'function' ? description(displayedItem) : description;

    return (
        <AlertDialog open={item !== undefined} onOpenChange={onOpenChange}>
            <AlertDialogContent onExitComplete={() => setRetainedItem(undefined)}>
                <AlertDialogHeader>
                    <AlertDialogTitle>{title}</AlertDialogTitle>
                    <AlertDialogDescription>{resolvedDescription}</AlertDialogDescription>
                    {!!error && (
                        <p role="alert" className="m-0 text-sm text-destructive">
                            {error}
                        </p>
                    )}
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={pending}>{cancelLabel}</AlertDialogCancel>
                    <AlertDialogAction
                        disabled={pending}
                        onClick={(event) => {
                            event.preventDefault();
                            if (item !== undefined) void onConfirm(item);
                        }}
                    >
                        {confirmLabel}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
