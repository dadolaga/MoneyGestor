'use client';

import { ChangeEventHandler, useEffect, useRef, useState } from 'react';
import { faPlus } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Box, Button } from '@mui/material';
import TransactionDialog from './TransactionDialog';
import { TransactionTable, TransactionTableRef } from './TransactionTable';
import DeleteDialog from './DeleteDialog';
import { TransactionGraph } from './TransactionGraph';
import { useIsMobile } from '../../utilities/useMobile';
import TransactionTableFilter, { FilterData } from './TransactionTableFilter';
import { Transaction } from '@/models/backend';

export default function Page() {
    const graph = useRef(null);
    const tableRef = useRef<TransactionTableRef>(null);
    const fileInput = useRef<HTMLInputElement>(null);

    const isMobile = useIsMobile();

    const [openTransactionDialog, setOpenTransactionDialog] = useState<boolean>(false);
    const [openTransactionDeleteDialog, setOpenTransactionDeleteDialog] = useState<boolean>(false);
    const [, setOpenImportFromCsvDialog] = useState<boolean>(false);
    const [transactionId, setTransactionId] = useState<number>(undefined);
    const [transactionDescription, setTransactionDescription] = useState<string>(undefined);
    const [, setCsvFile] = useState<File>(undefined);

    const [filter, setFilter] = useState<FilterData>({});

    function openTransactionDialogHandler() {
        setTransactionId(() => undefined);
        setOpenTransactionDialog(true);
    }

    const inputFileChange: ChangeEventHandler<HTMLInputElement> = (event) => {
        setOpenImportFromCsvDialog(true);

        setCsvFile(event.target.files[0]);
        event.target.value = '';
    };

    const closeTransactionDialogHandler = (isToReload: boolean) => {
        if (isToReload) {
            tableRef.current.refreshTable();
        }

        setOpenTransactionDialog(false);
    };

    const editTransactionHandler = (transaction: Transaction) => {
        setTransactionId(transaction.id);
        setOpenTransactionDialog(true);
    };

    return (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
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
                <TransactionTable ref={tableRef} filter={filter} onEditClick={editTransactionHandler} />
            </Box>
            {/* <Box
                sx={{
                    height: '100%',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'start',
                    gap: 1,
                }}
            >
                <Box
                    display="flex"
                    width={isMobile ? '100%' : undefined}
                    gap={2}
                    flexDirection={isMobile ? 'column' : 'row'}
                >
                    <Button
                        variant="outlined"
                        startIcon={<FontAwesomeIcon icon={faPlus} />}
                        onClick={openTransactionDialogHandler}
                    >
                        Aggiungi nuova transazione
                    </Button>
                    <input
                        ref={fileInput}
                        type="file"
                        style={{ display: 'none' }}
                        accept="text/csv"
                        onChange={inputFileChange}
                    />
                </Box>
                <TransactionTable
                    ref={tableRef}
                    setOpenTransactionDialog={setOpenTransactionDialog}
                    setTransactionDialogId={setTransactionId}
                    setOpenTransactionDeleteDialog={setOpenTransactionDeleteDialog}
                    setTransactionDescription={setTransactionDescription}
                />
            </Box>
            {!isMobile && (
                <Box sx={{ height: '100%', overflow: 'hidden', p: 4 }}>
                    <TransactionGraph ref={graph} />
                </Box>
            )} */}
        </Box>
    );
}
