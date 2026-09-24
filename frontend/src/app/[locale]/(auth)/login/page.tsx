'use client';

import { useState } from 'react';

import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';

import { CheckboxField, InputField } from '@/components/shared/form-controls';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import useApi from '@/hooks/useApi';
import { Link, useRouter } from '@/i18n/navigation';

interface LoginFormValues {
    username: string;
    password: string;
    remember: boolean;
}

export default function LoginPage() {
    const t = useTranslations('Auth.login');
    const router = useRouter();
    const api = useApi();
    const [submitError, setSubmitError] = useState<string>();
    const [isPending, setIsPending] = useState(false);
    const form = useForm<LoginFormValues>({ defaultValues: { username: '', password: '', remember: false } });

    const submitHandler = (values: LoginFormValues) => {
        setSubmitError(undefined);
        setIsPending(true);
        api.account
            .login({ user: values.username, password: values.password, remember: values.remember })
            .onSuccess(() => {
                router.replace('/dashboard');
            })
            .onError((error) => {
                const message = error.status === 401 || error.status === 423
                    ? t('errors.invalidCredentials')
                    : t('errors.generic');
                setSubmitError(message);
            })
            .onFinish(() => setIsPending(false))
            .execute();
    };

    const onInvalid = () => setSubmitError(t('errors.summary'));
    return (
        <div className="w-full h-full flex items-center justify-center">
            <Card className="w-md">
                <CardHeader className="items-center text-center">
                    <Image alt="Money Gestor" height={72} priority src="/new_logo_dark.png" width={229} />
                    <CardTitle>{t('title')}</CardTitle>
                    <p className="m-0 text-sm text-muted-foreground">{t('description')}</p>
                </CardHeader>
                <CardContent>
                    <form className="grid gap-5" noValidate onSubmit={form.handleSubmit(submitHandler, onInvalid)}>
                        {/* submitError and isPending are controlled values; each branch renders a safe React node. */}
                        {/* eslint-disable-next-line react/jsx-no-leaked-render */}
                        {submitError ? (
                            <div
                                aria-live="assertive"
                                className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
                                role="alert"
                            >
                                {submitError}
                            </div>
                        ) : null}
                        <InputField
                            autoComplete="username"
                            control={form.control}
                            disabled={isPending}
                            label={t('fields.username')}
                            name="username"
                            rules={{ required: t('validation.required') }}
                        />
                        <InputField
                            kind="password"
                            autoComplete="current-password"
                            control={form.control}
                            disabled={isPending}
                            label={t('fields.password')}
                            name="password"
                            rules={{ required: t('validation.required') }}
                        />
                        <CheckboxField
                            control={form.control}
                            disabled={isPending}
                            label={t('fields.remember')}
                            name="remember"
                        />
                        <Button disabled={isPending} type="submit">
                            {/* eslint-disable-next-line react/jsx-no-leaked-render */}
                            {isPending ? t('pending') : t('submit')}
                        </Button>
                    </form>
                    <p className="mb-0 mt-6 text-center text-sm text-muted-foreground">
                        <Link className="font-medium text-primary hover:underline" href="/forgot-password">
                            {t('forgotPassword')}
                        </Link>
                        {' · '}
                        <Link className="font-medium text-primary hover:underline" href="/resend-confirmation">
                            {t('resendConfirmation')}
                        </Link>
                    </p>
                    <p className="mb-0 mt-3 text-center text-sm text-muted-foreground">
                        {t('registerPrompt')}{' '}
                        <Link className="font-medium text-primary hover:underline" href="/register">
                            {t('registerLink')}
                        </Link>
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
