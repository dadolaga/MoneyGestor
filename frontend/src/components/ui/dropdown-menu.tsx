'use client';

import * as React from 'react';

import { Popover, PopoverContent, PopoverTrigger, usePopover } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

const DropdownMenu = Popover;

const DropdownMenuTrigger = React.forwardRef<HTMLButtonElement, React.ComponentPropsWithoutRef<typeof PopoverTrigger>>(
    ({ onKeyDown, ...props }, ref) => {
        const { setOpen } = usePopover();
        return (
            <PopoverTrigger
                ref={ref}
                {...props}
                aria-haspopup="menu"
                onKeyDown={(event) => {
                    onKeyDown?.(event);
                    if (!event.defaultPrevented && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
                        event.preventDefault();
                        setOpen(true);
                    }
                }}
            />
        );
    },
);
DropdownMenuTrigger.displayName = 'DropdownMenuTrigger';

const DropdownMenuContent = React.forwardRef<HTMLDivElement, React.ComponentPropsWithoutRef<typeof PopoverContent>>(
    ({ className, onKeyDown, ...props }, ref) => {
        const { setOpen, triggerRef } = usePopover();
        const search = React.useRef({ text: '', time: 0 });
        return (
            <PopoverContent
                ref={ref}
                {...props}
                role="menu"
                className={cn('w-auto min-w-40 overflow-y-auto rounded-md p-1 shadow-md', className)}
                onKeyDown={(event) => {
                    onKeyDown?.(event);
                    if (event.defaultPrevented) return;
                    if (event.key === 'Tab') {
                        triggerRef.current?.focus();
                        setOpen(false);
                        return;
                    }
                    const items = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="menuitem"]:not(:disabled)'));
                    const index = items.findIndex((item) => item === document.activeElement);
                    let next: HTMLButtonElement | undefined;
                    if (event.key === 'ArrowDown') next = items[(index + 1) % items.length];
                    else if (event.key === 'ArrowUp') next = items[(index - 1 + items.length) % items.length];
                    else if (event.key === 'Home') next = items[0];
                    else if (event.key === 'End') next = items[items.length - 1];
                    else if (event.key.length === 1 && event.key !== ' ' && !event.ctrlKey && !event.metaKey && !event.altKey) {
                        const time = Date.now();
                        search.current = { text: (time - search.current.time < 500 ? search.current.text : '') + event.key.toLocaleLowerCase(), time };
                        next = [...items.slice(index + 1), ...items.slice(0, index + 1)].find((item) => item.textContent?.trim().toLocaleLowerCase().startsWith(search.current.text));
                    }
                    if (next) {
                        event.preventDefault();
                        next.focus();
                    }
                }}
            />
        );
    },
);
DropdownMenuContent.displayName = 'DropdownMenuContent';

interface DropdownMenuItemProps extends Omit<React.ComponentPropsWithoutRef<'button'>, 'onSelect'> {
    onSelect?: (event: Event) => void;
}

const DropdownMenuItem = React.forwardRef<HTMLButtonElement, DropdownMenuItemProps>(
    ({ className, onClick, onSelect, ...props }, ref) => {
        const { setOpen, triggerRef } = usePopover();
        return (
            <button
                ref={ref}
                type="button"
                role="menuitem"
                tabIndex={-1}
                className={cn('relative flex w-full cursor-pointer select-none items-center rounded-sm border-0 bg-transparent px-2 py-1.5 text-left text-sm text-inherit outline-none hover:bg-accent focus:bg-accent focus:text-accent-foreground disabled:pointer-events-none disabled:opacity-50', className)}
                {...props}
                onClick={(event) => {
                    onClick?.(event);
                    if (event.defaultPrevented) return;
                    const selection = new Event('select', { cancelable: true });
                    onSelect?.(selection);
                    if (!selection.defaultPrevented) {
                        triggerRef.current?.focus();
                        setOpen(false);
                    }
                }}
            />
        );
    },
);
DropdownMenuItem.displayName = 'DropdownMenuItem';

export { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger };
