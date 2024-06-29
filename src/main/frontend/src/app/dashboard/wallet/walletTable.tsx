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
import { Wallet } from "../../Utilities/Datatypes";
import { useRestApi } from "../../request/Request";

interface IWalletTable {
    refreshWallets: () => void
}

const WalletTable = forwardRef((props: IWalletTable, ref) => {
    const [wallets, setWallets] = useState(null);
    const [openWalletDialog, setOpenWalletDialog] = useState(false);
    const [openDeleteWalletDialog, setOpenDeleteWalletDialog] = useState(false);
    const [editWallet, setEditWallet] = useState(null);
    const [deleteWallet, setDeleteWallet] = useState<Wallet>(null);

    const [sortColumn, setSortColumn] = useState(null);
    const [sortDirection, setSortDirection] = useState(true);

    const [cookie, setCookie] = useCookies(["_token"]);

    const restApi = useRestApi();

    useEffect(() => {
        refreshWallet()
    }, [sortColumn, sortDirection]);

    useImperativeHandle(ref, () => ({
        refreshWallet,
    }))

    function refreshWallet() {
        setWallets(null);

        restApi.Wallet.List()
        .then(wallets => {
            setWallets(wallets);
        });
    }

    function openWalletDialogFunction() {
        setEditWallet(null);
        setOpenWalletDialog(true);
    }

    function saveWallet(wallet) {
        props.refreshWallets();
    }

    function openEditWallet(id) {
        setEditWallet(id);
        setOpenWalletDialog(true);
    }

    function deleteWalletFunction(walletId, walletName) {
        setDeleteWallet({
            id: walletId,
            name: walletName,
            value: 0,
            favorite: false,
            color: "000000",
        });

        setOpenDeleteWalletDialog(true);
    }

    function confirmDeletedWallet() {
        setOpenDeleteWalletDialog(false);
        props.refreshWallets();
    }

    const sortHandler = (name) => (event) => {
        if(sortColumn == name) {
            if(!sortDirection) 
                setSortColumn(null);
            else 
                setSortDirection(false);
        } else {
            setSortColumn(name);
            setSortDirection(true);
        }
    }

    const favoriteHandler = (id) => (event) => {
        axios.post("/wallet/favorite/" + id, {}, {
            headers: {
                Authorization: cookie._token
            }
        })
        .then(message => {
            refreshWallet();
        })
        .catch(error => {

        });
    }

    return (
        <Box sx={{height: '100%', flex: 2, display: 'flex', flexDirection: 'column', alignItems: 'start', gap: 1 }}>
            <WalletDialog open={openWalletDialog} onClose={() => {setEditWallet(null); setOpenWalletDialog(false)}} onSave={saveWallet} walletId={editWallet} />
            <DeleteDialog open={openDeleteWalletDialog} wallet={deleteWallet} onClose={() => setOpenDeleteWalletDialog(false)} onDelete={confirmDeletedWallet}/>
            <Button variant="outlined" startIcon={<FontAwesomeIcon icon={faPlus} />} onClick={openWalletDialogFunction}>crea nuovo portafoglio</Button>
            <Paper sx={{width: '100%', height: '100%', display: 'flex', flexDirection: 'column', overflowY: 'hidden'}}>
                <TableContainer sx={{height: '100%'}}>
                    <Table stickyHeader>
                        <TableHead >
                            <TableRow>
                                <TableCell>
                                    <TableSortLabel
                                        active={sortColumn == 'name'}
                                        direction={sortDirection? 'asc' : 'desc'}
                                        onClick={sortHandler('name')}
                                        >
                                        Nome
                                    </TableSortLabel>
                                </TableCell>
                                <TableCell style={{ width: '100px' }}>
                                    <TableSortLabel
                                        active={sortColumn == 'value'}
                                        direction={sortDirection? 'asc' : 'desc'}
                                        onClick={sortHandler('value')}
                                        >
                                        Valore
                                    </TableSortLabel>
                                </TableCell>
                                <TableCell style={{width: '20px'}}>Azioni</TableCell>
                                <TableCell style={{width: '15px'}}></TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {wallets != null ? wallets.map((value: Wallet, index) => {
                                return (
                                    <TableRow key={index} sx={{"*": {color: '#' + value.color + '!important'}}}>
                                        <TableCell> {value.name} </TableCell>
                                        <TableCell align="right"> {convertNumberToValue(value.value)} </TableCell>
                                        <TableCell>
                                            <Box sx={{display: 'flex', gap: 2}} >
                                                <FontAwesomeIcon style={{cursor: 'pointer'}} icon={faPen} onClick={() => openEditWallet(value.id)}/>
                                                <FontAwesomeIcon style={{cursor: 'pointer'}} icon={faTrash} onClick={() => deleteWalletFunction(value.id, value.name)}/>
                                            </Box>
                                        </TableCell>
                                        <TableCell>
                                            <FontAwesomeIcon style={{cursor: 'pointer'}} onClick={favoriteHandler(value.id)} icon={value.favorite? faStar : faStartEmpty} />
                                        </TableCell>
                                    </TableRow>
                                )
                            }) : (
                                <TableRow>
                                    <TableCell sx={{p: 0}} colSpan={3}><LinearProgress /></TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>
        </Box>

    );
})

WalletTable.displayName = "WalletTable";

export default WalletTable;