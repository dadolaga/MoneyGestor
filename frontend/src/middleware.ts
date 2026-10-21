import { NextRequest } from 'next/server';
import createMiddleware from 'next-intl/middleware';

import { routing } from './i18n/routing';

const handleI18nRouting = createMiddleware(routing);

export default function middleware(request: NextRequest) {
    const headers = new Headers(request.headers);
    // Resolve the locale from the URL or saved cookie, never the browser language.
    headers.delete('accept-language');

    return handleI18nRouting(new NextRequest(request, { headers }));
}

export const config = {
    matcher: '/((?!api|trpc|_next|_vercel|.*\\..*).*)',
};
