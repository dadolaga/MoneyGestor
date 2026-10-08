'use client';

import { Suspense, useEffect, useRef, useState } from 'react';

import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAccountConfiguration } from '@/hooks/useAccountConfiguration';
import useApi from '@/hooks/useApi';
import { Link } from '@/i18n/navigation';

export default function VerifyEmailPage() {
    return <Suspense><VerifyEmailContent /></Suspense>;
}

function VerifyEmailContent() {
    const t = useTranslations('Auth.verification');
    const configurationText = useTranslations('Auth.configuration');
    const api = useApi();
    const { configuration, reloadConfiguration } = useAccountConfiguration();
    const searchParams = useSearchParams();
    const userId = searchParams.get('userId');
    const token = searchParams.get('token');
    const started = useRef(false);
    const [status, setStatus] = useState<'pending' | 'success' | 'error'>(userId && token ? 'pending' : 'error');

    useEffect(() => {
        if (configuration.status !== 'ready' || !configuration.data.requireConfirmedEmail || started.current) return;
        started.current = true;
        if (!userId || !token) return;
        api.account.confirmEmail(userId, token).onSuccess(() => setStatus('success')).onError(() => setStatus('error')).execute();
        // Submit the one-time token once, after loading the backend's confirmation policy.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [configuration, userId, token]);

    const isConfirmationDisabled = configuration.status === 'ready' && !configuration.data.requireConfirmedEmail;
    const hasConfigurationError = configuration.status === 'error';
    const showLogin = configuration.status === 'ready' && (status !== 'pending' || isConfirmationDisabled);
    const message = hasConfigurationError ? configurationText('error')
        : t(isConfirmationDisabled ? 'disabled' : configuration.status === 'ready' ? status : 'pending');

    return (
        <Card className="w-md">
            <CardHeader><CardTitle>{t('title')}</CardTitle></CardHeader>
            <CardContent className="grid gap-5 text-center">
                <p aria-live="polite" className={status === 'error' || hasConfigurationError ? 'text-sm text-destructive' : 'text-sm'}>
                    {message}
                </p>
                {hasConfigurationError === true && (
                    <button className="font-medium text-primary hover:underline" onClick={reloadConfiguration} type="button">
                        {configurationText('retry')}
                    </button>
                )}
                {showLogin === true && <Link className="font-medium text-primary hover:underline" href="/login">{t('login')}</Link>}
            </CardContent>
        </Card>
    );
}
