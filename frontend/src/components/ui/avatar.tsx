import * as React from 'react';

import { cn } from '@/lib/utils';

const Avatar = React.forwardRef<HTMLSpanElement, React.ComponentPropsWithoutRef<'span'>>(
    ({ className, ...props }, ref) => (
        <span ref={ref} className={cn('relative flex size-10 shrink-0 overflow-hidden rounded-full', className)} {...props} />
    ),
);
Avatar.displayName = 'Avatar';

const AvatarFallback = React.forwardRef<HTMLSpanElement, React.ComponentPropsWithoutRef<'span'>>(
    ({ className, ...props }, ref) => (
        <span ref={ref} className={cn('flex size-full items-center justify-center rounded-full bg-muted text-sm text-muted-foreground', className)} {...props} />
    ),
);
AvatarFallback.displayName = 'AvatarFallback';

export { Avatar, AvatarFallback };
