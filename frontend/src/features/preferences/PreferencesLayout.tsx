'use client';

import type { ReactNode } from 'react';

import { useTranslations } from 'next-intl';

import { ChevronRight, SlidersHorizontal } from '@/components/ui/icons';

export function PreferencesLayout({ children }: { children: ReactNode }) {
    const t = useTranslations('Preferences');

    return (
        <div className="mx-auto flex w-full min-w-0 max-w-6xl flex-col gap-5 [&_*]:box-border">
            <header>
                <p className="m-0 mb-3 flex items-center gap-2 text-xs font-medium text-muted-foreground">
                    <SlidersHorizontal aria-hidden="true" className="size-4" />
                    {t('account')}<ChevronRight aria-hidden="true" className="size-3" />{t('title')}
                </p>
                <h1 className="m-0 text-3xl font-bold tracking-tight sm:text-4xl">{t('title')}</h1>
                <p className="m-0 mt-1.5 text-sm text-muted-foreground sm:text-base">{t('description')}</p>
            </header>
            {children}
        </div>
    );
}
