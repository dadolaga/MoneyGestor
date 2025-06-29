import { Alert, Box, Button, Checkbox, DialogActions, DialogContent, DialogTitle, FormControl, FormHelperText, Input, LinearProgress, MenuItem, Select, Skeleton, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography } from "@mui/material";
import Dialog from "@mui/material/Dialog/Dialog";
import 'dayjs/locale/it'
import { ChangeEvent, ChangeEventHandler, ForwardedRef, forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { TransitionDialog } from "../base/transition";
import { useRestApi } from "../../request/Request";
import { convertCsvToObject, convertDateStringWithFormat, convertStringToNumber, convertStringToValue } from "../../utilities/Utilities";
import { MultiTransactionInsert, TransactionForm, TransactionType, Wallet } from "../../utilities/BackEndTypes";
import { SelectChangeEvent, SelectInputProps } from "@mui/material/Select/SelectInput";
import { dark } from "@mui/material/styles/createPalette";

interface IRowData {
    isSelected: boolean,
}

interface IColumnChose {
    print: string,
    databaseName: string,
}

const COLUMN_DEFAULT: IColumnChose[] = [{
        databaseName: "date",
        print: "Data"
    }, {
        databaseName: "longDescription",
        print: "Descrizione lunga"
    }, {
        databaseName: "description",
        print: "Descrizione"
    }, {
        databaseName: "value",
        print: "Valore"
    }]

interface IProps {
    open: boolean,
    onClose: (refresh: boolean) => void,
    file: File,
}

export default function ImportFromCsvDialog({open, onClose, file} : IProps) {
    const table = useRef<ITableRef>(null);

    const [errorMessage, setErrorMessage] = useState<string>(undefined);
    const [loading, setLoading] = useState<boolean>(true);
    const [values, setValues] = useState<object[][]>(undefined);

    const [isFirstRowHeader, setFirstRowHeader] = useState<boolean>(true);
    const [rowData, setRowData] = useState<IRowData[]>(undefined);
    const [walletId, setWalletId] = useState<number>(0);

    const [wallet, setWallets] = useState<Wallet[]>(undefined);
    const [types, setTypes] = useState<TransactionType[]>(undefined);

    const restApi = useRestApi();

    useEffect(() => {
        if(!open)
            return;

        setLoading(true);

        restApi.Wallet.List({order: "id"}).then(wallets => setWallets(wallets));
        loadType()
    }, [open]);

    useEffect(() => {
        if(!file)
            return;

        var reader = new FileReader();
        reader.onload = function() {
            setLoading(false);

            let csvObject = convertCsvToObject(reader.result as string);

            setValues(csvObject);
            setRowData(Array(csvObject.length).fill({
                isSelected: false,
            } as IRowData))
        };

        reader.readAsText(file);
    }, [file]);

    function loadType(): Promise<any> {
        return restApi.TransactionType.GetAll()
        .then(transactionTypes => setTypes(transactionTypes));
    }

    function sendTransaction() {
        let transactions = table.current.getRows();

        let send: MultiTransactionInsert = {
            walletId: walletId,
            transactions: []
        };

        let arrayOfType: {index: number, value: string, isDate: boolean, isNumber: boolean}[] = [];

        table.current.columnChose.forEach((chose, index) => {
            if(chose) {
                arrayOfType.push({
                    index: index,
                    value: chose,
                    isDate: chose == 'date',
                    isNumber: chose == 'value',
                })
            }
        });

        for(let i = 0; i<transactions.length; i++){
            if(transactions[i].rowSelected) {
                let transaction: TransactionForm = {
                    description: transactions[i].description,
                    typeId: transactions[i].typeId,
                    date: undefined,
                    value: undefined,
                }

                arrayOfType.forEach(value => {
                    let func = value.isNumber ? convertStringToNumber : (value.isDate ? (value) => convertDateStringWithFormat(value as string, table.current.dateFormat).toISOString() : (value) => value);

                    transaction[value.value] = func(values[i][value.index]);
                });

                send.transactions.push(transaction);
            }
        }

        restApi.Transaction.AddAll(send)
        .catch(() => setErrorMessage("Errore generale server"))
        .finally(() => {
            setLoading(false);
            onClose(true);
        });
    }

    const saveHandler = () => {
        setErrorMessage(undefined);
        setLoading(true);

        if(!walletId) {
            setErrorMessage("Inserire il portafoglio delle transazioni");
            setLoading(false);
            return;
        }

        if(!table.current.columnChose.includes("date") || !table.current.columnChose.includes("value")) {
            setErrorMessage("La tabella non contiene le colonne di Data e Valore");
            setLoading(false);
            return;
        }

        sendTransaction();

        setLoading(false);
    }

    const cancelHandler = () => {
        onClose(false);
    }

    return (
        <Dialog fullScreen open={open} TransitionComponent={TransitionDialog} >
            {loading && <LinearProgress />}
            <DialogTitle>Importa transazione da file csv</DialogTitle>
            <DialogContent sx={{display: 'flex', flexDirection: 'column', gap: 1}}>
                <Box display={'flex'} alignItems='center' gap={2}>
                    <Typography flexGrow={1}>Selezionare un portafoglio per il quale inserire le transazioni</Typography>
                    <Select sx={{flexGrow:100}} size="small" value={walletId} onChange={(event) => setWalletId(parseInt(event.target.value.toString()))}>
                        {wallet?.map(wallet => <MenuItem value={wallet.id}>{wallet.name}</MenuItem>)}
                    </Select>
                </Box>
                <Box display={'flex'} alignItems='center'>
                    <Typography>Prima riga di intestazione: </Typography>
                    <Checkbox checked={isFirstRowHeader} onClick={() => setFirstRowHeader(!isFirstRowHeader)}/>
                </Box>
                <Box>
                    {errorMessage && <Alert severity="error" variant="filled">{errorMessage}</Alert>}
                </Box>
                {values && <MyTable ref={table} values={values} isFirstRowHeader={isFirstRowHeader} types={types} />}
            </DialogContent>
            <DialogActions>
                <Button onClick={cancelHandler} color="secondary" >Annulla</Button>
                <Button onClick={saveHandler} disabled={loading}>Aggiungi</Button>
            </DialogActions>
        </Dialog>
    );
}

interface ITableProps {
    values: object[][],
    isFirstRowHeader: boolean,
    types: TransactionType[],
}

interface ITableRef {
    dateFormat: string,
    columnChose: string[],
    getRows: () => ITableRowRef[],
}

const MyTable = forwardRef((props: ITableProps, ref: ForwardedRef<ITableRef>) => {
    const {values, isFirstRowHeader, types} = props;

    const refs = values.map(() => useRef(null));
    
    const [columnChose, setColumnChose] = useState<string[]>(values[0].map(() => ""));
    const [dateFormat, setDateFormat] = useState<string>("");

    useImperativeHandle(ref, () => {
        return {
            dateFormat: dateFormat,
            columnChose,
            getRows: () => refs.map(ref => ref.current),
        }
    })

    const changeDateFormatHandler = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setDateFormat(event.target.value);
    }

    const changeColumnSelectorHandler = (columnIndex) => (event: SelectChangeEvent) => {
        var newArray = [...columnChose];
        newArray[columnIndex] = event.target.value;
        setColumnChose(newArray);
    }

    return <TableContainer>
        <Table stickyHeader>
            <TableHead>
                <TableRow> {<TableCell />}
                    {values && values[0].map((value, index) => 
                        <TableCell>
                            <Box display={'flex'} flexDirection={'column'} gap={1}>
                                <Typography>{isFirstRowHeader? (value as any as string) : `Column ${index+1}`}</Typography>
                                <Select fullWidth size="small" value={columnChose[index]} onChange={changeColumnSelectorHandler(index)} >
                                    <MenuItem value="">&nbsp;</MenuItem>
                                    {COLUMN_DEFAULT.map(columnChose => <MenuItem value={columnChose.databaseName}>{columnChose.print}</MenuItem>)}
                                </Select>
                                {columnChose[index] == 'date' && (<TextField size="small" onChange={changeDateFormatHandler}/>)}
                            </Box>
                        </TableCell>
                    )}
                    {<TableCell>Descrizione</TableCell>}
                    {<TableCell>Tipo</TableCell>}
                </TableRow>
            </TableHead>
            <TableBody>
                {values && values.map((row, index) => 
                    <MyTableRow ref={refs[index]} index={index} row={row} columnChose={columnChose} isFirstRowHeader={isFirstRowHeader} types={types} dateFormat={dateFormat}/>
                )}
            </TableBody>
        </Table>
    </TableContainer>;
})

