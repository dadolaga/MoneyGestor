'use client';

import { useState } from 'react';
import { Box, Card, Grid, Typography, LinearProgress, CardContent } from '@mui/material';
import { enqueueSnackbar } from 'notistack';
import Input from '@/component/Input';
import { checkIsEmail, checkPassword, FormProvider, FormSettings, FormType } from '@/context/FormContext';
import Submit from '@/component/Submit';
import useApi, { ResponseError } from '@/hooks/useApi';
import { User } from '@/models/backend';

export default function Page() {
    const [showLoading, setShowLoading] = useState(false);

    const api = useApi();

    const formSettings: FormSettings = {
        lastname: {
            mandatory: true,
        },
        firstname: {
            mandatory: true,
        },
        username: {
            mandatory: true,
        },
        email: {
            mandatory: true,
            checkers: [
                {
                    action: checkIsEmail,
                    message: "L'email non è valida",
                },
            ],
        },
        password: {
            mandatory: true,
            checkers: [
                {
                    action: checkPassword,
                    message: 'La password non è valida',
                },
            ],
        },
        confirm: {
            mandatory: true,
        },
    };

    function newRegistrationUser(form: FormType) {
        return new Promise<void>((resolve, reject) => {
            if (form['password'].value !== form['confirm'].value) {
                reject({ confirm: 'Le password devono conincidere' });
                return;
            }

            const user: User = {
                firstname: form['firstname'].value as string,
                lastname: form['lastname'].value as string,
                username: form['username'].value as string,
                email: form['email'].value as string,
                password: form['password'].value as string,
            };

            setShowLoading(true);

            api.user
                .add(user)
                .onSuccess(() => enqueueSnackbar('Utente aggiunto con successo', { variant: 'success' }))
                .onError((err: ResponseError) => {
                    switch (err.code) {
                        case 101:
                            reject({ username: "L'username è già stato inserito" });
                            break;
                        case 102:
                            reject({ email: "L'email è già stata inserita" });
                            break;
                    }
                })
                .onFinish(() => setShowLoading(false))
                .execute();
        });
    }

    return (
        <Box height={'100%'} width={'100%'} display={'flex'} alignItems={'center'} justifyContent={'center'}>
            <Card sx={{ maxWidth: '500px' }}>
                {showLoading && <LinearProgress sx={{ width: '100%' }} />}
                <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <Box>
                        {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text */}
                        <img src="/logo.png" style={{ width: '300px' }} />
                    </Box>
                    <Box sx={{ width: '100%' }}>
                        <Typography sx={{ paddingLeft: 2 }}>
                            {' '}
                            <span style={{ fontWeight: 'bold', fontSize: '1.3em' }}>Benvenuto!!</span> <br /> Registrati
                            per cominciare a registrare i tuoi movimenti bancari
                        </Typography>
                    </Box>
                    <Box>
                        <FormProvider settings={formSettings}>
                            <Grid container spacing={2}>
                                <Grid size={6}>
                                    <Input type="text" name="lastname" label="Cognome" />
                                </Grid>
                                <Grid size={6}>
                                    <Input type="text" name="firstname" label="Nome" />
                                </Grid>
                                <Grid size={12}>
                                    <Input type="text" name="username" label="Username" />
                                </Grid>
                                <Grid size={12}>
                                    <Input type="text" name="email" label="Email" />
                                </Grid>
                                <Grid size={6}>
                                    <Input type="password" name="password" label="Password" />
                                </Grid>
                                <Grid size={6}>
                                    <Input type="password" name="confirm" label="Conferma password" />
                                </Grid>
                                <Grid size={12}>
                                    <Submit
                                        variant="contained"
                                        label="Registrati"
                                        fullWidth
                                        onValidate={newRegistrationUser}
                                    />
                                </Grid>
                            </Grid>
                        </FormProvider>
                    </Box>
                </CardContent>
            </Card>
        </Box>
    );
}
