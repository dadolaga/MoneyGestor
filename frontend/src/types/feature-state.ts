export type FeatureState<T> =
    | { status: 'idle' }
    | { status: 'loading' }
    | { status: 'ready'; data: T }
    | { status: 'empty' }
    | { status: 'error'; error: { code?: number; message?: string } };

export type FeatureStatus = FeatureState<never>['status'];

export const featureStatuses: FeatureStatus[] = ['idle', 'loading', 'ready', 'empty', 'error'];
