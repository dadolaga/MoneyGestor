'use client';

import type { ReactNode } from 'react';

import { useTranslations } from 'next-intl';

import { Dialog, DialogBody, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

export function MarketingFaq({ children }: { children: ReactNode }) {
    const t = useTranslations('Home.faq');
    return (
        <Dialog>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent closeLabel={t('close')}>
                <DialogHeader>
                    <DialogTitle>{t('title')}</DialogTitle>
                    <DialogDescription>{t('description')}</DialogDescription>
                </DialogHeader>
                <DialogBody className="marketing-faq-list">
                    {(['start', 'languages', 'preview'] as const).map((key) => (
                        <details key={key}>
                            <summary>{t(`${key}.question`)}</summary>
                            <p>{t(`${key}.answer`)}</p>
                        </details>
                    ))}
                </DialogBody>
            </DialogContent>
        </Dialog>
    );
}
