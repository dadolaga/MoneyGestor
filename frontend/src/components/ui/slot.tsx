'use client';

import * as React from 'react';

import { cn } from '@/lib/utils';

type SlotProps = React.HTMLAttributes<HTMLElement> & { ref?: React.Ref<HTMLElement> };

/** Adds wrapper behavior to one child without introducing another DOM element. */
const Slot = React.forwardRef<HTMLElement, SlotProps>(({ children, ...props }, forwardedRef) => {
    const child = React.Children.only(children);
    if (!React.isValidElement<SlotProps>(child)) throw new Error('Slot requires one React element.');

    const merged: Record<string, unknown> = { ...props, ...child.props };
    for (const [key, handler] of Object.entries(props)) {
        const childHandler = child.props[key as keyof SlotProps];
        if (/^on[A-Z]/.test(key) && typeof handler === 'function' && typeof childHandler === 'function') {
            merged[key] = (event: React.SyntheticEvent) => {
                childHandler(event);
                if (!event.defaultPrevented) handler(event);
            };
        }
    }
    merged.className = cn(props.className, child.props.className);
    merged.style = { ...props.style, ...child.props.style };
    merged.ref = (element: HTMLElement | null) => {
        for (const ref of [forwardedRef, child.props.ref]) {
            if (typeof ref === 'function') ref(element);
            else if (ref) ref.current = element;
        }
    };
    return React.cloneElement(child, merged);
});
Slot.displayName = 'Slot';

export { Slot };
