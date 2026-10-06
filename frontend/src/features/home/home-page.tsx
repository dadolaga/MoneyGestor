'use client';

import { useState } from 'react';
import type { ReactNode } from 'react';

import Image from 'next/image';
import { useFormatter, useLocale, useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import {
    ArrowLeftRight,
    ArrowRight,
    BarChart3,
    Check,
    CreditCard,
    FileText,
    Menu,
    Moon,
    PiggyBank,
    Sun,
    UserPlus,
    Wallet,
    X,
} from '@/components/ui/icons';
import type { IconComponent } from '@/components/ui/icons';
import { Link } from '@/i18n/navigation';

type Feature = 'movements' | 'budgets' | 'reports' | 'wallets';
const featureIcons: Record<Feature, IconComponent> = {
    movements: ArrowLeftRight,
    budgets: PiggyBank,
    reports: BarChart3,
    wallets: Wallet,
};
const features: Feature[] = ['movements', 'budgets', 'reports', 'wallets'];
const featureTones = { movements: 'blue', budgets: 'brand', reports: 'brand', wallets: 'green' } as const;
const budgetIcons = [PiggyBank, Wallet];
const benefits = ['wallets', 'budgets', 'reports', 'sharing'] as const;
const benefitIcons = [Wallet, PiggyBank, BarChart3, UserPlus];
const steps = ['wallets', 'movements', 'insights'] as const;
const stepIcons = [Wallet, FileText, BarChart3];

function IconBubble({ icon: Icon, tone = 'brand' }: { icon: IconComponent; tone?: 'brand' | 'blue' | 'green' }) {
    return (
        <span className={`marketing-icon marketing-icon--${tone}`}>
            <Icon aria-hidden="true" />
        </span>
    );
}

function SectionLabel({ children }: { children: ReactNode }) {
    return <span className="marketing-eyebrow">{children}</span>;
}

function RegisterLink({ children, light = false }: { children: ReactNode; light?: boolean }) {
    return (
        <Button asChild className={`marketing-button${light ? ' marketing-button--light' : ''}`}>
            <Link href="/register">
                {children}
                <ArrowRight aria-hidden="true" />
            </Link>
        </Button>
    );
}

// These are presentation-only examples, independent of authenticated features and APIs.
function FeatureExample({ feature }: { feature: Feature }) {
    const t = useTranslations('Home.examples');
    const format = useFormatter();
    const money = (amount: number) => format.number(amount, { style: 'currency', currency: 'EUR' });

    if (feature === 'budgets') {
        return (
            <div className="marketing-example marketing-budget-example">
                {(['homeBudget', 'holidayGoal'] as const).map((key, index) => (
                    <div className="marketing-budget" key={key}>
                        <IconBubble icon={budgetIcons[index]} />
                        <div>
                            <span>{t(key)}</span>
                            <p>
                                {t('budgetAmount', {
                                    current: money(index === 0 ? 380 : 1200),
                                    total: money(index === 0 ? 600 : 2000),
                                })}
                            </p>
                            <div className="marketing-progress-row">
                                <div className="marketing-progress">
                                    <span
                                        className={index === 0 ? 'marketing-progress--63' : 'marketing-progress--60'}
                                    />
                                </div>
                                <strong>{format.number(index === 0 ? 0.63 : 0.6, { style: 'percent' })}</strong>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    if (feature === 'reports') {
        return (
            <div className="marketing-example marketing-report" role="img" aria-label={t('chartDescription')}>
                <span className="marketing-chart-label">{t('incomeAndExpenses')}</span>
                <div className="marketing-bars" aria-hidden="true">
                    {[45, 63, 88, 62, 100, 66].map((height, index) => (
                        <div className="marketing-bar-group" key={height}>
                            <div className="marketing-bar-track">
                                <i style={{ height: `${height}%` }} />
                                <i style={{ height: `${[29, 44, 59, 47, 63, 61][index]}%` }} />
                            </div>
                            <span>
                                {format.dateTime(new Date(Date.UTC(2024, index, 15)), {
                                    month: 'short',
                                    timeZone: 'UTC',
                                })}
                            </span>
                        </div>
                    ))}
                </div>
                <div className="marketing-chart-legend">
                    <span>{t('income')}</span>
                    <span>{t('expenses')}</span>
                </div>
            </div>
        );
    }

    const rows =
        feature === 'movements'
            ? [
                  { key: 'cardTopUp', amount: 150, icon: CreditCard },
                  { key: 'groceries', amount: -87.5, icon: Wallet },
                  { key: 'salary', amount: 2500, icon: Wallet },
              ]
            : [
                  { key: 'mainAccount', amount: 1250, icon: CreditCard },
                  { key: 'sharedHome', amount: -2450, icon: Wallet },
                  { key: 'travel', amount: 680, icon: ArrowLeftRight },
                  { key: 'groupExpenses', amount: 320, icon: UserPlus },
              ];
    return (
        <div className="marketing-example marketing-rows">
            {rows.map(({ key, amount, icon: Icon }) => (
                <div className="marketing-example-row" key={key}>
                    <Icon aria-hidden="true" />
                    <span>{t(key)}</span>
                    <strong className={amount > 0 ? 'marketing-income' : 'marketing-expense'}>
                        {feature === 'movements' && amount > 0 ? '+ ' : ''}
                        {money(amount)}
                    </strong>
                </div>
            ))}
        </div>
    );
}

function Faq({ children }: { children: ReactNode }) {
    const t = useTranslations('Home.faq');
    return (
        <Dialog>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent closeLabel={t('close')}>
                <DialogHeader>
                    <DialogTitle>{t('title')}</DialogTitle>
                    <DialogDescription>{t('description')}</DialogDescription>
                </DialogHeader>
                <div className="marketing-faq-list">
                    {(['start', 'languages', 'preview'] as const).map((key) => (
                        <details key={key}>
                            <summary>{t(`${key}.question`)}</summary>
                            <p>{t(`${key}.answer`)}</p>
                        </details>
                    ))}
                </div>
            </DialogContent>
        </Dialog>
    );
}

export function HomePage() {
    const t = useTranslations('Home');
    const locale = useLocale();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    // The public landing starts with the reference's dark art direction; this switch is local to it.
    const [isLightTheme, setIsLightTheme] = useState(false);
    const englishCurrent = locale === 'en' ? 'page' : undefined;
    const italianCurrent = locale === 'it' ? 'page' : undefined;

    const navigation = [
        { href: '#features', label: t('navigation.features') },
        { href: '#how-it-works', label: t('navigation.howItWorks') },
        { href: '#together', label: t('navigation.forWhom') },
        { href: '#start', label: t('navigation.pricing') },
    ];

    const closeMenuHandler = () => setIsMenuOpen(false);

    return (
        <div className="flowiy-home" data-theme={isLightTheme ? 'light' : 'dark'}>
            <header className="marketing-header">
                <div className="marketing-container marketing-header-inner">
                    <Link className="marketing-brand" href="/" aria-label={t('navigation.home')}>
                        <Image src="/new_logo_dark.png" alt="Flowiy" width={162} height={51} priority />
                    </Link>
                    <nav className="marketing-desktop-nav" aria-label={t('navigation.main')}>
                        {navigation.map(({ href, label }) => (
                            <Link href={href} key={href}>
                                {label}
                            </Link>
                        ))}
                        <Faq>
                            <button type="button" className="marketing-text-button">
                                {t('navigation.faq')}
                            </button>
                        </Faq>
                    </nav>
                    <div className="marketing-header-actions">
                        <Link href="/login" className="marketing-login">
                            <UserPlus aria-hidden="true" />
                            {t('navigation.login')}
                        </Link>
                        <RegisterLink light>{t('navigation.start')}</RegisterLink>
                        <Button
                            className="marketing-icon-button"
                            size="icon"
                            variant="ghost"
                            onClick={() => setIsLightTheme(!isLightTheme)}
                            aria-label={t(isLightTheme ? 'navigation.darkTheme' : 'navigation.lightTheme')}
                        >
                            {isLightTheme ? <Moon aria-hidden="true" /> : <Sun aria-hidden="true" />}
                        </Button>
                        <Button
                            className="marketing-menu-button marketing-icon-button"
                            size="icon"
                            variant="ghost"
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                            aria-label={t(isMenuOpen ? 'navigation.closeMenu' : 'navigation.openMenu')}
                            aria-expanded={isMenuOpen}
                            aria-controls="marketing-mobile-nav"
                        >
                            {isMenuOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
                        </Button>
                    </div>
                </div>
                <nav
                    id="marketing-mobile-nav"
                    className="marketing-mobile-nav"
                    hidden={!isMenuOpen}
                    aria-label={t('navigation.main')}
                >
                    {navigation.map(({ href, label }) => (
                        <Link href={href} key={href} onClick={closeMenuHandler}>
                            {label}
                        </Link>
                    ))}
                    <Link href="/login" onClick={closeMenuHandler}>
                        {t('navigation.login')}
                    </Link>
                    <Faq>
                        <button type="button" className="marketing-text-button">
                            {t('navigation.faq')}
                        </button>
                    </Faq>
                    <Link href="/" locale={locale === 'it' ? 'en' : 'it'} onClick={closeMenuHandler}>
                        {t('navigation.switchLanguage')}
                    </Link>
                </nav>
            </header>

            <main>
                <section className="marketing-hero marketing-section" aria-labelledby="hero-title">
                    <div className="marketing-ribbon marketing-ribbon--hero" aria-hidden="true" />
                    <div className="marketing-container marketing-hero-grid">
                        <div className="marketing-hero-copy">
                            <SectionLabel>{t('hero.label')}</SectionLabel>
                            <h1 id="hero-title">
                                {t('hero.title')}
                                <br />
                                <span>{t('hero.highlight')}</span>
                            </h1>
                            <p className="marketing-lead">{t('hero.description')}</p>
                            <div className="marketing-hero-actions">
                                <RegisterLink>{t('hero.tryFree')}</RegisterLink>
                                <Button asChild className="marketing-button marketing-button--outline">
                                    <Link href="#how-it-works">
                                        <span className="marketing-play" aria-hidden="true">
                                            ▷
                                        </span>
                                        {t('hero.demo')}
                                    </Link>
                                </Button>
                            </div>
                            <ul className="marketing-checks">
                                {(['free', 'noCard', 'quickSetup'] as const).map((key) => (
                                    <li key={key}>
                                        <Check aria-hidden="true" />
                                        {t(`hero.${key}`)}
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div className="marketing-hero-art">
                            <div
                                className="marketing-image-slot marketing-image-slot--dashboard"
                                role="img"
                                aria-label={t('images.dashboard')}
                            >
                                <span>{t('images.dashboard')}</span>
                            </div>
                            <div className="marketing-floating-card marketing-floating-card--budget" aria-hidden="true">
                                <IconBubble icon={PiggyBank} />
                                <div>
                                    <span>{t('hero.monthlyBudget')}</span>
                                    <div className="marketing-progress">
                                        <span className="marketing-progress--63" />
                                    </div>
                                </div>
                            </div>
                            <div
                                className="marketing-floating-card marketing-floating-card--sharing"
                                aria-hidden="true"
                            >
                                <IconBubble icon={UserPlus} tone="blue" />
                                <div>
                                    <span>{t('hero.familyWallet')}</span>
                                    <div className="marketing-avatar-slots">
                                        <i />
                                        <i />
                                        <i />
                                        <i />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="marketing-benefits marketing-section" aria-label={t('benefits.label')}>
                    <div className="marketing-container marketing-benefit-grid">
                        {benefits.map((key, index) => (
                            <div className="marketing-benefit" key={key}>
                                <IconBubble icon={benefitIcons[index]} />
                                <div>
                                    <h2>{t(`benefits.${key}.title`)}</h2>
                                    <p>{t(`benefits.${key}.description`)}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                <section
                    id="features"
                    className="marketing-section marketing-features"
                    aria-labelledby="features-title"
                >
                    <div className="marketing-container">
                        <div className="marketing-section-heading">
                            <div>
                                <SectionLabel>{t('features.label')}</SectionLabel>
                                <h2 id="features-title">{t('features.title')}</h2>
                                <p>{t('features.description')}</p>
                            </div>
                            <Button
                                asChild
                                className="marketing-button marketing-button--outline marketing-button--small"
                            >
                                <Link href="#feature-cards">
                                    {t('features.discover')}
                                    <ArrowRight aria-hidden="true" />
                                </Link>
                            </Button>
                        </div>
                        <div id="feature-cards" className="marketing-feature-grid">
                            {features.map((feature) => (
                                <article className="marketing-feature-card" key={feature}>
                                    <div className="marketing-feature-heading">
                                        <IconBubble icon={featureIcons[feature]} tone={featureTones[feature]} />
                                        <div>
                                            <h3>{t(`features.${feature}.title`)}</h3>
                                            <p>{t(`features.${feature}.description`)}</p>
                                        </div>
                                    </div>
                                    <FeatureExample feature={feature} />
                                </article>
                            ))}
                        </div>
                    </div>
                </section>

                <section
                    id="together"
                    className="marketing-section marketing-together"
                    aria-labelledby="together-title"
                >
                    <div className="marketing-ribbon marketing-ribbon--together" aria-hidden="true" />
                    <div className="marketing-container marketing-together-grid">
                        <div className="marketing-together-copy">
                            <SectionLabel>{t('together.label')}</SectionLabel>
                            <h2 id="together-title">
                                {t('together.title')}
                                <br />
                                <span>{t('together.highlight')}</span>
                            </h2>
                            <p>{t('together.description')}</p>
                            <Button asChild className="marketing-button">
                                <Link href="#how-it-works">
                                    {t('together.discover')}
                                    <ArrowRight aria-hidden="true" />
                                </Link>
                            </Button>
                            <div className="marketing-sharing-benefits">
                                {(['permissions', 'activity', 'visibility'] as const).map((key, index) => (
                                    <div key={key}>
                                        <IconBubble icon={[UserPlus, FileText, UserPlus][index]} />
                                        <span>{t(`together.${key}`)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div
                            className="marketing-image-slot marketing-image-slot--sharing"
                            role="img"
                            aria-label={t('images.sharing')}
                        >
                            <span>{t('images.sharing')}</span>
                        </div>
                    </div>
                </section>

                <section id="how-it-works" className="marketing-section marketing-how" aria-labelledby="how-title">
                    <div className="marketing-container">
                        <div className="marketing-section-heading">
                            <div>
                                <SectionLabel>{t('how.label')}</SectionLabel>
                                <h2 id="how-title">{t('how.title')}</h2>
                            </div>
                            <p>{t('how.description')}</p>
                        </div>
                        <ol className="marketing-steps">
                            {steps.map((key, index) => (
                                <li key={key}>
                                    <span className="marketing-step-number">{index + 1}</span>
                                    <IconBubble icon={stepIcons[index]} tone={index === 2 ? 'brand' : 'blue'} />
                                    <div>
                                        <h3>{t(`how.${key}.title`)}</h3>
                                        <p>{t(`how.${key}.description`)}</p>
                                    </div>
                                    <ArrowRight className="marketing-step-arrow" aria-hidden="true" />
                                </li>
                            ))}
                        </ol>
                    </div>
                </section>

                <section className="marketing-section marketing-security" aria-labelledby="security-title">
                    <div className="marketing-container marketing-security-grid">
                        <div>
                            <SectionLabel>{t('security.label')}</SectionLabel>
                            <h2 id="security-title">{t('security.title')}</h2>
                            <p>{t('security.description')}</p>
                        </div>
                        {(['account', 'permissions', 'control'] as const).map((key, index) => (
                            <div className="marketing-security-item" key={key}>
                                <IconBubble icon={[Wallet, UserPlus, FileText][index]} />
                                <div>
                                    <h3>{t(`security.${key}.title`)}</h3>
                                    <p>{t(`security.${key}.description`)}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                <section id="start" className="marketing-container marketing-cta" aria-labelledby="cta-title">
                    <div className="marketing-ribbon marketing-ribbon--cta" aria-hidden="true" />
                    <div>
                        <SectionLabel>{t('cta.label')}</SectionLabel>
                        <h2 id="cta-title">{t('cta.title')}</h2>
                        <p>{t('cta.description')}</p>
                    </div>
                    <div className="marketing-cta-action">
                        <RegisterLink light>{t('cta.button')}</RegisterLink>
                        <small>{t('cta.note')}</small>
                    </div>
                </section>
            </main>

            <footer className="marketing-footer marketing-container">
                <Link href="/" className="marketing-brand" aria-label={t('navigation.home')}>
                    <Image
                        src={isLightTheme ? '/new_logo.png' : '/new_logo_dark.png'}
                        alt="Flowiy"
                        width={118}
                        height={37}
                    />
                </Link>
                <p>{t('footer.tagline')}</p>
                <nav aria-label={t('navigation.footer')}>
                    {navigation.map(({ href, label }) => (
                        <Link href={href} key={href}>
                            {label}
                        </Link>
                    ))}
                    <Faq>
                        <button type="button" className="marketing-text-button">
                            {t('navigation.faq')}
                        </button>
                    </Faq>
                </nav>
                <div className="marketing-locales" aria-label={t('navigation.language')}>
                    <Link href="/" locale="en" lang="en" aria-current={englishCurrent}>
                        EN
                    </Link>
                    <span aria-hidden="true">/</span>
                    <Link href="/" locale="it" lang="it" aria-current={italianCurrent}>
                        IT
                    </Link>
                </div>
            </footer>
        </div>
    );
}
