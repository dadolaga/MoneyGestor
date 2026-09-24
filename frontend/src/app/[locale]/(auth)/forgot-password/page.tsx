'use client';

import { useState } from 'react';

import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';

import { InputField } from '@/components/shared/form-controls';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import useApi from '@/hooks/useApi';
import { Link } from '@/i18n/navigation';

export default function ForgotPasswordPage() {
    const t = useTranslations('Auth.recovery');
    const api = useApi();
    const [pending, setPending] = useState(false);
    const [accepted, setAccepted] = useState(false);
    const form = useForm<{ email: string }>({ defaultValues: { email: '' } });
    const submitLabel = pending ? t('pending') : t('send');

    return (
        <Card className="w-md">
            <CardHeader><CardTitle>{t('forgotTitle')}</CardTitle><p className="text-sm text-muted-foreground">{t('forgotDescription')}</p></CardHeader>
            <CardContent className="grid gap-5">
                {accepted ? <p aria-live="polite" className="text-sm">{t('accepted')}</p> : (
                    <form className="grid gap-5" onSubmit={form.handleSubmit(({ email }) => {
                        setPending(true);
                        api.account.forgotPassword(email).onSuccess(() => setAccepted(true)).onError(() => setAccepted(true)).onFinish(() => setPending(false)).execute();
                    })}>
                        <InputField autoComplete="email" control={form.control} disabled={pending} label={t('email')} name="email" rules={{ required: t('required') }} type="email" />
                        <Button disabled={pending} type="submit">{submitLabel}</Button>
                    </form>
                )}
                <Link className="text-center text-sm font-medium text-primary hover:underline" href="/login">{t('backToLogin')}</Link>
            </CardContent>
        </Card>
    );
}
