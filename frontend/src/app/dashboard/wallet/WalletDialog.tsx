import {
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Grid,
    LinearProgress,
    Typography,
} from '@mui/material';
import { useState, useEffect } from 'react';
import { FormProvider, FormSettings, FormType, checkIsDecimal } from '@/context/FormContext';
import Input from '@/component/Input';
import useApi, { ResponseError } from '@/hooks/useApi';
import { Color, Wallet } from '@/models/backend';
import { convertColor } from '@/utilis/color';
import Submit from '@/component/Submit';
import { useSnackbar } from 'notistack';

interface WalletDialogInterface {
    open: boolean;
    onClose: (_isSave: boolean) => void;
    walletId?: number;
}

export default function WalletDialog({ open, onClose, walletId }: WalletDialogInterface) {
    const api = useApi();

    const { enqueueSnackbar } = useSnackbar();

    const [loading, setLoading] = useState<boolean>(false);
    const [colors, setColors] = useState<Color[]>(undefined);

    const formSettings: FormSettings = {
        name: {
            mandatory: true,
        },

        value: {
            mandatory: true,
            checkers: [
                {
                    action: checkIsDecimal,
                    message: 'Il valore deve essere un numero',
                },
            ],
        },

        color: {
            mandatory: true,
        },
    };

    useEffect(() => {
        if (!open) return;

        loadColor();
    }, [open]);

    const loadColor = () => {
        setLoading(true);

        api.color
            .get()
            .onSuccess((colors) => {
                console.log(colors);
                setColors(colors);
            })
            .onFinish(() => {
                setLoading(false);
            })
            .execute();
    };

    function saveHandler(form: FormType) {
        return new Promise<void>((resolve, reject) => {
            const wallet: Wallet = {
                name: form['name'].value as string,
                value: parseFloat(form['value'].value as string),
                color: {
                    id: parseInt(form['color'].value as string),
                },
            };

            setLoading(true);

            api.wallet
                .add(wallet)
                .onSuccess(() => {
                    enqueueSnackbar('Portafoglio aggiunto con successo', { variant: 'success' });
                    resolve();
                })
                .onError((err: ResponseError) => {
                    switch (err.code) {
                        case 201:
                            reject({ name: 'Il nome inserito esiste già' });
                            break;
                    }
                })
                .onFinish(() => {
                    setLoading(false);
                })
                .execute();
        });
    }

    const onCloseHandler = () => {
        onClose(false);
    };

    return (
        <Dialog open={open} fullWidth maxWidth="sm" onClose={onClose} PaperProps={{}}>
            <FormProvider settings={formSettings}>
                {loading && <LinearProgress />}
                <DialogTitle>Crea nuovo portafoglio</DialogTitle>
                <DialogContent>
                    <Grid container spacing={2} sx={{ marginTop: 1 }} component="form">
                        <Grid size={8}>
                            <Input type="text" name="name" label="Nome" />
                        </Grid>
                        <Grid size={4}>
                            <Input type="text" name="value" label="Valore" />
                        </Grid>
                        <Grid size={12}>
                            <Input
                                type="multi"
                                name="color"
                                label="Colore"
                                values={colors?.map((color) => ({
                                    key: color.id,
                                    text: (
                                        <Box display="flex" alignItems="center" gap={2}>
                                            <Box
                                                sx={{
                                                    height: 16,
                                                    width: 16,
                                                    backgroundColor: convertColor(color.value),
                                                }}
                                            />
                                            <Typography>{color.name}</Typography>
                                        </Box>
                                    ),
                                }))}
                            />
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={onCloseHandler} color="secondary">
                        Annulla
                    </Button>
                    <Submit label="Salva" onValidate={saveHandler} />
                </DialogActions>
            </FormProvider>
        </Dialog>
    );
}
