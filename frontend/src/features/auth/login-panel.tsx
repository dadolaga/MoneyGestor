'use client';

import { useEffect, useState } from 'react';

import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';

import { CheckboxField, InputField } from '@/components/shared/form-controls';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { UserRound } from '@/components/ui/icons';
import { AccountRecoveryDialog, type RecoveryAction } from '@/features/auth/account-recovery-dialog';
import { AuthPasswordField } from '@/features/auth/auth-password-field';
import useApi from '@/hooks/useApi';
import { Link, useRouter } from '@/i18n/navigation';

interface LoginFormValues {
    username: string;
    password: string;
    remember: boolean;
}

interface PanelProps {
    initialRecovery?: RecoveryAction;
    onDirtyChange?: (isDirty: boolean) => void;
}

export function LoginPanel({ initialRecovery, onDirtyChange }: PanelProps) {
    const t = useTranslations('Auth.login');
    const router = useRouter();
    const api = useApi();
    const [submitError, setSubmitError] = useState<string>();
    const [isPending, setIsPending] = useState(false);
    const form = useForm<LoginFormValues>({ defaultValues: { username: '', password: '', remember: false } });

    useEffect(() => {
        onDirtyChange?.(form.formState.isDirty);
    }, [form.formState.isDirty, onDirtyChange]);

    const submitHandler = (values: LoginFormValues) => {
        setSubmitError(undefined);
        setIsPending(true);
        api.account
            .login({ user: values.username, password: values.password, remember: values.remember })
            .onSuccess(() => {
                router.replace('/dashboard');
            })
            .onError((error) => {
                const message = error.status === 401 ? t('errors.invalidCredentials')
                    : error.status === 423 ? t('errors.locked')
                    : error.status === 429 ? t('errors.tooManyRequests')
                    : error.status === 0 ? t('errors.network')
                    : t('errors.generic');
                setSubmitError(message);
            })
            .onFinish(() => setIsPending(false))
            .execute();
    };

    const onInvalid = () => setSubmitError(t('errors.summary'));
    return (
        <div className="w-full h-full flex items-center justify-center">
            <Card className="flowiy-auth-form-card">
                <CardHeader className="items-center text-center">
                    <CardTitle>{t('title')}</CardTitle>
                    <p className="m-0 text-sm text-muted-foreground">{t('description')}</p>
                </CardHeader>
                <CardContent>
                    <form aria-busy={isPending} className="grid gap-5" noValidate onSubmit={form.handleSubmit(submitHandler, onInvalid)}>
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
                            maxLength={256}
                            placeholder={t('placeholders.username')}
                            startAdornment={<UserRound aria-hidden="true" className="size-5" />}
                            rules={{ required: t('validation.required') }}
                        />
                        <AuthPasswordField
                            autoComplete="current-password"
                            control={form.control}
                            disabled={isPending}
                            label={t('fields.password')}
                            name="password"
                            maxLength={128}
                            placeholder={t('placeholders.password')}
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
                        <AccountRecoveryDialog action="forgot" defaultOpen={initialRecovery === 'forgot'}>
                            {t('forgotPassword')}
                        </AccountRecoveryDialog>
                        {' · '}
                        <AccountRecoveryDialog action="resend" defaultOpen={initialRecovery === 'resend'}>
                            {t('resendConfirmation')}
                        </AccountRecoveryDialog>
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
