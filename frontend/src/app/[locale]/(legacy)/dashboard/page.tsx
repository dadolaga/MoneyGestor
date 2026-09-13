'use client';

import { useCallback, useEffect, useState } from 'react';

import { ResponsivePie } from '@nivo/pie';
import dayjs from 'dayjs';

import { Box, Button, Card, CardContent, Typography, useTheme } from '@mui/material';

import 'dayjs/locale/it';
import type { DateRange } from '@/component/DataPickerNew';
import RangePickerField from '@/component/DataPickerNew';
import useApi from '@/hooks/useApi';
import type { DashboardOutput, DashboardOutputChar as DashboardOutputPie } from '@/models/backend';
import { getAdaptiveBackground } from '@/utilis/color';
import { convertNumberToPercentage, convertNumberToValue } from '@/utilis/values';

import TransactionDialog from './transaction/TransactionDialog';

export default function Dashboard() {
    const api = useApi();

    const [showTransactionDialog, setShowTransactionDialog] = useState<boolean>(false);

    const [dateSelection, setDateSelection] = useState<DateRange>({
        start: dayjs().startOf('month'),
        end: dayjs().endOf('month'),
    });

    const [dashboardData, setDashboardData] = useState<DashboardOutput>();

    const refreshDashboard = useCallback(() => {
        api.dashboard
            .all(dateSelection)
            .onSuccess((data) => {
                console.log(data);
                setDashboardData(data);
            })
            .onError((error) => {
                console.log(error);
            })
            .execute();
    }, [dateSelection]);

    useEffect(() => {
        refreshDashboard();
    }, [refreshDashboard]);

    const openTransactionDialogHandler = () => {
        setShowTransactionDialog(true);
    };

    const closeTransactionDialogHandler = (reload: boolean) => {
        if (reload) {
            refreshDashboard();
        }

        setShowTransactionDialog(false);
    };

    return (
        <Box display={'flex'} flexDirection={'column'} gap={3} p={1}>
            <TransactionDialog
                transactionId={undefined}
                open={showTransactionDialog}
                onClose={closeTransactionDialogHandler}
            />
            <Box width="100%" display="flex" flexDirection="row" justifyContent="space-between">
                <Typography color="secondary" variant="h4">
                    Dashboard finanze
                </Typography>
                <Box display="flex" flexDirection={'row-reverse'} gap={2}>
                    <Button fullWidth variant="contained" onClick={openTransactionDialogHandler}>
                        Aggiungi transazione
                    </Button>
                    <RangePickerField date={dateSelection} onDateChange={(date) => setDateSelection(date)} />
                </Box>
            </Box>
            <Box display="flex" width="100%" flexDirection="row" gap={2}>
                <Card sx={{ width: '100%' }}>
                    <CardContent>
                        <Typography color="textSecondary">Totale in entrata</Typography>
                        <Typography fontWeight="bold" fontSize={24} color="#29bf12">
                            {(dashboardData && convertNumberToValue(dashboardData.incoming)) ?? '???'}
                        </Typography>
                    </CardContent>
                </Card>
                <Card sx={{ width: '100%' }}>
                    <CardContent>
                        <Typography color="textSecondary">Totale in uscita</Typography>
                        <Typography fontWeight="bold" fontSize={24} color="#ef233c">
                            {(dashboardData && convertNumberToValue(dashboardData?.expense)) ?? '???'}
                        </Typography>
                    </CardContent>
                </Card>
                <Card sx={{ width: '100%' }}>
                    <CardContent>
                        <Typography color="textSecondary">Saving rate</Typography>
                        <Typography fontWeight="bold" fontSize={24}>
                            {`${dashboardData === undefined ? '???' : convertNumberToPercentage((dashboardData.incoming - Math.abs(dashboardData.expense)) / dashboardData.incoming)}`}{' '}
                            <Typography component="span" fontStyle="italic" color="textSecondary">
                                {`${dashboardData === undefined ? '???' : convertNumberToValue(dashboardData.incoming - Math.abs(dashboardData.expense))}`}
                            </Typography>
                        </Typography>
                    </CardContent>
                </Card>
            </Box>
            <Box display="flex" width="100%" height={300} flexDirection="row" gap={2}>
                <Card sx={{ width: '100%', height: '100%' }}>
                    <CardContent sx={{ height: '100%', display: 'flex', flexFlow: 'column', boxSizing: 'border-box' }}>
                        <Typography color="textSecondary">Distribuzione delle spese</Typography>
                        {dashboardData && dashboardData?.expenseCategories.length > 0 ? (
                            <Box sx={{ flexGrow: 1 }}>
                                <PieChart
                                    pieData={dashboardData?.expenseCategories.map((v) => ({
                                        ...v,
                                        value: Math.abs(v.value),
                                    }))}
                                    position="left"
                                />
                            </Box>
                        ) : (
                            <Box height="100%" display="flex" alignItems="center" justifyContent="center">
                                <Typography color="textDisabled" fontStyle="italic">
                                    {dashboardData === undefined ? 'Loading...' : 'Nessuna spesa registrata'}
                                </Typography>
                            </Box>
                        )}
                    </CardContent>
                </Card>
                <Card sx={{ width: '100%', height: '100%' }}>
                    <CardContent sx={{ height: '100%', display: 'flex', flexFlow: 'column', boxSizing: 'border-box' }}>
                        <Typography color="textSecondary">Distribuzione delle entrate</Typography>
                        {dashboardData && dashboardData?.incomingCategories.length > 0 ? (
                            <Box sx={{ flexGrow: 1 }}>
                                <PieChart pieData={dashboardData?.incomingCategories} position="right" />
                            </Box>
                        ) : (
                            <Box height="100%" display="flex" alignItems="center" justifyContent="center">
                                <Typography color="textDisabled" fontStyle="italic">
                                    {dashboardData === undefined ? 'Loading...' : 'Nessuna entrata registrata'}
                                </Typography>
                            </Box>
                        )}
                    </CardContent>
                </Card>
            </Box>
        </Box>
    );
}

function PieChart(props: { pieData: DashboardOutputPie[]; position: 'left' | 'right' }) {
    const theme = useTheme();

    return (
        <ResponsivePie
            data={props.pieData || []}
            id={(data) => data.type.name!}
            value={(data) => data.value}
            colors={{ scheme: 'pastel1' }}
            fit={true}
            innerRadius={0.7}
            padAngle={1}
            cornerRadius={5}
            enableArcLinkLabels={true}
            arcLinkLabelsStraightLength={32}
            arcLinkLabelsThickness={2}
            arcLinkLabelsColor={theme.palette.text.secondary}
            arcLinkLabelsTextColor={theme.palette.text.secondary}
            margin={{ top: 30, right: 10, left: 10, bottom: 30 }}
            arcLinkLabel={(data) => data.data.type.name!}
            isInteractive={true}
            activeOuterRadiusOffset={6}
            legends={[
                {
                    anchor: props.position,
                    direction: 'column',
                    justify: false,
                    itemHeight: 20,
                    itemWidth: 150,
                    itemsSpacing: 5,
                    symbolSize: 20,
                    itemTextColor: theme.palette.text.secondary,
                },
            ]}
            tooltip={(data) => (
                <Typography
                    sx={{
                        backgroundColor: getAdaptiveBackground(theme.palette.text.primary),
                        color: theme.palette.text.primary,
                        p: 0.5,
                        borderRadius: 2,
                    }}
                    variant="body2"
                >
                    {data.datum.data.value}
                </Typography>
            )}
        />
    );
}
