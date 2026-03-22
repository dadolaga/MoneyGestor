import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    Grid,
    LinearProgress,
    TextField,
    Typography,
    InputAdornment,
    IconButton,
    SelectChangeEvent,
    Box,
} from '@mui/material';
import 'dayjs/locale/it';
import { useCallback, useEffect, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowRightLong, faArrowDownLong, faPlus, faMinus } from '@fortawesome/free-solid-svg-icons';
import { Request, useRestApi } from '../../request/Request';
import { enqueueSnackbar } from 'notistack';
import { useIsMobile } from '../../utilities/useMobile';
import { FormProvider, FormSettings, FormType } from '@/context/FormContext';
import Input from '@/component/Input';
import Submit from '@/component/Submit';
import useApi from '@/hooks/useApi';
import { Transaction, Type, Wallet } from '@/models/backend';
import { ApiError } from 'next/dist/server/api-utils';

const ID_TRANSFER_TYPE = 1;
const ID_ADJUST_TYPE = 2;

const formSettings: FormSettings = {
    description: {
        mandatory: false,
        checkers: [
            {
                action: (value: string, form) =>
                    (form['type'] !== undefined &&
                        form['type'].value !== null &&
                        form['type'].value == ID_TRANSFER_TYPE) ||
                    (value !== undefined && value !== null && value.length > 0),
                message: 'La descrizione non può essere vuota',
            },
        ],
    },
    date: {
        mandatory: true,
    },
    value: {
        mandatory: true,
    },
    type: {
        mandatory: true,
    },
    wallet: {
        mandatory: true,
        checkers: [
            {
                action: (value, form) =>
                    form['type']?.value !== ID_TRANSFER_TYPE ||
                    form['wallet']?.value !== form['wallet-destination']?.value,
                message: 'Il portafoglio di origine deve essere diverso dal portafoglio di destinazione',
            },
        ],
    },
    'wallet-destination': {
        mandatory: false,
        checkers: [
            {
                action: (value, form) =>
                    form['type']?.value !== ID_TRANSFER_TYPE || (value !== undefined && value !== null),
                message: 'Il portafoglio di destinazione non può essere vuoto',
            },
            {
                action: (value, form) =>
                    value === undefined ||
                    value === null ||
                    form['type']?.value !== ID_TRANSFER_TYPE ||
                    form['wallet']?.value !== form['wallet-destination']?.value,
                message: 'Il portafoglio di destinazione deve essere diverso dal portafoglio di origine',
            },
        ],
    },
};

const formAddNewTypeSettings: FormSettings = {
    name: {
        mandatory: true,
    },
};

