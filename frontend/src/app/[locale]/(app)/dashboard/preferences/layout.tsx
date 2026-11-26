import type { ReactNode } from 'react';

import { PreferencesLayout } from '@/features/preferences/PreferencesLayout';

export default function Layout({ children }: { children: ReactNode }) {
    return <PreferencesLayout>{children}</PreferencesLayout>;
}
