'use client';

import { useTranslations } from 'next-intl';

import { Tag } from '@/components/ui/icons';
import { Link, usePathname } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

export function PreferencesNavigation({ onNavigate }: { onNavigate?: () => void }) {
    const t = useTranslations('Preferences');
    const pathname = usePathname();
    const sections = [
        { href: '/dashboard/preferences/transaction-types', icon: Tag, label: t('types') },
    ];

    return (
        <div className="grid gap-3">
            <p className="m-0 px-3 pt-1 text-xs font-semibold text-muted-foreground">{t('title')}</p>
            <nav aria-label={t('navigation')} className="grid gap-1">
                {sections.map(({ href, icon: Icon, label }) => {
                    const active = pathname === href || pathname.startsWith(`${href}/`);
                    const currentPage = active ? 'page' : undefined;
                    return (
                        <Link key={href} href={href} onClick={onNavigate} aria-current={currentPage}
                            className={cn(
                                'flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium no-underline transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                                active ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                            )}>
                            <Icon aria-hidden="true" className="size-5" />{label}
                        </Link>
                    );
                })}
            </nav>
        </div>
    );
}
