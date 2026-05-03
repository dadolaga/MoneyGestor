import type { RefObject, MouseEvent } from 'react';
import { useCallback, useImperativeHandle, useState, useEffect } from 'react';

import { faArrowRightLong, faPen, faTrash } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

import {
    Box,
    Chip,
    LinearProgress,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TablePagination,
    TableRow,
    TableSortLabel,
} from '@mui/material';

import TableCellSort from '@/component/TableCellSort';
import type { SortType } from '@/context/SortTableContext';
import { SortProvider } from '@/context/SortTableContext';
import useApi from '@/hooks/useApi';
import type { Transaction } from '@/models/backend';
import { convertSortToApi, convertFilterToApi } from '@/utilis/backend';
import { convertColor } from '@/utilis/color';
import { convertNumberToValue } from '@/utilis/values';

import type { FilterData } from './TransactionTableFilter';
import { useIsMobile } from '../../../hooks/useMobile';

const ID_EXCHANGE_TYPE = 1;

export interface TransactionTableRef {
    refreshTable: () => void;
}

interface ITransactionTableProps {
    ref: RefObject<TransactionTableRef>;
    filter?: FilterData;
    onEditClick: (transaction: Transaction) => void;
    onDeleteClick: (transaction: Transaction) => void;
}

const sortDefault: SortType = {
    date: 'desc',
};

export function TransactionTable(props: ITransactionTableProps) {
    const isMobile = useIsMobile();
    const api = useApi();

    const [transactions, setTransactions] = useState<Transaction[]>();
    const [sort, setSort] = useState<SortType>(sortDefault);
    const [loading, setLoading] = useState<boolean>(false);
    const [page, setPage] = useState<number>(0);

    const [transactionNumber, setTransactionNumber] = useState<number>();

    const loadTransactions = useCallback(() => {
        queueMicrotask(() => setLoading(true));

        api.transaction
            .list({
                order: convertSortToApi(sort),
                where: convertFilterToApi(props.filter),
            })
            .onSuccess((data) => {
                setPage(0);

                setTransactionNumber(data!.length);
                setTransactions(data!.data);
            })
            .onFinish(() => {
                setLoading(false);
            })
            .execute();
    }, [sort, props.filter]);

    useImperativeHandle(
        // eslint-disable-next-line react-hooks/refs
        props.ref,
        () => ({
            refreshTable: () => {
                loadTransactions();
            },
        }),
        [loadTransactions],
    );

    useEffect(() => {
        loadTransactions();
    }, [loadTransactions]);

    useEffect(() => {
        loadTransactions();
    }, [sort, page, loadTransactions]);

    const editHandler = (transaction: Transaction) => () => {
        props.onEditClick(transaction);
    };

    const deleteHandler = (transaction: Transaction) => () => {
        props.onDeleteClick(transaction);
    };

    const changePageHandler = (event: MouseEvent<HTMLButtonElement> | null, page: number) => {
        setPage(page);
    };

    const onSortHandler = useCallback((sort: SortType) => {
        setSort(sort);
    }, []);

    return (
        <Paper sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', overflowY: 'hidden' }}>
            <TableContainer sx={{ height: '100%' }}>
                <SortProvider onSort={onSortHandler} default={{ date: 'desc' }}>
                    <Table stickyHeader size={isMobile ? 'small' : 'medium'}>
                        <TableHead>
                            <TableRow>
                                <TableCellSort name="date" style={{ width: isMobile ? '75px' : '150px' }}>
                                    Data
                                </TableCellSort>
                                <TableCellSort name="description">Descrizione</TableCellSort>
                                {!isMobile && (
                                    <TableCell style={{ width: '10px' }}>
                                        <TableSortLabel>Tipo</TableSortLabel>
                                    </TableCell>
                                )}
                                <TableCellSort name="value" style={{ width: '100px' }} align="right">
                                    Valore
                                </TableCellSort>
                                {!isMobile && (
                                    <>
                                        <TableCell style={{ width: '10px' }}>
                                            <TableSortLabel>Portafoglio</TableSortLabel>
                                        </TableCell>
                                        <TableCell style={{ width: '20px' }}>Azioni</TableCell>
                                    </>
                                )}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {!!loading && (
                                <TableRow>
                                    <TableCell sx={{ p: 0 }} colSpan={5}>
                                        <LinearProgress />
                                    </TableCell>
                                </TableRow>
                            )}
                            {transactions?.map((value, index) => {
                                return (
                                    <TableRow key={index}>
                                        <TableCell>
                                            {new Date(value.date!).toLocaleDateString('it-IT', {
                                                day: 'numeric',
                                                month: isMobile ? 'numeric' : 'long',
                                                year: 'numeric',
                                            })}
                                        </TableCell>
                                        <TableCell>{value.description}</TableCell>
                                        {!isMobile && <TableCell>{value.transactionType!.name}</TableCell>}
                                        <TableCell align="right">
                                            {convertNumberToValue(
                                                value.transactionType!.id == ID_EXCHANGE_TYPE
                                                    ? Math.abs(value.value!)
                                                    : value.value,
                                            )}
                                        </TableCell>
                                        {!isMobile && (
                                            <>
                                                <TableCell sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
                                                    {value.transactionType!.id == ID_EXCHANGE_TYPE &&
                                                        !!value.walletDestination && (
                                                            <>
                                                                <Chip
                                                                    label={value.walletDestination.name}
                                                                    size="small"
                                                                    variant="outlined"
                                                                    style={{
                                                                        color: convertColor(
                                                                            value.walletDestination.color!.value!,
                                                                        ),
                                                                        borderColor: convertColor(
                                                                            value.walletDestination.color!.value!,
                                                                        ),
                                                                    }}
                                                                />
                                                                <FontAwesomeIcon icon={faArrowRightLong} />
                                                            </>
                                                        )}
                                                    <Chip
                                                        label={value.wallet!.name}
                                                        size="small"
                                                        variant="outlined"
                                                        style={{
                                                            color: convertColor(value.wallet!.color!.value!),
                                                            borderColor: convertColor(value.wallet!.color!.value!),
                                                        }}
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Box sx={{ display: 'flex', gap: 2 }}>
                                                        <FontAwesomeIcon
                                                            style={{ cursor: 'pointer' }}
                                                            icon={faPen}
                                                            onClick={editHandler(value)}
                                                        />
                                                        <FontAwesomeIcon
                                                            style={{ cursor: 'pointer' }}
                                                            icon={faTrash}
                                                            onClick={deleteHandler(value)}
                                                        />
                                                    </Box>
                                                </TableCell>
                                            </>
                                        )}
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </SortProvider>
            </TableContainer>
            <TablePagination
                sx={{ overflow: 'hidden' }}
                component="div"
                count={transactionNumber ?? 0}
                page={page}
                rowsPerPage={25}
                onPageChange={changePageHandler}
                rowsPerPageOptions={[25]}
            />
        </Paper>
    );
}
