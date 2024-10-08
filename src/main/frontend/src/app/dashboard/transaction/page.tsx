"use client"

import { useEffect, useRef, useState } from 'react'
import { faPlus } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Box, Button } from "@mui/material";
import TransactionDialog from "./TransactionDialog";
import { TransactionTable } from './TransactionTable';
import DeleteDialog from './DeleteDialog';
import { TransactionGraph } from './TransactionGraph';
import { Transaction } from '../../utilities/BackEndTypes';
import { useRestApi } from '../../request/Request';
import { Order } from '../base/Order';

export default function Page() {
    const graph = useRef(null);

    const [transactions, setTransactions] = useState<Transaction[]>(undefined);
    const [loading, setLoading] = useState<boolean>(false);
    const [sort, setSort] = useState<Order>(new Order());

    const restApi = useRestApi();

    const [openTransactionDialog, setOpenTransactionDialog] = useState<boolean>(false);
    const [openTransactionDeleteDialog, setOpenTransactionDeleteDialog] = useState<boolean>(false);
    const [transactionId, setTransactionId] = useState<number>(undefined);
    const [transactionDescription, setTransactionDescription] = useState<string>(undefined);

    useEffect(() => {
        loadTransactions();
    }, [sort]);

    function loadTransactions() {
        setLoading(true);

        restApi.Transaction.List({ order: sort.toUrlString() })
        .then(transactions => setTransactions(transactions))
        .catch()
        .finally(() => setLoading(false));
    }

    function openTransactionDialogHandler() {
        setTransactionId(transactionId => undefined);
        setOpenTransactionDialog(true);
    }

    const closeDeleteDialogHandler = (isToReload: boolean) => {
        if(isToReload) {
            loadTransactions();
            graph.current.loadTransaction();
        }

        setOpenTransactionDeleteDialog(false);
    } 
    
    const closeTransactionDialogHandler = (isToReload: boolean) => {
        if(isToReload) {
            loadTransactions();
            graph.current.loadTransaction();
        }

        setOpenTransactionDialog(false);
    } 

    return (
        <>
            <TransactionDialog open={openTransactionDialog} onClose={closeTransactionDialogHandler} transactionId={transactionId} />
            <DeleteDialog 
                open={openTransactionDeleteDialog} 
                onClose={closeDeleteDialogHandler} 
                transactionId={transactionId} 
                transactionDescription={transactionDescription} />
            <Box sx={{height: '100%', display: 'flex', flexDirection: 'column'}} >
                <Box sx={{height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column', alignItems: 'start', gap: 1}}>
                    <Button variant="outlined" startIcon={<FontAwesomeIcon icon={faPlus} />} onClick={openTransactionDialogHandler}>Aggiungi nuova transazione</Button>
                    <TransactionTable 
                        transactions={transactions}
                        loading={loading}
                        sort={sort}
                        setSort={setSort}
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