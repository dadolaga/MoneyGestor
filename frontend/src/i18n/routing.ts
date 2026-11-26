import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
    locales: ['en', 'it'],
    defaultLocale: 'en',
    localePrefix: 'as-needed',
    localeDetection: true,
    localeCookie: {
        maxAge: 60 * 60 * 24 * 365,
        path: '/',
        sameSite: 'lax',
    },
});
