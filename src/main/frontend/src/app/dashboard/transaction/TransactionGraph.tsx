import { forwardRef, useEffect, useImperativeHandle, useState } from 'react'
import { ResponsiveLine } from '@nivo/line'
import axios from '../../axios/axios'
import { useCookies } from 'react-cookie';
import { convertNumberToValue } from '../../Utilities/Utilities';

export const TransactionGraph = forwardRef((props, ref) => {
    const [transactions, setTransactions] = useState([]);

    const [cookie, setCookie] = useCookies(['_token']);

    useImperativeHandle(ref, () => ({
        loadTransaction,
    }));

    useEffect(() => {
        loadTransaction();
    }, [])

    function loadTransaction() {
        axios.get("/transaction/graph", {
            headers: {
                Authorization: cookie._token
            }
        })
        .then((message) => {
            let newData = [];

            message.data.forEach((value) => {
                let data = {
                    id: value.id,
                    color: "#" + value.color,
                    data: []
                };

                value.data.forEach((value) => {
                    data.data.push({
                        x: new Date(value.x[0], value.x[1] - 1, value.x[2]),
                        y: value.y
                    });
                });

                newData.push(data);
            });

            setTransactions(newData);
        });
    }

    return (
        <ResponsiveLine
            data={transactions}
            isInteractive
            useMesh
            theme={{
                grid: {
                    line: {
                        opacity: .4
                    }
                }, 
                tooltip: {
                    basic: {
                        zIndex: 1200
                    }
                }
            }}
            margin={{
                top: 10,
                left: 100,
                bottom: 50,
                right: 200
            }}
            legends={[{
                anchor: 'right',
                direction: 'column',
                itemWidth: -50,
                itemHeight: 23,
                itemDirection: 'left-to-right',
                itemTextColor: '#fff',
            }]}
            xScale={{
                type: "time",
                format: "%Y-%m-%d"
            }}
            yScale={{
                type: 'linear',
                min: 'auto'
            }}
            xFormat={(d: Date) => d.toLocaleDateString('it-IT', {
                day: '2-digit',
                month: 'long',
                year: 'numeric'
            })}
            yFormat={(d: number) => convertNumberToValue(d)}
            axisBottom={{
                format: "%d/%m/%Y"
            }}
            colors={d => d.color} />
    )
});

TransactionGraph.displayName = "TransactionGraph";