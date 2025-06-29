"use client"

import { useRouter } from 'next/navigation'
import { useCookies } from 'react-cookie'
import { faBars } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import AppBar from '@mui/material/AppBar'
import { Avatar, Box, Menu, MenuItem, Toolbar } from '@mui/material'
import IconButton from '@mui/material/IconButton'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import { useState } from 'react'
import { useRestApi } from '../request/Request'
import { useSnackbar } from 'notistack'
import { useIsMobile } from '../utilities/useMobile'


export default function Header({
    openDrawerClick
}: {
    openDrawerClick: () => void
}) {
    const [cookies, setCookie, removeCookie] = useCookies(["_token", "_displayName"]);

    const request = useRestApi();

    const isMobile = useIsMobile();

    const { enqueueSnackbar } = useSnackbar()

    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const open = Boolean(anchorEl);

    const router = useRouter();

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

    const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
        setAnchorEl(null);
    };

    const titleClickHandler = () => {
        router.push("/dashboard");
    }

    const logoutHandler = () => {
        request.User.Logout()
        .then(() => {
            enqueueSnackbar("User logout", {variant: "info"});

            removeCookie("_displayName");
            removeCookie("_token");

            router.push("dashboard/user/login");
        }).finally(() => {
            handleClose();
        })
    }

    return (
        <AppBar sx={{ zIndex: 1300 }}>
            <Toolbar>
                <IconButton sx={{ mr: 2 }} color='inherit' onClick={openDrawerClick}>
                    <FontAwesomeIcon icon={faBars} />
                </IconButton>
                <Box sx={{flexGrow: 1}}>
                    <Typography variant="h6" component={"span"} sx={{ cursor: "pointer" }} onClick={titleClickHandler}>Money Gestor</Typography>
                </Box>

                {(!cookies._displayName) && (
                    <>
                        <Button color='inherit' onClick={() => router.push('/dashboard/user/login')}>Login</Button>
                        <Button color='inherit' onClick={() => router.push('/dashboard/user/new')}>Registrati</Button>
                    </>
                )}

                {(cookies._displayName) && (
                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                        {!isMobile && (<Typography align='center'>{cookies._displayName}</Typography>)}
                        <Avatar {...stringAvatar(cookies._displayName)} onClick={handleClick} />
                    </Box>
                )}

                <Menu anchorEl={anchorEl} open={open} onClose={handleClose}>
                    <MenuItem onClick={logoutHandler}>Logout</MenuItem>
                </Menu>

            </Toolbar>
        </AppBar>
    )
}