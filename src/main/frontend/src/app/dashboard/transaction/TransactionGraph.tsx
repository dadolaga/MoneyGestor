import { forwardRef, useEffect, useImperativeHandle, useState } from 'react'
import { Datum, ResponsiveLine, Serie } from '@nivo/line'
import { convertNumberToValue } from '../../Utilities/Utilities';
import { useRestApi } from '../../request/Request';
import { LineGraph, Transaction, Wallet } from '../../Utilities/BackEndTypes';
import { ComposedChart, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { convertToReturnDate, sendDateToBackEnd } from '../../Utilities/BackEndUtilities';

export const TransactionGraph = forwardRef((props, ref) => {
    const [graphData, setGraphData] = useState<LineGraph<Wallet, Transaction>[]>([]);

    const restApi = useRestApi();

    const generateStartDate: () => Date = () => {
        let date = new Date();
        date.setMonth(date.getMonth() - 1);
        date.setHours(0);
        date.setMinutes(0);
        date.setSeconds(0);
        date.setMilliseconds(0);
        return date;
    }

    const generateEndDate: () => Date = () => {
        let date = new Date();
        date.setHours(0);
        date.setMinutes(0);
        date.setSeconds(0);
        date.setMilliseconds(0);
        return date;
    }

    useImperativeHandle(ref, () => ({
        loadTransaction,
    }));

    useEffect(() => {
        loadTransaction();
    }, [])

    function loadTransaction() {
        restApi.Transaction.Graph({
            start: sendDateToBackEnd(generateStartDate()),
            end: sendDateToBackEnd(generateEndDate()),
        })
        .then(lineGraph => {setGraphData(lineGraph)});
    }

    function convertToGraphData(data: LineGraph<Wallet, Transaction>[]): any[] {
        const endDate = generateEndDate();
        let progressiveDate = new Date(generateStartDate());
        let graphArrayData: any[] = [];

        let positions: number[] = [];
        let previousValue: number[] = [];
        while(progressiveDate <= endDate) {
            let object = { name: new Date(progressiveDate) };

            let index: number = 0;
            for (const wallet of data) {
                if(positions[index] === undefined)
                    positions[index] = 0;

                let dateString = convertToReturnDate(progressiveDate);
                
                object[wallet.line.name] = previousValue[index];

                while (positions[index] < wallet.values.length && dateString === wallet.values[positions[index]].date) {
                    object[wallet.line.name] = previousValue[index]? (previousValue[index] + wallet.values[positions[index]].value) : wallet.values[positions[index]].value;
                    previousValue[index] = object[wallet.line.name];
                    positions[index]++;
                }

                index++;
            }
            
            graphArrayData.push(object);
            progressiveDate.setDate(progressiveDate.getDate() + 1);
        }

        return graphArrayData;
    }

    return (
        <ResponsiveContainer>
            <LineChart data={convertToGraphData(graphData)} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <XAxis dataKey="name" tickFormatter={value => (value as Date).toLocaleString(undefined, { year: 'numeric', month: '2-digit', day:'2-digit' })} />
                <YAxis tickFormatter={value => value + " €"} />
                <Tooltip formatter={value => convertNumberToValue(value as number)} />
                <Legend layout='vertical' verticalAlign="middle" align="right" margin={{left: 100}}/>
                {graphData.map((value, key) => (
                    <Line key={key} type="linear" dataKey={value.line.name} stroke={"#" + value.line.color} dot={false}  />
                ))}
            </LineChart>
        </ResponsiveContainer>
    )
});

TransactionGraph.displayName = "TransactionGraph";