'use client';

import { useLayoutEffect, useRef } from 'react';
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
    const layerRef = useRef<HTMLDivElement>(null);

    useLayoutEffect(() => {
        const layer = layerRef.current;
        if (!layer) return;
        const placeholder = document.createComment('notification-layer');
        layer.before(placeholder);
        let dialogs = Array.from(document.querySelectorAll<HTMLDialogElement>('dialog:modal'));

        const updateLayer = (records: MutationRecord[] = []) => {
            for (const record of records) {
                if (record.type === 'attributes' && record.target instanceof HTMLDialogElement) {
                    const dialog = record.target;
                    dialogs = dialogs.filter((current) => current !== dialog);
                    if (dialog.matches(':modal')) dialogs.push(dialog);
                }
            }
            dialogs = dialogs.filter((dialog) => dialog.isConnected && dialog.matches(':modal'));
            const parent = dialogs.at(-1) ?? document.body;

            // Modal descendants stay interactive; a popover paints above the native dialog top layer.
            if (layer.parentElement !== parent) {
                if (layer.matches(':popover-open')) layer.hidePopover();
                parent.appendChild(layer);
            }
            if (!layer.matches(':popover-open')) layer.showPopover();
        };

        updateLayer();
        const observer = new MutationObserver(updateLayer);
        observer.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['open'] });
        return () => {
            observer.disconnect();
            if (layer.matches(':popover-open')) layer.hidePopover();
            // Restore React's original parent before it removes this subtree.
            placeholder.replaceWith(layer);
        };
    }, []);

    return (
        <div ref={layerRef} popover="manual" className="notification-layer">
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
        </div>
    );
}
