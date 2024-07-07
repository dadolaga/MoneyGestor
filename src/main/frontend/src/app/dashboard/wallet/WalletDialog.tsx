import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, FormControl, FormHelperText, Grid, InputAdornment, InputLabel, LinearProgress, MenuItem, Select, SelectChangeEvent, TextField } from "@mui/material";
import { useState, useEffect, ChangeEventHandler } from "react";
import axios from "../../axios/axios";
import { Request, useRestApi } from "../../request/Request";
import { CreateWalletForm } from "../../Utilities/BackEndTypes";
import { BaseChecker, Form, FormSettings } from "../../form/Form";

const WALLET_DEFAULT: CreateWalletForm = {
    name: "",
    value: 0,
    color: ""
}

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
    const [wallet, setWallet] = useState<CreateWalletForm>(WALLET_DEFAULT);
    const [colors, setColors] = useState([]);

    const [form, setForm] = useState<Form>(new Form(formSettings))

    const restApi = useRestApi();

    useEffect(() => {
        if(!open)
            return;

        setWallet({
            name: "",
            value: 0,
            color: ""
        });

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
            let colorList = [];
            message.data.forEach((el) => {
                colorList.push(el.color);
            })

            setColors(colorList);
        })
    }

    const saveOrModifyHandler = () => {
        setForm(form => form.check());

        /*let myWallet: CreateWalletForm = WALLET_DEFAULT;

        setNameError(null);
        setValueError(null);

        const name = wallet.name;
        const stringValue = wallet.value.toString().replaceAll(/\s+/g, "");

        if (checkError())
            return;

        myWallet.name = name;
        myWallet.value = parseFloat(stringValue.replace(",", "."));
        myWallet.color = wallet.color;

        if(walletId == null)
            saveNewWallet();
        else 
            editWallet(myWallet, walletId);

        function checkError() {
            const valueRegex = /^[\d]+(?:[\.,][\d]+)?$/;
            let thereIsError = false;

            if (name.trim().length == 0) {
                setNameError("Il nome non può essere vuoto");
                thereIsError = true;
            }

            if (!valueRegex.test(stringValue)) {
                setValueError("Il valore deve essere un valore monetario valido");
                thereIsError = true;
            }

            if(wallet.color == "") {
                setColorError("Il colore è un campo obbligatorio");
                thereIsError = true;
            }

            return thereIsError;
        }

        function editWallet(wallet, walletId) {
            setLoading(true);

            restApi.Wallet.Modify(walletId, wallet)
            .then(() => {
                onClose(true);
            })
            .catch(Request.ErrorGestor([{
                code: 102,
                action: _ => {
                    setNameError("Il nome è gia presente");
                }
            }]))
            .finally(() => {
                setLoading(false);
            })
        }

        function saveNewWallet() {
            setLoading(true);

            restApi.Wallet.Create(wallet)
            .then(id => {
                onClose(true);
            })
            .catch(Request.ErrorGestor([{
                code: 102,
                action: _ => setNameError("Il nome esiste già"),
            }]))
            .finally(() => {
                setLoading(false);
            })
        }*/
    }

    const onCloseHandler = () => {
        onClose(false);
    }

    const textChangeHandler = (name: string):  ChangeEventHandler<HTMLInputElement | HTMLTextAreaElement> => (action) => {
        setForm(form => form.setValue(name, action.target.value));
    }

    const selectChangeHandler = (name: string):  (event: SelectChangeEvent<string>) => void => (action) => {
        setForm(form => form.setValue(name, action.target.value));
    }

    return (
        <Dialog open={open} onClose={onClose} PaperProps={{}}>
            {loading && <LinearProgress />}
            <DialogTitle color={'#' + parseInt(wallet.color)}>Crea nuovo portafoglio</DialogTitle>
            <DialogContent>
                <DialogContentText>
                </DialogContentText>
                <Grid container spacing={2} sx={{ marginTop: 1 }} component="form">
                    <Grid item xs={8}>
                        <TextField
                            fullWidth 
                            error={form.haveError("name")} 
                            helperText={form.getError("name")} 
                            label="Nome" 
                            name="name" 
                            value={form.getValue("name")}
                            onChange={textChangeHandler("name")} 
                            disabled={loading} />
                    </Grid>
                    <Grid item xs={4}>
                        <TextField
                            fullWidth
                            error={form.haveError("value")}
                            helperText={form.getError("value")}
                            label="Valore iniziale"
                            name="value"
                            value={form.getValue("value")}
                            onChange={textChangeHandler("value")}
                            InputProps={{ endAdornment: <InputAdornment position="start">€</InputAdornment> }}
                            disabled={loading || walletId != undefined} />
                    </Grid>
                    <Grid item xs={12}>
                        <FormControl fullWidth error={form.haveError("color")}>
                            <InputLabel id="select-color" >Color</InputLabel>
                            <Select
                                sx={{
                                    ".MuiSelect-select": {
                                        display: 'inline-flex'
                                    }
                                }}
                                labelId="select-color"
                                label="Colore"
                                name="color"
                                value={form.getValue("color")}
                                onChange={selectChangeHandler("color")}
                                disabled={loading} >
                                { colors.map((value, index) => {
                                    return (<MenuItem key={index} value={value}><span style={{height: '20px', width: '20px', backgroundColor: '#' + value, marginRight: "10px"}}></span>#{value}</MenuItem>)
                                }) }
                            </Select>
                            <FormHelperText>{form.getError("color")}</FormHelperText>
                        </FormControl>
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