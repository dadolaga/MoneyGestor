'use client';

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
}: ConfirmDeleteDialogProps<T>) {
    if (item === undefined) return null;
    return (
        <AlertDialog open onOpenChange={onOpenChange}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{title}</AlertDialogTitle>
                    <AlertDialogDescription>
                        {typeof description === 'function' ? description(item) : description}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={pending}>{cancelLabel}</AlertDialogCancel>
                    <AlertDialogAction
                        disabled={pending}
                        onClick={(event) => {
                            event.preventDefault();
                            void onConfirm(item);
                        }}
                    >
                        {confirmLabel}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
