'use client';

import { useState, useCallback } from 'react';

import { useCookies } from 'react-cookie';

import { Box, Card, CardContent, LinearProgress, Typography } from '@mui/material';

import Input from '@/component/Input';
import Submit from '@/component/Submit';
import type { FormSettings, FormType } from '@/context/FormContext';
import { FormProvider } from '@/context/FormContext';
import type { ResponseError } from '@/hooks/useApi';
import useApi from '@/hooks/useApi';
import type { Login } from '@/models/backend';

export default function Page() {
    const formSettings: FormSettings = {
        username: {
            mandatory: true,
        },
        password: {
            mandatory: true,
        },
    };

    const api = useApi();

    const [, setCookie] = useCookies(['token']);

    const [loading, setLoading] = useState<boolean>(false);

    const loginHandler = useCallback(
        (form: FormType) => {
            return new Promise<void>((resolve, reject) => {
                const expiredData = new Date();
                const loginData: Login = {
                    user: form.username.value!.toString(),
                    password: form.password.value!.toString(),
                    remember: form.remember !== undefined,
                };

                setLoading(true);

                expiredData.setMonth(expiredData.getMonth() + 6);

                api.user
                    .login(loginData)
                    .onSuccess((data) => {
                        setCookie('token', data, { path: '/', expires: expiredData });

                        resolve();
                    })
                    .onError((err: ResponseError) => {
                        switch (err.code) {
                            case 111:
                                reject({ username: 'Username o password errati' });
                                break;
                        }
                    })
                    .onFinish(() => {
                        setLoading(false);
                    })
                    .execute();
            });
        },
        [setCookie],
    );

    return (
        <Box height={'100%'} width={'100%'} display={'flex'} alignItems={'center'} justifyContent={'center'}>
            <Card>
                {!!loading && <LinearProgress sx={{ width: '100%' }} />}
                <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <Box>
                        {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text */}
                        <img src="/logo.png" style={{ width: '300px' }} />
                    </Box>
                    <Box sx={{ width: '100%' }}>
                        <Typography variant="h5" sx={{ paddingLeft: 2 }}>
                            Login
                        </Typography>
                    </Box>
                    <Box component={'form'} sx={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <FormProvider settings={formSettings}>
                            <Input type="text" name="username" label="username o email" />
                            <Input type="password" name="password" label="password" />
                            <Input type="check" name="remember" label="Ricordami" />
                            <Submit variant="contained" label="Login" fullWidth onValidate={loginHandler} />
                        </FormProvider>
                    </Box>
                </CardContent>
            </Card>
        </Box>
    );
}
