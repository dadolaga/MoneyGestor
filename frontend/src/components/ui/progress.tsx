import * as React from 'react';

import { cn } from '@/lib/utils';

const Progress = React.forwardRef<HTMLProgressElement, React.ComponentPropsWithoutRef<'progress'>>(
    ({ className, value, max = 100, ...props }, ref) => (
        <progress
            ref={ref}
            value={value}
            max={max}
            className={cn('block h-2 w-full appearance-none overflow-hidden rounded-full border-0 bg-secondary [&::-webkit-progress-bar]:bg-secondary [&::-webkit-progress-value]:bg-primary [&::-moz-progress-bar]:bg-primary', className)}
            {...props}
        />
    ),
);
Progress.displayName = 'Progress';

export { Progress };
