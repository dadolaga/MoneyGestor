import type { Locale } from 'next-intl';

export async function getMessagesForLocale(locale: Locale) {
    const [common, navigation, metadata, auth] = await Promise.all([
        import(`../../messages/${locale}/common.json`),
        import(`../../messages/${locale}/navigation.json`),
        import(`../../messages/${locale}/metadata.json`),
        import(`../../messages/${locale}/auth.json`),
    ]);

    return {
        ...common.default,
        ...navigation.default,
        ...metadata.default,
        ...auth.default,
    };
}
