'use client';

import { useId, useState } from 'react';
import type { ReactNode } from 'react';

import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { useTheme } from 'next-themes';

import { AppHeaderAccount } from '@/components/app/app-header-account';
import { FormLanguageSwitch } from '@/components/shared/form-language-switch';
import { Button } from '@/components/ui/button';
import { ArrowRight, Bell, Menu, Moon, Search, Sun, UserPlus, X } from '@/components/ui/icons';
import { Link } from '@/i18n/navigation';

interface AppHeaderProps {
    navigation?: readonly { href: string; label: string }[];
    navigationExtra?: ReactNode;
    mobileNavigationExtra?: ReactNode;
    accountMode?: 'marketing' | 'session' | 'none';
    actions?: ReactNode;
    showGlobalSearch?: boolean;
    showNotifications?: boolean;
    onOpenNavigation?: () => void;
    homeHref?: string;
    loginHref?: string;
    registerHref?: string;
    isDirty?: boolean;
    themeControl?: { isLightTheme: boolean; onToggle: () => void };
}

export function AppHeader({
    navigation = [], navigationExtra, mobileNavigationExtra, accountMode = 'session', actions,
    showGlobalSearch = false, showNotifications = true, onOpenNavigation,
    homeHref = '/', loginHref = '/login', registerHref = '/register', isDirty = false, themeControl,
}: AppHeaderProps) {
    const t = useTranslations('Home.navigation');
    const app = useTranslations('Navigation');
    const { resolvedTheme, setTheme } = useTheme();
    const mobileNavigationId = useId();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const isLightTheme = themeControl?.isLightTheme ?? (resolvedTheme === 'light');
    const hasNavigation = navigation.length > 0 || navigationExtra !== undefined;

    const closeMenuHandler = () => setIsMenuOpen(false);
    const toggleThemeHandler = () => {
        if (themeControl) themeControl.onToggle();
        else setTheme(isLightTheme ? 'dark' : 'light');
    };

    return (
        <header className="app-header marketing-header">
            <div className="app-header-inner">
                <Link className="app-header-brand" href={homeHref} aria-label={t('home')}>
                    <Image src="/new_logo_dark.png" alt="Flowiy" width={162} height={51} priority />
                </Link>
                {!!hasNavigation && (
                    <nav className="app-header-desktop-nav" aria-label={t('main')}>
                        {navigation.map(({ href, label }) => <Link href={href} key={href}>{label}</Link>)}
                        {navigationExtra}
                    </nav>
                )}
                {!!showGlobalSearch && (
                    <div aria-hidden="true" className="mx-6 hidden h-10 max-w-xl flex-1 items-center rounded-lg border border-white/25 bg-black/10 px-4 text-sm lg:flex">
                        <Search className="mr-3 size-4 shrink-0" />
                        <span className="truncate">{app('searchPlaceholder')}</span>
                        <span className="ml-auto rounded border border-white/20 bg-black/10 px-1.5 py-0.5 text-xs font-semibold">⌘ K</span>
                    </div>
                )}
                <div className="app-header-actions">
                    <div className="app-header-controls">
                        <FormLanguageSwitch isDirty={isDirty} />
                        <Button className="app-header-icon-button" size="icon" variant="ghost" type="button"
                            onClick={toggleThemeHandler} aria-label={t(isLightTheme ? 'darkTheme' : 'lightTheme')}>
                            {isLightTheme ? <Moon aria-hidden="true" /> : <Sun aria-hidden="true" />}
                        </Button>
                    </div>
                    {accountMode === 'marketing' && (
                        <>
                            <Link href={loginHref} className="marketing-login"><UserPlus aria-hidden="true" />{t('login')}</Link>
                            <Button asChild className="marketing-button marketing-button--light">
                                <Link href={registerHref}>{t('start')}<ArrowRight aria-hidden="true" /></Link>
                            </Button>
                        </>
                    )}
                    {actions}
                    {!!showNotifications && <span aria-hidden="true" className="relative hidden size-10 items-center justify-center lg:flex">
                        <Bell className="size-5" />
                        <span className="absolute right-0 top-0 flex size-4 items-center justify-center rounded-full bg-card text-[10px] font-bold text-primary">3</span>
                    </span>}
                    {accountMode === 'session' && <AppHeaderAccount loginHref={loginHref} registerHref={registerHref} />}
                    {!!onOpenNavigation && (
                        <Button className="app-header-icon-button lg:hidden" size="icon" variant="ghost"
                            type="button" aria-label={app('openNavigation')} onClick={onOpenNavigation}>
                            <Menu aria-hidden="true" />
                        </Button>
                    )}
                    {!!hasNavigation && (
                        <Button className="app-header-icon-button app-header-menu-button" size="icon" variant="ghost" type="button"
                            onClick={() => setIsMenuOpen(!isMenuOpen)} aria-label={t(isMenuOpen ? 'closeMenu' : 'openMenu')}
                            aria-expanded={isMenuOpen} aria-controls={mobileNavigationId}>
                            {isMenuOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
                        </Button>
                    )}
                </div>
            </div>
            {!!hasNavigation && (
                <nav id={mobileNavigationId} className="app-header-mobile-nav" hidden={!isMenuOpen} aria-label={t('main')}>
                    {navigation.map(({ href, label }) => <Link href={href} key={href} onClick={closeMenuHandler}>{label}</Link>)}
                    {accountMode === 'marketing' && <Link href={loginHref} onClick={closeMenuHandler}>{t('login')}</Link>}
                    {navigationExtra}
                    {mobileNavigationExtra}
                </nav>
            )}
        </header>
    );
}
