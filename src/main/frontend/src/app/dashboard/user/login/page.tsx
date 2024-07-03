"use client";

import './style.css';
import { KeyboardEventHandler, useRef, useState } from "react";
import { useCookies } from "react-cookie";
import { Request, useRestApi } from "../../../request/Request";
import { LoginForm } from "../../../Utilities/BackEndTypes";
import { Alert, Box, Button, Card, CardContent, LinearProgress, TextField, Typography } from "@mui/material";
import { useRouter } from "next/navigation";

export default function Page() {
    const DEFAULT_FORM_ERROR = {
        "username": null,
        "password": null,
    };

    const form = useRef();
    const router = useRouter();
    const [cookies, setCookie] = useCookies(["_token", "_displayName"]);

    const restApi = useRestApi();

    const [formError, setFormError] = useState(DEFAULT_FORM_ERROR);

    const [message, setMessage] = useState(null);
    const [loading, setLoading] = useState<boolean>(false);

    function login() {
        const formData = new FormData(form.current);

        setMessage(null);
        setFormError(DEFAULT_FORM_ERROR);
        setLoading(true);

        if (!checkField())
            return;

        let loginData: LoginForm = {
            username: formData.get("username").toString(),
            password: formData.get("password").toString()
        };

        restApi.User.Login(loginData)
            .then(user => {
                setCookie('_displayName', user.lastname + " " + user.firstname, { path: '/' });
                setCookie('_token', user.token, { path: '/' });

                router.push("/dashboard");
            })
            .catch(Request.ErrorGestor([{
                code: 112,
                action: err => {
                    setMessage("Email/username o password errati");
                }
            }]))
            .finally(() => {
                setLoading(false);
            });

        function checkField() {
            const regexUsername = /^[A-Za-z0-9_\-]+$/;

            let valid = true;

            formData.forEach((value, key) => {
                if (value.toString().trim().length == 0) {
                    setFormError(value => value = { ...value, [key]: "Il campo non può essere vuoto" });
                    valid = false;
                }
            });

            if (valid) {
                if (!regexUsername.test(formData.get("username").toString())) {
                    setFormError(value => value = { ...value, "username": "L'username può solo contenere lettere numeri e _ o -" });
                    valid = false;
                }
            }

            return valid;
        }
    }

    const keyPressedOnPasswordHandler: KeyboardEventHandler<HTMLDivElement> = (event) => {
        if (event.key == "Enter") {
            login();
        }
    };

    return (
        <Box className="center">
            <Card style={{width: '30%', borderRadius: '10%'}}>
                {loading && <LinearProgress sx={{width: "100%"}}/>}
                <CardContent  sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4}}>
                    <Box className="image">
                        <img src='/logo.png' style={{width: '80%'}}/>
                    </Box>

                    <Box sx={{width: '100%'}}>
                        <Typography variant='h5' sx={{paddingLeft: 2}}>Login</Typography>
                    </Box> 
                    {message != null && <Alert variant='filled' severity='error' >{message}</Alert>}
                    <Box component={'form'} ref={form} sx={{width: '100%', display: 'flex', flexDirection: 'column', gap: 2}}>
                        <TextField error={formError.username != null} helperText={formError.username} fullWidth name='username' label='username o email' required/>
                        <TextField error={formError.password != null} helperText={formError.password} onKeyUp={keyPressedOnPasswordHandler} fullWidth name='password' type='password' label='password' required/>
                        <Button variant='contained' onClick={login}> Login </Button>
                    </Box>
                    <Box className="image">
                        <img  src='/login_without_background.png' style={{width: '60%'}} />
                    </Box>
                </CardContent>

            </Card>

        </Box>
    );
}