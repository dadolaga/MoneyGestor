'use client';

import { useRouter } from 'next/navigation';
import { useCookies } from 'react-cookie';
import { faBars } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import AppBar from '@mui/material/AppBar';
import { Avatar, Box, CircularProgress, Menu, MenuItem, Toolbar } from '@mui/material';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import { useState, MouseEvent, useEffect } from 'react';
import { useRestApi } from '../request/Request';
import { useSnackbar } from 'notistack';
import { useIsMobile } from '../utilities/useMobile';
import useApi from '@/hooks/useApi';
import { useLocation } from 'react-router-dom';

export default function Header({ openDrawerClick }: { openDrawerClick: () => void }) {
    const isMobile = useIsMobile();
    const api = useApi();

    const [cookies, _, removeCookie] = useCookies(['token']);

    const [userFullName, setUserFullName] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(true);

    const { enqueueSnackbar } = useSnackbar();

    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const open = Boolean(anchorEl);

    const router = useRouter();

    useEffect(() => {
        setLoading(true);

        console.log('location: ', window.location);

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
    }, [cookies.token]);

    function stringToColor(string) {
        let hash = 0;
        let i;

        /* eslint-disable no-bitwise */
        for (i = 0; i < string.length; i += 1) {
            hash = string.charCodeAt(i) + ((hash << 5) - hash);
        }

        let color = '#';

        for (i = 0; i < 3; i += 1) {
            const value = (hash >> (i * 8)) & 0xff;
            color += `00${value.toString(16)}`.slice(-2);
        }
        /* eslint-enable no-bitwise */

        return color;
    }

    function stringAvatar(name) {
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

                {loading ? (
                    <CircularProgress />
                ) : userFullName ? (
                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                        {!isMobile && <Typography align="center">{userFullName}</Typography>}
                        <Avatar {...stringAvatar(userFullName)} onClick={handleClick} />
                    </Box>
                ) : (
                    <>
                        <Button color="inherit" onClick={() => router.push('/dashboard/user/login')}>
                            Login
                        </Button>
                        <Button color="inherit" onClick={() => router.push('/dashboard/user/new')}>
                            Registrati
                        </Button>
                    </>
                )}

                <Menu anchorEl={anchorEl} open={open} onClose={handleClose}>
                    <MenuItem onClick={logoutHandler}>Logout</MenuItem>
                </Menu>
            </Toolbar>
        </AppBar>
    );
}
