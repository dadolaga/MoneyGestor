'use client';

import { Suspense, useState } from 'react';

import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useForm, useWatch } from 'react-hook-form';

import { InputField } from '@/components/shared/form-controls';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import useApi from '@/hooks/useApi';
import { Link } from '@/i18n/navigation';

type ResetForm = { email: string; password: string; confirmPassword: string };

export default function ResetPasswordPage() {
    return <Suspense><ResetPasswordForm /></Suspense>;
}

function ResetPasswordForm() {
    const t = useTranslations('Auth.recovery');
    const api = useApi();
    const searchParams = useSearchParams();
    const token = searchParams.get('token') ?? '';
    const [pending, setPending] = useState(false);
    const [complete, setComplete] = useState(false);
    const [error, setError] = useState(false);
    const form = useForm<ResetForm>({ defaultValues: { email: searchParams.get('email') ?? '', password: '', confirmPassword: '' } });
    const password = useWatch({ control: form.control, name: 'password' });
    const submitLabel = pending ? t('pending') : t('reset');

    return (
        <Card className="w-md">
            <CardHeader><CardTitle>{t('resetTitle')}</CardTitle></CardHeader>
            <CardContent className="grid gap-5">
                {complete ? <p aria-live="polite" className="text-sm">{t('resetSuccess')}</p> : (
                    <form className="grid gap-5" onSubmit={form.handleSubmit((values) => {
                        if (!token) { setError(true); return; }
                        setPending(true); setError(false);
                        api.account.resetPassword(values.email, token, values.password).onSuccess(() => setComplete(true)).onError(() => setError(true)).onFinish(() => setPending(false)).execute();
                    })}>
                        {!!error && <p role="alert" className="text-sm text-destructive">{t('genericError')}</p>}
                        <InputField autoComplete="email" control={form.control} disabled={pending} label={t('email')} name="email" rules={{ required: t('required') }} type="email" />
                        <InputField kind="password" autoComplete="new-password" control={form.control} disabled={pending} label={t('password')} name="password" rules={{ required: t('required'), minLength: { value: 12, message: t('passwordLength') } }} />
                        <InputField kind="password" autoComplete="new-password" control={form.control} disabled={pending} label={t('confirmPassword')} name="confirmPassword" rules={{ required: t('required'), validate: (value: string) => value === password || t('passwordMatch') }} />
                        <Button disabled={pending} type="submit">{submitLabel}</Button>
                    </form>
                )}
                <Link className="text-center text-sm font-medium text-primary hover:underline" href="/login">{t('backToLogin')}</Link>
            </CardContent>
        </Card>
    );
}
