'use client';

import { useCallback, useEffect, useState } from 'react';
import type { ReactNode } from 'react';

import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Bell, LogIn, LogOut, Menu, Search, UserPlus } from '@/components/ui/icons';
import { Skeleton } from '@/components/ui/skeleton';
import useApi from '@/hooks/useApi';
import { Link, useRouter } from '@/i18n/navigation';

function initials(name: string) {
    return name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0])
        .join('')
        .toUpperCase();
}

interface AppHeaderProps {
    actions?: ReactNode;
    showGlobalSearch?: boolean;
    showNotifications?: boolean;
    onOpenNavigation?: () => void;
    homeHref?: string;
    loginHref?: string;
    registerHref?: string;
}

export function AppHeader({ actions, showGlobalSearch, showNotifications = true, onOpenNavigation, homeHref = '/dashboard', loginHref = '/login', registerHref = '/register' }: AppHeaderProps) {
    const t = useTranslations('Navigation');
    const router = useRouter();
    const api = useApi();
    const [userName, setUserName] = useState<string>();
    const [isLoadingSession, setIsLoadingSession] = useState(true);

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
        api.account
            .logout()
            .onSuccess(() => {
                setUserName(undefined);
                toast.success(t('logoutSuccess'));
                router.push(loginHref);
            })
            .execute();
    }, [api.account, router, t, loginHref]);

    return (
        <header className="sticky top-0 z-40 flex h-[var(--header-height)] items-center bg-primary px-4 text-primary-foreground shadow-md sm:px-7">
            {!!onOpenNavigation && <Button
                aria-label={t('openNavigation')}
                className="mr-2 text-primary-foreground hover:bg-white/15 hover:text-primary-foreground lg:hidden"
                size="icon"
                variant="ghost"
                onClick={onOpenNavigation}
            >
                <Menu aria-hidden="true" className="size-5" />
            </Button>}
            <Link href={homeHref} className="flex shrink-0 items-center gap-2.5 text-primary-foreground">
                <Image alt="flowiy logo" height={50} priority src="/new_logo_dark.png" width={159} />
            </Link>
            {!!(showGlobalSearch ?? false) && (
                <div
                    aria-hidden="true"
                    className="mx-6 hidden h-10 max-w-xl flex-1 items-center rounded-lg border border-white/25 bg-black/10 px-4 text-sm shadow-inner lg:flex"
                >
                    <Search className="mr-3 size-4 shrink-0" />
                    <span className="truncate text-primary-foreground/95">{t('searchPlaceholder')}</span>
                    <span className="ml-auto rounded border border-white/20 bg-black/10 px-1.5 py-0.5 text-xs font-semibold">
                        ⌘ K
                    </span>
                </div>
            )}
            <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-4">
                {actions}
                {!!showNotifications && <span aria-hidden="true" className="relative hidden size-10 items-center justify-center lg:flex">
                    <Bell className="size-5" />
                    <span className="absolute right-0 top-0 flex size-4 items-center justify-center rounded-full bg-card text-[10px] font-bold text-primary">
                        3
                    </span>
                </span>}
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
                        <Button aria-label={t('logout')} size="icon" variant="ghost" onClick={logoutClickHandler}>
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
        </header>
    );
}
