'use client';

import { Box, Button, Card, CardContent, Typography, useTheme } from '@mui/material';
import { useEffect, useState } from 'react';
import 'dayjs/locale/it';
import RangePickerField, { DateRange } from '@/component/DataPickerNew';
import useApi from '@/hooks/useApi';
import dayjs from 'dayjs';
import { DashboardOutput, DashboardOutputChar as DashboardOutputPie } from '@/models/backend';
import { convertNumberToPercentage, convertNumberToValue } from '../utilities/Utilities';
import { ResponsivePie } from '@nivo/pie';
import { getAdaptiveBackground } from '@/utilis/color';

export default function Dashboard() {
    const api = useApi();

    const [dateSelection, setDateSelection] = useState<DateRange>({
        start: dayjs().startOf('month'),
        end: dayjs().endOf('month'),
    });

    const [dashboardData, setDashboardData] = useState<DashboardOutput>(undefined);

    useEffect(() => {
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
        console.log(dashboardData);
    }, [dashboardData]);

    return (
        <Box display={'flex'} flexDirection={'column'} gap={3} p={1}>
            <Box width="100%" display="flex" flexDirection="row" justifyContent="space-between">
                <Typography color="secondary" variant="h5">
                    Dashboard finanze - date
                </Typography>
                <Box display="flex" flexDirection={'row-reverse'} gap={2}>
                    <Button variant="contained">Aggiungi transazione</Button>
                    <RangePickerField date={dateSelection} onDateChange={(date) => setDateSelection(date)} />
                </Box>
            </Box>
            <Box display="flex" width="100%" flexDirection="row" gap={2}>
                <Card sx={{ width: '100%' }}>
                    <CardContent>
                        <Typography color="textSecondary">Totale in entrata</Typography>
                        <Typography fontWeight="bold" fontSize={24} color="#29bf12">
                            {dashboardData === undefined ? '???' : convertNumberToValue(dashboardData.incoming)}
                        </Typography>
                    </CardContent>
                </Card>
                <Card sx={{ width: '100%' }}>
                    <CardContent>
                        <Typography color="textSecondary">Totale in uscita</Typography>
                        <Typography fontWeight="bold" fontSize={24} color="#ef233c">
                            {dashboardData === undefined ? '???' : convertNumberToValue(dashboardData.expense)}
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
                        <Box sx={{ flexGrow: 1 }}>
                            <PieChart
                                pieData={dashboardData?.expenseCategories.map((v) => ({
                                    ...v,
                                    value: Math.abs(v.value),
                                }))}
                                position="left"
                            />
                        </Box>
                    </CardContent>
                </Card>
                <Card sx={{ width: '100%', height: '100%' }}>
                    <CardContent sx={{ height: '100%', display: 'flex', flexFlow: 'column', boxSizing: 'border-box' }}>
                        <Typography color="textSecondary">Distribuzione delle entrate</Typography>
                        <Box sx={{ flexGrow: 1 }}>
                            <PieChart pieData={dashboardData?.incomingCategories} position="right" />
                        </Box>
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
            id={(data) => data.type.name}
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
            arcLinkLabel={(data) => data.data.type.name}
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
