import type { Ref } from 'react';
import { useCallback, useEffect, useImperativeHandle, useState } from 'react';

import { ResponsivePie } from '@nivo/pie';

import { Box } from '@mui/material';

import useApi from '@/hooks/useApi';
import type { Wallet } from '@/models/backend';
import { convertColor } from '@/utilis/color';
import { convertNumberToValue } from '@/utilis/values';

export interface WalletPieRef {
    refresh: () => void;
}

interface Props {
    ref: Ref<WalletPieRef>;
}

export default function WalletPie(props: Props) {
    const ref = props.ref;

    const api = useApi();

    const [wallets, setWallets] = useState<Wallet[] | undefined>(undefined);

    const reloadWallets = useCallback(() => {
        queueMicrotask(() => setWallets(undefined));

        api.wallet
            .get()
            .onSuccess((wallets) => {
                setWallets(wallets);
            })
            .execute();
    }, []);

    useImperativeHandle(
        // eslint-disable-next-line react-hooks/refs
        ref,
        () => ({
            refresh: () => {
                reloadWallets();
            },
        }),
        [reloadWallets],
    );

    useEffect(() => {
        reloadWallets();
    }, [reloadWallets]);

    return (
        <Box width="100%" height="400px">
            <ResponsivePie
                data={wallets ?? []}
                id={'name'}
                value={'currentValue'}
                sortByValue={true}
                margin={{ left: -100, top: 20, bottom: 20 }}
                enableArcLinkLabels={false}
                valueFormat={(number) => convertNumberToValue(number) ?? ''}
                activeOuterRadiusOffset={10}
                colors={(data) => convertColor(data.data.color!.value!)}
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
