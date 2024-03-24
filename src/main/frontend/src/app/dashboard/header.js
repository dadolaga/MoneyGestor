"use client"

import { useRouter } from 'next/navigation'
import { useCookies } from 'react-cookie'
import { faBars } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useEffect, useState } from 'react'
import AppBar from '@mui/material/AppBar'
import { Avatar, Box, Dialog, Skeleton, Toolbar } from '@mui/material'
import IconButton from '@mui/material/IconButton'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import { useDispatch, useSelector } from 'react-redux'
import { changeName, selectUser } from '../redux/userSlice'
import axios from "../axios/axios";
import { setExpiredToken } from '../redux/showTokenExpirated'


export default function Header() {
    const name = useSelector(selectUser);
    const dispatch = useDispatch();

    const [cookies, setCookie] = useCookies(["_token"]);

    const router = useRouter();

    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);

        axios.get("/user/token", {
            params: {
                token: cookies._token
            }
        })
        .then(response => {
            dispatch(changeName(response.data.lastname + " " + response.data.firstname));
        })
        .catch(error => {
            if (error.response.status == 401) {
                dispatch(setExpiredToken(true))
            }
        })
        .finally(() => {
            setLoading(false);
        })
    }, []);

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

    return (
        <AppBar sx={{ zIndex: 1300 }}>
            <Toolbar>
                <IconButton sx={{ mr: 2 }} color='inherit'>
                    <FontAwesomeIcon icon={faBars} />
                </IconButton>
                <Typography variant="h6" component={"div"} sx={{ flexGrow: 1 }}>Money Gestor</Typography>

                {(!loading && name == null) && (
                    <>
                        <Button color='inherit' onClick={() => router.push('/dashboard/user/login')}>Login</Button>
                        <Button color='inherit' onClick={() => router.push('/dashboard/user/new')}>Registrati</Button>
                    </>
                )}

                {(!loading && name != null) && (
                    <Box sx={{display: 'flex', gap: 2, alignItems: 'center'}}>
                        <Typography align='center'>{name}</Typography>
                        <Avatar {... stringAvatar(name)} />
                    </Box>
                )}  

                {loading && (
                    <Box sx={{display: 'flex', gap: 2, alignItems: 'center'}}>
                        <Skeleton variant='text' sx={{fontSize: "1em"}} width={100} />
                        <Skeleton variant='circular' width={40} height={40}/>
                    </Box>
                )}

            </Toolbar>
        </AppBar>
    )
}