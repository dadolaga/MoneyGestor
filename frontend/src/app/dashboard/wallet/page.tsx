'use client';

import { Box, Button } from '@mui/material';
import { useRef, useState } from 'react';
import WalletTable from './WalletTable';
import WalletDialog from './WalletDialog';

export default function Page() {
    const tableWallet = useRef(null);

    const [showWalletDialog, setShowWalletDialog] = useState<boolean>(false);

    const clickAddWalletHandler = () => {
        setShowWalletDialog(true);
    };

    const closeWalletHandler = (added: boolean) => {
        setShowWalletDialog(false);

        if(added) {
            tableWallet.current.refreshTable();
        }
    };

    return (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
            <WalletDialog open={showWalletDialog} onClose={closeWalletHandler} />
            <Box height="100%" width="100%" display="flex" flexDirection="column" gap={2}>
                <Box width="100%" display="flex" flexDirection="row" justifyContent="end">
                    <Button variant='contained' onClick={clickAddWalletHandler}> Aggiungi portafoglio </Button>
                </Box>
                <WalletTable ref={tableWallet} />
            </Box>

            {/*{!isMobile && (<WalletPie wallets={wallets} loading={loading} />)} */}
        </Box>
    );
}
