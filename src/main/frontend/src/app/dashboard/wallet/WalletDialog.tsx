import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, FormControl, FormHelperText, Grid, InputAdornment, InputLabel, LinearProgress, MenuItem, Select, SelectChangeEvent, TextField } from "@mui/material";
import { useState, useEffect, ChangeEventHandler } from "react";
import axios from "../../axios/axios";
import { Request, useRestApi } from "../../request/Request";
import { Color, CreateWalletForm, Wallet } from "../../Utilities/BackEndTypes";
import { BaseChecker, Form, FormSettings } from "../../form/Form";
import Input from "../../component/Input";

interface WalletDialogInterface {
    open: boolean,
    onClose: (isSave: boolean) => void,
    walletId?: number
}

const formSettings: FormSettings[] = [{
    name: "name",
    checks: [{
        action: BaseChecker.isEmpty,
        text: "Il parametro non può essere vuoto"
    }],
}, {
    name: "value",
    checks: [{
        action: BaseChecker.isEmpty,
        text: "Il parametro non può essere vuoto"
    }, {
        action: BaseChecker.isNotNumber,
        text: "Il valore deve essere un numero"
    }],
}, {
    name: "color",
    checks: [{
        action: BaseChecker.isEmpty,
        text: "Il parametro non può essere vuoto"
    }],
}]

export default function WalletDialog({ open, onClose, walletId }: WalletDialogInterface) {
    const [loading, setLoading] = useState<boolean>(false);
    const [wallet, setWallet] = useState<CreateWalletForm>(undefined);
    const [colors, setColors] = useState([]);

    const [form, setForm] = useState<Form>(new Form(formSettings))

    const restApi = useRestApi();

    useEffect(() => {
        if(!open)
            return;

        setWallet(undefined);
        setLoading(true);

        let promiseList = [];

        promiseList.push(loadColor());
        if (open && walletId != null) {
            promiseList.push(loadWallet());
        }

        Promise.all(promiseList).finally(() => {
            setLoading(false);
        })

    }, [open]);

    function loadWallet() {
        restApi.Wallet.Get(walletId)
        .then(wallet => setWallet(wallet));
    }

    const loadColor = () => {
        axios.get("/color/list")
        .then((message) => {
            let colorList: Color[] = [];
            message.data.forEach((el) => {
                colorList.push(new Color(el.color));
            })

            setColors(colorList);
        })
    }

    const saveOrModifyHandler = () => {
        setForm(form => form.check());
        if(form.isCheckFail())
            return;

        let myWallet: CreateWalletForm = {};

        const name = form.getStringValue("name");
        const stringValue = form.getStringValue("value").replaceAll(/\s+/g, "");

        myWallet.name = name;
        myWallet.value = parseFloat(stringValue.replace(",", "."));
        myWallet.color = (form.getValue("color") as Color).color;

        if(walletId == null)
            saveNewWallet(myWallet);
        else 
            editWallet(myWallet, walletId);

        function editWallet(wallet, walletId) {
            setLoading(true);

            restApi.Wallet.Modify(walletId, wallet)
            .then(() => {
                onClose(true);
            })
            .catch(Request.ErrorGestor([{
                code: 102,
                action: _ => console.log("Il nome è gia presente")
            }]))
            .finally(() => {
                setLoading(false);
            })
        }

        function saveNewWallet(wallet: CreateWalletForm) {
            setLoading(true);

            restApi.Wallet.Create(wallet)
            .then(id => {
                onClose(true);
            })
            .catch(Request.ErrorGestor([{
                code: 102,
                action: _ => console.log("Il nome esiste già"),
            }]))
            .finally(() => {
                setLoading(false);
            })
        }
    }

    const onCloseHandler = () => {
        onClose(false);
    }

    return (
        <Dialog open={open} onClose={onClose} PaperProps={{}}>
            {loading && <LinearProgress />}
            <DialogTitle >Crea nuovo portafoglio</DialogTitle>
            <DialogContent>
                <DialogContentText>
                </DialogContentText>
                <Grid container spacing={2} sx={{ marginTop: 1 }} component="form">
                    <Grid item xs={8}>
                        <Input
                            type="text"
                            form={form}
                            setForm={setForm}
                            label="Nome"
                            name="name"
                            disabled={loading}
                            />
                    </Grid>
                    <Grid item xs={4}>
                        <Input
                            type="text"
                            form={form}
                            setForm={setForm}
                            label="Valore iniziale"
                            name="value"
                            InputProps={{ endAdornment: <InputAdornment position="start">€</InputAdornment> }}
                            disabled={loading || walletId != undefined}
                            />
                    </Grid>
                    <Grid item xs={12}>
                    <Input
                        type="multi"
                        form={form}
                        setForm={setForm}
                        label="Colore portafoglio"
                        name="color"
                        values={colors}
                        disabled={loading}
                        />
                    </Grid>
                </Grid>
            </DialogContent>
            <DialogActions>
                <Button onClick={onCloseHandler} color="secondary" >Annulla</Button>
                <Button onClick={saveOrModifyHandler} disabled={loading}>{walletId != null? "modifica" : "salva"}</Button>
            </DialogActions>
        </Dialog>
    );
}