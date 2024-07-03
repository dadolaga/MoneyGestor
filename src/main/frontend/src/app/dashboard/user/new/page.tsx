"use client"

import { faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons'
import { useState, useRef } from 'react';
import { Box, Card, Grid, TextField, FormControl, InputLabel, OutlinedInput, InputAdornment, IconButton, Typography, Button, Alert, FormHelperText, LinearProgress, CardMedia, CardContent, Snackbar, Slide } from '@mui/material';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Request, useRestApi } from '../../../request/Request';
import { UserRegistrationForm } from '../../../Utilities/BackEndTypes';
import { useSnackbar } from 'notistack';

export default function Page() {
    const form = useRef(null);

    const [showPassword, setShowPassword] = useState(false);

    const DEFAULT_FORM_ERROR = {
        "lastname": null,
        "firstname": null,
        "username": null,
        "email": null,
        "password": null,
        "confirm": null,
    };
    const [formError, setFormError] = useState(DEFAULT_FORM_ERROR);

    const [showLoading, setShowLoading] = useState(false);
    const [completeRegistration, setCompleteRegistration] = useState(false);

    const { enqueueSnackbar, closeSnackbar } = useSnackbar();

    const restApi = useRestApi();

    function registrationUser() {
        const formData = new FormData(form.current);

        setFormError(DEFAULT_FORM_ERROR);

        if(!checkField())
            return;

        let userData: UserRegistrationForm = {
            firstname: formData.get("firstname") as string,
            lastname: formData.get("lastname") as string,
            username: formData.get("username") as string,
            email: formData.get("email") as string,
            password: formData.get("password") as string,
            confirm: formData.get("confirm") as string,
        };

        setShowLoading(true);

        restApi.User.Registration(userData)
        .then(response => {
            enqueueSnackbar("Utente aggiunto con successo", {variant: 'success'});
        })
        .catch(Request.ErrorGestor([{
            code: 102,
            action: (error) => {
                if(error.message.includes("duplicate email")) {
                    enqueueSnackbar( "L'email è già stata inserita", {variant: 'error'});
                    return;
                }

                if(error.message.includes("duplicate username")) {
                    enqueueSnackbar( "L'username è già stato inserito", {variant: 'error'});
                    return;
                }
            }}, {
                code: 111,
                action: (error) => {
                    if(error.message.includes("password")) {
                        enqueueSnackbar( "La password non rispetta i creteri", {variant: 'error'});
                        return;
                    }
                }
            }
        ]))
        .finally(() => setShowLoading(false));


        function checkField() {
            const regexUsername = /^[A-Za-z0-9_\-]+$/;

            let valid = true;

            formData.forEach((value, key) => {
                if(value.toString().trim().length == 0) {
                    setFormError(value => value = {...value, [key]: "Il campo non può essere vuoto"});
                    valid = false;
                }
            });

            if(valid) {
                if(!regexUsername.test(formData.get("username").toString())) {
                    setFormError(value => value = {...value, "username": "L'username può solo contenere lettere numeri e _ o -"});
                    valid = false;
                }

                if(formData.get("password") !== formData.get("confirm")) {
                    setFormError(value => value = {...value, "password": "Le password devono conincidere"});
                    valid = false;
                }
            }

            return valid;
        }
    }

    return(
        <Box height={'100%'} width={'100%'} display={'flex'} alignItems={'center'} justifyContent={'center'}>
            <Card sx={{maxWidth: '500px'}} >
                {showLoading && <LinearProgress sx={{width: "100%"}}/>}
                <CardContent sx={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4}}>
                    <Box>
                        <img src='/logo.png' style={{width: '300px'}}/>
                    </Box>
                    <Box sx={{width: '100%'}}>
                        <Typography sx={{paddingLeft: 2}}> <span style={{fontWeight: 'bold', fontSize: '1.3em'}}>Benvenuto!!</span> <br /> Registrati per cominciare a registrare i tuoi movimenti bancari</Typography>
                    </Box> 
                    <Box component={'form'} ref={form}>
                        <Grid container spacing={2}>
                            <Grid item xs={6}>
                                <TextField error={formError.lastname != null} helperText={formError.lastname} fullWidth label="Cognome" name='lastname' color='primary' required />
                            </Grid>
                            <Grid item xs={6}>
                                <TextField error={formError.firstname != null} helperText={formError.firstname} fullWidth label="Nome" name='firstname' color='primary' required />
                            </Grid>
                            <Grid item xs={12}>
                                <TextField error={formError.username != null} helperText={formError.username} fullWidth label="Username" name='username' color='primary' required />
                            </Grid>
                            <Grid item xs={12}>
                                <TextField error={formError.email != null} helperText={formError.email} fullWidth label="Email" name='email' color='primary' required />
                            </Grid>
                            <Grid item xs={6}>
                                <FormControl variant="outlined" error={formError.password != null}>
                                    <InputLabel htmlFor="outlined-adornment-password">
                                        Password *
                                    </InputLabel>
                                    <OutlinedInput
                                        id="outlined-adornment-password"
                                        type={showPassword ? 'text' : 'password'}
                                        endAdornment={
                                        <InputAdornment position="end">
                                            <IconButton size='small' onClick={() => setShowPassword(!showPassword)} tabIndex={-1}> 
                                                <FontAwesomeIcon
                                                icon={showPassword? faEyeSlash : faEye}
                                                />
                                            </IconButton>
                                        </InputAdornment>
                                        }
                                        label="Password"
                                        name='password'
                                    />
                                    { formError.password != null && (
                                        <FormHelperText >{formError.password}</FormHelperText>
                                    )}
                                </FormControl>
                            </Grid>
                            <Grid item xs={6}>
                                <TextField error={formError.confirm != null} helperText={formError.confirm} fullWidth type='password' label="Conferma" name='confirm' color='primary' required />
                            </Grid>
                        </Grid>
                    </Box>
                    <Button variant='contained' fullWidth onClick={registrationUser}> Registrati </Button>
                </CardContent>
            </Card>
            <Snackbar open={completeRegistration} anchorOrigin={{vertical: 'bottom', horizontal: 'right'}} autoHideDuration={5000} onClose={() => setCompleteRegistration(false)}>
                <Alert severity='success' variant='filled' sx={{width: "100%"}}> Registrazione avvenuta con successo </Alert>
            </Snackbar>
        </Box>
    )
}