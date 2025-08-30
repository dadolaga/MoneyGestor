"use client"

import { faPlus } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Box, Button, Card, Paper, Typography } from "@mui/material";
import { StocksTable, StockTableRef } from "./StocksTable";
import StockDialog from "./StockDialog";
import { useRef, useState } from "react";
import { StockMovementTable } from "./StocksMovementTable";
import StockMovementDialog from "./StockMovementDialog";
import DeleteMovementDialog from "./DeleteMovementDialog";
import DeleteStockDialog from "./DeleteStockDialog";


export default function Page() {
    const stockTableRef = useRef<StockTableRef>(null);
    const stockMovementTableRef = useRef<StockTableRef>(null);

    const [movementDeleteId, setMovementDeleteId] = useState<number | undefined>(undefined);
    const [stockDeleteId, setStockDeleteId] = useState<number | undefined>(undefined);

    const [showDialog, setShowDialog] = useState<boolean>(false);
    const [showMovementDialog, setShowMovementDialog] = useState<boolean>(false);
    const [activeStock, setActiveStock] = useState<number>(undefined);
    const [stockEditId, setStockEditId] = useState<number>(undefined);
    const [stockMovementEditId, setStockMovementEditId] = useState<number>(undefined);

    const hideDialog = (refreshTable: boolean) => {
        if (refreshTable && stockTableRef.current != null)
            stockTableRef.current.refreshTable();

        setShowDialog(false);
        setStockDeleteId(undefined);
    }

    const hideMovementDialog = (refreshTable: boolean) => {
        if (refreshTable && stockMovementTableRef.current != null) {
            stockMovementTableRef.current.refreshTable();
            stockTableRef.current.refreshTable();
        }

        setShowMovementDialog(false);
        setMovementDeleteId(undefined);
    }

    const clickOnEditStockHandler = (stockId: number) => () => {
        setStockEditId(stockId);
        setShowDialog(true);
    }

    const clickOnEditStockMovementHandler = (stockMovementId: number) => () => {
        setStockMovementEditId(stockMovementId);
        setShowMovementDialog(true);
    }

    const clickOnDeleteStockHandler = (stockId: number) => () => {
        setStockDeleteId(stockId);
    }

    const clickOnDeleteStockMovementHandler = (stockId: number) => () => {
        setMovementDeleteId(stockId);
    }

    const clickAddNewStockHandler = () => {
        setStockEditId(undefined);
        setShowDialog(true);
    }

    const clickAddNewStockMovementHandler = () => {
        setStockMovementEditId(undefined);
        setShowMovementDialog(true);
    }

    const openMovementTableHandler = (stockId: number) => {
        setActiveStock(v => stockId);
    }

    return (
        <Box display="flex" flexDirection="column" gap={1} height="100%">
            <DeleteMovementDialog open={movementDeleteId !== undefined} onClose={hideMovementDialog} movement={movementDeleteId} />
            <DeleteStockDialog open={stockDeleteId !== undefined} onClose={hideDialog} stock={stockDeleteId}/>

            <StockDialog open={showDialog} onClose={hideDialog} stockId={stockEditId} />
            <StockMovementDialog open={showMovementDialog} onClose={hideMovementDialog} stockId={activeStock} stockMovementId={stockMovementEditId}/>
            <Box display="flex" flexDirection="row" justifyContent="space-between">
                <Box display="flex" flexDirection="row">
                    <Button variant="outlined" startIcon={<FontAwesomeIcon icon={faPlus} />} onClick={clickAddNewStockHandler}>Aggiungi nuova azione</Button>
                </Box>
                <Box display="flex" flexDirection="row">
                    <Button variant="outlined" startIcon={<FontAwesomeIcon icon={faPlus} />} disabled={activeStock === undefined} onClick={clickAddNewStockMovementHandler}>Aggiungi nuovo movimento</Button>
                </Box>
            </Box>
            <Box display="grid" gridTemplateColumns="1fr 550px" height="100%" gap={1}>
                <StocksTable ref={stockTableRef} loading={false} clickedStock={activeStock} setClickedStock={openMovementTableHandler} editStockClick={clickOnEditStockHandler} deleteStockClick={clickOnDeleteStockHandler} />
                {activeStock === undefined ? (
                    <Paper sx={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Typography fontSize="2em" fontStyle="italic">Seleziona un&apos;azione</Typography>
                    </Paper>
                ) : (
                    <StockMovementTable ref={stockMovementTableRef} clickedStock={activeStock} editStockClick={clickOnEditStockMovementHandler} deleteStockClick={clickOnDeleteStockMovementHandler} />
                )}
            </Box>
            <Paper sx={{ height: "100%" }}></Paper>
        </Box>
    );
}