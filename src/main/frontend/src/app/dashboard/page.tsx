"use client"

import { Box, Card, CardContent, Typography } from "@mui/material";
import { DefaultRawDatum, PieTooltipProps, ResponsivePie } from "@nivo/pie";
import { useEffect, useState } from "react";
import { useRestApi } from "../request/Request";
import { sendDateToBackEnd } from "../utilities/BackEndUtilities";
import { ITransaction } from "../utilities/Types";
import { convertNumberToValue, fullSize } from "../utilities/Utilities";

const data: DefaultRawDatum[] & {}[] = [
    {
        "id": "make",
        "label": "make",
        "value": 33,
        "color": "hsl(337, 70%, 50%)"
    },
    {
        "id": "rust",
        "label": "rust",
        "value": 262,
        "color": "hsl(234, 70%, 50%)"
    },
    {
        "id": "javascript",
        "label": "javascript",
        "value": 113,
        "color": "hsl(30, 70%, 50%)"
    },
    {
        "id": "hack",
        "label": "hack",
        "value": 86,
        "color": "hsl(21, 70%, 50%)"
    },
    {
        "id": "ruby",
        "label": "ruby",
        "value": 224,
        "color": "hsl(122, 70%, 50%)"
    }
]

export default function Dashboard() {
    const [dateStart, setDateStart] = useState<Date>();
    const [dateEnd, setDateEnd] = useState<Date>();
    const [transaction, setTransaction] = useState<ITransaction[]>([]);
    const [typePieData, setTypePieData] = useState([])

    const request = useRestApi();

    useEffect(() => {
        if (dateStart && dateEnd)
            return;

        const now = new Date();

        setDateStart(new Date(now.getFullYear(), now.getMonth(), 1));
        setDateEnd(new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 23, 59));
    }, []);

    useEffect(() => {
        if (!dateStart || !dateEnd)
            return

        request.Dashboard.Transaction(({
            start: sendDateToBackEnd(dateStart),
            end: sendDateToBackEnd(dateEnd),
            moneyIn: false
        })).then(data => {
            console.log(data)
            setTransaction(data)
        })
    }, [dateStart, dateEnd]);

    useEffect(() => {
        const data: (DefaultRawDatum & { label: string })[] = [];

        transaction.forEach((value) => {
            if (value.value < 0) {
                const finded = data.find(d => d.id === value.type.id);
                if (finded === undefined) {
                    data.push({
                        id: value.type.id,
                        label: value.type.name,
                        value: Math.abs(value.value),
                    })
                } else {
                    finded.value = finded.value + Math.abs(value.value)
                }
            }
        });

        console.log("pie: ", data);
        setTypePieData(data);

    }, [transaction])

    function getDatePrint() {
        if (!dateStart || !dateEnd)
            return "???"

        if (dateStart.getDate() == 1
            && new Date(dateStart.getFullYear(), dateStart.getMonth() + 1, 0).getDate() == dateEnd.getDate()
            && dateStart.getMonth() == dateEnd.getMonth())
            return `di ${dateStart.toLocaleDateString(undefined, { month: "long", year: "numeric" })}`

        return ` dal ${dateStart.toLocaleString(undefined, { day: "2-digit", month: "2-digit", year: "numeric" })} al ${dateEnd.toLocaleString(undefined, { day: "2-digit", month: "2-digit", year: "numeric" })}`
    }

    return (
        <Box sx={{ color: "text.primary", height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <Typography variant="h4" textAlign="center" sx={{ mb: 2 }}>
                Riepilogo {getDatePrint()}
            </Typography>
            <Box
                flexGrow={1}
                width="100%"
                display="grid"
                gridTemplateColumns="1fr 1fr 1fr"
                gridTemplateRows="1fr 1fr"
                gap={2}
                sx={{
                    minHeight: 0,
                    minWidth: 0,
                }}>
                <Card>
                    <CardContent sx={{ ...fullSize, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3 }}>
                        <Typography sx={{ fontSize: "2em", color: "#008000" }}>Entrate: <Typography component="span" sx={{ fontSize: "1.35em", fontWeight: "bold" }}>{convertNumberToValue(transaction.reduce((acc, current) => current.value > 0 ? current.value + acc : acc, 0))}</Typography></Typography>
                        <Typography sx={{ fontSize: "2em", color: "#c1121f" }}>Uscite: <Typography component="span" sx={{ fontSize: "1.35em", fontWeight: "bold" }}>{convertNumberToValue(transaction.reduce((acc, current) => current.value < 0 ? current.value + acc : acc, 0))}</Typography></Typography>
                        <Typography sx={{ fontSize: "3em", color: "#dee2e6" }}>Bilancio: <Typography component="span" sx={{ fontSize: "1.35em", fontWeight: "bold" }}>{convertNumberToValue(transaction.reduce((acc, current) => current.value + acc, 0))}</Typography></Typography>
                    </CardContent>
                </Card>
                <Card sx={{ display: 'flex', flexDirection: 'column' }}>
                    <CardContent sx={{
                        flexGrow: 1,
                        minHeight: "0",
                        width: "100%",
                        overflow: "hidden",
                        boxSizing: "border-box"
                    }}>
                        <Box height="100%" width="100%" display="flex" flexDirection="column" boxSizing="border-box" alignItems="center" gap={4}>
                            <Typography >Riepilogo delle uscite divise per tipo</Typography>
                            <Box flexGrow={1} sx={{ minHeight: 0, minWidth: 0, width: "100%" }}>
                                <ResponsivePie
                                    data={typePieData}
                                    colors={{scheme: "pastel1"}}
                                    margin={{top: 20, right: 20, bottom: 20, left: 20}}
                                    innerRadius={0.5}
                                    padAngle={0.6}
                                    enableArcLabels={true}
                                    arcLabel={(value) => convertNumberToValue(value.value)}
                                    arcLinkLabel="label"
                                    arcLinkLabelsTextColor={{from: "color", modifiers: [["brighter", 1]]}}
                                    isInteractive={false}
                                />
                            </Box>
                        </Box>
                    </CardContent>
                </Card>
            </Box>
        </Box>
    )
}

function CustomTooltip({ datum }: PieTooltipProps<any>) {
    useEffect(() => {
        console.log(datum);
    }, [datum]);

    return (<></>) ;
}