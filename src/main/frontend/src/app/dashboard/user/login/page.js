"use client"

import './style.css'
import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useCookies } from 'react-cookie';
import { Alert, Box, Button, Card, CardContent, TextField, Typography } from '@mui/material';
import { useDispatch } from 'react-redux'
import { changeName } from '../../../redux/userSlice';

export default function Page() {
    const form = useRef();
    const router = useRouter();
    const [cookies, setCookie] = useCookies(["_token"]);
    const dispatch = useDispatch();

    const [validation, setValidation] = useState(false);

    const DEFAULT_FORM_ERROR = {
        "username": null,
        "password": null,
    };
    const [formError, setFormError] = useState(DEFAULT_FORM_ERROR);

    const [message, setMessage] = useState(null);

    function login() {
        const formData = new FormData(form.current);

        setMessage(null);
        setFormError(DEFAULT_FORM_ERROR);

        if(!checkField())
            return;

        let loginData = {};
        formData.forEach((value, key) => {
            loginData[key] = value;
        });

        fetch("http://localhost:8093/api/user/login", {
            method: 'POST',
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(loginData)
        })
        .then(res => {
            return res.json();
        })
        .then(json => {
            if(json.code != undefined) {
                setMessage("Email/username o password errati");
            } else {
                dispatch(changeName(json.lastname + " " + json.firstname));
                setCookie('_token', json.token, {path: '/'});
            }
        });

        function checkField() {
            const regexUsername = /^[A-Za-z0-9_\-]+$/;

            let valid = true;

            formData.forEach((value, key) => {
                if(value.trim().length == 0) {
                    setFormError(value => value = {...value, [key]: "Il campo non può essere vuoto"});
                    valid = false;
                }
            });

            if(valid) {
                if(!regexUsername.test(formData.get("username"))) {
                    setFormError(value => value = {...value, "username": "L'username può solo contenere lettere numeri e _ o -"});
                    valid = false;
                }
            }

            return valid;
        }
    }

    return(
        <Box className="center">
            <Card>
            <CardContent sx={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4}}>
                    <Box>
                        <img src='/logo.png' style={{width: '300px'}}/>
                    </Box>
                    <Box sx={{width: '100%'}}>
                        <Typography variant='h5' sx={{paddingLeft: 2}}>Login</Typography>
                    </Box> 
                    {message != null && <Alert variant='filled' severity='error' >{message}</Alert>}
                    <Box component={'form'} ref={form} sx={{width: '100%', display: 'flex', flexDirection: 'column', gap: 2}}>
                        <TextField error={formError.username != null} helperText={formError.username} fullWidth name='username' label='username o email' required/>
                        <TextField error={formError.password != null} helperText={formError.password} fullWidth name='password' type='password' label='password' required/>
                        <Button variant='contained' onClick={login}> Login </Button>
                    </Box>
                </CardContent>
            </Card>
        </Box>
    );
}