import { faPen, faPlus, faStar, faTrash } from "@fortawesome/free-solid-svg-icons";
import { faStar as faStartEmpty} from '@fortawesome/free-regular-svg-icons'
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Box, Button, LinearProgress, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TablePagination, TableRow, TableSortLabel } from "@mui/material";
import { useState, useEffect, forwardRef, useImperativeHandle } from 'react'
import axios from "../../axios/axios";
import { useCookies } from "react-cookie";
import WalletDialog from "./WalletDialog";
import DeleteDialog from "./DeleteDialog";
import { convertNumberToValue } from "../../Utilities/Utilities";
import { Wallet } from "../../Utilities/BackEndTypes";
import { useRestApi } from "../../request/Request";
import { enqueueSnackbar } from "notistack";

interface IWalletTable {
    wallets: Wallet[],
    loading: boolean,
    refreshWallets: () => void,
}

const WalletTable = forwardRef(({wallets, loading, refreshWallets}: IWalletTable, ref) => {
    const [openWalletDialog, setOpenWalletDialog] = useState(false);
    const [openDeleteWalletDialog, setOpenDeleteWalletDialog] = useState(false);
    const [editWalletId, setEditWalletId] = useState<number>(undefined);
    const [deleteWalletId, setDeleteWalletId] = useState<number>(undefined);

    const [sortColumn, setSortColumn] = useState(null);
    const [sortDirection, setSortDirection] = useState(true);

    const restApi = useRestApi();

    const favoriteHandler = (id) =>  async (event) => {
        let wallet = await restApi.Wallet.Get(id);

        restApi.Wallet.Modify(id, { favorite: !wallet.favorite })
        .then(() => {
            refreshWallets();
        })
    }

    const closeWalletDialogHandler = (isSave: boolean) => {
        setOpenWalletDialog(false);

        if(isSave)
            refreshWallets();
    }

    const clickCreteNewWalletHandler = () => {
        setEditWalletId(undefined);
        setOpenWalletDialog(true);
    }

    const editWalletHandler = (id: number) => () => {
        setEditWalletId(id);
        setOpenWalletDialog(true);
    }

    const deleteWalletHandler = (id: number) => () => {
        setDeleteWalletId(id);
        setOpenDeleteWalletDialog(true);
    }

    const closeDeleteDialogHandler = (isDeleted: boolean) => {
        setOpenDeleteWalletDialog(false);

        if(isDeleted)
            refreshWallets();
    }

    return (
        <Box sx={{height: '100%', flex: 2, display: 'flex', flexDirection: 'column', alignItems: 'start', gap: 1 }}>
            <WalletDialog open={openWalletDialog} onClose={closeWalletDialogHandler} walletId={editWalletId} />
            <DeleteDialog open={openDeleteWalletDialog} walletId={deleteWalletId} onClose={closeDeleteDialogHandler} />
            <Button variant="outlined" startIcon={<FontAwesomeIcon icon={faPlus} />} onClick={clickCreteNewWalletHandler}>crea nuovo portafoglio</Button>
            <Paper sx={{width: '100%', height: '100%', display: 'flex', flexDirection: 'column', overflowY: 'hidden'}}>
                <TableContainer sx={{height: '100%'}}>
                    <Table stickyHeader>
                        <TableHead >
                            <TableRow>
                                <TableCell>
                                    <TableSortLabel
                                        active={sortColumn == 'name'}
                                        direction={sortDirection? 'asc' : 'desc'}
                                        >
                                        Nome
                                    </TableSortLabel>
                                </TableCell>
                                <TableCell style={{ width: '100px' }}>
                                    <TableSortLabel
                                        active={sortColumn == 'value'}
                                        direction={sortDirection? 'asc' : 'desc'}
                                        >
                                        Valore
                                    </TableSortLabel>
                                </TableCell>
                                <TableCell style={{width: '20px'}}>Azioni</TableCell>
                                <TableCell style={{width: '15px'}}></TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {(!wallets || loading) && (<TableRow>
                                <TableCell sx={{p: 0}} colSpan={4}><LinearProgress /></TableCell>
                            </TableRow>)}
                            {wallets?.map((value: Wallet, index) => {
                                return (
                                    <TableRow key={index} sx={{"*": {color: '#' + value.color + '!important'}}}>
                                        <TableCell> {value.name} </TableCell>
                                        <TableCell align="right"> {convertNumberToValue(value.value)} </TableCell>
                                        <TableCell>
                                            <Box sx={{display: 'flex', gap: 2}} >
                                                <FontAwesomeIcon style={{cursor: 'pointer'}} icon={faPen} onClick={editWalletHandler(value.id)}/>
                                                <FontAwesomeIcon style={{cursor: 'pointer'}} icon={faTrash} onClick={deleteWalletHandler(value.id)}/>
                                            </Box>
                                        </TableCell>
                                        <TableCell>
                                            <FontAwesomeIcon style={{cursor: 'pointer'}} onClick={favoriteHandler(value.id)} icon={value.favorite? faStar : faStartEmpty} />
                                        </TableCell>
                                    </TableRow>
                                )
                            })}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>
        </Box>

    );
})

WalletTable.displayName = "WalletTable";

export default WalletTable;