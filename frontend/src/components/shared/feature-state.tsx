import type { ReactNode } from 'react';

import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle, CircleDashed } from '@/components/ui/icons';
import { Skeleton } from '@/components/ui/skeleton';
import type { FeatureState } from '@/types/feature-state';

interface FeatureStateLabels {
    idle: string;
    loading: string;
    empty: string;
    error: string;
}

interface FeatureStateBoundaryProps<T> {
    state: FeatureState<T>;
    labels: FeatureStateLabels;
    children: (data: T) => ReactNode;
}

export function FeatureStateBoundary<T>({ state, labels, children }: FeatureStateBoundaryProps<T>) {
    if (state.status === 'ready') {
        return children(state.data);
    }

    if (state.status === 'loading') {
        return (
            <div aria-label={labels.loading} aria-busy="true" className="grid gap-3 sm:grid-cols-2">
                <span className="sr-only">{labels.loading}</span>
                <Skeleton className="h-28 w-full" />
                <Skeleton className="h-28 w-full" />
                <Skeleton className="h-28 w-full sm:col-span-2" />
            </div>
        );
    }

    const isError = state.status === 'error';
    const stateMessage = isError ? labels.error : state.status === 'empty' ? labels.empty : labels.idle;

    return (
        <Card role={isError ? 'alert' : 'status'}>
            <CardContent className="flex min-h-40 flex-col items-center justify-center gap-3 text-center text-muted-foreground">
                {isError ? <AlertCircle className="size-8 text-destructive" /> : <CircleDashed className="size-8" />}
                <p className="m-0 text-sm">{stateMessage}</p>
            </CardContent>
        </Card>
    );
}
