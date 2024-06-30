import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, LinearProgress } from "@mui/material";
import { useState } from "react";
import { useRestApi } from "../../request/Request";

export default function DeleteDialog({open, onClose, onDelete, wallet}) {
    const [showLoading, setShowLoading] = useState(false);

    const restApi = useRestApi();

    function deleteWallet() {
        setShowLoading(true);

        restApi.Wallet.Delete(wallet.id)
        .then(() => {
            onClose();
        })
        .finally(() => {
            setShowLoading(false);
        });

    }

    return (
        <Dialog open={open} onClose={onClose}>
            {showLoading && <LinearProgress />}
            <DialogTitle>
                Confermi di voler cancellare il portafoglio
            </DialogTitle>
            <DialogContent>
                <DialogContentText>
                    Sei sicuro di voler cancellare il portafoglio &quot;{wallet?.name}&quot;?
                </DialogContentText>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} color="secondary">No</Button>
                <Button onClick={deleteWallet}>si</Button>
            </DialogActions>
        </Dialog>
    )
}