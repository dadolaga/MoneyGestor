import type { Locale } from 'next-intl';

export async function getMessagesForLocale(locale: Locale) {
    const [common, navigation, metadata, auth, wallets, movements] = await Promise.all([
        import(`../../messages/${locale}/common.json`),
        import(`../../messages/${locale}/navigation.json`),
        import(`../../messages/${locale}/metadata.json`),
        import(`../../messages/${locale}/auth.json`),
        import(`../../messages/${locale}/wallets.json`),
        import(`../../messages/${locale}/movements.json`),
    ]);

    return {
        ...common.default,
        ...navigation.default,
        ...metadata.default,
        ...auth.default,
        ...wallets.default,
        ...movements.default,
    };
}
