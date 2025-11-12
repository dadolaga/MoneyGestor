import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, Grid, InputAdornment, Radio, RadioGroup, Typography } from "@mui/material";
import 'dayjs/locale/it'
import { useEffect, useState } from "react";
import { TransitionDialog } from "../base/transition";
import { useRestApi } from "../../request/Request";
import { CreateStockMovement, Stock, Wallet, WalletPrintable } from "../../utilities/BackEndTypes";
import Input from "../../component/Input";
import { BaseChecker, Form, FormSettings } from "../../form/Form";
import dayjs from "dayjs";
import { ResponseError } from "../../request/ResponseError";
import { useSnackbar } from "notistack";

interface IProps {
    open: boolean
    onClose: (_reload: boolean) => void
    stockId?: number
    stockMovementId?: number
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
    const { enqueueSnackbar } = useSnackbar();

    const [wallets, setWallets] = useState<Wallet[]>()

    const [form, setForm] = useState<Form>(new Form(formSettings));
    const [movementType, setMovementType] = useState<string>("market");
    const [stock, setStock] = useState<Stock>();
    const [loading, setLoading] = useState<boolean>(false);

    const [errorMessage, setErrorMessage] = useState<string>("");

    useEffect(() => {
        loadWallet()
    }, []);

    useEffect(() => {
        setErrorMessage("");
    }, [form])

    useEffect(() => {
        if (props.stockId === undefined || props.stockId === null)
            return;

        setLoading(true);

        api.Stock.Get(props.stockId)
            .then(v => {
                setStock(v);
            })
            .finally(() => {
                setLoading(false);
            });

    }, [props.stockId]);

    useEffect(() => {
        if (props.stockMovementId === undefined || props.stockMovementId === null)
            return;

        setLoading(true);

        api.StockMovement.Get(props.stockMovementId)
            .then(stockMovement => {
                console.log(stockMovement);

                setForm(form => form.setValue("description", stockMovement.description || "")
                    .setValue("date", stockMovement.date || "")
                    .setValue("value", stockMovement.value.toString())
                    .setValue("wallet", stockMovement.bank_deposit?.wallet && new WalletPrintable(stockMovement.bank_deposit.wallet)));

                setMovementType(stockMovement.bank_deposit ? "deposit" : stockMovement.is_tfr ? "tfr" : "market");

                if (stockMovement.bank_deposit) {
                    form.setValue("wallet", stockMovement.bank_deposit.wallet.id.toString());
                }
            })
            .finally(() => {
                setLoading(false);
            });

    }, [props.stockMovementId])

    function loadWallet(): Promise<void> {
        return api.Wallet.List({ sort: "!favorite-name" })
            .then(wallets => setWallets(wallets));
    }

    const saveHandler = () => {
        setForm(form => form.check());
        if (form.isCheckFail())
            return;

        let stockMovement: CreateStockMovement = {
            description: form.getStringValue("description"),
            date: form.getStringValue("date") ?? dayjs.utc().hour(0).minute(0).second(0).millisecond(0).toISOString(),
            value: parseFloat(form.getStringValue("value")),
            there_is_bank_deposit: movementType === "deposit",
            is_tfr: movementType === "tfr",
            wallet: movementType === "deposit" ? (form.getStringValue("wallet") ? parseInt(form.getStringValue("wallet")) : null) : null,
            stock: {
                id: props.stockId
            },
        }

        setLoading(true);

        if (props.stockMovementId) {
            api.StockMovement.Modify(props.stockMovementId, stockMovement)
                .then(() => {
                    props.onClose(true);
                })
                .catch((err: ResponseError) => {
                    switch (err.code) {
                        case 201:
                            setErrorMessage("Il portafoglio andrebbe in negativo");
                            break;

                    }
                })
                .finally(() => {
                    setLoading(false);
                });
        } else {
            api.StockMovement.Create(stockMovement)
                .then(() => {
                    enqueueSnackbar("Movimento inserito con successo", { variant: "success" });

                    props.onClose(true);
                })
                .catch((err: ResponseError) => {
                    switch (err.code) {
                        case 201:
                            setErrorMessage("Il portafoglio andrebbe in negativo");
                            break;

                        case 301:
                            enqueueSnackbar("Esiste già un movimento con la stessa data", { variant: "error" });
                            break;

                        case 302:
                            enqueueSnackbar("Non puoi inserire un movimento con data antecedente all'ultimo movimento", { variant: "error" });
                            break;
                    }
                })
                .finally(() => {
                    setLoading(false);
                });
        }
    }

    const cancelHandler = () => {
        props.onClose(true);
    }

    return (
        <Dialog open={props.open} onClose={props.onClose} TransitionComponent={TransitionDialog}>
            <DialogTitle>Crea nuova movimento nell&apos;azione</DialogTitle>
            <DialogContent>
                <Box display="flex" flexDirection="column" gap={2}>
                    <Typography>Inserire i dati del nuovo movimento dell&apos;azione bancaria</Typography>
                    {errorMessage && <Alert variant="filled" severity="error" >{errorMessage}</Alert>}
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
                                dataMoreOption={{ minDate: dayjs(stock?.subscriptionDate) }}
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
                </Box>
            </DialogContent>
            <DialogActions>
                <Button onClick={cancelHandler} color="secondary" >Annulla</Button>
                <Button onClick={saveHandler} disabled={loading} >{props.stockMovementId == null ? 'Salva' : 'Modifica'}</Button>
            </DialogActions>
        </Dialog>
    );
}