import * as React from 'react';

import { cn } from '@/lib/utils';

interface SeparatorProps extends React.ComponentPropsWithoutRef<'div'> {
    orientation?: 'horizontal' | 'vertical';
    decorative?: boolean;
}

const Separator = React.forwardRef<HTMLDivElement, SeparatorProps>(
    ({ className, orientation = 'horizontal', decorative = true, ...props }, ref) => {
        const ariaOrientation = decorative ? undefined : orientation;
        return <div
            ref={ref}
            role={decorative ? 'none' : 'separator'}
            aria-orientation={ariaOrientation}
            data-orientation={orientation}
            className={cn('shrink-0 bg-border data-[orientation=horizontal]:h-px data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-px', className)}
            {...props}
        />;
    },
);
Separator.displayName = 'Separator';

export { Separator };
