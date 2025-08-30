import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, LinearProgress } from "@mui/material";
import { useState } from "react";
import { useRestApi } from "../../request/Request";
import { useSnackbar } from "notistack";
import { ResponseError } from "../../request/ResponseError";

interface IProps {
    open: boolean,
    onClose: (success: boolean) => void,
    stock: number
}

export default function DeleteStockDialog({
    open,
    onClose,
    stock
}: IProps) {
    const { enqueueSnackbar } = useSnackbar();
    const [showLoading, setShowLoading] = useState(false);

    const restApi = useRestApi();

    function deleteWallet() {
        setShowLoading(true);

        restApi.Stock.Delete(stock)
            .then(() => {
                enqueueSnackbar("Azione cancellata con successo", { variant: "success" });
                onClose(true);
            })
            .catch((err: ResponseError) => {
                enqueueSnackbar("Errore nella cancellazione dell'azione", { variant: "error" });
                onClose(false);
            })
            .finally(() => setShowLoading(false));
    }

    return (
        <Dialog open={open} onClose={onClose}>
            {showLoading && <LinearProgress />}
            <DialogTitle>
                Confermi di voler cancellare l'azione
            </DialogTitle>
            <DialogContent>
                <DialogContentText>
                    Sei sicuro di voler cancellare l'azione selezionata?
                </DialogContentText>
            </DialogContent>
            <DialogActions>
                <Button onClick={() => onClose(false)} color="secondary">No</Button>
                <Button onClick={deleteWallet}>si</Button>
            </DialogActions>
        </Dialog>
    )
}