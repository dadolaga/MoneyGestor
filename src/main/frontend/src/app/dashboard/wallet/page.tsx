"use client"

import { Box } from '@mui/material'
import { useEffect, useRef, useState } from 'react'
import WalletTable from './walletTable'
import { Wallet } from '../../Utilities/BackEndTypes'
import { useRestApi } from '../../request/Request'
import { WalletPie } from './WalletPie'
import { Order } from '../base/Order'

export default function Page() {
    const tableWallet = useRef();

    const [wallets, setWallets] = useState<Wallet[]>(undefined);
    const [sort, setSort] = useState<Order>(new Order());
    const [loading, setLoading] = useState<boolean>(false);

    const restApi = useRestApi();

    useEffect(() => {
        loadWallets();
    }, [sort]);

    function loadWallets() {
        setLoading(true);

        restApi.Wallet.List({ order: sort.toUrlString() })
        .then(wallet => setWallets(wallet))
        .finally(() => setLoading(false))
    }
    
    const refreshWalletHandler = () => {
        loadWallets();
    }

    return (
        <Box sx={{height: '100%', display: 'flex', flexDirection: "row", alignItems: 'center'}}>
            <WalletTable ref={tableWallet} refreshWallets={refreshWalletHandler} wallets={wallets} loading={loading} sort={sort} setSort={setSort}/>
            <WalletPie wallets={wallets} loading={loading} />
        </Box>
    )
}