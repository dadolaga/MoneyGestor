'use client';

import * as React from 'react';

import { Slot } from '@/components/ui/slot';
import { cn } from '@/lib/utils';

const PopoverContext = React.createContext<{
    open: boolean;
    setOpen: (open: boolean) => void;
    triggerRef: React.RefObject<HTMLElement | null>;
    anchorRef?: React.RefObject<HTMLElement | null>;
    triggerId: string;
    contentId: string;
} | null>(null);

function usePopover() {
    const context = React.useContext(PopoverContext);
    if (!context) throw new Error('Popover components require a Popover parent.');
    return context;
}

function Popover({ children, open: controlledOpen, defaultOpen = false, onOpenChange, anchorRef }: {
    children: React.ReactNode;
    open?: boolean;
    defaultOpen?: boolean;
    onOpenChange?: (open: boolean) => void;
    anchorRef?: React.RefObject<HTMLElement | null>;
}) {
    const [internalOpen, setInternalOpen] = React.useState(defaultOpen);
    const triggerRef = React.useRef<HTMLElement>(null);
    const id = React.useId();
    const setOpen = (nextOpen: boolean) => {
        if (controlledOpen === undefined) setInternalOpen(nextOpen);
        onOpenChange?.(nextOpen);
    };
    return (
        <PopoverContext.Provider value={{ open: controlledOpen ?? internalOpen, setOpen, triggerRef, anchorRef, triggerId: `${id}-trigger`, contentId: `${id}-content` }}>
            {children}
        </PopoverContext.Provider>
    );
}

const PopoverTrigger = React.forwardRef<HTMLElement, React.ComponentPropsWithoutRef<'button'> & { asChild?: boolean }>(
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
                ref={(element: HTMLElement | null) => {
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
    focusOnOpen?: boolean;
    matchTriggerWidth?: boolean;
    maxHeight?: number;
    revealFromInput?: boolean;
    mobileBottom?: boolean;
}

/** The browser top layer keeps calendar popups visible inside modal dialogs. */
const PopoverContent = React.forwardRef<HTMLDivElement, PopoverContentProps>(
    ({ className, children, align = 'center', sideOffset = 4, focusOnOpen = true, matchTriggerWidth = false, maxHeight, revealFromInput = false, mobileBottom = false, style, onToggle, onKeyDown, ...props }, forwardedRef) => {
        const { open, setOpen, triggerRef, anchorRef, triggerId, contentId } = usePopover();
        const ref = React.useRef<HTMLDivElement>(null);
        const [position, setPosition] = React.useState<React.CSSProperties>({});
        const [labelledBy, setLabelledBy] = React.useState(triggerId);
        const [present, setPresent] = React.useState(open);
        if (open && !present) setPresent(true);
        React.useImperativeHandle(forwardedRef, () => ref.current!);

        React.useLayoutEffect(() => {
            const element = ref.current;
            if (!element) return;
            let cancelled = false;
            if (!open) {
                if (element.matches(':popover-open')) element.hidePopover();
                // Native dismissal also starts the CSS exit transition; retain the calendar/list until it ends.
                const animations = element.getAnimations();
                void Promise.allSettled(animations.map((animation) => animation.finished)).then(() => {
                    if (!cancelled) setPresent(false);
                });
                return () => { cancelled = true; };
            }
            setLabelledBy(triggerRef.current?.id ?? triggerId);
            if (!element.matches(':popover-open')) element.showPopover();
            const updatePosition = () => {
                const trigger = anchorRef?.current ?? triggerRef.current;
                if (!trigger) return;
                if (mobileBottom && window.matchMedia('(max-width: 639px)').matches) {
                    const viewport = window.visualViewport;
                    const height = viewport?.height ?? window.innerHeight;
                    element.style.width = `${Math.max(0, (viewport?.width ?? window.innerWidth) - 16)}px`;
                    setPosition({
                        position: 'fixed',
                        margin: 0,
                        inset: 'auto',
                        left: (viewport?.offsetLeft ?? 0) + 8,
                        bottom: Math.max(8, window.innerHeight - (viewport?.offsetTop ?? 0) - height + 8),
                        maxHeight: Math.min(maxHeight ?? Infinity, Math.max(0, height - 16)),
                        maxWidth: 'calc(100vw - 1rem)',
                    });
                    return;
                }
                const anchor = trigger.getBoundingClientRect();
                if (matchTriggerWidth) element.style.width = `${anchor.width}px`;
                const width = element.offsetWidth;
                const height = element.offsetHeight;
                const availableBelow = window.innerHeight - anchor.bottom - sideOffset - 8;
                const availableAbove = anchor.top - sideOffset - 8;
                const revealBelow = revealFromInput && window.matchMedia('(min-width: 640px)').matches;
                const placeAbove = !revealBelow && height > availableBelow && availableAbove > availableBelow;
                element.style.setProperty('--popover-side-offset', `${sideOffset}px`);
                const left = align === 'start' ? anchor.left : align === 'end' ? anchor.right - width : anchor.left + (anchor.width - width) / 2;
                setPosition({
                    position: 'fixed',
                    margin: 0,
                    inset: 'auto',
                    left: Math.max(8, Math.min(left, window.innerWidth - width - 8)),
                    top: placeAbove ? Math.max(8, anchor.top - sideOffset - height) : anchor.bottom + sideOffset,
                    maxHeight: Math.min(maxHeight ?? Infinity, Math.max(0, placeAbove ? availableAbove : availableBelow)),
                    maxWidth: 'calc(100vw - 1rem)',
                });
            };
            updatePosition();
            const observer = new ResizeObserver(updatePosition);
            observer.observe(element);
            window.addEventListener('resize', updatePosition);
            window.addEventListener('scroll', updatePosition, true);
            window.visualViewport?.addEventListener('resize', updatePosition);
            window.visualViewport?.addEventListener('scroll', updatePosition);
            if (focusOnOpen) element.querySelector<HTMLElement>('[autofocus], [role="menuitem"]:not(:disabled), [tabindex="0"], button:not(:disabled), input:not(:disabled)')?.focus();
            return () => {
                observer.disconnect();
                window.removeEventListener('resize', updatePosition);
                window.removeEventListener('scroll', updatePosition, true);
                window.visualViewport?.removeEventListener('resize', updatePosition);
                window.visualViewport?.removeEventListener('scroll', updatePosition);
            };
        }, [open, align, sideOffset, focusOnOpen, matchTriggerWidth, maxHeight, revealFromInput, mobileBottom, triggerRef, anchorRef, triggerId]);

        React.useLayoutEffect(() => {
            const element = ref.current;
            return () => {
                if (element?.matches(':popover-open')) element.hidePopover();
            };
        }, []);

        return (
            <div
                ref={ref}
                id={contentId}
                popover="auto"
                role="dialog"
                aria-labelledby={labelledBy}
                tabIndex={-1}
                data-state={open ? 'open' : 'closed'}
                data-input-reveal={revealFromInput || undefined}
                data-mobile-bottom={mobileBottom || undefined}
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
                {!!(open || present) && children}
            </div>
        );
    },
);
PopoverContent.displayName = 'PopoverContent';

export { Popover, PopoverContent, PopoverTrigger, usePopover };
