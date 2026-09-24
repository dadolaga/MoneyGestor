'use client';

import { useState } from 'react';

import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';

import { InputField } from '@/components/shared/form-controls';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

export default function RegisterPage() {
    const t = useTranslations('Auth.register');
    const router = useRouter();
    const api = useApi();
    const [submitError, setSubmitError] = useState<string>();
    const [isPending, setIsPending] = useState(false);
    const form = useForm<RegistrationFormValues>({
        defaultValues: { firstName: '', lastName: '', username: '', email: '', password: '', confirmPassword: '' },
    });
    const password = useWatch({ control: form.control, name: 'password' });

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
            .onError(() => setSubmitError(t('errors.generic')))
            .onFinish(() => setIsPending(false))
            .execute();
    };

    const onInvalid = () => setSubmitError(t('errors.summary'));
    return (
        <div className="w-full h-full flex items-center justify-center">
            <Card>
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
                        <div className="grid gap-5 sm:grid-cols-2">
                            <InputField
                                autoComplete="given-name"
                                control={form.control}
                                disabled={isPending}
                                label={t('fields.firstName')}
                                name="firstName"
                                rules={{ required: t('validation.required') }}
                            />
                            <InputField
                                autoComplete="family-name"
                                control={form.control}
                                disabled={isPending}
                                label={t('fields.lastName')}
                                name="lastName"
                                rules={{ required: t('validation.required') }}
                            />
                        </div>
                        <InputField
                            autoComplete="username"
                            control={form.control}
                            disabled={isPending}
                            label={t('fields.username')}
                            name="username"
                            rules={{ required: t('validation.required') }}
                        />
                        <InputField
                            autoComplete="email"
                            control={form.control}
                            disabled={isPending}
                            label={t('fields.email')}
                            name="email"
                            rules={{
                                pattern: { value: /^\S+@\S+\.\S+$/, message: t('validation.email') },
                                required: t('validation.required'),
                            }}
                            type="email"
                        />
                        <InputField
                            kind="password"
                            autoComplete="new-password"
                            control={form.control}
                            disabled={isPending}
                            label={t('fields.password')}
                            name="password"
                            rules={{
                                minLength: { value: 12, message: t('validation.passwordLength') },
                                required: t('validation.required'),
                            }}
                        />
                        <InputField
                            kind="password"
                            autoComplete="new-password"
                            control={form.control}
                            disabled={isPending}
                            label={t('fields.confirmPassword')}
                            name="confirmPassword"
                            rules={{
                                required: t('validation.required'),
                                validate: (value: string) =>
                                    value === password ? true : t('validation.passwordMatch'),
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
