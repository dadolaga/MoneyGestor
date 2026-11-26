import type { ReactNode } from 'react';

import { FlowiyAuthLayout } from '@/features/auth/flowiy-auth-pages';

export default function Layout({ children }: { children: ReactNode }) {
    return <FlowiyAuthLayout>{children}</FlowiyAuthLayout>;
}
