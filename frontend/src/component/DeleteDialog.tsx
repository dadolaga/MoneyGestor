import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from '@mui/material';

interface IProps<T> {
    data?: T;
    deleteMessage: string | ((data: T) => string);
    onDelete: (data?: T) => void;
}

export default function DeleteDialog<T_ID>(props: IProps<T_ID>) {
    return props.data === undefined ? null : (
        <Dialog open={true} onClose={() => props.onDelete(undefined)}>
            <DialogTitle>Conferma eliminazione</DialogTitle>
            <DialogContent>
                <DialogContentText>{typeof props.deleteMessage === 'string' && props.deleteMessage}</DialogContentText>
            </DialogContent>
            <DialogActions>
                <Button onClick={() => props.onDelete(undefined)} color="secondary">
                    No
                </Button>
                <Button onClick={() => props.onDelete(props.data)}>si</Button>
            </DialogActions>
        </Dialog>
    );
}
