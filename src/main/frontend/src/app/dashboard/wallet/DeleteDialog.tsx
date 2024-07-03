import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, LinearProgress } from "@mui/material";
import { useEffect, useState } from "react";
import { useRestApi } from "../../request/Request";
import { Wallet } from "../../Utilities/BackEndTypes";

export default function DeleteDialog({open, onClose, walletId}) {
    const [showLoading, setShowLoading] = useState(false);
    const [wallet, setWallet] = useState<Wallet>(undefined);

    const restApi = useRestApi();

    useEffect(() => {
        if(!open)
            return;

        restApi.Wallet.Get(walletId).then(wallet => setWallet(wallet));
    }, [open])

    function deleteWallet() {
        setShowLoading(true);

        restApi.Wallet.Delete(wallet.id)
        .then(() => {
            onClose(true);
        })
        .finally(() => {
            setShowLoading(false);
        });
    }

    return (
        <Dialog open={open} onClose={() => onClose(false)}>
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