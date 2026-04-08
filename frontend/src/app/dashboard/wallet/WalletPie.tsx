import { Box } from '@mui/material';
import { ResponsivePie } from '@nivo/pie';
import { convertNumberToValue } from '../../utilities/Utilities';
import { Ref, useCallback, useEffect, useImperativeHandle, useState } from 'react';
import useApi from '@/hooks/useApi';
import { Wallet } from '@/models/backend';
import { convertColor } from '@/utilis/color';

export interface WalletPieRef {
    refresh: () => void;
}

interface Props {
    ref: Ref<WalletPieRef>;
}

export default function WalletPie(props: Props) {
    const api = useApi();

    const [loading, setLoading] = useState<boolean>(false);
    const [wallets, setWallets] = useState<Wallet[]>(undefined);

    useImperativeHandle(
        props.ref,
        () => ({
            refresh: () => {
                reloadWallets();
            },
        }),
        [],
    );

    useEffect(() => {
        reloadWallets();
    }, []);

    const reloadWallets = useCallback(() => {
        setLoading(true);
        setWallets(undefined);

        api.wallet
            .get()
            .onSuccess((wallets) => {
                setWallets(wallets);
            })
            .onFinish(() => {
                setLoading(false);
            })
            .execute();
    }, [api]);

    return (
        <Box width="100%" height="400px">
            <ResponsivePie
                data={wallets || []}
                id={'name'}
                value={'currentValue'}
                sortByValue={true}
                margin={{ left: -100, top: 20, bottom: 20 }}
                enableArcLinkLabels={false}
                valueFormat={(number) => convertNumberToValue(number)}
                activeOuterRadiusOffset={10}
                colors={(data) => convertColor(data.data.color.value)}
                legends={[
                    {
                        anchor: 'right',
                        direction: 'column',
                        itemHeight: 15,
                        itemWidth: 100,
                        itemsSpacing: 10,
                        itemTextColor: '#fff',
                    },
                ]}
            />
        </Box>
    );
}
