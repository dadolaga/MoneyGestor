import createNextIntlPlugin from 'next-intl/plugin';

/** @type {import('next').NextConfig} */
const nextConfig = {
    output: 'standalone',
};

export default createNextIntlPlugin('./src/i18n/request.ts')(nextConfig);
