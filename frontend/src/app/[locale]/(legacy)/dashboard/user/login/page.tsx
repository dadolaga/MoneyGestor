import { redirect } from '@/i18n/navigation';

export default async function LegacyLoginRedirect({ params }: { params: Promise<{ locale: 'en' | 'it' }> }) {
    const { locale } = await params;
    redirect({ href: '/login', locale });
}
