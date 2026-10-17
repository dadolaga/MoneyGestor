'use client';

import * as React from 'react';

import { Slot } from '@/components/ui/slot';
import { cn } from '@/lib/utils';

const PopoverContext = React.createContext<{
    open: boolean;
    setOpen: (open: boolean) => void;
    triggerRef: React.RefObject<HTMLButtonElement | null>;
    triggerId: string;
    contentId: string;
} | null>(null);

function usePopover() {
    const context = React.useContext(PopoverContext);
    if (!context) throw new Error('Popover components require a Popover parent.');
    return context;
}

function Popover({ children, open: controlledOpen, defaultOpen = false, onOpenChange }: {
    children: React.ReactNode;
    open?: boolean;
    defaultOpen?: boolean;
    onOpenChange?: (open: boolean) => void;
}) {
    const [internalOpen, setInternalOpen] = React.useState(defaultOpen);
    const triggerRef = React.useRef<HTMLButtonElement>(null);
    const id = React.useId();
    const setOpen = (nextOpen: boolean) => {
        if (controlledOpen === undefined) setInternalOpen(nextOpen);
        onOpenChange?.(nextOpen);
    };
    return (
        <PopoverContext.Provider value={{ open: controlledOpen ?? internalOpen, setOpen, triggerRef, triggerId: `${id}-trigger`, contentId: `${id}-content` }}>
            {children}
        </PopoverContext.Provider>
    );
}

const PopoverTrigger = React.forwardRef<HTMLButtonElement, React.ComponentPropsWithoutRef<'button'> & { asChild?: boolean }>(
    ({ asChild, onClick, ...props }, forwardedRef) => {
        const { open, setOpen, triggerRef, triggerId, contentId } = usePopover();
        const Component = asChild ? Slot : 'button';
        return (
            <Component
                type="button"
                id={triggerId}
                aria-haspopup="dialog"
                aria-expanded={open}
                aria-controls={contentId}
                {...props}
                ref={(element: HTMLButtonElement | null) => {
                    triggerRef.current = element;
                    if (typeof forwardedRef === 'function') forwardedRef(element);
                    else if (forwardedRef) forwardedRef.current = element;
                }}
                onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
                    onClick?.(event);
                    if (!event.defaultPrevented) setOpen(!open);
                }}
            />
        );
    },
);
PopoverTrigger.displayName = 'PopoverTrigger';

interface PopoverContentProps extends React.ComponentPropsWithoutRef<'div'> {
    align?: 'start' | 'center' | 'end';
    sideOffset?: number;
}

/** The browser top layer keeps calendar popups visible inside modal dialogs. */
const PopoverContent = React.forwardRef<HTMLDivElement, PopoverContentProps>(
    ({ className, children, align = 'center', sideOffset = 4, style, onToggle, onKeyDown, ...props }, forwardedRef) => {
        const { open, setOpen, triggerRef, triggerId, contentId } = usePopover();
        const ref = React.useRef<HTMLDivElement>(null);
        const [position, setPosition] = React.useState<React.CSSProperties>({});
        const [labelledBy, setLabelledBy] = React.useState(triggerId);
        React.useImperativeHandle(forwardedRef, () => ref.current!);

        React.useLayoutEffect(() => {
            const element = ref.current;
            if (!element) return;
            if (!open) {
                if (element.matches(':popover-open')) element.hidePopover();
                return;
            }
            setLabelledBy(triggerRef.current?.id ?? triggerId);
            element.showPopover();
            const updatePosition = () => {
                const trigger = triggerRef.current;
                if (!trigger) return;
                const anchor = trigger.getBoundingClientRect();
                const width = element.offsetWidth;
                const height = element.offsetHeight;
                const availableBelow = window.innerHeight - anchor.bottom - sideOffset - 8;
                const availableAbove = anchor.top - sideOffset - 8;
                const placeAbove = height > availableBelow && availableAbove > availableBelow;
                const left = align === 'start' ? anchor.left : align === 'end' ? anchor.right - width : anchor.left + (anchor.width - width) / 2;
                setPosition({
                    position: 'fixed',
                    margin: 0,
                    inset: 'auto',
                    left: Math.max(8, Math.min(left, window.innerWidth - width - 8)),
                    top: placeAbove ? Math.max(8, anchor.top - sideOffset - height) : anchor.bottom + sideOffset,
                    maxHeight: Math.max(0, placeAbove ? availableAbove : availableBelow),
                    maxWidth: 'calc(100vw - 1rem)',
                });
            };
            updatePosition();
            const observer = new ResizeObserver(updatePosition);
            observer.observe(element);
            window.addEventListener('resize', updatePosition);
            window.addEventListener('scroll', updatePosition, true);
            element.querySelector<HTMLElement>('[autofocus], [role="menuitem"]:not(:disabled), [tabindex="0"], button:not(:disabled), input:not(:disabled)')?.focus();
            return () => {
                observer.disconnect();
                window.removeEventListener('resize', updatePosition);
                window.removeEventListener('scroll', updatePosition, true);
                if (element.matches(':popover-open')) element.hidePopover();
            };
        }, [open, align, sideOffset, triggerRef, triggerId]);

        return (
            <div
                ref={ref}
                id={contentId}
                popover="auto"
                role="dialog"
                aria-labelledby={labelledBy}
                tabIndex={-1}
                data-state={open ? 'open' : 'closed'}
                className={cn('z-50 box-border w-72 overflow-y-auto rounded-xl border border-border bg-popover p-4 text-popover-foreground shadow-lg outline-none', className)}
                style={{ ...position, ...style }}
                onToggle={(event) => {
                    onToggle?.(event);
                    const visible = event.currentTarget.matches(':popover-open');
                    if (visible !== open) setOpen(visible);
                }}
                onKeyDown={(event) => {
                    onKeyDown?.(event);
                    if (!event.defaultPrevented && event.key === 'Escape') {
                        event.preventDefault();
                        event.stopPropagation();
                        triggerRef.current?.focus();
                        setOpen(false);
                    }
                }}
                {...props}
            >
                {!!open && children}
            </div>
        );
    },
);
PopoverContent.displayName = 'PopoverContent';

export { Popover, PopoverContent, PopoverTrigger, usePopover };
