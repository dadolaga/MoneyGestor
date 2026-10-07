'use client';

import { useState } from 'react';

import { useTranslations } from 'next-intl';

import { AppHeader } from '@/components/app/app-header';
import {
    ArrowLeftRight,
    BarChart3,
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

    return (
        <div className="min-h-dvh max-h-dvh bg-background text-foreground">
            <AppHeader showGlobalSearch={showGlobalSearch} onOpenNavigation={() => setMobileNavigationOpen(true)} />
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
