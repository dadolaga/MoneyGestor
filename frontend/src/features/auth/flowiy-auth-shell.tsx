'use client';

import type { ReactNode } from 'react';

import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { useTheme } from 'next-themes';

import { AppHeader } from '@/components/app/app-header';
import { MarketingBrand } from '@/components/shared/marketing-brand';
import { ArrowLeft, BarChart3, ShieldCheck, Users } from '@/components/ui/icons';
import { Link } from '@/i18n/navigation';

export function FlowiyAuthShell({ mode, isDirty, children }: { mode: 'login' | 'register'; isDirty: boolean; children: ReactNode }) {
    const t = useTranslations('FlowiyAuth');
    const { resolvedTheme } = useTheme();
    const isLightTheme = resolvedTheme === 'light';
    const loginCurrent = mode === 'login' ? 'page' : undefined;
    const registerCurrent = mode === 'register' ? 'page' : undefined;
    const benefits = [
        { key: 'security', icon: ShieldCheck },
        { key: 'spending', icon: BarChart3 },
        { key: 'sharing', icon: Users },
    ] as const;

    return (
        <div className="flowiy-home flowiy-auth" data-theme={isLightTheme ? 'light' : 'dark'}>
            <AppHeader homeHref="/" showNotifications={false} isDirty={isDirty} />
            <main className="flowiy-auth-main">
                <div className="flowiy-auth-art" aria-hidden="true">
                    <span className="flowiy-auth-wave flowiy-auth-wave--top" />
                    <span className="flowiy-auth-wave flowiy-auth-wave--left" />
                    <span className="flowiy-auth-wave flowiy-auth-wave--bottom" />
                    <span className="flowiy-auth-wave flowiy-auth-wave--right" />
                </div>
                <div className="flowiy-auth-toolbar">
                    <Link className="flowiy-auth-back" href="/">
                        <ArrowLeft aria-hidden="true" className="size-4" />{t('backHome')}
                    </Link>
                </div>
                <div className="flowiy-auth-grid">
                    <section className="flowiy-auth-intro" aria-labelledby="flowiy-auth-headline">
                        <div className="flowiy-auth-intro-copy">
                            <div className="flowiy-auth-brand"><MarketingBrand width={132} isLightTheme={isLightTheme} /></div>
                            <h1 id="flowiy-auth-headline">{t('intro.headline')}<br /><span>{t('intro.highlight')}</span></h1>
                            <p className="flowiy-auth-description">{t('intro.description')}</p>
                            <ul className="flowiy-auth-benefits">
                                {benefits.map(({ key, icon: Icon }) => (
                                    <li className="flowiy-auth-benefit" key={key}>
                                        <span className="flowiy-auth-benefit-icon"><Icon aria-hidden="true" className="size-7" /></span>
                                        <div>
                                            <h2>{t(`benefits.${key}.title`)}</h2>
                                            <p>{t(`benefits.${key}.description`)}</p>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div className="flowiy-auth-dashboard" role="img" aria-label={t('dashboardPreview')}>
                            <Image
                                alt="" aria-hidden="true" className="flowiy-auth-dashboard-image"
                                height={821} width={1916} src="/flowiy-auth-reference.png"
                                sizes="(max-width: 860px) 1px, (max-width: 1100px) 110vw, 1800px"
                            />
                        </div>
                    </section>
                    <div className="flowiy-auth-card">
                        <nav className="flowiy-auth-switch" aria-label={t('switchLabel')}>
                            <Link href="/login" aria-current={loginCurrent}>{t('loginTab')}</Link>
                            <Link href="/register" aria-current={registerCurrent}>{t('registerTab')}</Link>
                        </nav>
                        <div className="flowiy-auth-form">{children}</div>
                    </div>
                </div>
            </main>
        </div>
    );
}
