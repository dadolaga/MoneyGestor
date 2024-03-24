"use client"

import { Box } from '@mui/material'
import WalletPie from './WalletPie'
import { useRef } from 'react'
import WalletTable from './walletTable'

export default function Page() {
    const walletPie = useRef();
    const tableWallet = useRef();
    
    function refreshWallet() {
        if(walletPie != null)
            walletPie.current.refreshWallet();

        if(tableWallet != null)
            tableWallet.current.refreshWallet();
    }

    return (
        <Box sx={{height: '100%', display: 'flex', flexDirection: "row", alignItems: 'center'}}>
            <WalletTable ref={tableWallet} refreshWallets={refreshWallet} />
            <WalletPie ref={walletPie} />
        </Box>
    )
}