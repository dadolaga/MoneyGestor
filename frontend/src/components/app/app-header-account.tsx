'use client';

import { useCallback, useEffect, useState } from 'react';

import { useTranslations } from 'next-intl';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { LogIn, LogOut, UserPlus } from '@/components/ui/icons';
import { Skeleton } from '@/components/ui/skeleton';
import useApi from '@/hooks/useApi';
import { useRouter } from '@/i18n/navigation';
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
    const api = useApi();
    const [userName, setUserName] = useState<string>();
    const [isLoadingSession, setIsLoadingSession] = useState(true);
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    useEffect(() => {
        const timeout = window.setTimeout(() => {
            api.account
                .session()
                .onSuccess((user) => setUserName(`${user.firstname} ${user.lastname}`))
                .onError(() => {
                    setUserName(undefined);
                })
                .onFinish(() => setIsLoadingSession(false))
                .execute();
        }, 0);

        return () => window.clearTimeout(timeout);
        // `useApi` exposes an intentionally lightweight fluent client whose object identity is not stable.
        // The session is refreshed once when the shell mounts.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const loginClickHandler = useCallback(() => {
        router.push(loginHref);
    }, [router, loginHref]);

    const registrationClickHandler = useCallback(() => {
        router.push(registerHref);
    }, [router, registerHref]);

    const logoutClickHandler = useCallback(() => {
        if (isLoggingOut) return;
        setIsLoggingOut(true);
        const notificationId = notify.loading(t('loggingOut'), 'account:logout');
        api.account
            .logout()
            .onSuccess(() => {
                setUserName(undefined);
                notify.success(t('logoutSuccess'), notificationId);
                router.push(loginHref);
            })
            .onError(() => notify.error(t('logoutFailed'), notificationId))
            .onFinish(() => setIsLoggingOut(false))
            .execute();
    }, [api.account, router, t, loginHref, isLoggingOut]);

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
