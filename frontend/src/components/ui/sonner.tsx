'use client';

import type { CSSProperties } from 'react';

import { useTranslations } from 'next-intl';
import { useTheme } from 'next-themes';
import { Toaster as Sonner } from 'sonner';

const toastStyle: CSSProperties & Record<`--${string}`, string> = {
    '--normal-bg': 'var(--popover)',
    '--normal-bg-hover': 'var(--muted)',
    '--normal-text': 'var(--popover-foreground)',
    '--normal-border': 'var(--border)',
    '--normal-border-hover': 'var(--border)',
    '--border-radius': 'var(--radius)',
    fontFamily: 'inherit',
};

export function Toaster() {
    const t = useTranslations('Common.notifications');
    const { resolvedTheme } = useTheme();

    return (
        <Sonner
            closeButton
            containerAriaLabel={t('label')}
            mobileOffset={16}
            offset={24}
            position="bottom-right"
            style={toastStyle}
            theme={resolvedTheme === 'dark' ? 'dark' : 'light'}
            visibleToasts={3}
            toastOptions={{
                closeButtonAriaLabel: t('close'),
                classNames: {
                    success: '[&_[data-icon]]:text-income',
                    error: '[&_[data-icon]]:text-destructive',
                },
            }}
        />
    );
}