interface ITableRowProps {
    index: number,
    row: object[],
    columnChose: string[],
    isFirstRowHeader: boolean,
    types: TransactionType[],
    dateFormat: string,
}

interface ITableRowRef {
    rowSelected: boolean, 
    description: string,
    typeId: number,
}

const MyTableRow = forwardRef((props: ITableRowProps, ref) => {
    const {index, row, columnChose, isFirstRowHeader, types, dateFormat} = props;
    
    const [rowSelected, setRowSelected] = useState<boolean>(false);
    const [description, setDescription] = useState<string>("");
    const [typeId, setTypeId] = useState<string>("");

    useImperativeHandle(ref, (): ITableRowRef => {
        return {
            rowSelected,
            description: description.trim(),
            typeId: parseInt(typeId),
    }})

    const changeDescriptionHandler = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setDescription(event.target.value);
        setRowSelected(event.target.value.trim().length > 0);
    }

    const changeTypeHandler = (event: SelectChangeEvent<string>) => {
        setTypeId(event.target.value);
    }

    return <TableRow sx={{display: index == 0? (isFirstRowHeader? 'none' : undefined) : undefined}}>{
        <TableCell>
            <Checkbox checked={rowSelected} onChange={() => setRowSelected(value => !value)} tabIndex={-1}/>
        </TableCell>}
        {row.map((value, index) => {
            let dateFixed: string = "Not parsed";

            try {
                dateFixed = convertDateStringWithFormat(value as any as string, dateFormat).toISOString();
            } catch (error) {} 

            return <TableCell>
                    <Box 
                        display='flex' 
                        gap={1} 
                        flexDirection={columnChose[index] == 'date'? "column" : undefined} 
                        alignItems={columnChose[index] == 'date'? "flex-start" : "flex-end"} >
                            <Typography>{value as any as string} </Typography>
                            {(columnChose[index] == 'value')? 
                                <Typography color={'lightgray'} fontSize='.8em' fontStyle='italic'> {convertStringToValue(value as any as string)} </Typography> : 
                                ((columnChose[index] == 'date')? 
                                <Typography color={'lightgray'} fontSize='.8em' fontStyle='italic'> {dateFixed} </Typography> : "")}
                    </Box>
                </TableCell>
        })}{
            <>
            <TableCell>
                    <TextField 
                        size="small" 
                        disabled={columnChose.indexOf('description') != -1} 
                        value={description} 
                        onChange={changeDescriptionHandler}/>
            </TableCell>
            <TableCell>
                <Select 
                    size="small" 
                    disabled={!rowSelected}
                    value={typeId} 
                    onChange={changeTypeHandler}>
                    {types && types.map((type, index) => {
                        return (<MenuItem key={index} value={type.id}>{type.name}</MenuItem>)
                    })}
                </Select>
            </TableCell>
            </>
        }
    </TableRow>;
})