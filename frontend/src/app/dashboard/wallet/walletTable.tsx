import { faPen, faStar, faTrash } from '@fortawesome/free-solid-svg-icons';
import { faStar as faStartEmpty } from '@fortawesome/free-regular-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    Box,
    LinearProgress,
    Paper,
    Skeleton,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableFooter,
    TableHead,
    TableRow,
    TableSortLabel,
} from '@mui/material';
import { useState, useEffect, useImperativeHandle, Ref, useCallback } from 'react';
import WalletDialog from './WalletDialog';
import { convertNumberToValue } from '../../utilities/Utilities';
import { useRestApi } from '../../request/Request';
import { useIsMobile } from '../../utilities/useMobile';
import { Wallet } from '@/models/backend';
import useApi from '@/hooks/useApi';
import DeleteDialog from '@/component/DeleteDialog';
import { enqueueSnackbar } from 'notistack';

export interface WalletTableRef {
    refreshTable: () => void;
}

interface Props {
    ref: Ref<WalletTableRef>;
    refreshPage: () => void;
}

export default function WalletTable({ ref, refreshPage }: Props) {
    const isMobile = useIsMobile();

    const api = useApi();

    const [loading, setLoading] = useState<boolean>(false);
    const [wallets, setWallets] = useState<Wallet[]>(undefined);
    const [sort, setSort] = useState<{ [key: string]: 'asc' | 'desc' }>({});
    const [openWalletDialog, setOpenWalletDialog] = useState(false);
    const [deleteWallet, setDeleteWallet] = useState<Wallet>(undefined);
    const [editWalletId, setEditWalletId] = useState<number>(undefined);

    const restApi = useRestApi();

    useEffect(() => {
        reloadWallets();
    }, []);

    useImperativeHandle<WalletTableRef, WalletTableRef>(
        ref,
        () => ({
            refreshTable: () => {
                reloadWallets();
            },
        }),
        [],
    );

    const reloadWallets = useCallback(() => {
        setLoading(true);
        setWallets(undefined);

        api.wallet
            .get()
            .onSuccess((wallets) => {
                setWallets(wallets);
            })
            .onFinish(() => {
                setLoading(false);
            })
            .execute();
    }, [api]);

    const clickFavoriteHandler = (id) => async (_event) => {
        enqueueSnackbar('Not implemented yet', { variant: 'warning' });
    };

    const clickEditWalletHandler = (id: number) => () => {
        setEditWalletId(id);
        setOpenWalletDialog(true);
    };

    const closeEditWalletHandler = (edited: boolean) => {
        setOpenWalletDialog(false);

        if (edited) {
            reloadWallets();
            refreshPage();
        }
    };

    const clickDeleteWalletHandler = (wallet: Wallet) => () => {
        setDeleteWallet(wallet);
    };

    const deleteWalletHandler = (wallet?: Wallet) => {
        if (wallet === undefined) {
            setDeleteWallet(undefined);
            return;
        }

        api.wallet
            .delete(wallet.id)
            .onSuccess(() => {
                enqueueSnackbar('Portafoglio eliminato con successo', { variant: 'success' });
                reloadWallets();
                refreshPage();
            })
            .onFinish(() => {
                setDeleteWallet(undefined);
            })
            .execute();
    };

    const clickOnOrderHandler = (nameOfElement: string) => () => {
        setSort({ ...sort, [nameOfElement]: sort[nameOfElement] === 'asc' ? 'desc' : 'asc' });
    };

    return (
        <Box sx={{ height: '100%', flex: 2, display: 'flex', flexDirection: 'column', alignItems: 'start', gap: 1 }}>
            <WalletDialog open={openWalletDialog} onClose={closeEditWalletHandler} walletId={editWalletId} />
            <DeleteDialog
                data={deleteWallet}
                deleteMessage={(wallet) => `Sei sicuro di voler cancellare il portafoglio "${wallet.name}"?`}
                onDelete={deleteWalletHandler}
            />
            <Paper
                sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', overflowY: 'hidden' }}
            >
                <TableContainer sx={{ height: '100%' }}>
                    <Table stickyHeader>
                        <TableHead>
                            <TableRow>
                                <TableCell>
                                    <TableSortLabel
                                        active={sort['name'] !== undefined}
                                        direction={sort['name']}
                                        onClick={clickOnOrderHandler('name')}
                                    >
                                        Nome
                                    </TableSortLabel>
                                </TableCell>
                                <TableCell style={{ width: '100px' }}>
                                    <TableSortLabel
                                        active={sort['value'] !== undefined}
                                        direction={sort['value']}
                                        onClick={clickOnOrderHandler('value')}
                                    >
                                        Valore
                                    </TableSortLabel>
                                </TableCell>
                                <TableCell style={{ width: '20px' }}>Azioni</TableCell>
                                <TableCell style={{ width: '15px' }}></TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {(!wallets || loading) && (
                                <TableRow>
                                    <TableCell sx={{ p: 0 }} colSpan={4}>
                                        <LinearProgress />
                                    </TableCell>
                                </TableRow>
                            )}
                            {wallets?.map((value: Wallet, index) => {
                                return (
                                    <TableRow key={index} sx={{ '*': { color: '#' + value.color + '!important' } }}>
                                        <TableCell> {value.name} </TableCell>
                                        <TableCell align="right"> {convertNumberToValue(value.value)} </TableCell>
                                        <TableCell>
                                            <Box sx={{ display: 'flex', gap: 2 }}>
                                                <FontAwesomeIcon
                                                    style={{ cursor: 'pointer' }}
                                                    icon={faPen}
                                                    onClick={clickEditWalletHandler(value.id)}
                                                />
                                                <FontAwesomeIcon
                                                    style={{ cursor: 'pointer' }}
                                                    icon={faTrash}
                                                    onClick={clickDeleteWalletHandler(value)}
                                                />
                                            </Box>
                                        </TableCell>
                                        <TableCell>
                                            <FontAwesomeIcon
                                                style={{ cursor: 'pointer' }}
                                                onClick={clickFavoriteHandler(value.id)}
                                                icon={value.favorite ? faStar : faStartEmpty}
                                            />
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                        <TableFooter>
                            <TableRow>
                                <TableCell
                                    sx={{
                                        textTransform: 'uppercase',
                                        fontWeight: 600,
                                        fontSize: '1em',
                                        fontStyle: 'italic',
                                    }}
                                >
                                    totale
                                </TableCell>
                                <TableCell sx={{ textAlign: 'end', fontWeight: 600, fontSize: '1.1em' }}>
                                    {wallets ? (
                                        convertNumberToValue(
                                            wallets
                                                .map((wallet) => wallet.value)
                                                .reduce((value, currentValue) => value + currentValue, 0),
                                        )
                                    ) : (
                                        <Skeleton variant="text" />
                                    )}
                                </TableCell>
                                <TableCell colSpan={3} />
                            </TableRow>
                        </TableFooter>
                    </Table>
                </TableContainer>
            </Paper>
        </Box>
    );
}
