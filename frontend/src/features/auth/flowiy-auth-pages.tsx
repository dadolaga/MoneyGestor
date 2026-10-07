'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';

import type { RecoveryAction } from '@/features/auth/account-recovery-dialog';
import { FlowiyAuthShell } from '@/features/auth/flowiy-auth-shell';
import { LoginPanel } from '@/features/auth/login-panel';
import { RegisterPanel } from '@/features/auth/register-panel';
import { usePathname } from '@/i18n/navigation';

const FormDirtyContext = createContext<((isDirty: boolean) => void) | undefined>(undefined);

export function FlowiyAuthLayout({ children }: { children: ReactNode }) {
    const pathname = usePathname();
    const [isDirty, setIsDirty] = useState(false);
    const mode = pathname === '/register' ? 'register' : 'login';

    return (
        <FormDirtyContext.Provider value={setIsDirty}>
            <FlowiyAuthShell mode={mode} isDirty={isDirty}>{children}</FlowiyAuthShell>
        </FormDirtyContext.Provider>
    );
}

export function FlowiyLoginPage({ initialRecovery }: { initialRecovery?: RecoveryAction }) {
    const onDirtyChange = useContext(FormDirtyContext);
    return <LoginPanel initialRecovery={initialRecovery} onDirtyChange={onDirtyChange} />;
}

export function FlowiyRegisterPage() {
    const onDirtyChange = useContext(FormDirtyContext);
    return <RegisterPanel onDirtyChange={onDirtyChange} />;
}
