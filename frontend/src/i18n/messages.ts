import type { Locale } from 'next-intl';

export async function getMessagesForLocale(locale: Locale) {
    const [common, navigation, metadata, auth, wallets, movements, apiFinance, home, flowiyAuth] = await Promise.all([
        import(`../../messages/${locale}/common.json`),
        import(`../../messages/${locale}/navigation.json`),
        import(`../../messages/${locale}/metadata.json`),
        import(`../../messages/${locale}/auth.json`),
        import(`../../messages/${locale}/wallets.json`),
        import(`../../messages/${locale}/movements.json`),
        import(`../../messages/${locale}/apiFinance.json`),
        import(`../../messages/${locale}/home.json`),
        import(`../../messages/${locale}/flowiyAuth.json`),
    ]);

    return {
        ...common.default,
        ...navigation.default,
        ...metadata.default,
        ...auth.default,
        ...wallets.default,
        ...movements.default,
        ...apiFinance.default,
        ...home.default,
        ...flowiyAuth.default,
    };
}
