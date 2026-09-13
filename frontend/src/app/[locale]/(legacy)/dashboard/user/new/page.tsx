import { redirect } from '@/i18n/navigation';

export default async function LegacyRegistrationRedirect({ params }: { params: Promise<{ locale: 'en' | 'it' }> }) {
    const { locale } = await params;
    redirect({ href: '/register', locale });
}
