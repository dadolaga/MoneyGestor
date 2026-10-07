'use client';

import { useEffect, useState } from 'react';

import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { InputField } from '@/components/shared/form-controls';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AtSign, Mail, UserRound } from '@/components/ui/icons';
import { AuthPasswordField } from '@/features/auth/auth-password-field';
import useApi from '@/hooks/useApi';
import { Link, useRouter } from '@/i18n/navigation';

interface RegistrationFormValues {
    firstName: string;
    lastName: string;
    username: string;
    email: string;
    password: string;
    confirmPassword: string;
}

interface PanelProps {
    onDirtyChange?: (isDirty: boolean) => void;
}

export function RegisterPanel({ onDirtyChange }: PanelProps) {
    const t = useTranslations('Auth.register');
    const router = useRouter();
    const api = useApi();
    const [submitError, setSubmitError] = useState<string>();
    const [isPending, setIsPending] = useState(false);
    const form = useForm<RegistrationFormValues>({
        defaultValues: { firstName: '', lastName: '', username: '', email: '', password: '', confirmPassword: '' },
    });

    useEffect(() => {
        onDirtyChange?.(form.formState.isDirty);
    }, [form.formState.isDirty, onDirtyChange]);

    const submitHandler = (values: RegistrationFormValues) => {
        setSubmitError(undefined);
        setIsPending(true);
        api.account
            .register({
                firstname: values.firstName,
                lastname: values.lastName,
                username: values.username,
                email: values.email,
                password: values.password,
            })
            .onSuccess(() => {
                toast.success(t('success'));
                router.replace('/login');
            })
            .onError((error) => {
                const message = error.status === 429 ? t('errors.tooManyRequests')
                    : error.status === 0 ? t('errors.network')
                    : error.status === 400 && error.message === 'validation_failed' ? t('errors.validation')
                    : t('errors.generic');
                setSubmitError(message);
            })
            .onFinish(() => setIsPending(false))
            .execute();
    };

    const onInvalid = () => setSubmitError(t('errors.summary'));
    const fields = {
        firstName: { placeholder: t('fields.firstName'), startAdornment: <UserRound aria-hidden="true" className="size-5" /> },
        lastName: { placeholder: t('fields.lastName'), startAdornment: <UserRound aria-hidden="true" className="size-5" /> },
        username: { placeholder: t('fields.username'), startAdornment: <AtSign aria-hidden="true" className="size-5" /> },
        email: { placeholder: t('placeholders.email'), startAdornment: <Mail aria-hidden="true" className="size-5" /> },
        password: { placeholder: t('placeholders.password'), description: t('validation.passwordRequirements') },
        confirmPassword: { placeholder: t('placeholders.confirmPassword') },
    };
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
                        <div className="grid gap-5 sm:grid-cols-2">
                            <InputField
                                autoComplete="given-name"
                                control={form.control}
                                disabled={isPending}
                                label={t('fields.firstName')}
                                name="firstName"
                                maxLength={100}
                                {...fields.firstName}
                                rules={{ required: t('validation.required') }}
                            />
                            <InputField
                                autoComplete="family-name"
                                control={form.control}
                                disabled={isPending}
                                label={t('fields.lastName')}
                                name="lastName"
                                maxLength={100}
                                {...fields.lastName}
                                rules={{ required: t('validation.required') }}
                            />
                        </div>
                        <InputField
                            autoComplete="username"
                            control={form.control}
                            disabled={isPending}
                            label={t('fields.username')}
                            name="username"
                            maxLength={64}
                            {...fields.username}
                            rules={{ required: t('validation.required'), minLength: { value: 3, message: t('validation.usernameLength') } }}
                        />
                        <InputField
                            autoComplete="email"
                            control={form.control}
                            disabled={isPending}
                            label={t('fields.email')}
                            name="email"
                            maxLength={256}
                            {...fields.email}
                            rules={{
                                pattern: { value: /^\S+@\S+\.\S+$/, message: t('validation.email') },
                                required: t('validation.required'),
                            }}
                            type="email"
                        />
                        <AuthPasswordField
                            autoComplete="new-password"
                            control={form.control}
                            disabled={isPending}
                            label={t('fields.password')}
                            name="password"
                            maxLength={128}
                            {...fields.password}
                            rules={{
                                minLength: { value: 12, message: t('validation.passwordLength') },
                                deps: ['confirmPassword'],
                                validate: (value: string) => /[A-Z]/.test(value) && /[a-z]/.test(value) && /[0-9]/.test(value) && /[^a-zA-Z0-9]/.test(value) ? true : t('validation.passwordRequirements'),
                                required: t('validation.required'),
                            }}
                        />
                        <AuthPasswordField
                            autoComplete="new-password"
                            control={form.control}
                            disabled={isPending}
                            label={t('fields.confirmPassword')}
                            name="confirmPassword"
                            maxLength={128}
                            {...fields.confirmPassword}
                            rules={{
                                required: t('validation.required'),
                                validate: (value: string) =>
                                    value === form.getValues('password') ? true : t('validation.passwordMatch'),
                            }}
                        />
                        <Button disabled={isPending} type="submit">
                            {/* eslint-disable-next-line react/jsx-no-leaked-render */}
                            {isPending ? t('pending') : t('submit')}
                        </Button>
                    </form>
                    <p className="mb-0 mt-6 text-center text-sm text-muted-foreground">
                        {t('loginPrompt')}{' '}
                        <Link className="font-medium text-primary hover:underline" href="/login">
                            {t('loginLink')}
                        </Link>
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
