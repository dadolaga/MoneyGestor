import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, LinearProgress } from "@mui/material";
import { useState } from "react";
import axios from "../../axios/axios";
import { useCookies } from "react-cookie";

export default function DeleteDialog({open, onClose, onDelete, transactionId, transactionDescription}) {
    const [showLoading, setShowLoading] = useState(false);
    const [cookie, setCookie] = useCookies(["_token"]);

    function deleteWallet() {
        setShowLoading(true);

        axios.get("/transaction/delete/" + transactionId, {
            headers: {
                Authorization: cookie._token
            }
        })
        .then(() => {
            onDelete();
        })
        .finally(() => {
            setShowLoading(false);
        })
    }

    return (
        <Dialog open={open} onClose={onClose}>
            {showLoading && <LinearProgress />}
            <DialogTitle>
                Confermi di voler cancellare la transazione
            </DialogTitle>
            <DialogContent>
                <DialogContentText>
                    Sei sicuro di voler cancellare la transazione &quot;{transactionDescription}&quot;?
                </DialogContentText>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} color="secondary">No</Button>
                <Button onClick={deleteWallet}>si</Button>
            </DialogActions>
        </Dialog>
    )
}