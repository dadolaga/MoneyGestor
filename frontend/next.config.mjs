import createNextIntlPlugin from 'next-intl/plugin';

const apiProxyTarget = (process.env.API_PROXY_TARGET || 'http://127.0.0.1:5256').replace(/\/+$/, '');

/** @type {import('next').NextConfig} */
const nextConfig = {
    output: 'standalone',
    async rewrites() {
        return [
            {
                source: '/api/v1/:path*',
                destination: `${apiProxyTarget}/api/v1/:path*`,
            },
        ];
    },
};

export default createNextIntlPlugin('./src/i18n/request.ts')(nextConfig);
