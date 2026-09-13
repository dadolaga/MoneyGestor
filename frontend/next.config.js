const createNextIntlPlugin = require('next-intl/plugin');

/** @type {import('next').NextConfig} */
const nextConfig = {};

module.exports = createNextIntlPlugin('./src/i18n/request.ts')(nextConfig);
