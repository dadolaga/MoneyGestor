import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, LinearProgress } from "@mui/material";
import { useState } from "react";
import { useRestApi } from "../../request/Request";
import { useSnackbar } from "notistack";
import { ResponseError } from "../../request/ResponseError";

interface IProps {
    open: boolean,
    onClose: (_success: boolean) => void,
    movement: number
}

export default function DeleteMovementDialog({
    open,
    onClose,
    movement
}: IProps) {
    const { enqueueSnackbar } = useSnackbar();
    const [showLoading, setShowLoading] = useState(false);

    const restApi = useRestApi();

    function deleteWallet() {
        setShowLoading(true);

        restApi.StockMovement.Delete(movement)
            .then(() => {
                enqueueSnackbar("Transazione cancellata con successo", { variant: "success" });
                onClose(true);
            })
            .catch((err: ResponseError) => {
                switch (err.code) {
                    case 302:
                        enqueueSnackbar("Non puoi eliminare un movimento con data antecedente all'ultimo movimento", { variant: "error" });
                        break;
                    default:
                        enqueueSnackbar("Errore nella cancellazione della transazione", { variant: "error" });
                        break;
                }
                onClose(false);
            })
            .finally(() => setShowLoading(false));
    }

    return (
        <Dialog open={open} onClose={onClose}>
            {showLoading && <LinearProgress />}
            <DialogTitle>
                Confermi di voler cancellare la transazione
            </DialogTitle>
            <DialogContent>
                <DialogContentText>
                    Sei sicuro di voler cancellare la transazione selezionata?
                </DialogContentText>
            </DialogContent>
            <DialogActions>
                <Button onClick={() => onClose(false)} color="secondary">No</Button>
                <Button onClick={deleteWallet}>si</Button>
            </DialogActions>
        </Dialog>
    )
}