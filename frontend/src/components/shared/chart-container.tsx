import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

interface ChartContainerProps {
    children: ReactNode;
    className?: string;
    description: string;
}

export function ChartContainer({ children, className, description }: ChartContainerProps) {
    return (
        <figure className={cn('m-0 min-w-0', className)}>
            {children}
            <figcaption className="sr-only">{description}</figcaption>
        </figure>
    );
}
