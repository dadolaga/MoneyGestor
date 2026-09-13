'use client';

import { useState } from 'react';

import { ThemeProvider } from '@emotion/react';
import { SnackbarProvider } from 'notistack';

import { Box, Toolbar } from '@mui/material';
import type { ThemeOptions } from '@mui/material/styles';
import { createTheme } from '@mui/material/styles';

import { useIsMobile } from '@/hooks/useMobile';

import Drawer from './drawer';
import Header from './header';

const themeOptions: ThemeOptions = {
    palette: {
        mode: 'dark',
        primary: {
            main: '#e11d48',
        },
        secondary: {
            main: '#f43f5e',
        },
        background: {
            default: '#0b1220',
            paper: '#182033',
        },
        text: {
            primary: '#f8fafc',
            secondary: '#b7c0cf',
        },
    },
};

const theme = createTheme(themeOptions);

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const isMobile = useIsMobile();
    const [openDrawer, setOpenDrawer] = useState<boolean>();

    return (
        <ThemeProvider theme={theme}>
            <SnackbarProvider
                anchorOrigin={
                    // eslint-disable-next-line react/jsx-no-leaked-render
                    isMobile ? { horizontal: 'center', vertical: 'top' } : { horizontal: 'left', vertical: 'bottom' }
                }
            >
                <Box sx={{ position: 'relative', height: '100vh' }}>
                    <Header openDrawerClick={() => setOpenDrawer(!openDrawer)} />
                    <Box sx={{ display: 'flex', height: '100%' }}>
                        <Drawer width={200} open={openDrawer ?? false} hide={() => setOpenDrawer(false)} />
                        <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', maxWidth: '100%' }}>
                            <Toolbar />
                            <Box sx={{ margin: 2, flexGrow: 1, overflowY: 'hidden' }}>{children}</Box>
                        </Box>
                    </Box>
                </Box>
            </SnackbarProvider>
        </ThemeProvider>
    );
}
