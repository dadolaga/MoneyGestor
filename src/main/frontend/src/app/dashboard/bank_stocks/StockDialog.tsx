import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Grid, LinearProgress, InputAdornment } from "@mui/material";
import 'dayjs/locale/it'
import { useEffect, useState } from "react";
import { TransitionDialog } from "../base/transition";
import { useRestApi } from "../../request/Request";
import { Stock } from "../../utilities/BackEndTypes";
import Input from "../../component/Input";
import { BaseChecker, Form, FormSettings } from "../../form/Form";
import dayjs from "dayjs";
import { useSnackbar } from "notistack";
import { ResponseError } from "../../request/ResponseError";

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
    const { enqueueSnackbar } = useSnackbar();

    const api = useRestApi();

    const [form, setForm] = useState<Form>(new Form(formSettings));
    const [loading, setLoading] = useState<boolean>(false);

    useEffect(() => {
        if (props.stockId === undefined || props.stockId === null)
            return;

        setLoading(true);

        api.Stock.Get(props.stockId)
            .then(stock => {
                console.log(stock);

                setForm(form => form.setValue("name", stock.name)
                    .setValue("date", stock.subscriptionDate)
                    .setValue("value", stock.subscriptionValue.toString()));
            })
            .finally(() => {
                setLoading(false);
            });

    }, [props.stockId])

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

        let request;
        if (props.stockId !== undefined) {
            request = api.Stock.Modify(props.stockId, stock);
        } else {
            request = api.Stock.Create(stock);
        }

        request
            .then(() => {
                enqueueSnackbar("Azione effettuata con successo", {variant: "success"})
                props.onClose(true);
            })
            .catch((err: ResponseError) => {
                switch(err.code) {
                    default:
                        enqueueSnackbar("Errore nella creazione dell'azione", {variant: "error"});
                        break;
                }
            })
            .finally(() => {
                setLoading(false);
            })

    }

    const cancelHandler = () => {
        props.onClose(false);
    }

    return (
        <Dialog open={props.open} onClose={props.onClose} TransitionComponent={TransitionDialog}>
            {loading && <LinearProgress />}
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
                            disabled={loading || props.stockId !== undefined} />
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