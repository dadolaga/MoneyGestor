import { Box, Button, DialogActions, DialogContent, DialogContentText, DialogTitle, FormControl, FormHelperText, Grid, InputAdornment, InputLabel, LinearProgress, MenuItem, Select, TextField, Typography } from "@mui/material";
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import Dialog from "@mui/material/Dialog/Dialog";
import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import 'dayjs/locale/it'
import { useEffect, useState } from "react";
import axios from "../../axios/axios";
import { useCookies } from "react-cookie";
import { ITransaction } from "../../Utilities/Datatypes";
import { ICheckForm, checkForm } from "../../Utilities/CheckForm";
import { TransitionDialog } from "../base/transition";
import dayjs from "dayjs";
import { CSSProperties } from "@mui/material/styles/createTypography";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowRightLong, faRightLong } from "@fortawesome/free-solid-svg-icons";
import { useRestApi } from "../../request/Request";
import { TransactionType, Wallet } from "../../Utilities/BackEndTypes";

const ID_EXCHANGE_TYPE = 1;
const ID_TIE_TYPE = 2;

export default function TransactionDialog({open, onclose, onSave, transactionId}) {
    const [loading, setLoading] = useState(true);
    const [wallets, setWallets] = useState<Wallet[]>(null);
    const [types, setTypes] = useState<TransactionType[]>(null);

    const [description, setDescription] = useState("");
    const [date, setDate] = useState(null);
    const [value, setValue] = useState("0");
    const [wallet, setWallet] = useState("");
    const [walletDestination, setWalletDestination] = useState("");
    const [type, setType] = useState<number>();

    const [openAddNewTypeDialog, setOpenAddNewTypeDialog] = useState(false);

    const [descriptionError, setDescriptionError] = useState(null);
    const [dateError, setDateError] = useState(null);
    const [valueError, setValueError] = useState(null);
    const [walletError, setWalletError] = useState(null);
    const [walletDestinationError, setWalletDestinationError] = useState(null);
    const [typeError, setTypeError] = useState(null);

    const [cookie, setCookie] = useCookies(['_token']);

    const restApi = useRestApi();

    useEffect(() => {
        if(!open)
            return;

        setDescription("");
        setDate(dayjs());
        setValue("0");
        setWallet("");
        setWalletDestination("");
        setType(undefined);

        setLoading(true);

        let promiseArray: Promise<any>[] = [];

        promiseArray.push(loadWallet());
        promiseArray.push(loadType());

        if(transactionId != null) {
            promiseArray.push(loadTransaction());
        }

        Promise.all(promiseArray).finally(() => {
            setLoading(false);
        })
    }, [open]);

    useEffect(() => {
        if(type === 0) {
            setOpenAddNewTypeDialog(true);
        }

    }, [type])

    function loadWallet(): Promise<void> {
        return restApi.Wallet.List({ order: "!favorite#name" })
        .then(wallets => setWallets(wallets));
    }

    function loadType(): Promise<any> {
        return restApi.TransactionType.GetAll()
        .then(transactionTypes => setTypes(transactionTypes));
    }

    function loadTransaction(): Promise<any> {
        return axios.get("/transaction/get/" + transactionId, {
            headers: {
                Authorization: cookie._token
            }
        })
        .then(message => {
            console.log(message.data);
            let value: ITransaction = message.data;

            setDescription(value.description);
            setDate(dayjs(new Date(value.date)));
            setValue(((value.type.id == ID_EXCHANGE_TYPE? -1 : 1) * value.value).toString());
            setWallet(value.wallet.id.toString());
            setWalletDestination(value.walletDestination?.id.toString());
            setType(value.type.id);
        })
    }

    function myCheckForm() {
        let data : ICheckForm[] = [{
                value: description,
                functionSetText: setDescriptionError,
                check: (type != ID_EXCHANGE_TYPE && type != ID_TIE_TYPE) ? [{
                    checkEmpty: true,
                    errorText: "Non è possibile tenere la descrizione vuota"
                }] : []
            }, {
                value: date,
                functionSetText: setDateError,
                check: [{
                    checkEmpty: true,
                    errorText: "Non è possibile tenere la data vuota"
                }]
            }, {
                value: value,
                functionSetText: setValueError,
                check: [{
                    checkFunction: (value) => value == "0",
                    errorText: "Non è possibile tenere il valore vuoto"
                }, {
                    regex: type != ID_EXCHANGE_TYPE ? /^[+-]?[\d]+(?:[\.,][\d]+)?$/ : /^[\d]+(?:[\.,][\d]+)?$/,
                    errorText: "Il valore deve esse numerico"
                }]
            }, {
                value: wallet,
                functionSetText: setWalletError,
                check: [{
                    checkEmpty: true,
                    errorText: "Non è possibile tenere il portafoglio vuoto"
                }]
            }, {
                value: type,
                functionSetText: setTypeError,
                check: [{
                    checkEmpty: true,
                    errorText: "Non è possibile tenere il tipo vuoto"
                }, {
                    checkFunction: (value) => value == 0,
                    errorText: "Non è possibile selezionare questo tipo"
                }]
            }];

        if(type == ID_EXCHANGE_TYPE) {
            data.push({
                value: walletDestination,
                functionSetText: setWalletDestinationError,
                check: [{
                    checkEmpty: true,
                    errorText: "Non è possibile tenere il portafoglio di destinazione vuoto",
                }, {
                    checkFunction: (value) => value == wallet,
                    errorText: "Il portafoglio di destinazione deve essere diverso"
                }]
            });
        }

        return checkForm(data);
    }

    function saveTransaction() {
        setLoading(true);

        axios.post("/transaction/new", {
            description: description,
            date: printDate(date.$d),
            value: value,
            wallet: wallet,
            walletDestination: walletDestination,
            typeId: type,
        }, {
            headers: {
                Authorization: cookie._token
            }
        }).finally(() => {
            setLoading(false);
            onSave();
        });

        function printDate(date: Date) {
            return new Date(date.getTime() - (date.getTimezoneOffset()*60000)).toISOString();
        }
    }

    function editTransaction() {
        setLoading(true);

        axios.post("/transaction/edit/" + transactionId, {
            id: transactionId,
            description: description,
            date: printDate(date.$d),
            value: value,
            wallet: wallet,
            walletDestination: walletDestination,
            typeId: type,
        }, {
            headers: {
                Authorization: cookie._token
            }
        }).finally(() => {
            setLoading(false);
            onSave();
        });

        function printDate(date: Date) {
            return new Date(date.getTime() - (date.getTimezoneOffset()*60000)).toISOString();
        }
    }

    function saveHandler() {
        if(myCheckForm())
            return;

        if(transactionId == null)
            saveTransaction();
        else 
            editTransaction();
    }

    const addNewTypeHandler = () => {
        setLoading(true);

        loadType().finally(() => {
            setLoading(false);
        });

        setOpenAddNewTypeDialog(false);
    }

    return (
        <Dialog open={open} onClose={onclose} TransitionComponent={TransitionDialog}>
            <AddNewTypeDialog open={openAddNewTypeDialog} onCancel={() => setOpenAddNewTypeDialog(false)} onAdd={addNewTypeHandler}/>
            {loading && <LinearProgress />}
            <DialogTitle>Crea nuova transazione</DialogTitle>
            <DialogContent>
                <DialogContentText>
                    Inserire i dati della nuova transizione
                </DialogContentText>
                <Grid container spacing={2} sx={{ marginTop: 1 }} component="form">
                    <Grid item xs={12}>
                        <TextField 
                            fullWidth
                            name="description"
                            label="Descrizione"
                            error={descriptionError != null}
                            helperText={descriptionError}
                            value={description}
                            onChange={(el) => setDescription(el.target.value)}
                            disabled={loading} />
                    </Grid>
                    <Grid item xs={8}>
                        <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="it" >
                            <DatePicker 
                                sx={{width: '100%'}}
                                views={["year", "month", "day"]}
                                label="Data"
                                slotProps={{
                                    textField: {
                                        error: dateError != null,
                                        helperText: dateError,
                                    }
                                }}
                                value={date}
                                onChange={(value) => setDate(value)}
                                disabled={loading} />
                        </LocalizationProvider>
                    </Grid>
                    <Grid item xs={4}>
                    <TextField
                            fullWidth
                            label="Valore"
                            name="value"
                            value={value}
                            onChange={(el) => setValue(el.target.value)}
                            error={valueError != null}
                            helperText={valueError}
                            InputProps={{ endAdornment: <InputAdornment position="start">€</InputAdornment> }} 
                            disabled={loading} />
                    </Grid>
                    <Grid item xs={type == ID_EXCHANGE_TYPE? 12 : 4}>
                        <FormControl fullWidth error={typeError != null}>
                            <InputLabel htmlFor="transaction_type">Tipo</InputLabel>
                            <Select 
                                fullWidth 
                                id="transaction_type"
                                disabled={loading || (transactionId != null && type == 1)} 
                                value={type == null? '' : type}
                                onChange={(el) => setType(parseInt(el.target.value.toString()))}
                                label="Tipo">
                                {types?.map((value, index) => {
                                    let style: CSSProperties = {};
                                    if(value.id == 1 || value.id == 2)
                                        style = {fontWeight: 'bold', textTransform: 'uppercase'}

                                    return <MenuItem key={value.id} value={value.id} style={style} disabled={transactionId != null && value.id == 1}>{value.name}</MenuItem>
                                })}
                                <MenuItem key={0} value={0} style={{fontStyle: 'italic'}}>Nuovo...</MenuItem>
                            </Select>
                            {typeError != null && <FormHelperText>{typeError}</FormHelperText>}
                        </FormControl>
                    </Grid>
                    <Grid item xs={type == ID_EXCHANGE_TYPE? 5 : 8}>
                        <FormControl fullWidth error={walletError != null}>
                            <InputLabel htmlFor="transaction_wallet">Portafoglio</InputLabel>
                            <Select 
                                fullWidth 
                                id="transaction_wallet"
                                disabled={loading} 
                                value={wallet == null? '' : wallet}
                                onChange={(el) => setWallet(el.target.value)}
                                label="Portafoglio">
                                {wallets?.map((value, index) => {
                                    return (<MenuItem key={index} value={value.id.toString()}>{value.name}</MenuItem>);
                                })}
                            </Select>
                            {walletError != null && <FormHelperText>{walletError}</FormHelperText>}
                        </FormControl>
                    </Grid>
                    {type == ID_EXCHANGE_TYPE && (
                        <>
                            <Grid item xs={2} sx={{display: 'flex', alignItems: 'center', justifyContent: 'center'}} >
                                <FontAwesomeIcon icon={faArrowRightLong} size="2x"/>
                            </Grid>
                            <Grid item xs={type == ID_EXCHANGE_TYPE? 5 : 8}>
                                <FormControl fullWidth error={walletDestinationError != null}>
                                    <InputLabel htmlFor="transaction_wallet">Portafoglio</InputLabel>
                                    <Select 
                                        fullWidth 
                                        id="transaction_wallet"
                                        disabled={loading} 
                                        value={walletDestination == null? '' : walletDestination}
                                        onChange={(el) => setWalletDestination(el.target.value)}
                                        label="Portafoglio">
                                        {wallets?.map((value, index) => {
                                            return (
                                                <MenuItem value={value.id.toString()} key={index}>{value.name}</MenuItem>
                                            );
                                        })}
                                    </Select>
                                    {walletDestinationError != null && <FormHelperText>{walletDestinationError}</FormHelperText>}
                                </FormControl>
                            </Grid>
                        </>
                    )}
                </Grid>
            </DialogContent>
            <DialogActions>
                <Button onClick={onclose} color="secondary" >Annulla</Button>
                <Button onClick={saveHandler} disabled={loading} >{transactionId == null? 'Salva' : 'Modifica'}</Button>
            </DialogActions>
        </Dialog>
    );
}

