import { Box } from "@mui/material";
import { ResponsivePie } from "@nivo/pie";
import { convertNumberToValue } from "../../Utilities/Utilities";
import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import axios from "../../axios/axios";
import { useCookies } from "react-cookie";
import { Wallet } from "../../Utilities/Datatypes";

const WalletPie = forwardRef((props, ref) => {
    const [wallets, setWallets] = useState(null);

    const [cookie, setCookie] = useCookies(["_token"]);

    useEffect(() => {
        refreshWallet();
    }, []);

    useImperativeHandle(ref, () => ({
        refreshWallet,
    }))
    
    function refreshWallet() {
        setWallets(null);

        axios.get("/wallet/list", {
            params: {
                sort: 'name'
            },
            headers: {
                Authorization: cookie._token
            }
        })
        .then(message => {
            let wallet: Wallet[] = [];
            message.data.forEach((el) => {
                wallet.push({
                    ...el,
                    color: '#' + el.color
                })
            });

            setWallets(wallet);
        });
    }

    return (
        <Box sx={{flex: 1}} width={'100%'} height={'400px'}>
            <ResponsivePie 
                data={wallets == null? [] : wallets}
                id={'name'}
                margin={{left: -100, top: 20, bottom: 20}}
                enableArcLinkLabels={false}
                sortByValue
                valueFormat={(number) => convertNumberToValue(number)}
                activeOuterRadiusOffset={10}
                colors={(data) => (data.data as any).color}
                legends={[{
                    anchor: "right",
                    direction: "column",
                    itemHeight: 15,
                    itemWidth: 100,
                    itemsSpacing: 10,
                    itemTextColor: "#fff",
                }]}
            />
        </Box>
    )
});

WalletPie.displayName = "WalletTable";

export default WalletPie;