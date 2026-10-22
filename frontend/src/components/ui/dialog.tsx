'use client';

import * as React from 'react';

import { dialogContentMotion } from '@/components/ui/dialog-motion';
import { X } from '@/components/ui/icons';
import { Slot } from '@/components/ui/slot';
import { cn } from '@/lib/utils';

interface DialogProps {
    children: React.ReactNode;
    open?: boolean;
    defaultOpen?: boolean;
    onOpenChange?: (open: boolean) => void;
    role?: 'dialog' | 'alertdialog';
    dismissOnOutside?: boolean;
}

const DialogContext = React.createContext<{
    open: boolean;
    setOpen: (open: boolean) => void;
    titleId: string;
    descriptionId: string;
    contentId: string;
    role: 'dialog' | 'alertdialog';
    dismissOnOutside: boolean;
} | null>(null);

function useDialog() {
    const context = React.useContext(DialogContext);
    if (!context) throw new Error('Dialog components require a Dialog parent.');
    return context;
}

function Dialog({ children, open: controlledOpen, defaultOpen = false, onOpenChange, role = 'dialog', dismissOnOutside = true }: DialogProps) {
    const [internalOpen, setInternalOpen] = React.useState(defaultOpen);
    const id = React.useId();
    const open = controlledOpen ?? internalOpen;
    const setOpen = (nextOpen: boolean) => {
        if (controlledOpen === undefined) setInternalOpen(nextOpen);
        onOpenChange?.(nextOpen);
    };
    return (
        <DialogContext.Provider value={{ open, setOpen, titleId: `${id}-title`, descriptionId: `${id}-description`, contentId: `${id}-content`, role, dismissOnOutside }}>
            {children}
        </DialogContext.Provider>
    );
}

type DialogButtonProps = React.ComponentPropsWithoutRef<'button'> & { asChild?: boolean };

const DialogTrigger = React.forwardRef<HTMLButtonElement, DialogButtonProps>(
    ({ asChild, onClick, ...props }, ref) => {
        const dialog = useDialog();
        const Component = asChild ? Slot : 'button';
        return (
            <Component
                ref={ref}
                type="button"
                aria-haspopup="dialog"
                aria-expanded={dialog.open}
                aria-controls={dialog.contentId}
                onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
                    onClick?.(event);
                    if (!event.defaultPrevented) dialog.setOpen(true);
                }}
                {...props}
            />
        );
    },
);
DialogTrigger.displayName = 'DialogTrigger';

const DialogClose = React.forwardRef<HTMLButtonElement, DialogButtonProps>(
    ({ asChild, onClick, ...props }, ref) => {
        const dialog = useDialog();
        const Component = asChild ? Slot : 'button';
        return (
            <Component
                ref={ref}
                type="button"
                onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
                    onClick?.(event);
                    if (!event.defaultPrevented) dialog.setOpen(false);
                }}
                {...props}
            />
        );
    },
);
DialogClose.displayName = 'DialogClose';

type DialogSurfaceProps = React.ComponentPropsWithoutRef<'dialog'> & { onExitComplete?: () => void };

