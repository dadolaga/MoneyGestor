import { Box, Chip, LinearProgress, Paper, Tab, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TableSortLabel } from "@mui/material";
import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import axios from "../../axios/axios";
import { useCookies } from "react-cookie";
import { ITransaction, ITransactionTable } from "../../Utilities/Datatypes";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowRightLong, faPen, faTrash } from "@fortawesome/free-solid-svg-icons";
import { convertNumberToValue } from "../../Utilities/Utilities";

const ID_EXCHANGE_TYPE = 1;

interface ITransactionTableProps {
    setTransactionDialogId: (any) => void,
    setOpenTransactionDialog: (any) => void,
    setOpenTransactionDeleteDialog: (any) => void,
    setTransactionDescription: (any) => void,
}

export const TransactionTable = forwardRef((props: ITransactionTableProps, ref) => {
    const [transactions, setTransactions] = useState<ITransactionTable[]>(null);

    const [sortColumn, setSortColumn] = useState("date");
    const [sortDirection, setSortDirection] = useState(false);

    const [loading, setLoading] = useState(true);

    const [cookie, setCookie] = useCookies(["_token"]);

    useImperativeHandle(ref, () => ({
        loadTransaction,
    }));

    useEffect(() => {
        loadTransaction();
    }, [sortColumn, sortDirection])

    function loadTransaction() {
        setLoading(true);

        axios.get("/transaction/list", {
            params: {
                sort: sortColumn == null? "!date" : ((!sortDirection? '!' : '') + sortColumn)
            },
            headers: {
                Authorization: cookie._token
            }
        })
        .then(message => {
            setTransactions(message.data);
        })
        .finally(() => {
            setLoading(false);
        });
    }

    const editHandler = (id) => (event) => {
        props.setTransactionDialogId(id);
        props.setOpenTransactionDialog(true);
    }

    const deleteHandler = (id, description) => (event) => {
        props.setTransactionDialogId(id);
        props.setTransactionDescription(description);
        props.setOpenTransactionDeleteDialog(true);
    }

    const sortHandler = (name) => (event) => {
        setSortDirection(sortColumn == name? !sortDirection : true);
        setSortColumn(name);
    }


    return (
        <Paper sx={{width: '100%', height: '100%', display: 'flex', flexDirection: 'column', overflowY: 'hidden'}}>
                <TableContainer sx={{height: '100%'}}>
                    <Table stickyHeader>
                        <TableHead >
                            <TableRow>
                                <TableCell style={{ width: '150px'}}>
                                    <TableSortLabel 
                                        active={sortColumn == 'date'}
                                        direction={sortDirection? 'asc' : 'desc'}
                                        onClick={sortHandler('date')} >
                                        Data
                                    </TableSortLabel>
                                </TableCell>
                                <TableCell>
                                    <TableSortLabel 
                                        active={sortColumn == 'description'}
                                        direction={sortDirection? 'asc' : 'desc'}
                                        onClick={sortHandler('description')} >
                                        Descrizione
                                    </TableSortLabel>
                                </TableCell>
                                <TableCell style={{ width: '10px'}}>
                                    <TableSortLabel  >
                                        Tipo
                                    </TableSortLabel>
                                </TableCell>
                                <TableCell style={{ width: '100px'}}>
                                    <TableSortLabel 
                                        active={sortColumn == 'value'}
                                        direction={sortDirection? 'asc' : 'desc'}
                                        onClick={sortHandler('value')} >
                                        Valore
                                    </TableSortLabel>
                                </TableCell>
                                <TableCell style={{ width: '10px'}}>
                                    <TableSortLabel  >
                                        Portafoglio
                                    </TableSortLabel>
                                </TableCell>
                                <TableCell style={{width: '20px'}}>Azioni</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loading? <TableRow><TableCell sx={{p: 0}} colSpan={5}><LinearProgress /></TableCell></TableRow> : null}
                            {transactions?.map((value, index) => {
                                return (
                                    <TableRow key={index}>
                                        <TableCell>{new Date(value.date).toLocaleDateString('it-IT', {day: 'numeric', month: 'long', year: 'numeric'})}</TableCell>
                                        <TableCell>{value.description}</TableCell>
                                        <TableCell>{value.type.name}</TableCell>
                                        <TableCell>{convertNumberToValue((value.type.id == ID_EXCHANGE_TYPE? -1 : 1) * value.value)}</TableCell>
                                        <TableCell sx={{display: 'flex', gap: 1.5, alignItems: 'center'}}>
                                            <Chip label={value.wallet.name} size="small" variant="outlined" style={{color: '#' + value.wallet.color, borderColor: '#' + value.wallet.color}}/>{
                                                value.type.id == ID_EXCHANGE_TYPE && <>
                                                    <FontAwesomeIcon icon={faArrowRightLong} />
                                                    <Chip label={value.walletDestination.name} size="small" variant="outlined" style={{color: '#' + value.walletDestination.color, borderColor: '#' + value.walletDestination.color}}/>
                                                </>
                                            }</TableCell>
                                        <TableCell>
                                            <Box sx={{display: 'flex', gap: 2}} >
                                                <FontAwesomeIcon style={{cursor: 'pointer'}} icon={faPen} onClick={editHandler(value.id)}/>
                                                <FontAwesomeIcon style={{cursor: 'pointer'}} icon={faTrash} onClick={deleteHandler(value.id, value.description)}/>
                                            </Box>
                                        </TableCell>
                                    </TableRow>
                                )
                            })}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>
    );
});

TransactionTable.displayName = "TransactionTable";