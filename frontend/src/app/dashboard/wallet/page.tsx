"use client"

import { Box } from '@mui/material'
import { useEffect, useRef, useState } from 'react'
import WalletTable from './WalletTable'
import { Wallet } from '../../utilities/BackEndTypes'
import { useRestApi } from '../../request/Request'
import { WalletPie } from './WalletPie'
import { Order } from '../base/Order'
import { useIsMobile } from '../../utilities/useMobile'
import WalletDialog from './WalletDialog'

export default function Page() {
    const tableWallet = useRef(null);

    const isMobile = useIsMobile();

    const [showWalletDialog, setShowWalletDialog] = useState<boolean>(true);
    const [wallets, setWallets] = useState<Wallet[]>(undefined);
    const [sort, setSort] = useState<Order>(new Order());
    const [loading, setLoading] = useState<boolean>(false);

    const restApi = useRestApi();

    useEffect(() => {
        //loadWallets();
    }, [sort]);

    function loadWallets() {
        setLoading(true);

        restApi.Wallet.List({ sort: sort.toUrlString() })
        .then(wallet => setWallets(wallet))
        .finally(() => setLoading(false))
    }
    
    const refreshWalletHandler = () => {
        loadWallets();
    }

    return (
        <Box sx={{height: '100%', display: 'flex', flexDirection: "row", alignItems: 'center'}}>
            <WalletDialog open={showWalletDialog} onClose={_ => setShowWalletDialog(false)} />
            {/* <WalletTable ref={tableWallet} refreshWallets={refreshWalletHandler} wallets={wallets} loading={loading} sort={sort} setSort={setSort}/>
            {!isMobile && (<WalletPie wallets={wallets} loading={loading} />)} */}
        </Box>
    )
}