"use client"

import { Box } from '@mui/material'
import { useEffect, useRef, useState } from 'react'
import WalletTable from './walletTable'
import { Wallet } from '../../Utilities/BackEndTypes'
import { useRestApi } from '../../request/Request'
import { WalletPie } from './WalletPie'

export default function Page() {
    const tableWallet = useRef();

    const [wallets, setWallets] = useState<Wallet[]>(undefined);
    const [loading, setLoading] = useState<boolean>(false);

    const restApi = useRestApi();

    useEffect(() => {
        loadWallets();
    }, []);

    function loadWallets() {
        setLoading(true);

        restApi.Wallet.List()
        .then(wallet => setWallets(wallet))
        .finally(() => setLoading(false))
    }
    
    const refreshWalletHandler = () => {
        loadWallets();
    }

    return (
        <Box sx={{height: '100%', display: 'flex', flexDirection: "row", alignItems: 'center'}}>
            <WalletTable ref={tableWallet} refreshWallets={refreshWalletHandler} wallets={wallets} loading={loading} />
            <WalletPie wallets={wallets} loading={loading} />
        </Box>
    )
}