export default function TransactionDialog({ open, onClose, transactionId }) {
    const isMobile = useIsMobile();

    const api = useApi();

    const [loading, setLoading] = useState<number>(0);
    const [wallets, setWallets] = useState<Wallet[]>(undefined);
    const [types, setTypes] = useState<Type[]>(undefined);

    const [typeSelectedId, setTypeSelectedId] = useState<number>(undefined);

    const [openAddNewTypeDialog, setOpenAddNewTypeDialog] = useState<boolean>(false);

    const [sign, setSign] = useState<boolean>(true); // false: plus - true: minus

    useEffect(() => {
        loadTransactionType();
        loadWallet();
    }, []);

    const loadTransactionType = useCallback(() => {
        setLoading((i) => i + 1);

        api.type
            .get()
            .onSuccess((types) => {
                setTypes(types);
            })
            .onFinish(() => {
                setLoading((i) => i - 1);
            })
            .execute();
    }, []);

    const loadWallet = useCallback(() => {
        setLoading((i) => i + 1);

        api.wallet
            .get()
            .onSuccess((wallets) => {
                setWallets(wallets);
            })
            .onFinish(() => {
                setLoading((i) => i - 1);
            })
            .execute();
    }, []);

    const typeChangeHandler = useCallback((action: SelectChangeEvent<string>) => {
        setTypeSelectedId(parseInt(action.target.value));
    }, []);

    const clickAddNewTypeHandler = useCallback(() => {
        setOpenAddNewTypeDialog(true);
    }, []);

    const closeAddNewTypeDialogHandler = useCallback((isToReload: boolean) => {
        if (isToReload) {
            loadTransactionType();
        }

        setOpenAddNewTypeDialog(false);
    }, []);

    const closeTransactionDialogHandler = useCallback(() => {
        onClose(false);
    }, []);

    const saveTransactionHandler = useCallback(
        (form: FormType) => {
            return new Promise<void>((resolve, reject) => {
                var transaction: Transaction = {
                    description: form['description'].value as string,
                    date: form['date'].value as string,
                    value: form['value'].value as number,
                    transactionType: {
                        id: form['type'].value as number,
                    },
                    wallet: {
                        id: form['wallet'].value as number,
                    },
                    walletDestination: {
                        id: form['wallet-destination'].value as number,
                    },
                };

                console.log(transaction);

                api.transaction
                    .add(transaction)
                    .onSuccess(() => {
                        onClose(true);
                    })
                    .onError((error) => {
                        switch (error.code) {
                            case 301:
                                reject({ wallet: 'Il portafoglio andrebbe in negativo' });
                                break;
                        }
                    })
                    .execute();

                resolve();
            });
        },
        [api.user],
    );

    return (
        <Dialog open={open} onClose={onClose}>
            <AddNewTypeDialog open={openAddNewTypeDialog} onClose={closeAddNewTypeDialogHandler} />
            {loading !== 0 && <LinearProgress />}
            <FormProvider settings={formSettings}>
                <DialogTitle>Crea nuova transazione</DialogTitle>
                <DialogContent>
                    <DialogContentText>Inserire i dati della nuova transizione</DialogContentText>
                    <Grid container spacing={2} sx={{ marginTop: 1 }} component="form">
                        <Grid size={{ xs: 12 }}>
                            <Input type="text" name="description" label="Descrizione" disabled={loading !== 0} />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 8 }}>
                            <Input type="date" name="date" label="Data" disabled={loading !== 0} />
                        </Grid>
                        {isMobile && typeSelectedId != ID_TRANSFER_TYPE && (
                            <Grid size={{ xs: 2 }} display="flex" alignItems="center" justifyContent="center">
                                <IconButton onClick={() => {}}>
                                    <FontAwesomeIcon icon={sign ? faMinus : faPlus} />
                                </IconButton>
                            </Grid>
                        )}
                        <Grid size={{ xs: typeSelectedId != ID_TRANSFER_TYPE ? 10 : 12, sm: 4 }}>
                            <Input
                                type={'text'}
                                inputProps={{ inputMode: 'numeric' }}
                                name="value"
                                label="Valore"
                                endAdornment={<InputAdornment position="end">€</InputAdornment>}
                                disabled={loading !== 0}
                            />
                        </Grid>
                        <Grid size={{ xs: 12, sm: typeSelectedId == ID_TRANSFER_TYPE ? 12 : 4 }}>
                            <Input
                                type="multi"
                                name="type"
                                label="Tipo"
                                disabled={loading !== 0}
                                values={types?.map((value) => ({
                                    key: value.id,
                                    text: (
                                        <Typography
                                            fontStyle={
                                                value.id == ID_ADJUST_TYPE || value.id == ID_TRANSFER_TYPE
                                                    ? 'italic'
                                                    : undefined
                                            }
                                        >
                                            {value.name}
                                        </Typography>
                                    ),
                                }))}
                                onChange={typeChangeHandler}
                            />
                            <Typography
                                sx={{
                                    ':hover': { textDecorationLine: 'underline' },
                                    fontSize: '.85em',
                                    pl: 0.5,
                                    cursor: 'pointer',
                                    fontStyle: 'italic',
                                    color: '#219ebc',
                                }}
                                onClick={clickAddNewTypeHandler}
                            >
                                Aggiungi nuovo tipo
                            </Typography>
                        </Grid>
                        <Grid size={{ xs: 12, sm: typeSelectedId == ID_TRANSFER_TYPE ? 5 : 8 }}>
                            <Input
                                type="multi"
                                name="wallet"
                                label="Portafoglio"
                                disabled={loading !== 0}
                                values={wallets?.map((value) => ({
                                    key: value.id,
                                    text: value.name,
                                }))}
                            />
                        </Grid>
                        {typeSelectedId == ID_TRANSFER_TYPE && (
                            <>
                                <Grid
                                    size={{ xs: 12, md: 2 }}
                                    sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                >
                                    <FontAwesomeIcon icon={isMobile ? faArrowDownLong : faArrowRightLong} size="2x" />
                                </Grid>
                                <Grid size={{ xs: 12, sm: 5 }}>
                                    <Input
                                        type="multi"
                                        name="wallet-destination"
                                        label="Portafoglio destinazione"
                                        disabled={loading !== 0}
                                        values={wallets?.map((value) => ({
                                            key: value.id,
                                            text: value.name,
                                        }))}
                                    />
                                </Grid>
                            </>
                        )}
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={closeTransactionDialogHandler} color="secondary">
                        Annulla
                    </Button>
                    <Submit label="Salva" onValidate={saveTransactionHandler} />
                </DialogActions>
            </FormProvider>
        </Dialog>
    );
}

function AddNewTypeDialog({ open, onClose }) {
    const api = useApi();

    const [loading, setLoading] = useState<boolean>(false);

    const cancelHandler = () => {
        onClose(false);
    };

    const validateHandler = useCallback((form: FormType) => {
        return new Promise<void>((resolve, reject) => {
            var type: Type = {
                name: form['name'].value as string,
            };

            setLoading(true);

            api.type
                .add(type)
                .onSuccess(() => {
                    resolve();
                    onClose(true);
                })
                .onError((error) => {
                    switch (error.code) {
                        case 401:
                            reject({ name: 'Il tipo esiste gia' });
                            break;
                    }
                })
                .onFinish(() => {
                    setLoading(false);
                })
                .execute();
        });
    }, []);

    return (
        <Dialog open={open}>
            {loading && <LinearProgress />}
            <DialogTitle>Agguingi nuovo tipo</DialogTitle>
            <FormProvider settings={formAddNewTypeSettings}>
                <DialogContent>
                    <Box display="flex" flexDirection={'column'} gap={1}>
                        <DialogContentText>Inserisci il nome del nuovo tipo</DialogContentText>
                        <Input type="text" name="name" label="Nome" disabled={loading} />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={cancelHandler} color="secondary">
                        Annulla
                    </Button>
                    <Submit label="Aggiungi" onValidate={validateHandler} />
                </DialogActions>
            </FormProvider>
        </Dialog>
    );
}
