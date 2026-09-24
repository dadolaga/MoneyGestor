'use client';

import { Suspense, useEffect, useRef, useState } from 'react';

import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import useApi from '@/hooks/useApi';
import { Link } from '@/i18n/navigation';

export default function VerifyEmailPage() {
    return <Suspense><VerifyEmailContent /></Suspense>;
}

function VerifyEmailContent() {
    const t = useTranslations('Auth.verification');
    const api = useApi();
    const searchParams = useSearchParams();
    const userId = searchParams.get('userId');
    const token = searchParams.get('token');
    const started = useRef(false);
    const [status, setStatus] = useState<'pending' | 'success' | 'error'>(userId && token ? 'pending' : 'error');

    useEffect(() => {
        if (started.current) return;
        started.current = true;
        if (!userId || !token) return;
        api.account.confirmEmail(userId, token).onSuccess(() => setStatus('success')).onError(() => setStatus('error')).execute();
        // The one-time token must only be submitted once on mount.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <Card className="w-md">
            <CardHeader><CardTitle>{t('title')}</CardTitle></CardHeader>
            <CardContent className="grid gap-5 text-center">
                <p aria-live="polite" className={status === 'error' ? 'text-sm text-destructive' : 'text-sm'}>{t(status)}</p>
                {status !== 'pending' && <Link className="font-medium text-primary hover:underline" href="/login">{t('login')}</Link>}
            </CardContent>
        </Card>
    );
}
