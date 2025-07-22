import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, FormControl, FormControlLabel, FormLabel, Grid, InputAdornment, Radio, RadioGroup } from "@mui/material";
import 'dayjs/locale/it'
import { useEffect, useState } from "react";
import { TransitionDialog } from "../base/transition";
import { useRestApi } from "../../request/Request";
import { CreateStockMovement, Stock, StockMovement, Wallet, WalletPrintable } from "../../utilities/BackEndTypes";
import Input from "../../component/Input";
import { BaseChecker, Form, FormSettings } from "../../form/Form";
import dayjs from "dayjs";

interface IProps {
    open: boolean
    onClose: (reload: boolean) => void
    stockId?: number
}

const formSettings: FormSettings[] = [{
    name: "value",
    checks: [{
        action: BaseChecker.isEmpty,
        text: "Il valore non può essere vuoto"
    }, {
        action: BaseChecker.isNotNumber,
        text: "Il valore deve essere un numero"
    }]
}];

export default function StockMovementDialog(props: IProps) {
    const api = useRestApi();

    const [wallets, setWallets] = useState<Wallet[]>()

    const [form, setForm] = useState<Form>(new Form(formSettings));
    const [movementType, setMovementType] = useState<string>("market");
    const [loading, setLoading] = useState<boolean>(false);
    
    useEffect(() => {
        loadWallet()
    }, []);

    function loadWallet(): Promise<void> {
        return api.Wallet.List({ order: "!favorite-name" })
            .then(wallets => setWallets(wallets));
    }

    const saveHandler = () => {
        setForm(form => form.check());
        if (form.isCheckFail())
            return;

        let stockMovement: CreateStockMovement  = {
            description: form.getStringValue("description"),
            date: form.getStringValue("date") ?? dayjs.utc().hour(0).minute(0).second(0).millisecond(0).toISOString(),
            value: parseFloat(form.getStringValue("value")),
            is_bank_deposit: movementType === "deposit",
            is_tfr: movementType === "tfr",
            wallet: form.getStringValue("wallet") ? parseInt(form.getStringValue("wallet")) : null,
            stock: {
                id: props.stockId
            }
        }

        api.StockMovement.Create(stockMovement)
        .finally(() => {
            setLoading(false);

            props.onClose(true);
        });
    }

    const cancelHandler = () => {
        props.onClose(true);
    }

    return (
        <Dialog open={props.open} onClose={props.onClose} TransitionComponent={TransitionDialog}>
            <DialogTitle>Crea nuova movimento nell&apos;azione</DialogTitle>
            <DialogContent>
                <DialogContentText>
                    Inserire i dati del nuovo movimento dell&apos;azione bancaria
                </DialogContentText>
                <Grid container spacing={2} sx={{ marginTop: 1 }} component="form">
                    <Grid size={{ xs: 12 }}>
                        <Input
                            type="text"
                            form={form}
                            setForm={setForm}
                            name="description"
                            label="Descrizione"
                            disabled={loading} />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 8 }}>

                        <Input
                            type="date"
                            form={form}
                            setForm={setForm}
                            name="date"
                            label="Data"
                            disabled={loading} />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 4 }}>
                        <Input
                            type={"text"}
                            inputProps={{ inputMode: "numeric" }}
                            form={form}
                            setForm={setForm}
                            name="value"
                            label="Valore movimento"
                            endAdornment={<InputAdornment position="end">€</InputAdornment>}
                            disabled={loading} />
                    </Grid>
                    <Grid size={{ xs: 12 }}>
                        <RadioGroup row sx={{ width: "100%", justifyContent: "space-between" }} defaultValue="female" onChange={(event) => setMovementType(event.target.value)} value={movementType}>
                            <FormControlLabel value="market" control={<Radio />} label="Del mercato normale" />
                            <FormControlLabel value="deposit" control={<Radio />} label="Da conto corrente" />
                            <FormControlLabel value="tfr" control={<Radio />} label="Da TFR" />
                        </RadioGroup>
                    </Grid>
                    {movementType === "deposit" && <Grid size={{ xs: 12 }}>
                        <Input
                            type="multi"
                            form={form}
                            setForm={setForm}
                            name="wallet"
                            label="Portafoglio"
                            disabled={loading}
                            values={WalletPrintable.convert(wallets)} />
                    </Grid>}
                </Grid>
            </DialogContent>
            <DialogActions>
                <Button onClick={cancelHandler} color="secondary" >Annulla</Button>
                <Button onClick={saveHandler} disabled={loading} >{props.stockId == null ? 'Salva' : 'Modifica'}</Button>
            </DialogActions>
        </Dialog>
    );
}