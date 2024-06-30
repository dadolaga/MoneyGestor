import { Box } from "@mui/material";
import { ResponsivePie } from "@nivo/pie";
import { convertNumberToValue } from "../../Utilities/Utilities";
import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import axios from "../../axios/axios";
import { useCookies } from "react-cookie";
import { useRestApi } from "../../request/Request";
import { Wallet } from "../../Utilities/BackEndTypes";

interface IWalletPie {
    wallets: Wallet[],
    loading: boolean,
}

export function WalletPie({wallets, loading}: IWalletPie, ref) {
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
                colors={(data) => "#" + data.data.color}
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
};
