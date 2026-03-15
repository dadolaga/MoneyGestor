'use client';

import { Box, Button } from '@mui/material';
import { useRef, useState } from 'react';
import WalletTable from './WalletTable';
import WalletDialog from './WalletDialog';
import WalletPie from './WalletPie';

export default function Page() {
    const tableWallet = useRef(null);
    const pieWallet = useRef(null);

    const [showWalletDialog, setShowWalletDialog] = useState<boolean>(false);

    const clickAddWalletHandler = () => {
        setShowWalletDialog(true);
    };

    const refreshPage = () => {
        tableWallet.current.refreshTable();
        pieWallet.current.refresh();
    };

    const closeWalletHandler = (added: boolean) => {
        setShowWalletDialog(false);

        if (added) {
            refreshPage();
        }
    };

    return (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
            <WalletDialog open={showWalletDialog} onClose={closeWalletHandler} />
            <Box width="100%" height="100%" display="grid" gridTemplateColumns="3fr 2fr" gap={2}>
                <Box height="100%" width="100%" display="flex" flexDirection="column" gap={2}>
                    <Box width="100%" display="flex" flexDirection="row" justifyContent="start">
                        <Button variant="contained" onClick={clickAddWalletHandler}>
                            Aggiungi portafoglio
                        </Button>
                    </Box>
                    <WalletTable ref={tableWallet} refreshPage={refreshPage }/>
                </Box>
                <Box display="flex" alignItems="center">
                    <WalletPie ref={pieWallet} />
                </Box>
            </Box>
        </Box>
    );
}
