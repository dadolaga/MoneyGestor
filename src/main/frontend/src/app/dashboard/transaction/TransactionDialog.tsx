import { Button, DialogActions, DialogContent, DialogContentText, DialogTitle, Grid, LinearProgress, TextField, Typography } from "@mui/material";
import Dialog from "@mui/material/Dialog/Dialog";
import 'dayjs/locale/it'
import { useEffect, useState } from "react";
import axios from "../../axios/axios";
import { useCookies } from "react-cookie";
import { ITransaction } from "../../Utilities/Datatypes";
import { checkForm } from "../../Utilities/CheckForm";
import { TransitionDialog } from "../base/transition";
import dayjs from "dayjs";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowRightLong } from "@fortawesome/free-solid-svg-icons";
import { Request, useRestApi } from "../../request/Request";
import { TransactionForm, TransactionType, TransactionTypePrintable, Wallet, WalletPrintable } from "../../Utilities/BackEndTypes";
import { enqueueSnackbar } from "notistack";
import Input from "../../component/Input";
import { BaseChecker, Form, FormSettings } from "../../form/Form";
import { IFormMultiType } from "../../Utilities/Interfaces";

const ID_EXCHANGE_TYPE = 1;

const formSettings: FormSettings[] = [{
    name: "description",
    checks: [{
        action: (value, values) => 
            ((values["type"] as IFormMultiType)?.getKey() != ID_EXCHANGE_TYPE)? BaseChecker.isEmpty(value) : false,
        text: "La descrizione non può essere vuota"
    }]}, {
    name: "value",
    checks: [{
        action: BaseChecker.isEmpty,
        text: "Il valore non può essere vuoto"
    }, {
        action: BaseChecker.isNotNumber,
        text: "Il valore deve essere un numero"
    }]}, {
    name: "type",
    checks: [{
        action: BaseChecker.isEmpty,
        text: "Il tipo non può essere vuoto"
    }]}, {
    name: "wallet",
    checks: [{
        action: BaseChecker.isEmpty,
        text: "Il portafoglio non può essere vuoto"
    }]}, {
        name: "wallet-destination",
        checks: [{
            action: (value, values) => 
                ((values["type"] as IFormMultiType)?.getKey() == ID_EXCHANGE_TYPE)? BaseChecker.isEmpty(value) : false,                
            text: "Il portafoglio di destinazione non può essere vuoto"
        }]}
];

export default function TransactionDialog({open, onClose, onSave, transactionId}) {
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

    const [cookie, setCookie] = useCookies(['_token']);

    const restApi = useRestApi();

    const [form, setForm] = useState<Form>(new Form(formSettings));

    useEffect(() => {
        if(!open)
            return;

        setForm(form => form.reset());

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

    function saveTransaction() {
        setLoading(true);

        let transactionForm: TransactionForm = {
            description: form.getStringValue("description"),
            date: form.getStringValue("date") ?? dayjs.utc().hour(0).minute(0).second(0).millisecond(0).toISOString(),
            value: parseFloat(form.getStringValue("value")),
            typeId: form.getValue("type")?.getKey() as number,
            wallet: form.getValue("wallet")?.getKey() as number,
            walletDestination: form.getValue("wallet-destination")?.getKey() as number
        }

        restApi.Transaction.Create(transactionForm)
        .then(() => {
            onClose(true);
        })
        .catch(Request.ErrorGestor([]))
        .finally(() => {
            setLoading(false);
        })
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
        setForm(form => form.check());
        if(form.isCheckFail())
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

    const addNewTypeClickHandler = () => {
        setOpenAddNewTypeDialog(true);
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
                        <Input
                            type="text"
                            form={form}
                            setForm={setForm}
                            name="description"
                            label="Descrizione"
                            disabled={loading} />
                    </Grid>
                    <Grid item xs={8}>
                        <Input
                            type="date"
                            form={form}
                            setForm={setForm}
                            name="date"
                            label="Data"
                            disabled={loading} />
                    </Grid>
                    <Grid item xs={4}>
                    <Input
                            type="text"
                            form={form}
                            setForm={setForm}
                            name="value"
                            label="Valore"
                            disabled={loading} />
                    </Grid>
                    <Grid item xs={form.getValue("type")?.getKey() == ID_EXCHANGE_TYPE? 12 : 4}>
                        <Input
                            type="multi"
                            form={form}
                            setForm={setForm}
                            name="type"
                            label="Tipo"
                            disabled={loading}
                            values={TransactionTypePrintable.convert(types)} />
                        <Typography 
                            sx={{":hover": {textDecorationLine: "underline"}, fontSize: '.85em', pl: .5, cursor: "pointer", fontStyle: 'italic', color: "#219ebc"}}
                            onClick={addNewTypeClickHandler} >
                            Aggiungi nuovo tipo
                        </Typography>
                    </Grid>
                    <Grid item xs={form.getValue("type")?.getKey() == ID_EXCHANGE_TYPE? 5 : 8}>
                        <Input
                            type="multi"
                            form={form}
                            setForm={setForm}
                            name="wallet"
                            label="Portafoglio"
                            disabled={loading}
                            values={WalletPrintable.convert(wallets)} />
                    </Grid>
                    {form.getValue("type")?.getKey() == ID_EXCHANGE_TYPE && (
                        <>
                            <Grid item xs={2} sx={{display: 'flex', alignItems: 'center', justifyContent: 'center'}} >
                                <FontAwesomeIcon icon={faArrowRightLong} size="2x"/>
                            </Grid>
                            <Grid item xs={form.getValue("type")?.getKey() == ID_EXCHANGE_TYPE? 5 : 8}>
                                <Input
                                    type="multi"
                                    form={form}
                                    setForm={setForm}
                                    name="wallet-destination"
                                    label="Portafoglio destinazione"
                                    disabled={loading}
                                    values={WalletPrintable.convert(wallets)} />
                            </Grid>
                        </>
                    )}
                </Grid>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} color="secondary" >Annulla</Button>
                <Button onClick={saveHandler} disabled={loading} >{transactionId == null? 'Salva' : 'Modifica'}</Button>
            </DialogActions>
        </Dialog>
    );
}

function AddNewTypeDialog({open, onAdd, onCancel}) {
    const [loading, setLoading] = useState(false);

    const [value, setValue] = useState(null);

    const [typeError, setTypeError] = useState(null);

    const restApi = useRestApi();

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

        restApi.TransactionType.Create({ name: value })
        .then(_ => {
            onAdd();
        })
        .catch(Request.ErrorGestor([{
            code: 102,
            action: () => {
                enqueueSnackbar("Il tipo esiste gia", {variant: "error"});
            }
        }]))
        .finally(() => setLoading(false));
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