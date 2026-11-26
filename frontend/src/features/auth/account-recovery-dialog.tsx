'use client';

import { useState, type ReactNode } from 'react';

import { useTranslations } from 'next-intl';
import { useTheme } from 'next-themes';
import { useForm } from 'react-hook-form';

import { InputField } from '@/components/shared/form-controls';
import { Button } from '@/components/ui/button';
import { Dialog, DialogBody, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Mail } from '@/components/ui/icons';
import { ApiProblemError, apiClient } from '@/lib/api/client';

export type RecoveryAction = 'forgot' | 'resend';

export function AccountRecoveryDialog({ action, children, defaultOpen = false }: { action: RecoveryAction; children: ReactNode; defaultOpen?: boolean }) {
    const t = useTranslations('Auth.recovery');
    const common = useTranslations('Common.actions');
    const { resolvedTheme } = useTheme();
    const [isOpen, setIsOpen] = useState(defaultOpen);
    const [isPending, setIsPending] = useState(false);
    const [isAccepted, setIsAccepted] = useState(false);
    const [submitError, setSubmitError] = useState<string>();
    const form = useForm<{ email: string }>({ defaultValues: { email: '' } });
    const title = t(action === 'forgot' ? 'forgotTitle' : 'resendTitle');
    const description = t(action === 'forgot' ? 'forgotDescription' : 'resendDescription');
    const submitLabel = isPending ? t('sending') : t(action === 'forgot' ? 'send' : 'resend');

    const openChangeHandler = (open: boolean) => {
        if (open && !isPending) {
            form.reset();
            setIsAccepted(false);
            setSubmitError(undefined);
        }
        setIsOpen(open);
    };

    const submitHandler = async ({ email }: { email: string }) => {
        if (isPending) return;
        setIsPending(true);
        setSubmitError(undefined);
        try {
            if (action === 'forgot') await apiClient.forgotPassword(email.trim());
            else await apiClient.resendConfirmation(email.trim());
            setIsAccepted(true);
        } catch (error) {
            const status = error instanceof ApiProblemError ? error.status : undefined;
            const message = status === 429 ? t('tooManyRequests')
                : status === 0 ? t('networkError')
                : t('requestError');
            setSubmitError(message);
        } finally {
            setIsPending(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={openChangeHandler}>
            <DialogTrigger asChild>
                <button className="flowiy-auth-recovery-link" type="button">{children}</button>
            </DialogTrigger>
            <DialogContent closeLabel={common('close')} className="flowiy-home flowiy-auth-recovery-dialog" data-theme={resolvedTheme === 'light' ? 'light' : 'dark'}>
                <DialogHeader className="pr-8">
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>{description}</DialogDescription>
                </DialogHeader>
                <DialogBody>
                    {isAccepted === true ? (
                        <p className="flowiy-auth-recovery-status" role="status">{t('accepted')}</p>
                    ) : (
                        <form aria-busy={isPending} className="grid gap-5" noValidate onSubmit={form.handleSubmit(submitHandler)}>
                            {!!submitError && <p className="text-sm text-destructive" role="alert">{submitError}</p>}
                            <InputField
                                autoComplete="email" control={form.control} disabled={isPending}
                                id={`${action}-email`} label={t('email')} maxLength={256} name="email"
                                placeholder={t('emailPlaceholder')} type="email"
                                startAdornment={<Mail aria-hidden="true" className="size-5" />}
                                rules={{ required: t('required'), validate: (value: string) => /^\S+@\S+\.\S+$/.test(value.trim()) ? true : t('invalidEmail') }}
                            />
                            <Button disabled={isPending} type="submit">{submitLabel}</Button>
                        </form>
                    )}
                </DialogBody>
                <DialogFooter>
                    <DialogClose asChild><Button type="button" variant="ghost">{common('close')}</Button></DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
