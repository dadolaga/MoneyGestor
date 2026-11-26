'use client';

import { useId, useState } from 'react';
import type { ReactNode } from 'react';

import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { useTheme } from 'next-themes';

import { AppHeaderAccount } from '@/components/app/app-header-account';
import { ComingSoonDialog } from '@/components/shared/coming-soon-dialog';
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
    showGlobalSearch = true, showNotifications = true, onOpenNavigation,
    homeHref = '/', loginHref = '/login', registerHref = '/register', isDirty = false, themeControl,
}: AppHeaderProps) {
    const t = useTranslations('Home.navigation');
    const app = useTranslations('Navigation');
    const { resolvedTheme, setTheme } = useTheme();
    const mobileNavigationId = useId();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isComingSoonOpen, setIsComingSoonOpen] = useState(false);
    const isLightTheme = themeControl?.isLightTheme ?? (resolvedTheme === 'light');
    const hasNavigation = navigation.length > 0 || navigationExtra !== undefined;

    const closeMenuHandler = () => setIsMenuOpen(false);
    const toggleThemeHandler = () => {
        if (themeControl) themeControl.onToggle();
        else setTheme(isLightTheme ? 'dark' : 'light');
    };

    return (
        <header className="app-header marketing-header" data-theme={isLightTheme ? 'light' : 'dark'}>
            <svg className="app-header-wave" viewBox="0 0 1672 66" preserveAspectRatio="none" aria-hidden="true">
                <path d="M900 67 C1025 67 1048 16 1120 -6 L1672 -6 L1672 67 Z" />
            </svg>
            <div className="app-header-inner">
                <Link className="app-header-brand" href={homeHref} aria-label={t('home')}>
                    <Image src={isLightTheme ? '/new_logo.png' : '/new_logo_dark.png'} alt="Flowiy" width={162} height={51} priority />
                </Link>
                {!!hasNavigation && (
                    <nav className="app-header-desktop-nav" aria-label={t('main')}>
                        {navigation.map(({ href, label }) => <Link href={href} key={href}>{label}</Link>)}
                        {navigationExtra}
                    </nav>
                )}
                {!!showGlobalSearch && !hasNavigation && (
                    <button type="button" className="app-header-search" onClick={() => setIsComingSoonOpen(true)}>
                        <Search aria-hidden="true" className="size-5" />
                        <span>{app('searchPlaceholder')}</span>
                    </button>
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
                    {!!showNotifications && (
                        <Button type="button" variant="ghost" size="icon" className="app-header-icon-button app-header-notifications"
                            aria-label={app('notifications')} onClick={() => setIsComingSoonOpen(true)}>
                            <Bell aria-hidden="true" />
                        </Button>
                    )}
                    {accountMode === 'session' && <AppHeaderAccount loginHref={loginHref} registerHref={registerHref}
                        isDirty={isDirty} isLightTheme={isLightTheme} onToggleTheme={toggleThemeHandler} />}
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
            <ComingSoonDialog open={isComingSoonOpen} onOpenChange={setIsComingSoonOpen} />
        </header>
    );
}
