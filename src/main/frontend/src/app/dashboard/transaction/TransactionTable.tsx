import { Box, Chip, LinearProgress, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TablePagination, TableRow, TableSortLabel } from "@mui/material";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowRightLong, faPen, faTrash } from "@fortawesome/free-solid-svg-icons";
import { convertNumberToValue } from "../../utilities/Utilities";
import { Transaction } from "../../utilities/BackEndTypes";
import { Order } from "../base/Order";
import { useIsMobile } from "../../utilities/useMobile";
import { useRestApi } from "../../request/Request";
import { RefObject, useCallback, useImperativeHandle, useState, MouseEvent, useEffect } from "react";

const ID_EXCHANGE_TYPE = 1;

export interface TransactionTableRef {
    refreshTable: () => void
}

interface ITransactionTableProps {
    ref: RefObject<TransactionTableRef>,
    setTransactionDialogId: (_value: any) => void,
    setTransactionDescription: (_value: any) => void,
    setOpenTransactionDialog: (_value: any) => void,
    setOpenTransactionDeleteDialog: (_value: any) => void,
}

export function TransactionTable(props: ITransactionTableProps) {
    const isMobile = useIsMobile();
    const api = useRestApi();

    const [transactions, setTransactions] = useState<Transaction[]>(undefined);
    const [loading, setLoading] = useState<boolean>(false);
    const [sort, setSort] = useState<Order>(new Order([{ name: "date", order: "desc" }]));
    const [page, setPage] = useState<number>(0);

    const [numberOfTransaction, setNumberOfTransaction] = useState<number>(undefined);

    const loadTransactions = useCallback(() => {
        setLoading(true);

        api.Transaction.List({ sort: sort.toUrlString(), page: page, limit: 25})
            .then(transactions => setTransactions(transactions))
            .catch()
            .finally(() => setLoading(false));

    }, [sort, page]);

    useImperativeHandle(props.ref, () => ({
        refreshTable: () => {
            loadTransactions();
        }
    }), [loadTransactions]);

    useEffect(() => {
        api.Transaction.NumberOfAll()
            .then(numberOfTransaction => setNumberOfTransaction(numberOfTransaction));
            
        loadTransactions();
    }, []);

    useEffect(() => {
        loadTransactions();
    }, [sort, page]);

    const editHandler = (id) => () => {
        props.setTransactionDialogId(id);
        props.setOpenTransactionDialog(true);
    }

    const deleteHandler = (id, description) => () => {
        props.setTransactionDialogId(id);
        props.setTransactionDescription(description);
        props.setOpenTransactionDeleteDialog(true);
    }

    const clickOnOrderHandler = (nameOfElement: string) => () => {
        setSort(sort.clickOnElement(nameOfElement));
    }

    const changePageHandler = (event: MouseEvent<HTMLButtonElement>, page: number) => {
        setPage(page);
    }

    return (
        <Paper sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', overflowY: 'hidden' }}>
            <TableContainer sx={{ height: '100%' }}>
                <Table stickyHeader size={isMobile ? "small" : "medium"}>
                    <TableHead >
                        <TableRow>
                            <TableCell style={{ width: isMobile ? '75px' : '150px' }}>
                                <TableSortLabel
                                    active={sort.haveElement('date')}
                                    direction={sort.getElement('date')?.order}
                                    onClick={clickOnOrderHandler('date')} >
                                    Data
                                </TableSortLabel>
                            </TableCell>
                            <TableCell>
                                <TableSortLabel
                                    active={sort.haveElement('description')}
                                    direction={sort.getElement('description')?.order}
                                    onClick={clickOnOrderHandler('description')} >
                                    Descrizione
                                </TableSortLabel>
                            </TableCell>
                            {!isMobile && (<TableCell style={{ width: '10px' }}>
                                <TableSortLabel>
                                    Tipo
                                </TableSortLabel>
                            </TableCell>)}
                            <TableCell style={{ width: '100px' }} align="right">
                                <TableSortLabel
                                    active={sort.haveElement('value')}
                                    direction={sort.getElement('value')?.order}
                                    onClick={clickOnOrderHandler('value')} >
                                    Valore
                                </TableSortLabel>
                            </TableCell>
                            {!isMobile && (<><TableCell style={{ width: '10px' }}>
                                <TableSortLabel  >
                                    Portafoglio
                                </TableSortLabel>
                            </TableCell>
                                <TableCell style={{ width: '20px' }}>Azioni</TableCell></>
                            )}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {loading ? <TableRow><TableCell sx={{ p: 0 }} colSpan={5}><LinearProgress /></TableCell></TableRow> : null}
                        {transactions?.map((value, index) => {
                            return (
                                <TableRow key={index}>
                                    <TableCell>{new Date(value.date).toLocaleDateString('it-IT', { day: 'numeric', month: isMobile ? "numeric" : "long", year: 'numeric' })}</TableCell>
                                    <TableCell>{value.description}</TableCell>
                                    {!isMobile && (<TableCell>{value.type.name}</TableCell>)}
                                    <TableCell align="right">{convertNumberToValue(value.type.id == ID_EXCHANGE_TYPE ? Math.abs(value.value) : value.value)}</TableCell>
                                    {!isMobile && (<><TableCell sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
                                        {value.type.id == ID_EXCHANGE_TYPE &&
                                            <>
                                                <Chip label={value.walletDestination.name} size="small" variant="outlined" style={{ color: '#' + value.walletDestination.color, borderColor: '#' + value.walletDestination.color }} />
                                                <FontAwesomeIcon icon={faArrowRightLong} />
                                            </>
                                        }
                                        <Chip label={value.wallet.name} size="small" variant="outlined" style={{ color: '#' + value.wallet.color, borderColor: '#' + value.wallet.color }} />
                                    </TableCell>
                                        <TableCell>
                                            <Box sx={{ display: 'flex', gap: 2 }} >
                                                <FontAwesomeIcon style={{ cursor: 'pointer' }} icon={faPen} onClick={editHandler(value.transactionDestinationId ?? value.id)} />
                                                <FontAwesomeIcon style={{ cursor: 'pointer' }} icon={faTrash} onClick={deleteHandler(value.id, value.description)} />
                                            </Box>
                                        </TableCell></>)}
                                </TableRow>
                            )
                        })}
                    </TableBody>
                </Table>
            </TableContainer>
            <TablePagination sx={{ overflow: "hidden" }} component="div" count={numberOfTransaction} page={page} rowsPerPage={25} onPageChange={changePageHandler} rowsPerPageOptions={[25]} />
        </Paper>
    );
}