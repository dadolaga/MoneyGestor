'use client';

import { useCallback, useEffect, useState } from 'react';

import { useTranslations } from 'next-intl';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { LogIn, LogOut, UserPlus } from '@/components/ui/icons';
import { Skeleton } from '@/components/ui/skeleton';
import { useRouter } from '@/i18n/navigation';
import { apiClient } from '@/lib/api/client';
import { notify } from '@/lib/notifications';

function initials(name: string) {
    return name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0])
        .join('')
        .toUpperCase();
}

interface AppHeaderAccountProps {
    loginHref: string;
    registerHref: string;
}

export function AppHeaderAccount({ loginHref, registerHref }: AppHeaderAccountProps) {
    const t = useTranslations('Navigation');
    const router = useRouter();
    const [userName, setUserName] = useState<string>();
    const [isLoadingSession, setIsLoadingSession] = useState(true);
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    useEffect(() => {
        const controller = new AbortController();
        const timeout = window.setTimeout(() => {
            void apiClient.session(controller.signal)
                .then((user) => {
                    if (!controller.signal.aborted) setUserName(`${user.firstname} ${user.lastname}`);
                })
                .catch(() => {
                    if (!controller.signal.aborted) setUserName(undefined);
                })
                .finally(() => {
                    if (!controller.signal.aborted) setIsLoadingSession(false);
                });
        }, 0);

        return () => {
            window.clearTimeout(timeout);
            controller.abort();
        };
    }, []);

    const loginClickHandler = useCallback(() => {
        router.push(loginHref);
    }, [router, loginHref]);

    const registrationClickHandler = useCallback(() => {
        router.push(registerHref);
    }, [router, registerHref]);

    const logoutClickHandler = useCallback(async () => {
        if (isLoggingOut) return;
        setIsLoggingOut(true);
        const notificationId = notify.loading(t('loggingOut'), 'account:logout');
        try {
            await apiClient.logout();
            setUserName(undefined);
            notify.success(t('logoutSuccess'), notificationId);
            router.push(loginHref);
        } catch {
            notify.error(t('logoutFailed'), notificationId);
        } finally {
            setIsLoggingOut(false);
        }
    }, [router, t, loginHref, isLoggingOut]);

    return (
        <div className="app-header-account">
            {/* The conditions are explicit booleans; this renders exactly one account state. */}
            {/* eslint-disable-next-line react/jsx-no-leaked-render */}
            {isLoadingSession === true ? (
                <Skeleton className="h-10 w-10 rounded-full" />
            ) : userName !== undefined ? (
                <div className="flex items-center gap-3">
                    <Avatar className="size-11">
                        <AvatarFallback className="bg-white font-semibold text-primary">
                            {initials(userName)}
                        </AvatarFallback>
                    </Avatar>
                    <span className="hidden max-w-36 truncate text-sm font-semibold sm:block">{userName}</span>
                    <Button aria-label={t('logout')} disabled={isLoggingOut} size="icon" variant="ghost" onClick={logoutClickHandler}>
                        <LogOut aria-hidden="true" />
                    </Button>
                </div>
                ) : (
                    <div className="flex items-center gap-3">
                        <Button aria-label={t('enter')} size="default" variant="border" onClick={loginClickHandler}>
                            <LogIn aria-hidden="true" />
                            <span className="app-header-account-label">{t('enter')}</span>
                        </Button>
                        <Button
                            aria-label={t('register')}
                            size="default"
                            className="bg-white text-(--primary)"
                            variant={'outline'}
                            onClick={registrationClickHandler}
                        >
                            <UserPlus aria-hidden="true" />
                            <span className="app-header-account-label">{t('register')}</span>
                        </Button>
                    </div>
                )}
        </div>
    );
}
