"use client"

import { Box, Card, CardContent, Typography } from "@mui/material";
import { DefaultRawDatum, ResponsivePie } from "@nivo/pie";
import { useCallback, useEffect, useState } from "react";
import { useRestApi } from "../request/Request";
import { sendDateToBackEnd } from "../utilities/BackEndUtilities";
import { ITransaction } from "../utilities/Types";
import { convertNumberToValue, fullSize } from "../utilities/Utilities";
import { useIsMobile } from "../utilities/useMobile";
import { DataPickerDialog, DateRange } from "../../component/DataPicker";
import dayjs from "dayjs";

export default function Dashboard() {
    const isMobile = useIsMobile();

    const [transaction, setTransaction] = useState<ITransaction[]>([]);
    const [typePieData, setTypePieData] = useState([]);

    const [dateRange, setDateRange] = useState<DateRange>({ start: null, end: null });
    const [showDataPicker, setOpenDataPicker] = useState<boolean>(false);

    const request = useRestApi();

    useEffect(() => {
        if (dateRange.start && dateRange.end)
            return;

        setDateRange({
            start: dayjs().startOf("month"),
            end: dayjs().endOf("month")
        });
    }, []);

    useEffect(() => {
        if (!dateRange.start || !dateRange.end)
            return

        request.Dashboard.Transaction(({
            start: sendDateToBackEnd(dateRange.start.toDate()),
            end: sendDateToBackEnd(dateRange.end.toDate()),
            moneyIn: false
        })).then(data => {
            console.log(data)
            setTransaction(data)
        })
    }, [dateRange]);

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

    const clickDateHandler = useCallback(() => {
        setOpenDataPicker(true);
    }, []);

    function getDatePrint() {
        if (!dateRange.start || !dateRange.end)
            return " ???"

        if (dateRange.start.year() == dateRange.end.year() && dateRange.start.date() == 1 && dateRange.start.month() == 0 && dateRange.end.date() == 31 && dateRange.end.month() == 11)
            return ` dell'anno ${dateRange.start.year()}`;

        if (dateRange.start.get("date") == 1 && dateRange.end.endOf("month").get("date") == dateRange.end.get("date"))
            return ` di ${dateRange.start.toDate().toLocaleDateString(undefined, { month: "long", year: "numeric" })}`

        return ` dal ${dateRange.start.toDate().toLocaleString(undefined, { day: "2-digit", month: "2-digit", year: "numeric" })} al ${dateRange.end.toDate().toLocaleString(undefined, { day: "2-digit", month: "2-digit", year: "numeric" })}`
    }

    return (
        <Box sx={{ color: "text.primary", height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <Box>
                <Typography variant={isMobile ? "h5" : "h3"} textAlign="center" sx={{ mb: 2 }}>
                    Riepilogo
                    <Box component="span" sx={{ position: "relative" }}>
                        <Typography sx={{
                            transition: ".15s",
                            cursor: "pointer",
                            opacity: 1,
                            ["&:hover"]: { opacity: 0.5 }
                        }}
                            variant={isMobile ? "h5" : "h3"}
                            component="span"
                            onClick={clickDateHandler}>
                            {getDatePrint()}
                        </Typography>
                        {/* <DataPickerDialog dateRange={dateRange} setDateRange={setDateRange} show={showDataPicker} hide={() => setOpenDataPicker(false)} /> */}
                    </Box>
                </Typography>
            </Box>
            <Box
                flexGrow={1}
                width="100%"
                display="grid"
                gridTemplateColumns={!isMobile ? "1fr 1fr 1fr" : "1fr"}
                gridTemplateRows={!isMobile ? "1fr 1fr" : ".5fr 1fr"}
                gap={2}
                sx={{
                    minHeight: 0,
                    minWidth: 0,
                }}>
                <Card >
                    <CardContent sx={{ ...fullSize, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3, boxSizing: "border-box" }}>
                        <Typography sx={{ fontSize: `clamp(1rem, ${isMobile ? 6 : 2}vw, 3rem)`, color: "#008000" }}>
                            Entrate: <Typography component="span" sx={{ fontSize: "1.35em", fontWeight: "bold" }}>{convertNumberToValue(transaction.reduce((acc, current) => current.value > 0 ? current.value + acc : acc, 0))}</Typography>
                        </Typography>
                        <Typography sx={{ fontSize: `clamp(1rem, ${isMobile ? 6 : 2}vw, 3rem)`, color: "#c1121f" }}>
                            Uscite: <Typography component="span" sx={{ fontSize: "1.35em", fontWeight: "bold" }}>{convertNumberToValue(transaction.reduce((acc, current) => current.value < 0 ? current.value + acc : acc, 0))}</Typography>
                        </Typography>
                        <Typography sx={{ fontSize: `clamp(1.25rem, ${isMobile ? 6.5 : 2.5}vw, 3.5rem)`, color: "#dee2e6" }}>
                            Bilancio: <Typography component="span" sx={{ fontSize: "1.35em", fontWeight: "bold" }}>{convertNumberToValue(transaction.reduce((acc, current) => current.value + acc, 0))}</Typography>
                        </Typography>
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
                            <Typography>Riepilogo delle uscite divise per tipo</Typography>
                            <Box flexGrow={1} sx={{ minHeight: 0, minWidth: 0, width: "100%" }}>
                                <ResponsivePie
                                    data={typePieData}
                                    colors={{ scheme: "pastel1" }}
                                    margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
                                    innerRadius={0.5}
                                    padAngle={0.6}
                                    enableArcLabels={true}
                                    arcLabel={(value) => convertNumberToValue(value.value)}
                                    arcLinkLabel="label"
                                    arcLinkLabelsTextColor={{ from: "color", modifiers: [["brighter", 1]] }}
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