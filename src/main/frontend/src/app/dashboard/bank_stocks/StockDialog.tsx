import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Grid, LinearProgress, TextField, Typography, InputAdornment, CircularProgress } from "@mui/material";
import 'dayjs/locale/it'
import { useState } from "react";
import { TransitionDialog } from "../base/transition";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowRightLong, faArrowDownLong } from "@fortawesome/free-solid-svg-icons";
import { Request, useRestApi } from "../../request/Request";
import { Stock, TransactionType, TransactionTypePrintable, WalletPrintable } from "../../utilities/BackEndTypes";
import { enqueueSnackbar } from "notistack";
import Input from "../../component/Input";
import { BaseChecker, Form, FormSettings } from "../../form/Form";
import { IFormMultiType } from "../../utilities/Interfaces";
import dayjs from "dayjs";

interface IProps {
    open: boolean
    onClose: (reload: boolean) => void
    stockId?: number
}

const formSettings: FormSettings[] = [{
    name: "name",
    checks: [{
        action: BaseChecker.isEmpty,
        text: "La descrizione non può essere vuota"
    }]
}, {
    name: "value",
    checks: [{
        action: BaseChecker.isEmpty,
        text: "Il valore non può essere vuoto"
    }, {
        action: BaseChecker.isNotNumber,
        text: "Il valore deve essere un numero"
    }]
}];

export default function StockDialog(props: IProps) {
    const api = useRestApi();

    const [form, setForm] = useState<Form>(new Form(formSettings));
    const [loading, setLoading] = useState<boolean>(false);

    const saveHandler = () => {
        setForm(form => form.check());
        if (form.isCheckFail())
            return;

        setLoading(true);

        let stock: Stock = {
            name: form.getStringValue("name"),
            subscriptionDate: form.getStringValue("date") ?? dayjs.utc().hour(0).minute(0).second(0).millisecond(0).toISOString(),
            subscriptionValue: parseFloat(form.getStringValue("value")),
        }

        api.Stock.Create(stock)
        .finally(() => {
            setLoading(false);

            props.onClose(true);
        })
    }

    const cancelHandler = () => {
        props.onClose(false);
    }

    return (
        <Dialog open={props.open} onClose={props.onClose} TransitionComponent={TransitionDialog}>
            { loading && <LinearProgress />}
            <DialogTitle>Crea nuova azione</DialogTitle>
            <DialogContent>
                <DialogContentText>
                    Inserire i dati della nuova azione bancaria
                </DialogContentText>
                <Grid container spacing={2} sx={{ marginTop: 1 }} component="form">
                    <Grid size={{ xs: 12 }}>
                        <Input
                            type="text"
                            form={form}
                            setForm={setForm}
                            name="name"
                            label="Nome"
                            disabled={loading} />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 8 }}>
                        <Input
                            type="date"
                            form={form}
                            setForm={setForm}
                            name="date"
                            label="Data di sottoscrizione"
                            disabled={loading} />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 4 }}>
                        <Input
                            type={"text"}
                            inputProps={{ inputMode: "numeric" }}
                            form={form}
                            setForm={setForm}
                            name="value"
                            label="Valore iniziale"
                            endAdornment={<InputAdornment position="end">€</InputAdornment>}
                            disabled={loading} />
                    </Grid>
                </Grid>
            </DialogContent>
            <DialogActions>
                <Button onClick={cancelHandler} color="secondary" >Annulla</Button>
                <Button onClick={saveHandler} disabled={loading}>{props.stockId == null ? 'Salva' : 'Modifica'}</Button>
            </DialogActions>
        </Dialog>
    );
}