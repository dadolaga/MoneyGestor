'use client';

import type { ReactNode } from 'react';

import { ThemeProvider } from 'next-themes';
import { SnackbarProvider } from 'notistack';
import { Toaster } from 'sonner';

export function AppProviders({ children }: { children: ReactNode }) {
    return (
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
            <SnackbarProvider anchorOrigin={{ horizontal: 'left', vertical: 'bottom' }}>{children}</SnackbarProvider>
            <Toaster closeButton richColors />
        </ThemeProvider>
    );
}
