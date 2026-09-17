'use client';

import { useCallback, useEffect, useState } from 'react';

import {
    ArrowLeftRight,
    BarChart3,
    Bell,
    LayoutDashboard,
    LogIn,
    Menu,
    Search,
    UserPlus,
    Wallet,
} from 'lucide-react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { useCookies } from 'react-cookie';
import { toast } from 'sonner';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import useApi from '@/hooks/useApi';
import { Link, usePathname, useRouter } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

type NavigationItem = {
    href: '/dashboard' | '/dashboard/wallet' | '/dashboard/transaction' | '/dashboard/not_implemented';
    icon: typeof LayoutDashboard;
    label: string;
};

function initials(name: string) {
    return name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0])
        .join('')
        .toUpperCase();
}

export function AppShell({ showGlobalSearch, children }: { showGlobalSearch?: boolean; children: React.ReactNode }) {
    const t = useTranslations('Navigation');
    const pathname = usePathname();
    const router = useRouter();
    const api = useApi();
    const [cookies, , removeCookie] = useCookies(['token']);
    const [mobileNavigationOpen, setMobileNavigationOpen] = useState(false);
    const [userName, setUserName] = useState<string>();
    const [isLoadingSession, setIsLoadingSession] = useState(Boolean(cookies.token));

    const navigation: NavigationItem[] = [
        { href: '/dashboard', icon: LayoutDashboard, label: t('dashboard') },
        { href: '/dashboard/wallet', icon: Wallet, label: t('wallets') },
        { href: '/dashboard/transaction', icon: ArrowLeftRight, label: t('transactions') },
        { href: '/dashboard/not_implemented', icon: BarChart3, label: t('reports') },
    ];

    useEffect(() => {
        if (!cookies.token) return;

        const timeout = window.setTimeout(() => {
            api.user
                .info()
                .onSuccess((user) => setUserName(`${user.firstname} ${user.lastname}`))
                .onError(() => {
                    removeCookie('token', { path: '/' });
                    setUserName(undefined);
                    toast.error(t('sessionExpired'));
                })
                .onFinish(() => setIsLoadingSession(false))
                .execute();
        }, 0);

        return () => window.clearTimeout(timeout);
        // `useApi` exposes an intentionally lightweight fluent client whose object identity is not stable.
        // The session is refreshed only when the token changes.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [cookies.token, removeCookie, t]);

    const navigationLinks = (onNavigate?: () => void) => (
        <nav aria-label={t('primaryNavigation')} className="grid gap-1">
            {navigation.map(({ href, icon: Icon, label }) => {
                const active = pathname === href;

                return (
                    <Link
                        key={href}
                        href={href}
                        onClick={onNavigate}
                        className={cn(
                            'flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                            active
                                ? 'bg-accent text-accent-foreground'
                                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                        )}
                    >
                        <Icon aria-hidden="true" className="size-5" />
                        {label}
                    </Link>
                );
            })}
        </nav>
    );

    const loginClickHandler = useCallback(() => {
        router.push('/login');
    }, [router]);

    const registrationClickHandler = useCallback(() => {
        router.push('/register');
    }, [router]);

    return (
        <div className="min-h-dvh max-h-dvh bg-background text-foreground">
            <header className="sticky top-0 z-40 flex h-[var(--header-height)] items-center bg-primary px-4 text-primary-foreground shadow-md sm:px-7">
                <Button
                    aria-label={t('openNavigation')}
                    className="mr-2 text-primary-foreground hover:bg-white/15 hover:text-primary-foreground lg:hidden"
                    size="icon"
                    variant="ghost"
                    onClick={() => setMobileNavigationOpen(true)}
                >
                    <Menu aria-hidden="true" className="size-5" />
                </Button>
                <Link href="/dashboard" className="flex shrink-0 items-center gap-2.5 text-primary-foreground">
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
                    <span aria-hidden="true" className="relative hidden size-10 items-center justify-center lg:flex">
                        <Bell className="size-5" />
                        <span className="absolute right-0 top-0 flex size-4 items-center justify-center rounded-full bg-card text-[10px] font-bold text-primary">
                            3
                        </span>
                    </span>
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
                        </div>
                    ) : (
                        <div className="flex items-center gap-3">
                            <Button size="default" variant="border" onClick={loginClickHandler}>
                                <LogIn aria-hidden="true" />
                                {t('enter')}
                            </Button>
                            <Button size="default" className="bg-white text-(--primary)" variant={'outline'} onClick={registrationClickHandler}>
                                <UserPlus aria-hidden="true" />
                                {t('register')}
                            </Button>
                        </div>
                    )}
                </div>
            </header>
            <div className="mx-auto flex h-[calc(100dvh-var(--header-height))] overflow-auto">
                <aside className="hidden w-[var(--navigation-width)] shrink-0 border-r border-border bg-card p-3 lg:block">
                    {navigationLinks()}
                </aside>
                <main className="min-w-0 flex-1 p-4 sm:p-6 overflow-auto">{children}</main>
            </div>
            <Sheet open={mobileNavigationOpen} onOpenChange={setMobileNavigationOpen}>
                <SheetContent side="left">
                    <SheetHeader>
                        <SheetTitle>{t('primaryNavigation')}</SheetTitle>
                        <SheetDescription>{t('navigationDescription')}</SheetDescription>
                    </SheetHeader>
                    <Separator />
                    {navigationLinks(() => setMobileNavigationOpen(false))}
                </SheetContent>
            </Sheet>
        </div>
    );
}