/** Native modal dialogs provide focus containment, background inertness and focus restoration. */
const DialogSurface = React.forwardRef<HTMLDialogElement, DialogSurfaceProps>(
    ({ children, onCancel, onClose, onPointerDown, onClick, onExitComplete, ...props }, forwardedRef) => {
        const { open, setOpen, titleId, descriptionId, contentId, role, dismissOnOutside } = useDialog();
        const ref = React.useRef<HTMLDialogElement>(null);
        const pointerStartedOutside = React.useRef(false);
        const [present, setPresent] = React.useState(open);
        const exitCompleteRef = React.useRef(onExitComplete);
        React.useImperativeHandle(forwardedRef, () => ref.current!);

        React.useLayoutEffect(() => { exitCompleteRef.current = onExitComplete; });

        React.useLayoutEffect(() => {
            const element = ref.current;
            if (!element) return;
            let cancelled = false;
            if (open && !element.open) {
                setPresent(true);
                element.showModal();
                element.querySelector<HTMLButtonElement>('[data-dialog-cancel]')?.focus();
            } else if (!open && element.open) {
                // Keep the native modal and its contents alive until the exit animation finishes.
                const animations = element.getAnimations({ subtree: true }).filter((animation) =>
                    animation.effect instanceof KeyframeEffect && animation.effect.target === element);
                void Promise.allSettled(animations.map((animation) => animation.finished)).then(() => {
                    if (cancelled) return;
                    element.close();
                    setPresent(false);
                    exitCompleteRef.current?.();
                });
            }
            return () => { cancelled = true; };
        }, [open]);

        React.useLayoutEffect(() => {
            const element = ref.current;
            return () => { if (element?.open) element.close(); };
        }, []);

        const isOutside = (event: React.MouseEvent<HTMLDialogElement>) => {
            const rect = event.currentTarget.getBoundingClientRect();
            return event.target === event.currentTarget &&
                (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom);
        };

        return (
            <dialog
                {...props}
                ref={ref}
                id={contentId}
                role={role}
                aria-modal="true"
                aria-labelledby={titleId}
                aria-describedby={descriptionId}
                data-slot="modal"
                data-state={open ? 'open' : 'closed'}
                onCancel={(event) => {
                    onCancel?.(event);
                    const shouldClose = !event.defaultPrevented;
                    event.preventDefault();
                    // The browser must not close a controlled dialog independently of React state.
                    if (shouldClose) setOpen(false);
                }}
                onClose={(event) => {
                    onClose?.(event);
                    if (!event.currentTarget.open && open) setOpen(false);
                }}
                onPointerDown={(event) => {
                    onPointerDown?.(event);
                    pointerStartedOutside.current = isOutside(event);
                }}
                onClick={(event) => {
                    onClick?.(event);
                    if (!event.defaultPrevented && dismissOnOutside && pointerStartedOutside.current && isOutside(event)) setOpen(false);
                }}
            >
                {!!(open || present) && children}
            </dialog>
        );
    },
);
DialogSurface.displayName = 'DialogSurface';

const DialogContent = React.forwardRef<HTMLDialogElement, DialogSurfaceProps & { closeLabel?: string }>(
    ({ className, children, closeLabel = 'Close', ...props }, ref) => (
        <DialogSurface
            ref={ref}
            className={cn(
                'fixed bottom-auto right-auto left-1/2 top-1/2 m-0 box-border flex h-auto min-h-0 max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 flex-col gap-4 overflow-hidden rounded-xl border border-border bg-popover p-6 text-popover-foreground shadow-lg outline-none backdrop:bg-foreground/20 backdrop:backdrop-blur-sm',
                dialogContentMotion,
                className,
            )}
            {...props}
        >
            {children}
            <DialogClose
                aria-label={closeLabel}
                className="absolute right-4 top-4 inline-flex size-8 cursor-pointer items-center justify-center rounded-md border-0 bg-transparent text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
                <X aria-hidden="true" className="size-4" />
            </DialogClose>
        </DialogSurface>
    ),
);
DialogContent.displayName = 'DialogContent';

function DialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
    return <div className={cn('flex shrink-0 flex-col space-y-2 text-center sm:text-left', className)} {...props} />;
}

function DialogBody({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
    return <div className={cn('min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain', className)} {...props} />;
}

function DialogFooter({ className, ...props }: React.HTMLAttributes<HTMLElement>) {
    return <footer className={cn('flex shrink-0 flex-col-reverse gap-2 sm:flex-row sm:justify-end', className)} {...props} />;
}

const DialogTitle = React.forwardRef<HTMLHeadingElement, React.ComponentPropsWithoutRef<'h2'>>(
    ({ className, ...props }, ref) => {
        const { titleId } = useDialog();
        return <h2 ref={ref} id={titleId} className={cn('m-0 text-lg font-semibold', className)} {...props} />;
    },
);
DialogTitle.displayName = 'DialogTitle';

const DialogDescription = React.forwardRef<HTMLParagraphElement, React.ComponentPropsWithoutRef<'p'>>(
    ({ className, ...props }, ref) => {
        const { descriptionId } = useDialog();
        return <p ref={ref} id={descriptionId} className={cn('m-0 text-sm text-muted-foreground', className)} {...props} />;
    },
);
DialogDescription.displayName = 'DialogDescription';

export { Dialog, DialogBody, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogSurface, DialogTitle, DialogTrigger };
