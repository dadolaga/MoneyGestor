import type { Locale } from 'next-intl';

import { redirect } from '@/i18n/navigation';

export default async function LegacyMobileAddPage({ params }: { params: Promise<{ locale: Locale }> }) {
    const { locale } = await params;
    redirect({ href: '/dashboard/transaction', locale });
}
