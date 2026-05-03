'use client';

import type { MouseEvent } from 'react';
import { useState, useEffect, useCallback } from 'react';

import { faBars } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useRouter } from 'next/navigation';
import { useSnackbar } from 'notistack';
import { useCookies } from 'react-cookie';

import { Avatar, Box, Button, CircularProgress, Menu, MenuItem, Toolbar } from '@mui/material';
import AppBar from '@mui/material/AppBar';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';

import useApi from '@/hooks/useApi';
import { useIsMobile } from '@/hooks/useMobile';

export default function Header({ openDrawerClick }: { openDrawerClick: () => void }) {
    const isMobile = useIsMobile();
    const api = useApi();

    const [cookies, , removeCookie] = useCookies(['token']);

    const [userFullName, setUserFullName] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(true);

    const { enqueueSnackbar } = useSnackbar();

    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const open = Boolean(anchorEl);

    const router = useRouter();

    const loadUserInformation = useCallback(() => {
        void Promise.resolve().then(() => setLoading(true));

        api.user
            .info()
            .onSuccess((user) => {
                setUserFullName(`${user.firstname} ${user.lastname}`);
            })
            .onError(() => {
                if (window.location.pathname !== '/dashboard/user/login') {
                    enqueueSnackbar('User login expired', { variant: 'error' });

                    router.push('/dashboard/user/login');
                }
            })
            .onFinish(() => {
                setLoading(false);
            })
            .execute();
    }, [enqueueSnackbar, cookies.token]);

    useEffect(() => {
        loadUserInformation();
    }, [loadUserInformation]);

    function stringToColor(text: string) {
        let hash = 0;
        let i;

        for (i = 0; i < text.length; i += 1) {
            hash = text.charCodeAt(i) + ((hash << 5) - hash);
        }

        let color = '#';

        for (i = 0; i < 3; i += 1) {
            const value = (hash >> (i * 8)) & 0xff;
            color += `00${value.toString(16)}`.slice(-2);
        }

        return color;
    }

    function stringAvatar(name: string) {
        return {
            sx: {
                bgcolor: stringToColor(name),
            },
            children: `${name.split(' ')[0][0]}${name.split(' ')[1][0]}`,
        };
    }

    const handleClick = (event: MouseEvent<HTMLDivElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
        setAnchorEl(null);
    };

    const titleClickHandler = () => {
        router.push('/dashboard');
    };

    const logoutHandler = () => {
        removeCookie('token', { path: '/' });
        setUserFullName('');
        handleClose();

        if (window.location.pathname !== '/dashboard/user/login') {
            router.push('/dashboard/user/login');
        }
    };

    const renderUserSection = () => {
        if (loading) return <CircularProgress />;

        if (userFullName) {
            return (
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                    {!isMobile && <Typography align="center">{userFullName}</Typography>}
                    <Avatar {...stringAvatar(userFullName)} onClick={handleClick} />
                </Box>
            );
        }

        return (
            <>
                <Button onClick={() => router.push('/dashboard/user/login')}>Login</Button>
                <Button onClick={() => router.push('/dashboard/user/new')}>Registrati</Button>
            </>
        );
    };

    return (
        <AppBar sx={{ zIndex: 1300 }}>
            <Toolbar>
                <IconButton sx={{ mr: 2 }} color="inherit" onClick={openDrawerClick}>
                    <FontAwesomeIcon icon={faBars} />
                </IconButton>
                <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="h6" component={'span'} sx={{ cursor: 'pointer' }} onClick={titleClickHandler}>
                        Money Gestor
                    </Typography>
                </Box>

                {renderUserSection()}

                <Menu anchorEl={anchorEl} open={open} onClose={handleClose}>
                    <MenuItem onClick={logoutHandler}>Logout</MenuItem>
                </Menu>
            </Toolbar>
        </AppBar>
    );
}
