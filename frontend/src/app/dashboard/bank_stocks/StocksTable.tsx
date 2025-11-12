import { Box, LinearProgress, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TableSortLabel, Typography } from "@mui/material";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPen, faTrash, faArrowRight } from "@fortawesome/free-solid-svg-icons";
import { convertNumberToPercentage, convertNumberToValue } from "../../utilities/Utilities";
import { Stock } from "../../utilities/BackEndTypes";
import { Order } from "../base/Order";
import { useIsMobile } from "../../utilities/useMobile";
import { MouseEventHandler, Ref, useEffect, useImperativeHandle, useState } from "react";
import { useRestApi } from "../../request/Request";

export interface StockTableRef {
    refreshTable: () => void
}

interface IProps {
    ref: Ref<StockTableRef>
    loading: boolean
    clickedStock: number,
    setClickedStock: (_value: number) => void
    editStockClick: (_stockId: number) => MouseEventHandler<SVGSVGElement>
    deleteStockClick: (_stockId: number) => MouseEventHandler<SVGSVGElement>
}

export function StocksTable(props: IProps) {
    const isMobile = useIsMobile();

    const api = useRestApi();

    const [sort, setSort] = useState<Order>(new Order([]));
    const [loading, setLoading] = useState<boolean>(false);
    const [stocks, setStocks] = useState<Stock[]>();

    useEffect(() => {
        refreshTable();
    }, [])

    useImperativeHandle(props.ref, () => ({
        refreshTable: () => {
            console.log("refreshTable");

            setLoading(true);

            setTimeout(() => {
                refreshTable();
            }, 100);
        }
    }), []);

    function refreshTable() {
        setLoading(true);

        api.Stock.List({ sort: sort.toUrlString() }).then((stocks) => {
            console.log("Stock", stocks);
            setStocks(stocks);
        }).finally(() => {
            setLoading(false);
        })
    }

    const clickOnOrderHandler = (nameOfElement: string) => () => {
        setSort(sort.clickOnElement(nameOfElement));
    }

    const clickActiveStockHandler = (id: number): MouseEventHandler<SVGSVGElement> => () => {
        props.setClickedStock(id);
    }

    return (
        <Paper sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', overflowY: 'hidden' }}>
            <TableContainer sx={{ height: '100%' }}>
                <Table stickyHeader size={isMobile ? "small" : "medium"}>
                    <TableHead >
                        <TableRow>
                            <TableCell>
                                <TableSortLabel
                                    active={sort.haveElement('description')}
                                    direction={sort.getElement('description')?.order}
                                    onClick={clickOnOrderHandler('description')} >
                                    Nome
                                </TableSortLabel>
                            </TableCell>
                            <TableCell style={{ width: '50px' }}>
                                <TableSortLabel>
                                    Rendimento
                                </TableSortLabel>
                            </TableCell>
                            <TableCell style={{ width: '100px' }} align="right">
                                <TableSortLabel
                                    active={sort.haveElement('value')}
                                    direction={sort.getElement('value')?.order}
                                    onClick={clickOnOrderHandler('value')} >
                                    Valore
                                </TableSortLabel>
                            </TableCell>
                            <TableCell style={{ width: '20px' }}>Azioni</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {loading ? <TableRow><TableCell sx={{ p: 0 }} colSpan={5}><LinearProgress /></TableCell></TableRow> : null}
                        {(!stocks || stocks.length === 0) && (
                            <TableRow>
                                <TableCell colSpan={4}>
                                    <Typography fontStyle="italic" color="textSecondary" align="center">Inserire la prima azione</Typography>    
                                </TableCell>
                            </TableRow>
                        )}
                        {stocks?.map((value, index) => (
                            <TableRow key={index} sx={{ backgroundColor: value.id === props.clickedStock ? "#c1121f30" : undefined }}>
                                {/* <TableCell>{new Date(value.date).toLocaleDateString('it-IT', { day: 'numeric', month: isMobile ? "numeric" : "long", year: 'numeric' })}</TableCell> */}
                                <TableCell>{value.name}</TableCell>
                                <TableCell align="right">{convertNumberToPercentage(value.currentValue / value.resourcesInvested - 1)}</TableCell>
                                <TableCell sx={{ display: 'flex', gap: 1.5, justifyContent: "right" }}>{convertNumberToValue(value.currentValue)}</TableCell>
                                <TableCell>
                                    <Box sx={{ display: 'flex', gap: 2 }} >
                                        <FontAwesomeIcon style={{ cursor: 'pointer' }} icon={faPen} onClick={props.editStockClick(value.id)} />
                                        <FontAwesomeIcon style={{ cursor: 'pointer' }} icon={faTrash} onClick={props.deleteStockClick(value.id)} />
                                        <FontAwesomeIcon style={{ cursor: 'pointer' }} icon={faArrowRight} onClick={clickActiveStockHandler(value.id)} />
                                    </Box>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        </Paper>
    );
}