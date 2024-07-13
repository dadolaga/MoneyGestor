"use client"

import { useRef, useState } from 'react'
import { faPlus } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Box, Button } from "@mui/material";
import TransactionDialog from "./TransactionDialog";
import { TransactionTable } from './TransactionTable';
import DeleteDialog from './DeleteDialog';
import { TransactionGraph } from './TransactionGraph';

export default function Page() {
    const table = useRef(null);
    const graph = useRef(null);

    const [openTransactionDialog, setOpenTransactionDialog] = useState(false);
    const [openTransactionDeleteDialog, setOpenTransactionDeleteDialog] = useState(false);
    const [transactionId, setTransactionId] = useState(null);
    const [transactionDescription, setTransactionDescription] = useState(null);

    function saveTransactionHandler() {
        setOpenTransactionDialog(false);

        table.current.loadTransaction();
        graph.current.loadTransaction();
    }

    function deleteTransactionHandler() {
        setOpenTransactionDeleteDialog(false);

        table.current.loadTransaction();
        graph.current.loadTransaction();
    }

    function openTransactionDialogHandler() {
        setTransactionId(null);
        setOpenTransactionDialog(true);
    }
    
    return (
        <>
            <TransactionDialog open={openTransactionDialog} onClose={() => setOpenTransactionDialog(false)} onSave={saveTransactionHandler} transactionId={transactionId} />
            <DeleteDialog open={openTransactionDeleteDialog} onClose={() => setOpenTransactionDeleteDialog(false)} transactionId={transactionId} transactionDescription={transactionDescription} onDelete={deleteTransactionHandler}/>
            <Box sx={{height: '100%', display: 'flex', flexDirection: 'column'}} >
                <Box sx={{height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column', alignItems: 'start', gap: 1}}>
                    <Button variant="outlined" startIcon={<FontAwesomeIcon icon={faPlus} />} onClick={openTransactionDialogHandler}>Aggiungi nuova transazione</Button>
                    <TransactionTable 
                        ref={table} 
                        setOpenTransactionDialog={setOpenTransactionDialog}
                        setTransactionDialogId={setTransactionId} 
                        setOpenTransactionDeleteDialog={setOpenTransactionDeleteDialog} 
                        setTransactionDescription={setTransactionDescription}/>
                </Box>
                <Box sx={{height: '100%', overflow: 'hidden', p: 4}}>
                    <TransactionGraph ref={graph} />
                </Box>
            </Box>
        </>
    )
}