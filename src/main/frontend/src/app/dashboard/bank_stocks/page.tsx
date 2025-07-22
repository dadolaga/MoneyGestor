"use client"

import { faPlus } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Box, Button, Card, Paper, Typography } from "@mui/material";
import { StocksTable, StockTableRef } from "./StocksTable";
import StockDialog from "./StockDialog";
import { useRef, useState } from "react";
import { StockMovementTable } from "./StocksMovementTable";
import StockMovementDialog from "./StockMovementDialog";


export default function Page() {
    const stockTableRef = useRef<StockTableRef>(null);
    const stockMovementTableRef = useRef<StockTableRef>(null);
    const [showDialog, setShowDialog] = useState<boolean>(false);
    const [showMovementDialog, setShowMovementDialog] = useState<boolean>(false);
    const [activeStock, setActiveStock] = useState<number>(undefined);

    const hideDialog = (refreshTable: boolean) => {
        if (refreshTable && stockTableRef.current != null)
            stockTableRef.current.refreshTable();

        setShowDialog(false);
    }

    const hideMovementDialog = (refreshTable: boolean) => {
        if (refreshTable && stockMovementTableRef.current != null)
            stockMovementTableRef.current.refreshTable();

        setShowMovementDialog(false);
    }

    const clickAddNewStockHandler = () => {
        setShowDialog(true);
    }

    const clickAddNewStockMovementHandler = () => {
        setShowMovementDialog(true);
    }

    return (
        <Box display="flex" flexDirection="column" gap={1} height="100%">
            <StockDialog open={showDialog} onClose={hideDialog} />
            <StockMovementDialog open={showMovementDialog} onClose={hideMovementDialog} stockId={activeStock} />
            <Box display="flex" flexDirection="row" justifyContent="space-between">
                <Box display="flex" flexDirection="row">
                    <Button variant="outlined" startIcon={<FontAwesomeIcon icon={faPlus} />} onClick={clickAddNewStockHandler}>Aggiungi nuova azione</Button>
                </Box>
                <Box display="flex" flexDirection="row">
                    <Button variant="outlined" startIcon={<FontAwesomeIcon icon={faPlus} />} disabled={activeStock === undefined} onClick={clickAddNewStockMovementHandler}>Aggiungi nuovo movimento</Button>
                </Box>
            </Box>
            <Box display="grid" gridTemplateColumns="3fr 1fr" height="100%" gap={1}>
                <StocksTable ref={stockTableRef} loading={false} clickedStock={activeStock} setClickedStock={setActiveStock} />
                {activeStock === undefined ? (
                    <Paper sx={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Typography fontSize="2em" fontStyle="italic">Seleziona un&apos;azione</Typography>
                    </Paper>
                ) : (
                    <StockMovementTable ref={stockMovementTableRef} />
                )}
            </Box>
            <Paper sx={{ height: "100%" }}></Paper>
        </Box>
    );
}