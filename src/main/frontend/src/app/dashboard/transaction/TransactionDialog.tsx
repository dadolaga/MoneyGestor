import { Button, DialogActions, DialogContent, DialogContentText, DialogTitle, Grid, LinearProgress, TextField, Typography } from "@mui/material";
import Dialog from "@mui/material/Dialog/Dialog";
import 'dayjs/locale/it'
import { useEffect, useState } from "react";
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

export default function TransactionDialog({open, onClose, transactionId}) {
    const [loading, setLoading] = useState<boolean>(true);
    const [wallets, setWallets] = useState<Wallet[]>(undefined);
    const [types, setTypes] = useState<TransactionType[]>(undefined);

    const [openAddNewTypeDialog, setOpenAddNewTypeDialog] = useState<boolean>(false);

    const restApi = useRestApi();

    const [form, setForm] = useState<Form>(new Form(formSettings));

    useEffect(() => {
        if(!open)
            return;

        form.reset();

        setLoading(true);

        let promiseArray: Promise<any>[] = [];

        promiseArray.push(loadWallet());
        promiseArray.push(loadType());

        if(transactionId) {
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
        return restApi.Transaction.Get(transactionId)
            .then(transaction => setForm(form => form.setValues({
                ...transaction, 
                type: new TransactionTypePrintable(transaction.type),
                wallet: new WalletPrintable(transaction.wallet),
                "wallet-destination": transaction.walletDestination? new WalletPrintable(transaction.walletDestination) : undefined,
                value: transaction.walletDestination? Math.abs(transaction.value) : transaction.value,
                date: dayjs.utc(transaction.date)
            })));
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
        .catch(Request.ErrorGestor([{
            code: 201,
            action: () => setForm(form => form.setManualError("value", "Il portafoglio andrebbe in negativo"))
        }]))
        .finally(() => {
            setLoading(false);
        })
    }

    function editTransaction() {
        setLoading(true);

        let transactionForm: TransactionForm = {
            description: form.getStringValue("description"),
            date: form.getStringValue("date") ?? dayjs.utc().hour(0).minute(0).second(0).millisecond(0).toISOString(),
            value: parseFloat(form.getStringValue("value")),
            typeId: form.getValue("type")?.getKey() as number,
            wallet: form.getValue("wallet")?.getKey() as number,
            walletDestination: form.getValue("wallet-destination")?.getKey() as number
        }

        restApi.Transaction.Modify(transactionId, transactionForm)
        .then(() => onClose(true))
        .catch(Request.ErrorGestor([{
            code: 201,
            action: () => setForm(form => form.setManualError("value", "Il portafoglio andrebbe in negativo"))
        }]))
        .finally(() => setLoading(false));
    }

    const saveHandler = () => {
        setForm(form => form.check());
        if(form.isCheckFail())
            return;

        if(transactionId == null)
            saveTransaction();
        else 
            editTransaction();
    }

    const cancelHandler = () => {
        onClose(false);
    }

    const addNewTypeClickHandler = () => {
        setOpenAddNewTypeDialog(true);
    }

    const closeAddNewTypeHandler = (isToRefresh: boolean) => {
        setOpenAddNewTypeDialog(false);

        if(isToRefresh) {
            setLoading(true);
            loadType().finally(() => setLoading(false));
        }
    }

    return (
        <Dialog open={open} onClose={onClose} TransitionComponent={TransitionDialog}>
            <AddNewTypeDialog open={openAddNewTypeDialog} onClose={closeAddNewTypeHandler} />
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
                <Button onClick={cancelHandler} color="secondary" >Annulla</Button>
                <Button onClick={saveHandler} disabled={loading} >{transactionId == null? 'Salva' : 'Modifica'}</Button>
            </DialogActions>
        </Dialog>
    );
}

function AddNewTypeDialog({open, onClose}) {
    const [loading, setLoading] = useState<boolean>(false);

    const [value, setValue] = useState<string>("");

    const [typeError, setTypeError] = useState(null);

    const restApi = useRestApi();

    function addNewType() {
        if(value.trim().length <= 0) {
            setTypeError("Inserire un valore per il tipo")
            return;
        }

        setLoading(true);

        restApi.TransactionType.Create({ name: value })
        .then(_ => {
            onClose(true);
        })
        .catch(Request.ErrorGestor([{
            code: 102,
            action: () => {
                enqueueSnackbar("Il tipo esiste gia", {variant: "error"});
            }
        }]))
        .finally(() => setLoading(false));
    }

    const cancelHandler = () => {
        onClose(false);
    }

    const addHandler = () => {
        addNewType();
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