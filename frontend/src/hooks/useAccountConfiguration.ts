'use client';

import { useCallback, useEffect, useState } from 'react';

import { apiClient, type AccountConfiguration } from '@/lib/api/client';
import type { FeatureState } from '@/types/feature-state';

export function useAccountConfiguration() {
    const [configuration, setConfiguration] = useState<FeatureState<AccountConfiguration>>({ status: 'loading' });
    const [requestVersion, setRequestVersion] = useState(0);

    useEffect(() => {
        const controller = new AbortController();
        apiClient.accountConfiguration(controller.signal)
            .then((data) => {
                if (!controller.signal.aborted) setConfiguration({ status: 'ready', data });
            })
            .catch(() => {
                if (!controller.signal.aborted) setConfiguration({ status: 'error', error: {} });
            });
        return () => controller.abort();
    }, [requestVersion]);

    const reloadConfiguration = useCallback(() => {
        setConfiguration({ status: 'loading' });
        setRequestVersion((version) => version + 1);
    }, []);

    return { configuration, reloadConfiguration };
}
