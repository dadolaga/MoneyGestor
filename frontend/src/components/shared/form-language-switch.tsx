'use client';

import { useState } from 'react';

import { useLocale, useTranslations } from 'next-intl';

import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select';
import { usePathname, useRouter } from '@/i18n/navigation';

export function FormLanguageSwitch({ isDirty }: { isDirty: boolean }) {
    const locale = useLocale();
    const t = useTranslations('Auth');
    const common = useTranslations('Common.actions');
    const pathname = usePathname();
    const router = useRouter();
    const [pendingLocale, setPendingLocale] = useState<'en' | 'it'>();

    const changeLanguageHandler = (language: 'en' | 'it') => {
        router.replace(`${pathname}${window.location.search}${window.location.hash}`, { locale: language });
    };

    const selectLanguageHandler = (language: string) => {
        if ((language !== 'en' && language !== 'it') || language === locale) return;
        if (isDirty) {
            setPendingLocale(language);
        } else {
            changeLanguageHandler(language);
        }
    };

    return (
        <>
            <Select value={locale} onValueChange={selectLanguageHandler}>
                <SelectTrigger aria-label={t('language')} className="app-header-language-select">
                    <span lang={locale}>{locale.toUpperCase()}</span>
                </SelectTrigger>
                <SelectContent align="end">
                    <SelectItem value="en"><span lang="en">{t('english')}</span></SelectItem>
                    <SelectItem value="it"><span lang="it">{t('italian')}</span></SelectItem>
                </SelectContent>
            </Select>
            <AlertDialog open={pendingLocale !== undefined} onOpenChange={(open) => { if (!open) setPendingLocale(undefined); }}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t('changeLanguage')}</AlertDialogTitle>
                        <AlertDialogDescription>{t('languageDiscard')}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{common('cancel')}</AlertDialogCancel>
                        <AlertDialogAction onClick={() => {
                            if (pendingLocale) changeLanguageHandler(pendingLocale);
                        }}>{t('changeLanguage')}</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