function AddNewTypeDialog({open, onAdd, onCancel}) {
    const [loading, setLoading] = useState(false);

    const [value, setValue] = useState(null);

    const [typeError, setTypeError] = useState(null);

    const [cookie, setCookie] = useCookies(['_token']);

    const cancelHandler = (event) => {
        onCancel();
    }

    const addHandler = (event) => {
        addNewType();
    }

    function addNewType() {
        let check = checkForm([{
            value: value,
            functionSetText: setTypeError,
            check: [{
                errorText: "Il campo tipo è obbligatorio",
                checkEmpty: true,
            }]
        }]);

        if(check)
            return;

        setLoading(true);

        axios.post("/transaction_type/new", {
            name: value
        }, {
            headers: {
                Authorization: cookie._token
            }
        })
        .then(() => {
            onAdd();
        })
        .catch((error) => {
            if(error.response.data.code == 5) {
                setTypeError("Tipo già inserito");
            }
        })
        .finally(() => {
            setLoading(false);
        });
    }

    return (
        <Dialog open={open}>
            {loading && <LinearProgress />}
            <DialogTitle>Agguingi nuovo tipo</DialogTitle>
            <DialogContent>
                <DialogContentText>Inserisci il nome del nuovo tipo</DialogContentText>
                <TextField
                    error={typeError != null}
                    helperText={typeError}
                    autoFocus
                    disabled={loading}
                    margin="dense"
                    label="Tipo"
                    fullWidth
                    value={value}
                    onChange={(el) => setValue(el.target.value)}
                    variant="standard"
                />
            </DialogContent>
            <DialogActions>
                <Button onClick={cancelHandler} color="secondary" >Annulla</Button>
                <Button onClick={addHandler} disabled={loading} >Aggiungi</Button>
            </DialogActions>
        </Dialog>
    );
}