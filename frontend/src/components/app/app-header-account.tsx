'use client';

import { useCallback, useEffect, useState } from 'react';

import { useTranslations } from 'next-intl';

import { ComingSoonDialog } from '@/components/shared/coming-soon-dialog';
import { FormLanguageSwitch } from '@/components/shared/form-language-switch';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ChevronDown, Globe, LogIn, LogOut, Moon, Settings, SlidersHorizontal, Sun, UserPlus, UserRound } from '@/components/ui/icons';
import { Skeleton } from '@/components/ui/skeleton';
import { useRouter } from '@/i18n/navigation';
import { apiClient } from '@/lib/api/client';
import type { AccountProfile } from '@/lib/api/client';
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
    isDirty: boolean;
    isLightTheme: boolean;
    onToggleTheme: () => void;
}

export function AppHeaderAccount({ loginHref, registerHref, isDirty, isLightTheme, onToggleTheme }: AppHeaderAccountProps) {
    const t = useTranslations('Navigation');
    const common = useTranslations('Common');
    const router = useRouter();
    const [user, setUser] = useState<AccountProfile>();
    const [isLoadingSession, setIsLoadingSession] = useState(true);
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [panel, setPanel] = useState<'profile' | 'appearance'>();
    const [isComingSoonOpen, setIsComingSoonOpen] = useState(false);
    const userName = user ? `${user.firstname} ${user.lastname}`.trim() || user.username : '';

    useEffect(() => {
        const controller = new AbortController();
        const timeout = window.setTimeout(() => {
            void apiClient.session(controller.signal)
                .then((user) => {
                    if (!controller.signal.aborted) setUser(user);
                })
                .catch(() => {
                    if (!controller.signal.aborted) setUser(undefined);
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
            setIsMenuOpen(false);
            setPanel(undefined);
            setUser(undefined);
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
            {/* eslint-disable-next-line react/jsx-no-leaked-render */}
            {isLoadingSession === true ? (
                <Skeleton className="h-10 w-10 rounded-full" />
            ) : user !== undefined ? (
                <>
                    <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
                        <DropdownMenuTrigger className="app-header-account-trigger" aria-label={`${t('accountMenu')}: ${userName}`}>
                            <Avatar className="app-header-avatar">
                                <AvatarFallback>{initials(userName)}</AvatarFallback>
                            </Avatar>
                            <span className="app-header-user-name">{userName}</span>
                            <ChevronDown aria-hidden="true" className="size-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" sideOffset={4} className="app-header-account-menu">
                            <div className="app-header-account-summary" role="presentation">
                                <Avatar className="app-header-avatar">
                                    <AvatarFallback>{initials(userName)}</AvatarFallback>
                                </Avatar>
                                <div><strong>{userName}</strong><span>{t('personalAccount')}</span></div>
                            </div>
                            <DropdownMenuItem className="app-header-account-item" onSelect={() => setPanel('profile')}>
                                <UserRound aria-hidden="true" />{t('profile')}
                            </DropdownMenuItem>
                            <DropdownMenuItem className="app-header-account-item" onSelect={() => setIsComingSoonOpen(true)}>
                                <Settings aria-hidden="true" />{t('settings')}
                            </DropdownMenuItem>
                            <DropdownMenuItem className="app-header-account-item" onSelect={() => router.push('/dashboard/preferences')}>
                                <SlidersHorizontal aria-hidden="true" />{t('preferences')}
                            </DropdownMenuItem>
                            <DropdownMenuItem className="app-header-account-item" onSelect={() => setPanel('appearance')}>
                                <Globe aria-hidden="true" />{t('themeAndLanguage')}
                            </DropdownMenuItem>
                            <div className="app-header-account-divider" role="separator" />
                            <DropdownMenuItem className="app-header-account-item app-header-logout" disabled={isLoggingOut}
                                onSelect={(event) => { event.preventDefault(); void logoutClickHandler(); }}>
                                <LogOut aria-hidden="true" />{t(isLoggingOut ? 'loggingOut' : 'logout')}
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                    <Dialog open={panel !== undefined} onOpenChange={(open) => { if (!open) setPanel(undefined); }}>
                        <DialogContent closeLabel={common('actions.close')} className="app-header-profile-dialog">
                            <DialogHeader className="pr-8">
                                <DialogTitle>{t(panel === 'profile' ? 'profile' : 'themeAndLanguage')}</DialogTitle>
                                <DialogDescription>{t(panel === 'profile' ? 'personalAccount' : 'appearanceDescription')}</DialogDescription>
                            </DialogHeader>
                            <DialogBody>
                                {panel === 'profile' ? (
                                    <dl className="m-0 grid gap-4 text-sm">
                                        {[['fullName', userName], ['username', user.username], ['email', user.email]].map(([label, value]) => (
                                            <div key={label}><dt className="text-muted-foreground">{t(label)}</dt><dd className="m-0 mt-1 break-words font-medium">{value}</dd></div>
                                        ))}
                                    </dl>
                                ) : (
                                    <div className="grid gap-4">
                                        <div className="flex items-center justify-between gap-4">
                                            <span className="text-sm">{common('theme.label')}</span>
                                            <Button type="button" variant="secondary" onClick={onToggleTheme}>
                                                {isLightTheme ? <Moon aria-hidden="true" className="size-4" /> : <Sun aria-hidden="true" className="size-4" />}
                                                {common(isLightTheme ? 'theme.dark' : 'theme.light')}
                                            </Button>
                                        </div>
                                        <div className="flex items-center justify-between gap-4">
                                            <span className="text-sm">{t('language')}</span>
                                            <FormLanguageSwitch isDirty={isDirty} />
                                        </div>
                                    </div>
                                )}
                            </DialogBody>
                        </DialogContent>
                    </Dialog>
                    <ComingSoonDialog open={isComingSoonOpen} onOpenChange={setIsComingSoonOpen} />
                </>
                ) : (
                    <div className="flex items-center gap-3">
                        <Button aria-label={t('enter')} size="default" variant="border" onClick={loginClickHandler}>
                            <LogIn aria-hidden="true" />
                            <span className="app-header-account-label">{t('enter')}</span>
                        </Button>
                        <Button
                            aria-label={t('register')}
                            size="default"
                            className="app-header-register"
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
