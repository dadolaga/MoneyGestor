import { Box, Chip, LinearProgress, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TableSortLabel } from "@mui/material";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowRightLong, faPen, faTrash } from "@fortawesome/free-solid-svg-icons";
import { convertNumberToValue } from "../../Utilities/Utilities";
import { Transaction } from "../../Utilities/BackEndTypes";
import { Order } from "../base/Order";

const ID_EXCHANGE_TYPE = 1;

interface ITransactionTableProps {
    transactions?: Transaction[],
    loading: boolean,
    refreshTransactions: () => void,
    sort: Order,
    setSort: (_: Order) => void,
    setTransactionDialogId: (any) => void,
    setOpenTransactionDialog: (any) => void,
    setOpenTransactionDeleteDialog: (any) => void,
    setTransactionDescription: (any) => void,
}

export function TransactionTable(props: ITransactionTableProps) {
    const editHandler = (id) => (event) => {
        props.setTransactionDialogId(id);
        props.setOpenTransactionDialog(true);
    }

    const deleteHandler = (id, description) => (event) => {
        props.setTransactionDialogId(id);
        props.setTransactionDescription(description);
        props.setOpenTransactionDeleteDialog(true);
    }

    const clickOnOrderHandler = (nameOfElement: string) => () => {
        props.setSort(props.sort.clickOnElement(nameOfElement));
    }

    return (
        <Paper sx={{width: '100%', height: '100%', display: 'flex', flexDirection: 'column', overflowY: 'hidden'}}>
                <TableContainer sx={{height: '100%'}}>
                    <Table stickyHeader>
                        <TableHead >
                            <TableRow>
                                <TableCell style={{ width: '150px'}}>
                                    <TableSortLabel 
                                        active={props.sort.haveElement('date')}
                                        direction={props.sort.getElement('date')?.order}
                                        onClick={clickOnOrderHandler('date')} >
                                        Data
                                    </TableSortLabel>
                                </TableCell>
                                <TableCell>
                                    <TableSortLabel 
                                        active={props.sort.haveElement('description')}
                                        direction={props.sort.getElement('description')?.order}
                                        onClick={clickOnOrderHandler('description')} >
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
                                        active={props.sort.haveElement('value')}
                                        direction={props.sort.getElement('value')?.order}
                                        onClick={clickOnOrderHandler('value')} >
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
                            {props.loading? <TableRow><TableCell sx={{p: 0}} colSpan={5}><LinearProgress /></TableCell></TableRow> : null}
                            {props.transactions?.map((value, index) => {
                                return (
                                    <TableRow key={index}>
                                        <TableCell>{new Date(value.date).toLocaleDateString('it-IT', {day: 'numeric', month: 'long', year: 'numeric'})}</TableCell>
                                        <TableCell>{value.description}</TableCell>
                                        <TableCell>{value.type.name}</TableCell>
                                        <TableCell>{convertNumberToValue(value.type.id == ID_EXCHANGE_TYPE? Math.abs(value.value) : value.value)}</TableCell>
                                        <TableCell sx={{display: 'flex', gap: 1.5, alignItems: 'center'}}>
                                            {value.type.id == ID_EXCHANGE_TYPE && <>
                                                    <Chip label={value.walletDestination.name} size="small" variant="outlined" style={{color: '#' + value.walletDestination.color, borderColor: '#' + value.walletDestination.color}}/>
                                                    <FontAwesomeIcon icon={faArrowRightLong} />
                                                </>
                                            }
                                            <Chip label={value.wallet.name} size="small" variant="outlined" style={{color: '#' + value.wallet.color, borderColor: '#' + value.wallet.color}}/>
                                            </TableCell>
                                        <TableCell>
                                            <Box sx={{display: 'flex', gap: 2}} >
                                                <FontAwesomeIcon style={{cursor: 'pointer'}} icon={faPen} onClick={editHandler(value.transactionDestinationId ?? value.id)}/>
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
}