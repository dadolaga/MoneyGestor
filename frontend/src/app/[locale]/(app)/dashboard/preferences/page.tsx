import { redirect } from '@/i18n/navigation';

export default async function PreferencesPage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    redirect({ href: '/dashboard/preferences/transaction-types', locale });
}
