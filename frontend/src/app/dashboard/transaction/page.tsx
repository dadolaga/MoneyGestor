"use client"

import { ChangeEventHandler, useRef, useState } from 'react'
import { faPlus } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Box, Button } from "@mui/material";
import TransactionDialog from "./TransactionDialog";
import { TransactionTable, TransactionTableRef } from './TransactionTable';
import DeleteDialog from './DeleteDialog';
import { TransactionGraph } from './TransactionGraph';
import { useIsMobile } from '../../utilities/useMobile';

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

    function openTransactionDialogHandler() {
        setTransactionId(() => undefined);
        setOpenTransactionDialog(true);
    }

    const inputFileChange: ChangeEventHandler<HTMLInputElement> = (event) => {
        setOpenImportFromCsvDialog(true);

        setCsvFile(event.target.files[0]);
        event.target.value = "";
    }

    const closeDeleteDialogHandler = (isToReload: boolean) => {
        if (isToReload) {
            tableRef.current.refreshTable();
            graph.current.loadTransaction();
        }

        setOpenTransactionDeleteDialog(false);
    }

    const closeTransactionDialogHandler = (isToReload: boolean) => {
        if (isToReload) {
            tableRef.current.refreshTable();
            graph.current.loadTransaction();
        }

        setOpenTransactionDialog(false);
    }

    return (
        <>
            <TransactionDialog open={openTransactionDialog} onClose={closeTransactionDialogHandler} transactionId={transactionId} />
            {/* <ImportFromCsvDialog open={openImportFromCsvDialog} onClose={closeImportFromCsvDialog} file={csvFile} /> */}
            <DeleteDialog
                open={openTransactionDeleteDialog}
                onClose={closeDeleteDialogHandler}
                transactionId={transactionId}
                transactionDescription={transactionDescription} />
            <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }} >
                <Box sx={{ height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column', alignItems: 'start', gap: 1 }}>
                    <Box display='flex' width={isMobile ? "100%" : undefined} gap={2} flexDirection={isMobile ? "column" : "row"}>
                        <Button variant="outlined" startIcon={<FontAwesomeIcon icon={faPlus} />} onClick={openTransactionDialogHandler}>Aggiungi nuova transazione</Button>
                        {/* <Button variant="outlined" startIcon={<FontAwesomeIcon icon={faPlus} />} onClick={clickAddTransactionFromCSV} aria-hidden>Importa da file csv</Button> */}
                        <input ref={fileInput} type='file' style={{ display: 'none' }} accept='text/csv' onChange={inputFileChange} />
                    </Box>
                    <TransactionTable
                        ref={tableRef}
                        setOpenTransactionDialog={setOpenTransactionDialog}
                        setTransactionDialogId={setTransactionId}
                        setOpenTransactionDeleteDialog={setOpenTransactionDeleteDialog}
                        setTransactionDescription={setTransactionDescription} />
                </Box>
                {!isMobile && (
                    <Box sx={{ height: '100%', overflow: 'hidden', p: 4 }}>
                        <TransactionGraph ref={graph} />
                    </Box>
                )}
            </Box>
        </>
    )
}