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
import useApi, { ResponseError, ApiRequest } from '@/hooks/useApi';
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

    const [loading, setLoading] = useState<number>(0);
    const [colors, setColors] = useState<Color[]>(undefined);
    const [wallet, setWallet] = useState<Wallet>(undefined);

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

        setWallet(undefined);
        loadColor();

        if (walletId) {
            loadWallet();
        }
    }, [open, walletId]);

    const loadColor = () => {
        setLoading((i) => i + 1);

        api.color
            .get()
            .onSuccess((colors) => {
                console.log(colors);
                setColors(colors);
            })
            .onFinish(() => {
                setLoading((i) => i - 1);
            })
            .execute();
    };

    const loadWallet = () => {
        setLoading((i) => i + 1);

        api.wallet
            .getSingle(walletId)
            .onSuccess((wallet) => {
                setWallet(wallet);
            })
            .onFinish(() => {
                setLoading((i) => i - 1);
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

            setLoading((i) => i + 1);

            var apiRequest: ApiRequest<number> = walletId
                ? api.wallet.modify(walletId, wallet)
                : api.wallet.add(wallet);

            apiRequest
                .onSuccess(() => {
                    enqueueSnackbar(
                        walletId ? 'Portafoglio modificato con successo' : 'Portafoglio aggiunto con successo',
                        { variant: 'success' },
                    );
                    
                    onClose(true);
                    
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
                    setLoading((i) => i - 1);
                })
                .execute();
        });
    }

    const onCloseHandler = () => {
        onClose(false);
    };

    return (
        <Dialog open={open} fullWidth maxWidth="sm" onClose={onClose} PaperProps={{}}>
            <FormProvider
                settings={formSettings}
                default={wallet ? { name: wallet.name, value: wallet.value, color: wallet.color.id } : undefined}
            >
                {loading > 0 && <LinearProgress />}
                <DialogTitle>
                    {walletId ? `Modifica portafoglio: ${wallet ? wallet.name : '...'}` : 'Crea nuovo portafoglio'}
                </DialogTitle>
                <DialogContent>
                    <Grid container spacing={2} sx={{ marginTop: 1 }} component="form">
                        <Grid size={8}>
                            <Input type="text" name="name" label="Nome" />
                        </Grid>
                        <Grid size={4}>
                            <Input type="text" name="value" label="Valore" disabled={walletId !== undefined} />
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
                    <Submit label={walletId ? 'Modifica' : 'Salva'} onValidate={saveHandler} />
                </DialogActions>
            </FormProvider>
        </Dialog>
    );
}
