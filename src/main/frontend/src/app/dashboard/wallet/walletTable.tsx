import { useRouter } from 'next/navigation';
import { forwardRef, useState } from 'react';
import { Wallet } from "../../Utilities/BackEndTypes";
import { useRestApi } from "../../request/Request";
import { Order } from "../base/Order";
import WalletDialog from "./WalletDialog";

interface IWalletTable {
    wallets: Wallet[],
    loading: boolean,
    refreshWallets: () => void,
    sort: Order,
    setSort: (_: Order) => void,
}

const WalletTable = forwardRef(({wallets, loading, refreshWallets, sort, setSort}: IWalletTable, ref) => {
    const [openWalletDialog, setOpenWalletDialog] = useState(false);
    const [openDeleteWalletDialog, setOpenDeleteWalletDialog] = useState(false);
    const [editWalletId, setEditWalletId] = useState<number>(undefined);
    const [deleteWalletId, setDeleteWalletId] = useState<number>(undefined);
    const [isOpen, setIsOpen] = useState(false);
    const [isButtonVisible, setIsButtonVisible] = useState(true);

    const handleOpen = () => {
    setIsOpen(true);
    setIsButtonVisible(false);
    };

    const handleClose = () => {
    setIsOpen(false);
    setIsButtonVisible(true);
    };
    const restApi = useRestApi();
    const router = useRouter();

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

    const clickOnOrderHandler = (nameOfElement: string) => () => {
        setSort(sort.clickOnElement(nameOfElement));

    }

    return (
        <div>
            {isButtonVisible && (
                <button onClick={handleOpen}>Add</button>
            )}
            {isOpen && (
                <div className="popup-container">
                <div className="popup">
                    <WalletDialog onClose={handleClose} />
                </div>
                </div>
            )}
        </div>
        // <Box sx={{height: '100%', flex: 2, display: 'flex', flexDirection: 'column', alignItems: 'start', gap: 1 }}>
        //     <WalletDialog open={openWalletDialog} onClose={closeWalletDialogHandler} walletId={editWalletId} />
        //     <DeleteDialog open={openDeleteWalletDialog} walletId={deleteWalletId} onClose={closeDeleteDialogHandler} />
            
        //     <Paper sx={{width: '100%', height: '100%', display: 'flex', flexDirection: 'column', overflowY: 'hidden'}}>
        //         <TableContainer sx={{height: '100%'}}>
        //             <Table stickyHeader>
        //                 <TableHead >
        //                     <TableRow>
        //                         <TableCell>
        //                             <TableSortLabel
        //                                 active={sort.haveElement('name')}
        //                                 direction={sort.getElement('name')?.order}
        //                                 onClick={clickOnOrderHandler('name')}
        //                                 >
        //                                 Nome
        //                             </TableSortLabel>
        //                         </TableCell>
        //                         <TableCell style={{ width: '100px' }}>
        //                             <TableSortLabel
        //                                 active={sort.haveElement('value')}
        //                                 direction={sort.getElement('value')?.order}
        //                                 onClick={clickOnOrderHandler('value')}
        //                                 >
        //                                 Valore
        //                             </TableSortLabel>
        //                         </TableCell>
        //                         <TableCell style={{width: '20px'}}>Azioni</TableCell>
        //                         <TableCell style={{width: '15px'}}></TableCell>
        //                     </TableRow>
        //                 </TableHead>
        //                 <TableBody>
        //                     {(!wallets || loading) && (<TableRow>
        //                         <TableCell sx={{p: 0}} colSpan={4}><LinearProgress /></TableCell>
        //                     </TableRow>)}
        //                     {wallets?.map((value: Wallet, index) => {
        //                         return (
        //                             <TableRow key={index} sx={{"*": {color: '#' + value.color + '!important'}}}>
        //                                 <TableCell> {value.name} </TableCell>
        //                                 <TableCell align="right"> {convertNumberToValue(value.value)} </TableCell>
        //                                 <TableCell>
        //                                     <Box sx={{display: 'flex', gap: 2}} >
        //                                         <FontAwesomeIcon style={{cursor: 'pointer'}} icon={faPen} onClick={editWalletHandler(value.id)}/>
        //                                         <FontAwesomeIcon style={{cursor: 'pointer'}} icon={faTrash} onClick={deleteWalletHandler(value.id)}/>
        //                                     </Box>
        //                                 </TableCell>
        //                                 <TableCell>
        //                                     <FontAwesomeIcon style={{cursor: 'pointer'}} onClick={favoriteHandler(value.id)} icon={value.favorite? faStar : faStartEmpty} />
        //                                 </TableCell>
        //                             </TableRow>
        //                         )
        //                     })}
        //                 </TableBody>
        //             </Table>
        //         </TableContainer>
        //     </Paper>
        // </Box>

    );
})

WalletTable.displayName = "WalletTable";

export default WalletTable;