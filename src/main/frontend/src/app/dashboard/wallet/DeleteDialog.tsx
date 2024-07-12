import { useEffect, useState } from "react";
import { Wallet } from "../../Utilities/BackEndTypes";
import { useRestApi } from "../../request/Request";

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
        <h1 style={{color: 'white'}}>ciao</h1>
        // <Dialog open={open} onClose={() => onClose(false)}>
        //     {showLoading && <LinearProgress />}
        //     <DialogTitle>
        //         Confermi di voler cancellare il portafoglio
        //     </DialogTitle>
        //     <DialogContent>
        //         <DialogContentText>
        //             Sei sicuro di voler cancellare il portafoglio &quot;{wallet?.name}&quot;?
        //         </DialogContentText>
        //     </DialogContent>
        //     <DialogActions>
        //         <Button onClick={onClose} color="secondary">No</Button>
        //         <Button onClick={deleteWallet}>si</Button>
        //     </DialogActions>
        // </Dialog>
    )
}