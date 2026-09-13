'use client';

import { useCallback, useEffect, useState } from 'react';

import { faArrowRightToBracket, faArrowRightFromBracket } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { enqueueSnackbar } from 'notistack';

import 'dayjs/locale/it';

import { Box, Grid, Typography, Paper, InputBase, Chip, IconButton, Button } from '@mui/material';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import type { PickerValue } from '@mui/x-date-pickers/internals';

import useApi from '@/hooks/useApi';
import type { Transaction, Type, Wallet } from '@/models/backend';


dayjs.extend(utc);

const ID_TRANSFER_TYPE = 1;

export default function TransactionDialog() {
    const api = useApi();

    const [loading, setLoading] = useState<number>(0);
    const [wallets, setWallets] = useState<Wallet[]>();
    const [types, setTypes] = useState<Type[]>();

    const [description, setDescription] = useState<string>('');
    const [typeSelectedId, setTypeSelectedId] = useState<number>();
    const [walletSelectedId, setWalletSelectedId] = useState<number>();
    const [walletDestinationSelectedId, setWalletDestinationSelectedId] = useState<number>();
    const [date, setDate] = useState<Dayjs>(dayjs());
    const [stringValue, setStringValue] = useState<string>('');

    const [isIncoming, setIsIncoming] = useState<boolean>(false);

    const loadTransactionType = useCallback(() => {
        queueMicrotask(() => setLoading((i) => i + 1));

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
        queueMicrotask(() => setLoading((i) => i + 1));

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

    const clearData = useCallback(() => {
        setDescription('');
        setTypeSelectedId(undefined);
        setWalletSelectedId(undefined);
        setWalletDestinationSelectedId(undefined);
        setStringValue('');
        setDate(dayjs().utc());
        setIsIncoming(false);
    }, []);

    useEffect(() => {
        loadTransactionType();
        loadWallet();
    }, [loadTransactionType, loadWallet]);

    const typeSelectHandler = useCallback(
        (type: Type) => () => {
            setTypeSelectedId(type.id);
        },
        [],
    );

    const walletSelectHandler = useCallback(
        (wallet: Wallet) => () => {
            setWalletSelectedId(wallet.id);
        },
        [],
    );

    const walletDestinationSelectHandler = useCallback(
        (wallet: Wallet) => () => {
            setWalletDestinationSelectedId(wallet.id);
        },
        [],
    );

    const changeTransactionDirectionHandler = () => {
        setIsIncoming((value) => !value);
    };

    const dateChangeHandler = useCallback((event: PickerValue) => {
        console.log(event, event?.hour(0).utc(false));
        setDate(event?.utc(true) ?? dayjs());
    }, []);

    const clearHandler = useCallback(() => {
        clearData();
    }, [clearData]);

    const saveTransactionHandler = () => {
        const value = parseFloat(stringValue);

        if (typeSelectedId !== ID_TRANSFER_TYPE && description.trim().length == 0) {
            enqueueSnackbar('La descrizione è obbligatoria', { variant: 'error' });
            return;
        }

        if (typeSelectedId === undefined) {
            enqueueSnackbar('Il tipo di transazione è obbligatorio', { variant: 'error' });
            return;
        }

        if (walletSelectedId === undefined) {
            enqueueSnackbar(`Il portafoglio ${typeSelectedId === ID_TRANSFER_TYPE ? "d'origine " : ''}è obbligatorio`, {
                variant: 'error',
            });
            return;
        }

        if (date === undefined) {
            enqueueSnackbar('La data è obbligatoria', { variant: 'error' });
            return;
        }

        if (value === undefined || Number.isNaN(value)) {
            enqueueSnackbar('Il valore è obbligatorio', { variant: 'error' });
            return;
        }

        if (typeSelectedId === ID_TRANSFER_TYPE && walletDestinationSelectedId === undefined) {
            enqueueSnackbar('Il portafoglio di destinazione è obbligatorio', { variant: 'error' });
            return;
        }

        if (typeSelectedId === ID_TRANSFER_TYPE && value < 0) {
            enqueueSnackbar('Il valore in modalità transfer deve essere positivo', { variant: 'error' });
            return;
        }

        setLoading((i) => i + 1);

        const transaction: Transaction = {
            description: description.trim().length === 0 ? undefined : description.trim(),
            date: date.hour(0).minute(0).second(0).millisecond(0).utc().toISOString(),
            value: isIncoming ? value : -value,
            transactionType: {
                id: typeSelectedId,
            },
            wallet: {
                id: walletSelectedId,
            },
            walletDestination: {
                id: typeSelectedId === ID_TRANSFER_TYPE ? walletDestinationSelectedId : undefined,
            },
        };

        api.transaction
            .add(transaction)
            .onSuccess(() => {
                enqueueSnackbar('Transazione creata', { variant: 'success' });

                clearData();
            })
            .onError((error) => {
                switch (error.code) {
                    case 301:
                        enqueueSnackbar('Il andrebbe in negativo', { variant: 'error' });
                        break;
                }
            })
            .onFinish(() => {
                setLoading((i) => i - 1);
            })
            .execute();
    };

    return (
        <Box sx={{ height: '100%' }} display="flex" flexDirection="column" justifyContent="space-between">
            <Grid container spacing={2.5} sx={{ marginTop: 1 }} component="form">
                <Grid size={12}>
                    <Typography color="textPrimary" sx={{ mb: 0.5 }}>
                        Descrizione
                    </Typography>
                    <Paper>
                        <InputBase
                            fullWidth
                            sx={{ px: 1, py: 0.5, flex: 1 }}
                            placeholder="Inserisci la descrizione..."
                            value={description}
                            onChange={(event) => setDescription(event.target.value)}
                        />
                    </Paper>
                </Grid>
                <Grid size={12}>
                    <Typography color="textPrimary" sx={{ mb: 0.5 }}>
                        Tipo transazione
                    </Typography>
                    <Box display="flex" flexDirection="row" gap={2} overflow="auto">
                        {types?.map((value) => (
                            <Chip
                                key={value.id}
                                style={{
                                    color: typeSelectedId === value.id ? 'red' : undefined,
                                    borderColor: typeSelectedId === value.id ? 'red' : undefined,
                                }}
                                label={value.name}
                                variant="outlined"
                                onClick={typeSelectHandler(value)}
                            />
                        ))}
                    </Box>
                </Grid>
                <Grid size={12}>
                    <Typography color="textPrimary" sx={{ mb: 0.5 }}>
                        Portafoglio
                    </Typography>
                    <Box display="flex" flexDirection="row" gap={2} overflow="auto">
                        {wallets?.map((value) => (
                            <Chip
                                key={value.id}
                                style={{
                                    color: walletSelectedId === value.id ? 'red' : undefined,
                                    borderColor: walletSelectedId === value.id ? 'red' : undefined,
                                }}
                                label={value.name}
                                variant="outlined"
                                onClick={walletSelectHandler(value)}
                            />
                        ))}
                    </Box>
                </Grid>
                {typeSelectedId == ID_TRANSFER_TYPE && (
                    <Grid size={{ xs: 12, sm: 8 }}>
                        <Typography color="textPrimary" sx={{ mb: 0.5 }}>
                            Portafoglio destinazione
                        </Typography>
                        <Box display="flex" flexDirection="row" gap={2} overflow="auto">
                            {wallets?.map((value) => (
                                <Chip
                                    key={value.id}
                                    style={{
                                        color: walletDestinationSelectedId === value.id ? 'red' : undefined,
                                        borderColor: walletDestinationSelectedId === value.id ? 'red' : undefined,
                                    }}
                                    label={value.name}
                                    variant="outlined"
                                    onClick={walletDestinationSelectHandler(value)}
                                />
                            ))}
                        </Box>
                    </Grid>
                )}
                <Grid size={12}>
                    <Typography color="textPrimary" sx={{ mb: 0.5 }}>
                        Data
                    </Typography>
                    <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="it">
                        <DatePicker
                            sx={{ width: '100%' }}
                            slotProps={{ textField: { size: 'small' } }}
                            views={['year', 'month', 'day']}
                            value={date ?? dayjs()}
                            onChange={dateChangeHandler}
                            disabled={loading !== 0}
                        />
                    </LocalizationProvider>
                </Grid>
                <Grid size={12}>
                    <Typography color="textPrimary" sx={{ mb: 0.5 }}>
                        Prezzo
                    </Typography>
                    <Paper sx={{ p: '2px 4px', display: 'flex', alignItems: 'center' }}>
                        {typeSelectedId !== ID_TRANSFER_TYPE && (
                            <IconButton
                                sx={{ p: '10px' }}
                                aria-label="menu"
                                onClick={changeTransactionDirectionHandler}
                            >
                                <FontAwesomeIcon
                                    // eslint-disable-next-line react/jsx-no-leaked-render
                                    icon={isIncoming ? faArrowRightToBracket : faArrowRightFromBracket}
                                    color={isIncoming ? '#38b000' : '#c1121f'}
                                />
                            </IconButton>
                        )}
                        <InputBase
                            sx={{ mx: 1, my: 0.5, flex: 1 }}
                            placeholder="Inserisci il prezzo della transazione..."
                            value={stringValue}
                            onChange={(event) => setStringValue(event.target.value)}
                        />
                    </Paper>
                </Grid>
            </Grid>
            <Grid container spacing={2} sx={{ width: '100%' }}>
                <Grid size={6}>
                    <Button fullWidth variant="contained" color="secondary" onClick={clearHandler}>
                        Cancel
                    </Button>
                </Grid>
                <Grid size={6}>
                    <Button fullWidth variant="contained" onClick={saveTransactionHandler}>
                        Salva
                    </Button>
                </Grid>
            </Grid>
        </Box>
    );
}
