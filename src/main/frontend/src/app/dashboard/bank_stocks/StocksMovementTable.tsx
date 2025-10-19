import { Box, Chip, LinearProgress, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TableSortLabel } from "@mui/material";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPen, faTrash } from "@fortawesome/free-solid-svg-icons";
import { convertNumberToPercentage, convertNumberToValue } from "../../utilities/Utilities";
import { StockMovement } from "../../utilities/BackEndTypes";
import { Order } from "../base/Order";
import { useIsMobile } from "../../utilities/useMobile";
import { MouseEventHandler, MutableRefObject, useCallback, useEffect, useImperativeHandle, useState } from "react";
import { useRestApi } from "../../request/Request";

export interface StockMovementTableRef {
    refreshTable: () => void
}

interface IProps {
    ref: MutableRefObject<StockMovementTableRef>
    clickedStock: number
    //: (value: number) => void
    editStockClick: (_stockId: number) => MouseEventHandler<SVGSVGElement>
    deleteStockClick: (_stockId: number) => MouseEventHandler<SVGSVGElement>
}

export function StockMovementTable(props: IProps) {
    const isMobile = useIsMobile();

    const api = useRestApi();

    const [sort, setSort] = useState<Order>(new Order([{ name: "date", order: "desc" }]));
    const [loading, setLoading] = useState<boolean>(false);
    const [stockMovements, setStockMovements] = useState<StockMovement[]>();


    const refreshTable = useCallback(() => {
        setLoading(true);

        api.StockMovement.List({ stock: props.clickedStock, sort: sort.toUrlString() }).then((stocks) => {
            setStockMovements(stocks);
        }).finally(() => {
            setLoading(false);
        })
    }, [api.StockMovement, props.clickedStock, sort]);

    useImperativeHandle(props.ref, () => ({
        refreshTable: () => {
            refreshTable();
        }
    }), [refreshTable]);

    useEffect(() => {
        refreshTable();
    }, [props.clickedStock]);

    const clickOnOrderHandler = (nameOfElement: string) => () => {
        setSort(sort.clickOnElement(nameOfElement));

        refreshTable();
    }

    return (
        <Paper sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', overflowY: 'hidden' }}>
            <TableContainer sx={{ height: '100%' }}>
                <Table stickyHeader size={isMobile ? "small" : "medium"}>
                    <TableHead >
                        <TableRow>
                            <TableCell>
                                <TableSortLabel
                                    active={sort.haveElement('date')}
                                    direction={sort.getElement('date')?.order}
                                    onClick={clickOnOrderHandler('date')} >
                                    Data
                                </TableSortLabel>
                            </TableCell>
                            <TableCell style={{ width: '1px' }}>
                                <TableSortLabel>
                                    Valore
                                </TableSortLabel>
                            </TableCell>
                            <TableCell style={{ width: '1px' }} align="right">
                                <TableSortLabel
                                    active={sort.haveElement('value')}
                                    direction={sort.getElement('value')?.order}
                                    onClick={clickOnOrderHandler('value')} >
                                    Aumento
                                </TableSortLabel>
                            </TableCell>
                            <TableCell style={{ width: '20px' }}>Tipo</TableCell>
                            <TableCell style={{ width: '20px' }}>Azioni</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {loading ? <TableRow><TableCell sx={{ p: 0 }} colSpan={5}><LinearProgress /></TableCell></TableRow> : null}
                        {stockMovements?.map((value, index) => (
                            <TableRow key={index} sx={{ backgroundColor: value.id === props.clickedStock ? "#c1121f30" : undefined }}>
                                {/* <TableCell>{new Date(value.date).toLocaleDateString('it-IT', { day: 'numeric', month: isMobile ? "numeric" : "long", year: 'numeric' })}</TableCell> */}
                                <TableCell>{new Date(value.date).toLocaleDateString('it-IT', { day: 'numeric', month: isMobile ? "numeric" : "long", year: 'numeric' })}</TableCell>
                                <TableCell align="center">{convertNumberToValue(value.value)}</TableCell>
                                <TableCell align="center">{convertNumberToPercentage(value.current_yield)}</TableCell>
                                <TableCell> {value.is_tfr ? <TfrChip /> : value.bank_deposit ? <BankDepositChip /> : <MarketChip />} </TableCell>
                                <TableCell>
                                    <Box sx={{ display: 'flex', gap: 2 }} >
                                        <FontAwesomeIcon style={{ cursor: 'pointer' }} icon={faPen} onClick={props.editStockClick(value.id)} />
                                        <FontAwesomeIcon style={{ cursor: 'pointer' }} icon={faTrash} onClick={props.deleteStockClick(value.id)} />
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

function MarketChip() {
    return (
        <Chip label="Mercato" variant="outlined" size="small" style={{ color: "#fb8500", borderColor: "#fb8500" }} />
    )
}

function BankDepositChip() {
    return (
        <Chip label="Deposito" variant="outlined" size="small" style={{ color: "#ffff3f", borderColor: "#ffff3f" }} />
    )
}

function TfrChip() {
    return (
        <Chip label="TFR" variant="outlined" size="small" style={{ color: "#70e000", borderColor: "#70e000" }} />
    )
}