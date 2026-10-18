'use client';

import { useState } from 'react';

import { useTranslations } from 'next-intl';

import { AppHeader } from '@/components/app/app-header';
import { Button } from '@/components/ui/button';
import {
    ArrowLeftRight,
    BarChart3,
    Ellipsis,
    FileText,
    House,
    LayoutDashboard,
    Wallet,
} from '@/components/ui/icons';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Link, usePathname } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

type NavigationItem = {
    href: '/dashboard' | '/dashboard/wallet' | '/dashboard/transaction' | '/dashboard/not_implemented';
    icon: typeof LayoutDashboard;
    label: string;
};

export function AppShell({ showGlobalSearch, children }: { showGlobalSearch?: boolean; children: React.ReactNode }) {
    const t = useTranslations('Navigation');
    const pathname = usePathname();
    const [mobileNavigationOpen, setMobileNavigationOpen] = useState(false);

    const navigation: NavigationItem[] = [
        { href: '/dashboard', icon: LayoutDashboard, label: t('dashboard') },
        { href: '/dashboard/wallet', icon: Wallet, label: t('wallets') },
        { href: '/dashboard/transaction', icon: ArrowLeftRight, label: t('transactions') },
        { href: '/dashboard/not_implemented', icon: BarChart3, label: t('reports') },
    ];

    const navigationLinks = (onNavigate?: () => void) => (
        <nav aria-label={t('primaryNavigation')} className="grid gap-1">
            {navigation.map(({ href, icon: Icon, label }) => {
                const active = pathname === href;
                const currentPage = active ? 'page' : undefined;

                return (
                    <Link
                        key={href}
                        href={href}
                        onClick={onNavigate}
                        aria-current={currentPage}
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

    return (
        <div className="min-h-dvh max-h-dvh bg-background text-foreground">
            <AppHeader showGlobalSearch={showGlobalSearch} onOpenNavigation={() => setMobileNavigationOpen(true)} />
            <div className="mx-auto flex h-[calc(100dvh-var(--header-height))] overflow-hidden">
                <aside className="hidden w-[var(--navigation-width)] shrink-0 border-r border-border bg-card p-3 lg:block">
                    {navigationLinks()}
                </aside>
                <main className="min-w-0 flex-1 overflow-auto p-3 pb-[calc(5rem+env(safe-area-inset-bottom))] sm:p-6 sm:pb-[calc(6rem+env(safe-area-inset-bottom))] lg:pb-6">{children}</main>
            </div>
            <nav aria-label={t('primaryNavigation')}
                className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-3 border-0 border-t border-solid border-border bg-card pb-[env(safe-area-inset-bottom)] lg:hidden">
                {navigation.filter(({ href }) => href === '/dashboard' || href === '/dashboard/transaction').map(({ href, label }) => {
                    const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(`${href}/`));
                    const currentPage = active ? 'page' : undefined;
                    const Icon = href === '/dashboard' ? House : FileText;
                    const mobileLabel = href === '/dashboard' ? t('home') : label;
                    return (
                        <Link key={href} href={href} aria-current={currentPage}
                            className={cn('flex min-h-16 min-w-0 flex-col items-center justify-center gap-1 px-2 text-xs font-medium no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
                                active ? 'bg-primary/5 text-primary' : 'text-muted-foreground hover:bg-muted')}>
                            <Icon aria-hidden="true" className="size-6" />
                            {mobileLabel}
                        </Link>
                    );
                })}
                <Button type="button" variant="transparent" onClick={() => setMobileNavigationOpen(true)}
                    aria-haspopup="dialog" aria-expanded={mobileNavigationOpen}
                    className={cn('h-auto min-h-16 flex-col gap-1 rounded-none px-2 text-xs',
                        pathname !== '/dashboard' && !pathname.startsWith('/dashboard/transaction') ? 'bg-primary/5 text-primary' : 'text-muted-foreground')}>
                    <Ellipsis aria-hidden="true" className="size-6" />{t('more')}
                </Button>
            </nav>
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
