'use client';

import { useCallback, useRef, useState } from 'react';

import { Box, Button } from '@mui/material';

import DeleteDialog from '@/component/DeleteDialog';
import useApi from '@/hooks/useApi';
import type { Transaction } from '@/models/backend';
import { convertNumberToValue } from '@/utilis/values';

import TransactionDialog from './TransactionDialog';
import type { TransactionTableRef } from './TransactionTable';
import { TransactionTable } from './TransactionTable';
import type { FilterData } from './TransactionTableFilter';
import TransactionTableFilter from './TransactionTableFilter';

export default function Page() {
    const tableRef = useRef<TransactionTableRef>(null!);

    const [openTransactionDialog, setOpenTransactionDialog] = useState<boolean>(false);
    const [transactionId, setTransactionId] = useState<number>();
    const [deleteTransaction, setDeleteTransaction] = useState<Transaction>();

    const [filter, setFilter] = useState<FilterData>({});

    const api = useApi();

    function openTransactionDialogHandler() {
        setTransactionId(() => undefined);
        setOpenTransactionDialog(true);
    }

    const closeTransactionDialogHandler = (isToReload: boolean) => {
        if (isToReload && tableRef.current !== null) {
            tableRef.current.refreshTable();
        }

        setOpenTransactionDialog(false);
    };

    const editTransactionHandler = (transaction: Transaction) => {
        setTransactionId(transaction.id);
        setOpenTransactionDialog(true);
    };

    const deleteTransactionHandler = (transaction: Transaction) => {
        setDeleteTransaction(transaction);
    };

    const deleteTransactionConfirmHandler = useCallback((transactionDelete?: Transaction) => {
        if (transactionDelete === undefined) {
            setDeleteTransaction(undefined);
            return;
        }

        api.transaction
            .delete(transactionDelete.id!)
            .onSuccess(() => {
                if (tableRef.current !== null) {
                    tableRef.current.refreshTable();
                }
            })
            .onFinish(() => {
                setDeleteTransaction(undefined);
            })
            .execute();
    }, []);

    return (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <DeleteDialog
                data={deleteTransaction}
                deleteMessage={(data) =>
                    `Sei sicuro di voler eliminare la transazione "${data.description}" di ${convertNumberToValue(data.value)}?`
                }
                onDelete={deleteTransactionConfirmHandler}
            />
            <TransactionDialog
                open={openTransactionDialog}
                onClose={closeTransactionDialogHandler}
                transactionId={transactionId}
            />
            <Box height={'100%'} display="flex" flexDirection={'column'} gap={0.5}>
                <Box display="flex" justifyContent="space-between" p={1}>
                    <Button variant="contained" onClick={openTransactionDialogHandler}>
                        Aggiungi nuova transazione
                    </Button>
                    <TransactionTableFilter setData={setFilter} />
                </Box>
                <TransactionTable
                    ref={tableRef}
                    filter={filter}
                    onEditClick={editTransactionHandler}
                    onDeleteClick={deleteTransactionHandler}
                />
            </Box>
        </Box>
    );
}
