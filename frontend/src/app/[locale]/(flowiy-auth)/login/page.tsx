import { FlowiyLoginPage } from '@/features/auth/flowiy-auth-pages';

export default async function Page({ searchParams }: { searchParams: Promise<{ recovery?: string | string[] }> }) {
    const { recovery } = await searchParams;
    const initialRecovery = recovery === 'forgot' || recovery === 'resend' ? recovery : undefined;
    return <FlowiyLoginPage initialRecovery={initialRecovery} />;
}
